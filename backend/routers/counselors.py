import re
import os
import secrets
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

import models
from database import get_db, DATA_DIR, auto_migrate
from services import agent_service

router = APIRouter(prefix="/api/counselors", tags=["counselors"])

# counselor token (string) -> account_id
_counselor_tokens: dict = {}

AVATAR_DIR = os.path.join(DATA_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
ALLOWED_IMG_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5MB


def _is_email(s: str) -> bool:
    return bool(re.match(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", s or ""))


def _any_counselor_exists(db: Session) -> bool:
    return db.query(models.CounselorAccount).count() > 0


@router.get("/status")
def status(
    x_auth_token: Optional[str] = Header(default=None), db: Session = Depends(get_db)
):
    """返回：是否还需要首次注册 / 当前是否登录 / 当前账号信息"""
    has_any = _any_counselor_exists(db)
    aid = _counselor_tokens.get(x_auth_token or "")
    acc = db.query(models.CounselorAccount).get(aid) if aid else None
    return {
        "need_setup": not has_any,
        "logged_in": bool(acc),
        "account": {
            "id": acc.id,
            "username": acc.username,
            "name": acc.name,
            "email": acc.email,
            "avatar": acc.avatar,
            "avatar_color": acc.avatar_color,
            "theme": acc.theme,
            "is_admin": acc.is_admin,
        }
        if acc
        else None,
    }


@router.post("/register")
def register(body: dict, db: Session = Depends(get_db)):
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()

    if not username or not password or not name:
        raise HTTPException(400, "账号、密码、姓名均为必填")
    if len(password) < 4:
        raise HTTPException(400, "密码至少 4 位")
    if email and not _is_email(email):
        raise HTTPException(400, "邮箱格式不正确")
    if (
        db.query(models.CounselorAccount)
        .filter(models.CounselorAccount.username == username)
        .first()
    ):
        raise HTTPException(400, "该账号已被使用，换一个吧")

    is_first = not _any_counselor_exists(db)
    acc = models.CounselorAccount(
        username=username,
        password=password,
        name=name,
        email=email,
        avatar=name[0] if name else "辅",
        avatar_color="#5b8cff",
        theme="dark",
        is_admin=1 if is_first else 0,
        enabled=1,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    token = secrets.token_hex(16)
    _counselor_tokens[token] = acc.id
    acc.last_login_at = datetime.now()
    db.commit()
    return {
        "ok": True,
        "token": token,
        "account": {
            "id": acc.id,
            "username": acc.username,
            "name": acc.name,
            "email": acc.email,
            "avatar": acc.avatar,
            "avatar_color": acc.avatar_color,
            "theme": acc.theme,
            "is_admin": acc.is_admin,
        },
    }


@router.post("/login")
def login(body: dict, db: Session = Depends(get_db)):
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()
    if not username or not password:
        raise HTTPException(400, "请填写账号密码")
    acc = (
        db.query(models.CounselorAccount)
        .filter(
            models.CounselorAccount.username == username,
            models.CounselorAccount.password == password,
            models.CounselorAccount.enabled == 1,
        )
        .first()
    )
    if not acc:
        raise HTTPException(401, "账号或密码不正确")
    token = secrets.token_hex(16)
    _counselor_tokens[token] = acc.id
    acc.last_login_at = datetime.now()
    db.commit()
    return {
        "ok": True,
        "token": token,
        "account": {
            "id": acc.id,
            "username": acc.username,
            "name": acc.name,
            "email": acc.email,
            "avatar": acc.avatar,
            "avatar_color": acc.avatar_color,
            "theme": acc.theme,
            "is_admin": acc.is_admin,
        },
    }


@router.post("/logout")
def logout(x_auth_token: Optional[str] = Header(default=None)):
    _counselor_tokens.pop(x_auth_token or "", None)
    return {"ok": True}


def require_counselor(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Counselor-Token"),
    db: Session = Depends(get_db),
) -> models.CounselorAccount:
    aid = _counselor_tokens.get(x_auth_token or "")
    if not aid:
        raise HTTPException(401, "请先登录辅导员账号")
    acc = db.query(models.CounselorAccount).get(aid)
    if not acc or not acc.enabled:
        raise HTTPException(401, "账号已停用")
    return acc


@router.put("/me")
def update_me(
    body: dict,
    db: Session = Depends(get_db),
    acc: models.CounselorAccount = Depends(require_counselor),
):
    """修改自己的资料/头像/主题/邮箱；改密码需原密码验证"""
    if "name" in body:
        acc.name = body["name"]
    if "email" in body:
        if body["email"] and not _is_email(body["email"]):
            raise HTTPException(400, "邮箱格式不正确")
        acc.email = body["email"]
    if "avatar" in body:
        acc.avatar = body["avatar"]
    if "avatar_color" in body:
        acc.avatar_color = body["avatar_color"]
    if "theme" in body and body["theme"] in (
        "dark",
        "warm",
        "green",
        "purple",
        "light",
    ):
        acc.theme = body["theme"]
    if "new_password" in body and body["new_password"]:
        if body.get("old_password") != acc.password:
            raise HTTPException(400, "原密码不正确")
        if len(body["new_password"]) < 4:
            raise HTTPException(400, "新密码至少 4 位")
        acc.password = body["new_password"]
    db.commit()
    return {
        "ok": True,
        "account": {
            "id": acc.id,
            "username": acc.username,
            "name": acc.name,
            "email": acc.email,
            "avatar": acc.avatar,
            "avatar_color": acc.avatar_color,
            "theme": acc.theme,
            "is_admin": acc.is_admin,
        },
    }


@router.get("/list")
def list_counselors(
    db: Session = Depends(get_db),
    acc: models.CounselorAccount = Depends(require_counselor),
):
    rows = (
        db.query(models.CounselorAccount)
        .order_by(models.CounselorAccount.id.asc())
        .all()
    )
    return [
        {
            "id": a.id,
            "username": a.username,
            "name": a.name,
            "email": a.email,
            "avatar": a.avatar,
            "avatar_color": a.avatar_color,
            "theme": a.theme,
            "is_admin": a.is_admin,
            "enabled": a.enabled,
            "created_at": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            "last_login_at": a.last_login_at.strftime("%m-%d %H:%M")
            if a.last_login_at
            else "",
        }
        for a in rows
    ]


@router.put("/{cid}/toggle")
def toggle_counselor(
    cid: int,
    db: Session = Depends(get_db),
    acc: models.CounselorAccount = Depends(require_counselor),
):
    if not acc.is_admin:
        raise HTTPException(403, "仅管理员可启用/停用其它辅导员")
    target = db.query(models.CounselorAccount).get(cid)
    if not target:
        raise HTTPException(404, "账号不存在")
    if target.id == acc.id:
        raise HTTPException(400, "不能停用自己")
    target.enabled = 0 if target.enabled else 1
    db.commit()
    return {"ok": True, "enabled": target.enabled}


@router.delete("/{cid}")
def delete_counselor(
    cid: int,
    db: Session = Depends(get_db),
    acc: models.CounselorAccount = Depends(require_counselor),
):
    if not acc.is_admin:
        raise HTTPException(403, "仅管理员可删除辅导员")
    target = db.query(models.CounselorAccount).get(cid)
    if not target:
        raise HTTPException(404, "账号不存在")
    if target.id == acc.id:
        raise HTTPException(400, "不能删除自己")
    db.delete(target); db.commit()
    return {"ok": True}


# ---------------- 头像上传与读取 ----------------
@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...),
                         db: Session = Depends(get_db),
                         acc: models.CounselorAccount = Depends(require_counselor)):
    """上传照片作为头像。返回新的 avatar 路径。"""
    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(400, f"图片过大，最大 {MAX_AVATAR_BYTES // 1024 // 1024}MB")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMG_EXT:
        raise HTTPException(400, f"仅支持图片格式：{', '.join(ALLOWED_IMG_EXT)}")
    # 删除旧头像文件（若是上传的图片）
    if acc.avatar and acc.avatar.startswith("/api/avatars/"):
        old = os.path.join(AVATAR_DIR, os.path.basename(acc.avatar))
        try:
            if os.path.exists(old): os.remove(old)
        except Exception: pass
    filename = f"{acc.id}_{secrets.token_hex(8)}{ext}"
    path = os.path.join(AVATAR_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)
    acc.avatar = f"/api/avatars/{filename}"
    db.commit()
    return {"ok": True, "avatar": acc.avatar}


@router.post("/avatar/reset")
def reset_avatar(body: dict = None,
                  db: Session = Depends(get_db),
                  acc: models.CounselorAccount = Depends(require_counselor)):
    """取消照片头像，改回文字。"""
    if acc.avatar and acc.avatar.startswith("/api/avatars/"):
        old = os.path.join(AVATAR_DIR, os.path.basename(acc.avatar))
        try:
            if os.path.exists(old): os.remove(old)
        except Exception: pass
    new_char = (body or {}).get("avatar") or acc.name[:1] if acc.name else "辅"
    acc.avatar = new_char
    db.commit()
    return {"ok": True, "avatar": acc.avatar}


# 公开读取头像（任何人都能 GET，仅文件名不可枚举）
avatar_router = APIRouter(prefix="/api/avatars", tags=["avatars"])


@avatar_router.get("/{filename}")
def get_avatar(filename: str):
    # 防越权：只允许 avatars 目录下的文件名，不允许 ../ 路径穿越
    safe = os.path.basename(filename)
    path = os.path.join(AVATAR_DIR, safe)
    if not os.path.exists(path):
        raise HTTPException(404, "头像不存在")
    ext = os.path.splitext(safe)[1].lower()
    media = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    }.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media)
