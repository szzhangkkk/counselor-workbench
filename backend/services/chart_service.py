from collections import Counter
from sqlalchemy.orm import Session
import models


def _count_by(db: Session, model, field: str, limit: int = 12) -> dict:
    rows = db.query(model).all()
    counter = Counter(getattr(r, field) or "未知" for r in rows)
    top = counter.most_common(limit)
    return {
        "labels": [k for k, v in top],
        "values": [v for k, v in top],
    }


def employment_chart(db: Session) -> dict:
    """就业去向分布 + 就业率"""
    status = _count_by(db, models.EmploymentRecord, "status")
    total = sum(status["values"])
    employed = sum(
        v
        for k, v in zip(status["labels"], status["values"])
        if k in ("已就业", "自主创业", "灵活就业", "参军")
    )
    return {
        "type": "employment_status",
        "title": "就业去向分布",
        "status_distribution": status,
        "total": total,
        "employed_count": employed,
        "employment_rate": round(employed / total * 100, 1) if total else 0,
        "region_distribution": _count_by(db, models.EmploymentRecord, "region"),
    }


def psychology_chart(db: Session) -> dict:
    """心理预警等级分布 + 类别分布"""
    return {
        "type": "psychology",
        "title": "心理台账概览",
        "level_distribution": _count_by(db, models.PsychologyRecord, "level"),
        "category_distribution": _count_by(db, models.PsychologyRecord, "category"),
        "follow_up_pending": db.query(models.PsychologyRecord)
        .filter(models.PsychologyRecord.next_follow_up != "")
        .count(),
    }


def talk_chart(db: Session) -> dict:
    """谈话类型分布"""
    return {
        "type": "talks",
        "title": "谈心谈话概览",
        "talk_type_distribution": _count_by(db, models.TalkRecord, "talk_type"),
    }


def grade_chart(db: Session) -> dict:
    """成绩分布直方图 + 平均分"""
    scores = [r.score for r in db.query(models.GradeRecord).all() if r.score]
    bins = ["0-59", "60-69", "70-79", "80-89", "90-100"]
    bucket = [0] * 5
    for s in scores:
        if s < 60:
            bucket[0] += 1
        elif s < 70:
            bucket[1] += 1
        elif s < 80:
            bucket[2] += 1
        elif s < 90:
            bucket[3] += 1
        else:
            bucket[4] += 1
    avg = round(sum(scores) / len(scores), 1) if scores else 0
    pass_rate = (
        round(sum(1 for s in scores if s >= 60) / len(scores) * 100, 1) if scores else 0
    )
    return {
        "type": "grades",
        "title": "学业成绩概览",
        "score_distribution": {"labels": bins, "values": bucket},
        "average": avg,
        "pass_rate": pass_rate,
        "total_records": len(scores),
    }


def attendance_chart(db: Session) -> dict:
    """出勤状态分布 + 旷课学生 Top"""
    att = _count_by(db, models.AttendanceRecord, "status")
    absences = (
        db.query(models.AttendanceRecord)
        .filter(models.AttendanceRecord.status.in_(["旷课", "迟到"]))
        .all()
    )
    top_counter = Counter((r.name, r.student_id) for r in absences)
    top = top_counter.most_common(8)
    return {
        "type": "attendance",
        "title": "课程考勤概览",
        "status_distribution": att,
        "absence_rate": round(
            (
                att["values"][att["labels"].index("旷课")]
                if "旷课" in att["labels"]
                else 0
            )
            / sum(att["values"])
            * 100,
            1,
        )
        if sum(att["values"])
        else 0,
        "top_absentees": [
            {"name": k[0], "student_id": k[1], "count": v} for k, v in top
        ],
    }


def overview_chart(db: Session) -> dict:
    """工作台总览卡片数据"""
    return {
        "students": db.query(models.Student).count(),
        "employment": db.query(models.EmploymentRecord).count(),
        "psychology": db.query(models.PsychologyRecord).count(),
        "talks": db.query(models.TalkRecord).count(),
        "grades": db.query(models.GradeRecord).count(),
        "attendance": db.query(models.AttendanceRecord).count(),
    }


CHART_BUILDERS = {
    "overview": overview_chart,
    "employment": employment_chart,
    "psychology": psychology_chart,
    "talks": talk_chart,
    "grades": grade_chart,
    "attendance": attendance_chart,
}


def build_chart(ledger_type: str, db: Session) -> dict:
    fn = CHART_BUILDERS.get(ledger_type)
    if not fn:
        raise ValueError(f"未知图表类型: {ledger_type}")
    return fn(db)
