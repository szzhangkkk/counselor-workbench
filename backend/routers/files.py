from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db, UPLOAD_DIR
from routers.auth import require_auth
from services.file_parser import parse_file, FileParserError

router = APIRouter(
    prefix="/api/files", tags=["files"], dependencies=[Depends(require_auth)]
)

LEDGER_MODEL_MAP = {
    "students": models.Student,
    "employment": models.EmploymentRecord,
    "psychology": models.PsychologyRecord,
    "talks": models.TalkRecord,
    "grades": models.GradeRecord,
    "attendance": models.AttendanceRecord,
}


@router.post("/import/{ledger_type}")
async def import_file(
    ledger_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if ledger_type not in LEDGER_MODEL_MAP:
        raise HTTPException(404, "未知台账类型")

    content = await file.read()
    filename = file.filename or "upload"
    try:
        records = parse_file(content, filename, ledger_type)
    except FileParserError as e:
        raise HTTPException(400, str(e))

    if not records:
        raise HTTPException(400, "解析到 0 条有效记录，请检查表头列名或必填字段")

    model = LEDGER_MODEL_MAP[ledger_type]
    skipped = 0
    imported = 0
    details = []
    for rec in records:
        try:
            obj = model(**{k: v for k, v in rec.items() if hasattr(model, k)})
            db.add(obj)
            imported += 1
        except Exception as e:
            skipped += 1
            details.append(f"跳过: {rec.get('name', '')} - {e}")

    db.add(
        models.ImportLog(
            ledger_type=ledger_type,
            filename=filename,
            file_type=file.content_type or "",
            rows_imported=imported,
            rows_skipped=skipped,
            detail="\n".join(details[:20]),
        )
    )
    db.commit()

    return {
        "ok": True,
        "imported": imported,
        "skipped": skipped,
        "filename": filename,
        "sample": records[:3],
    }


@router.get("/history")
def import_history(db: Session = Depends(get_db)):
    rows = (
        db.query(models.ImportLog).order_by(models.ImportLog.id.desc()).limit(50).all()
    )
    return [
        {
            "id": r.id,
            "ledger_type": r.ledger_type,
            "filename": r.filename,
            "file_type": r.file_type,
            "rows_imported": r.rows_imported,
            "rows_skipped": r.rows_skipped,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")
            if r.created_at
            else "",
        }
        for r in rows
    ]
