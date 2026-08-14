from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import require_auth
from services.chart_service import build_chart, overview_chart

router = APIRouter(
    prefix="/api/charts", tags=["charts"], dependencies=[Depends(require_auth)]
)

VALID = {"overview", "employment", "psychology", "talks", "grades", "attendance"}


@router.get("/{ledger_type}")
def get_chart(ledger_type: str, db: Session = Depends(get_db)):
    if ledger_type not in VALID:
        raise HTTPException(404, "未知图表类型")
    return build_chart(ledger_type, db)


@router.get("")
def get_all_charts(db: Session = Depends(get_db)):
    return {
        "overview": overview_chart(db),
        "employment": build_chart("employment", db),
        "psychology": build_chart("psychology", db),
        "talks": build_chart("talks", db),
        "grades": build_chart("grades", db),
        "attendance": build_chart("attendance", db),
    }
