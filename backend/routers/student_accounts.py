from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from routers.auth import require_auth

router = APIRouter(
    prefix="/api/student-accounts",
    tags=["student-accounts"],
    dependencies=[Depends(require_auth)],
)


@router.get("")
def list_accounts(db: Session = Depends(get_db)):
    rows = (
        db.query(models.StudentAccount).order_by(models.StudentAccount.id.desc()).all()
    )
    profiles = {p.student_id: p for p in db.query(models.StudentProfile).all()}
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "name": a.name,
            "class_name": a.class_name,
            "major": a.major,
            "grade": a.grade,
            "enabled": a.enabled,
            "password": a.password,
            "hobbies": profiles[a.student_id].hobbies
            if a.student_id in profiles
            else "",
            "interests": profiles[a.student_id].interests
            if a.student_id in profiles
            else "",
            "distressed": profiles[a.student_id].distressed
            if a.student_id in profiles
            else 0,
            "last_distress_type": profiles[a.student_id].last_distress_type
            if a.student_id in profiles
            else "",
        }
        for a in rows
    ]


@router.post("")
def create_account(body: dict, db: Session = Depends(get_db)):
    sid = (body.get("student_id") or "").strip()
    if not sid or not body.get("name"):
        raise HTTPException(400, "学号和姓名必填")
    # 关联学生信息台账填充班级专业年级
    student = db.query(models.Student).filter(models.Student.student_id == sid).first()
    acc = models.StudentAccount(
        student_id=sid,
        name=body["name"],
        password=(body.get("password") or sid),  # 默认密码即学号
        class_name=body.get("class_name") or (student.class_name if student else ""),
        major=body.get("major") or (student.major if student else ""),
        grade=body.get("grade") or (student.grade if student else ""),
        enabled=1 if body.get("enabled", True) else 0,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    # 自动初始化画像
    db.add(models.StudentProfile(student_id=sid))
    db.commit()
    return {"id": acc.id, "password": acc.password}


@router.put("/{account_id}")
def update_account(account_id: int, body: dict, db: Session = Depends(get_db)):
    acc = db.query(models.StudentAccount).get(account_id)
    if not acc:
        raise HTTPException(404, "账号不存在")
    for k in ("name", "password", "class_name", "major", "grade"):
        if k in body:
            setattr(acc, k, body[k])
    if "enabled" in body:
        acc.enabled = 1 if body["enabled"] else 0
    db.commit()
    return {"ok": True}


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(models.StudentAccount).get(account_id)
    if not acc:
        raise HTTPException(404, "账号不存在")
    db.delete(acc)
    db.commit()
    return {"ok": True}


@router.post("/batch")
def batch_create(body: dict, db: Session = Depends(get_db)):
    """批量按学生信息台账生成账号：{class_name 或 grade} 全部建"""
    q = db.query(models.Student)
    if body.get("class_name"):
        q = q.filter(models.Student.class_name == body["class_name"])
    elif body.get("grade"):
        q = q.filter(models.Student.grade == body["grade"])
    else:
        raise HTTPException(400, "请指定 class_name 或 grade")
    students = q.all()
    created = 0
    for s in students:
        existing = (
            db.query(models.StudentAccount)
            .filter(models.StudentAccount.student_id == s.student_id)
            .first()
        )
        if existing:
            continue
        db.add(
            models.StudentAccount(
                student_id=s.student_id,
                name=s.name,
                password=s.student_id,
                class_name=s.class_name,
                major=s.major,
                grade=s.grade,
                enabled=1,
            )
        )
        db.add(models.StudentProfile(student_id=s.student_id))
        created += 1
    db.commit()
    return {"ok": True, "created": created}
