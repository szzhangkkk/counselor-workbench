from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import schemas
import models
from database import get_db
from routers.auth import require_auth
from services import agent_service

router = APIRouter(
    prefix="/api/agent", tags=["agent"], dependencies=[Depends(require_auth)]
)


@router.post("/chat")
def chat(req: schemas.ChatRequest, db: Session = Depends(get_db)):
    try:
        reply, _ = agent_service.chat([m.dict() for m in req.messages], req.mode, db)
        return {"reply": reply}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"对话失败: {e}")


@router.get("/config")
def get_config():
    cfg = agent_service.load_config()
    for k in ("api_key", "admin_password"):
        cfg.pop(k, None)
    return cfg


@router.post("/config")
def save_config(cfg: dict):
    existing = agent_service.load_config()
    if not cfg.get("api_key") and existing.get("api_key"):
        cfg["api_key"] = existing["api_key"]
    if "admin_password" not in cfg:
        cfg["admin_password"] = existing.get("admin_password", "")
    agent_service.save_config(cfg)
    return {"ok": True}


@router.post("/test")
def test_connection():
    cfg = agent_service.load_config()
    if not cfg.get("api_key"):
        raise HTTPException(400, "未配置 API Key")
    try:
        client = agent_service._client()
        resp = client.chat.completions.create(
            model=cfg["model"],
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        return {"ok": True, "reply": resp.choices[0].message.content}
    except Exception as e:
        raise HTTPException(400, f"连接失败: {e}")


# ---------------- 会话记忆 ----------------
@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    rows = (
        db.query(models.ChatSession)
        .order_by(models.ChatSession.updated_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "mode": s.mode,
            "summary_chars": len(s.summary or ""),
            "updated_at": s.updated_at.strftime("%m-%d %H:%M") if s.updated_at else "",
        }
        for s in rows
    ]


@router.post("/sessions")
def create_session(body: dict, db: Session = Depends(get_db)):
    s = models.ChatSession(
        title=body.get("title") or "新会话",
        mode=body.get("mode") or "internal",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "title": s.title, "mode": s.mode}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).delete()
    db.query(models.ChatSession).filter(models.ChatSession.id == session_id).delete()
    db.commit()
    return {"ok": True}


@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.id.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in rows]


@router.post("/sessions/{session_id}/messages")
def save_message(session_id: int, body: dict, db: Session = Depends(get_db)):
    db.add(
        models.ChatMessage(
            session_id=session_id,
            role=body.get("role", "user"),
            content=body.get("content", ""),
        )
    )
    db.commit()
    return {"ok": True}


# ---------------- 对外咨询（无鉴权，强制 external） ----------------
public_router = APIRouter(prefix="/api/public", tags=["public"])


@public_router.post("/chat")
def public_chat(req: schemas.ChatRequest, db: Session = Depends(get_db)):
    try:
        reply, _ = agent_service.chat([m.dict() for m in req.messages], "external", db)
        return {"reply": reply}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"对话失败: {e}")


@public_router.get("/info")
def public_info():
    cfg = agent_service.load_config()
    return {
        "school_name": cfg.get("school_name", "示例大学"),
        "counselor_name": cfg.get("counselor_name", "辅导员"),
        "agent_ready": bool(cfg.get("api_key")),
    }
