from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Any

import models
import schemas
from database import get_db
from routers.auth import require_auth

router = APIRouter(
    prefix="/api/ledgers", tags=["ledgers"], dependencies=[Depends(require_auth)]
)

TABLE_CONFIG = {
    "students": (models.Student, schemas.StudentIn, "姓名"),
    "employment": (models.EmploymentRecord, schemas.EmploymentIn, "姓名"),
    "psychology": (models.PsychologyRecord, schemas.PsychologyIn, "姓名"),
    "talks": (models.TalkRecord, schemas.TalkIn, "姓名"),
    "grades": (models.GradeRecord, schemas.GradeIn, "姓名"),
    "attendance": (models.AttendanceRecord, schemas.AttendanceIn, "姓名"),
}


def _searchable_fields(model):
    return [
        c.name
        for c in model.__table__.columns
        if c.name
        in (
            "name",
            "student_id",
            "class_name",
            "course_name",
            "status",
            "level",
            "topic",
            "company",
            "semester",
        )
    ]


@router.get("/{ledger_type}")
def list_records(
    ledger_type: str,
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
):
    if ledger_type not in TABLE_CONFIG:
        raise HTTPException(404, "未知台账类型")
    model, _, _ = TABLE_CONFIG[ledger_type]
    q = db.query(model)
    if keyword:
        fields = _searchable_fields(model)
        q = q.filter(or_(*[getattr(model, f).like(f"%{keyword}%") for f in fields]))
    rows = q.order_by(model.id.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            **{
                c.name: getattr(r, c.name)
                for c in model.__table__.columns
                if c.name != "id"
            },
        }
        for r in rows
    ]


@router.post("/{ledger_type}")
def create_record(ledger_type: str, payload: Any, db: Session = Depends(get_db)):
    if ledger_type not in TABLE_CONFIG:
        raise HTTPException(404, "未知台账类型")
    model, schema, _ = TABLE_CONFIG[ledger_type]
    data = payload.dict() if hasattr(payload, "dict") else dict(payload)
    rec = model(**{k: v for k, v in data.items() if hasattr(model, k)})
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id}


@router.put("/{ledger_type}/{record_id}")
def update_record(
    ledger_type: str, record_id: int, payload: Any, db: Session = Depends(get_db)
):
    if ledger_type not in TABLE_CONFIG:
        raise HTTPException(404, "未知台账类型")
    model, _, _ = TABLE_CONFIG[ledger_type]
    rec = db.query(model).get(record_id)
    if not rec:
        raise HTTPException(404, "记录不存在")
    data = payload.dict() if hasattr(payload, "dict") else dict(payload)
    for k, v in data.items():
        if hasattr(model, k):
            setattr(rec, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/{ledger_type}/{record_id}")
def delete_record(ledger_type: str, record_id: int, db: Session = Depends(get_db)):
    if ledger_type not in TABLE_CONFIG:
        raise HTTPException(404, "未知台账类型")
    model, _, _ = TABLE_CONFIG[ledger_type]
    rec = db.query(model).get(record_id)
    if not rec:
        raise HTTPException(404, "记录不存在")
    db.delete(rec)
    db.commit()
    return {"ok": True}


@router.post("/{ledger_type}/bulk")
def bulk_create(ledger_type: str, payload: List[dict], db: Session = Depends(get_db)):
    if ledger_type not in TABLE_CONFIG:
        raise HTTPException(404, "未知台账类型")
    model, _, _ = TABLE_CONFIG[ledger_type]
    for data in payload:
        rec = model(**{k: v for k, v in data.items() if hasattr(model, k)})
        db.add(rec)
    db.commit()
    return {"ok": True, "count": len(payload)}
