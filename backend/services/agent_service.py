import json
import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional

from openai import OpenAI
from sqlalchemy.orm import Session

import models

CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "agent_config.json",
)

DEFAULT_CONFIG = {
    "api_base": "https://api.deepseek.com/v1",
    "api_key": "",
    "model": "deepseek-chat",
    "school_name": "示例大学",
    "counselor_name": "辅导员",
    "admin_password": "",
}


def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        for k, v in DEFAULT_CONFIG.items():
            cfg.setdefault(k, v)
        return cfg
    return dict(DEFAULT_CONFIG)


def save_config(cfg: dict) -> None:
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def _client() -> OpenAI:
    cfg = load_config()
    return OpenAI(api_key=cfg["api_key"], base_url=cfg["api_base"])


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """你是"{school_name}"的一名专职辅导员助理 Agent，服务于辅导员本人。
你拥有两个工作模式：

【对内模式】(数据问答)
你可以查询辅导员工作台中本地台账数据（学生信息、就业、心理、谈心谈话、学业成绩、课程考勤）。
规则：
- 涉及具体数字/名单类问题时，必须调用 query_ledger 工具获取真实数据，不要编造。
- 回答要精确，引用数据来源（如"就业台账"、"成绩台账"），并给出简洁的统计结论。
- 如果数据为空或查询不到，如实告知。

【对外模式】(学校事务咨询)
当学生、家长或老师询问学校日常事宜时，使用你掌握的通用知识回答，例如：
报到注册、选课、学籍、奖学金、助学金、评优评先、宿舍管理、心理健康服务、考试安排、就业指导、请假流程等。
注意：
- 告知对方以学校官方最新通知为准。
- 语气亲切、专业、条理清晰。

⚠️ 严守边界：你【没有任何数据库访问权限】。如果对方询问具体某个学生的成绩、心理状况、就业去向、考勤、家庭情况等敏感信息，必须明确回答"我无法查询具体学生数据，请联系辅导员"，绝不要假装"查询到了"、不要编造、不要泛化回答。

当前模式由用户消息中的 [模式：internal/external/student] 标记决定，external 时不要调用查询工具。
"""

LEDGER_META = {
    "students": "学生信息台账：学号(student_id)、姓名(name)、性别、专业(major)、班级(class_name)、年级、政治面貌、宿舍、生源地、监护人等",
    "employment": "就业台账：学号、姓名、班级、就业状态(status：已就业/待就业/考研/考公/出国/自主创业)、单位(company)、岗位、薪资、地区等",
    "psychology": "心理台账：学号、姓名、班级、评估日期、等级(level：正常/关注/预警/危机)、类别、表现、干预措施、下次跟进",
    "talks": "谈心谈话台账：学号、姓名、班级、谈话日期、类型、主题、内容、结论、谈话人",
    "grades": "学业成绩台账：学号、姓名、班级、学期、课程、学分、成绩(score)、绩点、排名、补考成绩",
    "attendance": "课程考勤台账：学号、姓名、班级、课程、日期、节次、状态(出勤/迟到/早退/请假/旷课)、原因",
}

QUERY_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_ledger",
            "description": "查询辅导员工作台本地台账数据，返回 JSON。根据问题选择合适的台账类型与过滤条件。",
            "parameters": {
                "type": "object",
                "properties": {
                    "ledger": {
                        "type": "string",
                        "enum": list(LEDGER_META.keys()),
                        "description": "要查询的台账类型",
                    },
                    "filters": {
                        "type": "object",
                        "description": '过滤条件字典，例如 {"class_name": "计科2301", "level": "预警", "status": "待就业"}。键为台账字段名（见台账说明），值为字符串或数字。',
                    },
                    "aggregate": {
                        "type": "string",
                        "enum": ["count", "avg_score", "list", "distinct"],
                        "description": "聚合方式：count=计数、avg_score=成绩平均分、list=列出记录、distinct=取某字段去重值",
                    },
                    "field": {
                        "type": "string",
                        "description": "aggregate 为 distinct 或 avg_score 时需要指定字段",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "list 时最多返回行数，默认 20",
                    },
                },
                "required": ["ledger"],
            },
        },
    }
]

# 学生专用：温和对话 + 主动了解 + 双轨预警
STUDENT_PROMPT = """你是「{school_name}」的安全陪伴助手，专门服务一位大学生「{student_name}」（{class_name}）。
你的风格：
1. 温暖、亲切、克制：像可信赖的学长/学姐 + 校园亚好友，不轻浮不冷漠。
2. 共情优先：先确认对方的情绪再给建议，多问开放问题，少长篇大论。
3. 主动了解：可以借话题了解 TA 的爱好、专业兴趣、最近心情，但不要审问。
4. 务实建议：选课 / 学习方法 / 人际 / 报销 / 申请流程等都给出可操作步骤。
5. 安全底线：一旦检测到自伤念头或危机，请明确说"我已替你联系辅导员，稍后会主动找你"，但不要假装人类、不要承诺超出能力的事。

⚠️ 重要隐私边界：你【没有任何数据库访问权限】，不能查询任何学生的成绩、心理、考勤、其它同学信息。如果学生问及其他同学的情况，礼貌拒绝。你只能基于本对话中学生本人告诉你的内容来回应。

讨论任何学校事务时，文末统一附一句"具体以学校官方通知为准"。

【严守隐私】不会向无关方透露这层对话内容；只有遇到需要辅导员协助的情况，你才会在后台静默通知辅导员。

【任务】完成每次回复后，你必须在末尾输出一段结构化标记（用户不可见，系统会解析后裁掉）：

<STRUCT>{json}</STRUCT>

其中 json 字段：
{{
  "distress": false,
  "distress_type": "",
  "severity": "",
  "evidence": "",
  "suggestion": "",
  "hobbies": "",
  "interests": ""
}}

字段说明：
- distress: bool，是否检测到困难/压力（绝不能轻易为 true）
- distress_type: 学业压力 | 家庭压力 | 经济压力 | 心理压力 | 选课困惑 | 人际困扰 | 空
- severity: 关注 | 预警 | 危机 | 空（generally default 关注 or 预警；"危机"仅在出现自伤/危险迹象时使用）
- evidence: 触发你判断的学生原话片段（≤40字，无则空）
- suggestion: 给辅导员的简短处置建议（≤30字，无则空）
- hobbies: 本轮了解到的爱好（如有新增/补充，留字段；无则空字符串）
- interests: 本轮了解到的学术/职业兴趣（无则空）

输出严格遵循此结构，不要把它暴露给学生，也不要替换为其它格式。
"""


# ---------------------------------------------------------------------------
# Long context: rolling summary
# ---------------------------------------------------------------------------
RECENT_TURNS = 20  # 最近若干轮全量保留
SUMMARY_TRIGGER = 30  # 超过该值的存量消息触发摘要
SUMMARY_KEEP_CHARS = 1500  # 摘要最多保留字数


def _build_messages_with_summary(
    history: List[Dict[str, str]],
    system_prompt: str,
    session: Optional[models.ChatSession],
    client: OpenAI,
) -> List[Dict[str, str]]:
    """构造发给 LLM 的消息列表：固定 system + 已有概要 + 最近 N 轮"""
    msgs: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    if session is not None and session.summary:
        msgs.append(
            {"role": "system", "content": "【早期对话摘要】\n" + session.summary}
        )

    recent = (
        history[-RECENT_TURNS * 2 :] if len(history) > RECENT_TURNS * 2 else history
    )
    msgs.extend({"role": m["role"], "content": m["content"]} for m in recent)
    return msgs


def _maybe_rollup_summary(
    history: List[Dict[str, str]],
    session: Optional[models.ChatSession],
    client: OpenAI,
    model: str,
) -> Optional[str]:
    """如果历史超过阈值且当前概要过旧，则触发摘要压缩"""
    if session is None or len(history) < SUMMARY_TRIGGER * 2:
        return session.summary if session else ""
    cfg = load_config()
    old_summary = session.summary or ""
    elder = history[: -RECENT_TURNS * 2]
    if not elder:
        return old_summary
    compact_msgs = [
        {
            "role": "system",
            "content": "请把下面的多轮对话压缩为结构化摘要，保留：用户的核心意图、已确认的关键信息、"
            "已提供的建议要点、Agent 已查询到的台账数据要点、用户透露的偏好/情绪。"
            "用简体中文输出，不超过 1500 字。",
        }
    ]
    if old_summary:
        compact_msgs.append(
            {"role": "system", "content": "已有早期摘要：\n" + old_summary}
        )
    compact_msgs.extend(
        {"role": m["role"], "content": m["content"]} for m in elder[-20:]
    )
    try:
        resp = client.chat.completions.create(
            model=model, messages=compact_msgs, max_tokens=900
        )
        new_sum = (resp.choices[0].message.content or "").strip()[:SUMMARY_KEEP_CHARS]
        return new_sum
    except Exception as e:
        return old_summary


# ---------------------------------------------------------------------------
# Query ledger execution
# ---------------------------------------------------------------------------
def _do_query(
    ledger: str,
    filters: Dict[str, Any],
    aggregate: str,
    field: str,
    limit: int,
    db: Session,
) -> Dict[str, Any]:
    table_map = {
        "students": models.Student,
        "employment": models.EmploymentRecord,
        "psychology": models.PsychologyRecord,
        "talks": models.TalkRecord,
        "grades": models.GradeRecord,
        "attendance": models.AttendanceRecord,
    }
    model = table_map[ledger]
    q = db.query(model)
    for k, v in (filters or {}).items():
        col = getattr(model, k, None)
        if col is not None:
            q = q.filter(col == str(v))
    agg = aggregate or "count"
    if agg == "count":
        return {"count": q.count()}
    if agg == "avg_score":
        col = getattr(model, field)
        vals = [r[0] for r in q.with_entities(col).all() if r[0] is not None]
        if not vals:
            return {"avg_score": 0, "count": 0}
        return {"avg_score": round(sum(vals) / len(vals), 2), "count": len(vals)}
    if agg == "distinct":
        col = getattr(model, field)
        return {
            "values": list(
                dict.fromkeys(str(r[0]) for r in q.with_entities(col).all() if r[0])
            )
        }
    rows = q.limit(limit or 20).all()
    return {
        "rows": [
            {c.name: getattr(r, c.name) for c in model.__table__.columns} for r in rows
        ]
    }


def _run_query(args: Dict[str, Any], db: Session) -> Dict[str, Any]:
    try:
        return _do_query(
            args.get("ledger", ""),
            args.get("filters", {}),
            args.get("aggregate", "count"),
            args.get("field", ""),
            args.get("limit", 20),
            db,
        )
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Mode system prompt + history trimming
# ---------------------------------------------------------------------------
def _trim_quality(history: List[Dict[str, str]], mode: str) -> List[Dict[str, str]]:
    """剥离 system 标记前缀，避免污染上下文"""
    out = []
    for m in history:
        if m["role"] not in ("user", "assistant"):
            continue
        c = m["content"]
        c = re.sub(r"^\[模式：\w+\]\s*", "", c)
        out.append({"role": m["role"], "content": c})
    return out


def _strip_struct(text: str) -> tuple:
    """从学生回复末尾拆出 <STRUCT>{...}</STRUCT>，返回 (clean_text, dict_or_None)"""
    m = re.search(r"<STRUCT>(.*?)</STRUCT>", text, re.S)
    if not m:
        return text.strip(), None
    raw = m.group(1).strip()
    try:
        data = json.loads(raw)
    except Exception:
        # 兼容{"key": "val"} 大括号被破坏的情况
        try:
            data = json.loads(raw.replace("'", '"'))
        except Exception:
            data = None
    return text[: m.start()].strip(), data


def _build_system_prompt(
    mode: str, student_context: Optional[Dict[str, str]] = None
) -> str:
    cfg = load_config()
    sys_msg = SYSTEM_PROMPT.format(
        school_name=cfg.get("school_name", "示例大学"),
        counselor_name=cfg.get("counselor_name", "辅导员"),
    )
    if mode == "internal":
        ledger_desc = "\n".join(f"- {k}: {v}" for k, v in LEDGER_META.items())
        sys_msg += (
            "\n\n【台账字段说明】\n"
            + ledger_desc
            + "\n\n你必须基于 query_ledger 返回的数据回答，切勿编造数据。"
        )
        return sys_msg
    if mode == "student":
        return STUDENT_PROMPT.format(
            school_name=cfg.get("school_name", "示例大学"),
            student_name=student_context.get("name", "同学")
            if student_context
            else "同学",
            class_name=student_context.get("class_name", ""),  # noqa
        )
    # external
    return sys_msg


# ---------------------------------------------------------------------------
# Procedure: trigger alerts and write ledger
# ---------------------------------------------------------------------------
def _handle_student_struct(
    struct: Dict[str, Any],
    session_id: Optional[int],
    student_ctx: Dict[str, str],
    db: Session,
) -> Optional[int]:
    """处理学生回复中的 <STRUCT> 标记，必要时写入预警与台账，返回 alert_id"""
    if not struct:
        _update_profile_keywords(student_ctx.get("student_id", ""), struct, db)
        return None
    _update_profile_keywords(student_ctx.get("student_id", ""), struct, db)
    if not struct.get("distress"):
        return None

    distress_type = (struct.get("distress_type") or "其它").strip()
    severity = (struct.get("severity") or "关注").strip()
    evidence = (struct.get("evidence") or "").strip()
    suggestion = (struct.get("suggestion") or "").strip()
    student_id = student_ctx.get("student_id", "")
    name = student_ctx.get("name", "")

    # 双轨同步之一：写入心理台账「待跟进」
    if distress_type in ("心理压力",) or severity in ("预警", "危机"):
        db.add(
            models.PsychologyRecord(
                student_id=student_id,
                name=name,
                class_name=student_ctx.get("class_name", ""),
                assess_date=datetime.now().strftime("%Y-%m-%d"),
                level=severity,
                category=distress_type,
                symptoms=evidence,
                intervention=suggestion + "（系统自动登记，需辅导员跟进）",
                counselor="AI 助手",
                next_follow_up=datetime.now().strftime("%Y-%m-%d"),
                remarks=f"来源：学生咨询自动登记｜会话 #{session_id or '-'}",
            )
        )
    # 双轨同步之二：所有压力都写入谈心谈话占位
    db.add(
        models.TalkRecord(
            student_id=student_id,
            name=name,
            class_name=student_ctx.get("class_name", ""),
            talk_date=datetime.now().strftime("%Y-%m-%d"),
            talk_type="心理疏导" if distress_type == "心理压力" else "日常谈心",
            topic=distress_type,
            content=f"学生反馈：{evidence}",
            conclusion=suggestion + "（AI 提示：请尽快核实跟进）",
            counselor="AI 助手",
        )
    )

    # 铃铛报警
    alert = models.AlertNotification(
        student_id=student_id,
        student_name=name,
        distress_type=distress_type,
        severity=severity,
        evidence=evidence,
        suggestion=suggestion,
        session_id=session_id,
    )
    db.add(alert)
    db.flush()
    # 更新学生画像状态
    db.query(models.StudentProfile).filter(
        models.StudentProfile.student_id == student_id
    ).update(
        {
            "distressed": 1,
            "last_distress_type": distress_type,
            "last_updated_by_agent": datetime.now(),
        },
        synchronize_session=False,
    )
    db.commit()
    return alert.id


def _update_profile_keywords(
    student_id: str, struct: Optional[Dict[str, Any]], db: Session
):
    """把学习到的爱好/兴趣合并进 StudentProfile"""
    if not student_id or not struct:
        return
    hobbies = (struct.get("hobbies") or "").strip()
    interests = (struct.get("interests") or "").strip()
    if not hobbies and not interests:
        return
    p = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.student_id == student_id)
        .first()
    )
    if not p:
        p = models.StudentProfile(student_id=student_id)
        db.add(p)
        db.flush()
    if hobbies:
        existing = [h.strip() for h in (p.hobbies or "").split(",") if h.strip()]
        for h in hobbies.split(","):
            if h.strip() and h.strip() not in existing:
                existing.append(h.strip())
        p.hobbies = ",".join(existing)
    if interests:
        existing = [h.strip() for h in (p.interests or "").split(",") if h.strip()]
        for h in interests.split(","):
            if h.strip() and h.strip() not in existing:
                existing.append(h.strip())
        p.interests = ",".join(existing)
    p.updated_at = datetime.now()
    db.commit()


# ---------------------------------------------------------------------------
# Public chat
# ---------------------------------------------------------------------------
def chat(
    messages: List[Dict[str, str]],
    mode: str,
    db: Session,
    session: Optional[models.ChatSession] = None,
    student_ctx: Optional[Dict[str, str]] = None,
) -> tuple:
    """返回 (reply_text, alert_id_or_None)。会自动持久化 rolling summary。"""
    cfg = load_config()
    if not cfg.get("api_key"):
        raise ValueError("尚未配置大模型 API Key，请在「设置」中填写")
    client = _client()
    model = cfg["model"]
    sys_prompt = _build_system_prompt(mode, student_ctx)

    history = _trim_quality(messages, mode)
    # 触发摘要（如果历史很长）
    if len(history) >= SUMMARY_TRIGGER * 2 and session is not None:
        new_summary = _maybe_rollup_summary(history, session, client, model)
        if new_summary and new_summary != session.summary:
            session.summary = new_summary
            db.commit()

    llm_msgs = _build_messages_with_summary(history, sys_prompt, session, client)

    for _ in range(5):
        if mode == "internal":
            resp = client.chat.completions.create(
                model=model,
                messages=llm_msgs,
                tools=QUERY_TOOLS,
                tool_choice="auto",
            )
        else:
            # external / student 模式：显式禁用工具，双保险防止 LLM "幻觉调用"
            resp = client.chat.completions.create(
                model=model,
                messages=llm_msgs,
                tools=QUERY_TOOLS,
                tool_choice="none",
            )
        msg = resp.choices[0].message
        if getattr(msg, "tool_calls", None):
            llm_msgs.append(
                {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {"id": tc.id, "type": "function", "function": tc.function}
                        for tc in msg.tool_calls
                    ],
                }
            )
            for tc in msg.tool_calls:
                fn_args = json.loads(tc.function.arguments or "{}")
                result = _run_query(fn_args, db)
                llm_msgs.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )
            continue

        reply = msg.content or ""

        alert_id = None
        if mode == "student":
            clean, struct = _strip_struct(reply)
            if struct is not None:
                alert_id = _handle_student_struct(
                    struct,
                    session.id if session else None,
                    student_ctx or {},
                    db,
                )
            reply = clean
        return reply, alert_id

    return "抱歉，未能完成回复，请重试。", None
