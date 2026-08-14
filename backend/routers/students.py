from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional

import models
import schemas
from database import get_db
from services import agent_service

router = APIRouter(prefix="/api/students", tags=["students"])

# 内存 token -> student_account_id
_student_tokens: dict = {}


def _ctx_from_account(acc: models.StudentAccount, db: Session) -> dict:
    """构造学生上下文 dict，含画像"""
    profile = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.student_id == acc.student_id)
        .first()
    )
    ctx = {
        "student_id": acc.student_id,
        "name": acc.name,
        "class_name": acc.class_name or "",
        "major": acc.major or "",
        "grade": acc.grade or "",
        "hobbies": profile.hobbies if profile else "",
        "interests": profile.interests if profile else "",
        "profile_hints": "",
    }
    if profile and (profile.hobbies or profile.interests or profile.distressed):
        hints = []
        if profile.hobbies:
            hints.append("爱好：" + profile.hobbies)
        if profile.interests:
            hints.append("兴趣：" + profile.interests)
        if profile.distressed:
            hints.append(
                "当前状态：处于困难期（最近困扰："
                + (profile.last_distress_type or "未知")
                + "）"
            )
        ctx["profile_hints"] = "（已知信息：）" + "；".join(hints)
    return ctx


@router.get("/status")
def status(x_student_token: Optional[str] = Header(default=None)):
    sid = _student_tokens.get(x_student_token or "")
    return {"logged_in": bool(sid), "account_id": sid or 0}


@router.post("/login")
def login(body: dict, db: Session = Depends(get_db)):
    sid = (body.get("student_id") or "").strip()
    pwd = (body.get("password") or "").strip()
    if not sid or not pwd:
        raise HTTPException(400, "请填写学号和密码")
    acc = (
        db.query(models.StudentAccount)
        .filter(
            models.StudentAccount.student_id == sid,
            models.StudentAccount.password == pwd,
            models.StudentAccount.enabled == 1,
        )
        .first()
    )
    if not acc:
        raise HTTPException(401, "学号或密码不正确")
    token = secrets_string()
    _student_tokens[token] = acc.id
    return {
        "ok": True,
        "token": token,
        "name": acc.name,
        "student_id": acc.student_id,
        "class_name": acc.class_name,
        "major": acc.major,
        "grade": acc.grade,
    }


def secrets_string() -> str:
    import secrets

    return secrets.token_hex(16)


@router.post("/logout")
def logout(x_student_token: Optional[str] = Header(default=None)):
    _student_tokens.pop(x_student_token or "", None)
    return {"ok": True}


def _require_student(
    x_student_token: Optional[str], db: Session
) -> models.StudentAccount:
    aid = _student_tokens.get(x_student_token or "")
    if not aid:
        raise HTTPException(401, "学生未登录")
    acc = db.query(models.StudentAccount).get(aid)
    if not acc or not acc.enabled:
        raise HTTPException(401, "账号已停用")
    return acc


@router.post("/chat")
def student_chat(
    req: schemas.ChatRequest,
    x_student_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    acc = _require_student(x_student_token, db)
    ctx = _ctx_from_account(acc, db)

    # 学生每次对话都创建/复用一个 session
    session_id = (req.messages[0].content or "").startswith("__resume__") and None
    session = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.student_account_id == acc.id,
            models.ChatSession.mode == "student",
        )
        .order_by(models.ChatSession.id.desc())
        .first()
    )
    if not session:
        session = models.ChatSession(
            title=f"学生咨询-{acc.name}", mode="student", student_account_id=acc.id
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 包装学生上下文进 system 提示：通过在 messages 前插入一条 user 提示
    msgs = []
    if ctx["profile_hints"]:
        msgs.append({"role": "system", "content": "学生画像：" + ctx["profile_hints"]})
    msgs.extend({"role": m.role, "content": m.content} for m in req.messages)

    # 保存学生本轮消息
    last_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    if last_user:
        db.add(
            models.ChatMessage(
                session_id=session.id, role="user", content=last_user.content
            )
        )
        db.commit()

    try:
        reply, alert_id = agent_service.chat(
            msgs, "student", db, session=session, student_ctx=ctx
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"对话失败: {e}")

    db.add(models.ChatMessage(session_id=session.id, role="assistant", content=reply))
    db.commit()

    return {
        "reply": reply,
        "session_id": session.id,
        "alert_id": alert_id,
        "profile_updated": True,
    }


@router.get("/history")
def student_history(
    x_student_token: Optional[str] = Header(default=None), db: Session = Depends(get_db)
):
    acc = _require_student(x_student_token, db)
    session = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.student_account_id == acc.id,
            models.ChatSession.mode == "student",
        )
        .order_by(models.ChatSession.id.desc())
        .first()
    )
    if not session:
        return {"messages": []}
    msgs = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session.id)
        .order_by(models.ChatMessage.id.asc())
        .all()
    )
    return {
        "messages": [{"role": m.role, "content": m.content} for m in msgs],
        "session_id": session.id,
    }


@router.get("/profile")
def student_profile(
    x_student_token: Optional[str] = Header(default=None), db: Session = Depends(get_db)
):
    acc = _require_student(x_student_token, db)
    p = (
        db.query(models.StudentProfile)
        .filter(models.StudentProfile.student_id == acc.student_id)
        .first()
    )
    return {
        "name": acc.name,
        "student_id": acc.student_id,
        "class_name": acc.class_name,
        "major": acc.major,
        "grade": acc.grade,
        "hobbies": p.hobbies if p else "",
        "interests": p.interests if p else "",
        "distressed": p.distressed if p else 0,
    }
