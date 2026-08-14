import secrets
from fastapi import APIRouter, Header, HTTPException

from services import agent_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

_tokens: set = set()


def is_auth_enabled() -> bool:
    """如果系统中已有辅导员账号，则启用账号登录模式；否则全部开放"""
    from database import SessionLocal
    import models

    with SessionLocal() as db:
        return db.query(models.CounselorAccount).count() > 0


def require_auth(
    x_auth_token: str = Header(default=""), x_counselor_token: str = Header(default="")
):
    """接受 admin 旧 token 或 counselor 新 token"""
    if x_auth_token and x_auth_token in _tokens:
        return True
    if x_counselor_token:
        from routers.counselors import _counselor_tokens
        from database import SessionLocal
        import models

        cid = _counselor_tokens.get(x_counselor_token)
        if cid:
            with SessionLocal() as db:
                acc = db.query(models.CounselorAccount).get(cid)
                if acc and acc.enabled:
                    return True
                raise HTTPException(401, "账号已停用")
    raise HTTPException(401, "需要登录辅导员账号")


@router.get("/status")
def status():
    return {"enabled": is_auth_enabled()}


@router.post("/login")
def login(body: dict):
    cfg = agent_service.load_config()
    password = cfg.get("admin_password", "")
    if not password:
        return {"ok": True, "token": "", "enabled": False}
    if body.get("password") == password:
        token = secrets.token_hex(16)
        _tokens.add(token)
        return {"ok": True, "token": token, "enabled": True}
    raise HTTPException(401, "密码错误")


@router.post("/logout")
def logout(x_auth_token: str = Header(default="")):
    _tokens.discard(x_auth_token)
    return {"ok": True}
