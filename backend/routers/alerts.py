from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from routers.auth import require_auth

router = APIRouter(
    prefix="/api/alerts", tags=["alerts"], dependencies=[Depends(require_auth)]
)


@router.get("")
def list_alerts(read: str = "all", limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(models.AlertNotification)
    if read == "unread":
        q = q.filter(models.AlertNotification.read == 0)
    elif read == "read":
        q = q.filter(models.AlertNotification.read == 1)
    rows = q.order_by(models.AlertNotification.id.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "student_name": a.student_name,
            "distress_type": a.distress_type,
            "severity": a.severity,
            "evidence": a.evidence,
            "suggestion": a.suggestion,
            "session_id": a.session_id,
            "read": a.read,
            "created_at": a.created_at.strftime("%m-%d %H:%M") if a.created_at else "",
        }
        for a in rows
    ]


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db)):
    n = (
        db.query(models.AlertNotification)
        .filter(models.AlertNotification.read == 0)
        .count()
    )
    return {"count": n}


@router.post("/{alert_id}/read")
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(models.AlertNotification).get(alert_id)
    if not a:
        raise HTTPException(404, "通知不存在")
    a.read = 1
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(models.AlertNotification).filter(
        models.AlertNotification.read == 0
    ).update({"read": 1})
    db.commit()
    return {"ok": True}
