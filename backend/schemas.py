from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class StudentIn(BaseModel):
    student_id: str = ""
    name: str = ""
    gender: Optional[str] = ""
    major: Optional[str] = ""
    class_name: Optional[str] = ""
    grade: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    dormitory: Optional[str] = ""
    political_status: Optional[str] = ""
    hometown: Optional[str] = ""
    birth_date: Optional[str] = ""
    guardian_name: Optional[str] = ""
    guardian_phone: Optional[str] = ""
    special_info: Optional[str] = ""


class EmploymentIn(BaseModel):
    student_id: str = ""
    name: str = ""
    class_name: Optional[str] = ""
    status: Optional[str] = ""
    company: Optional[str] = ""
    position: Optional[str] = ""
    salary: Optional[str] = ""
    offer_date: Optional[str] = ""
    contract_type: Optional[str] = ""
    region: Optional[str] = ""
    remarks: Optional[str] = ""


class PsychologyIn(BaseModel):
    student_id: str = ""
    name: str = ""
    class_name: Optional[str] = ""
    assess_date: Optional[str] = ""
    level: Optional[str] = ""
    category: Optional[str] = ""
    symptoms: Optional[str] = ""
    intervention: Optional[str] = ""
    counselor: Optional[str] = ""
    next_follow_up: Optional[str] = ""
    remarks: Optional[str] = ""


class TalkIn(BaseModel):
    student_id: str = ""
    name: str = ""
    class_name: Optional[str] = ""
    talk_date: Optional[str] = ""
    talk_type: Optional[str] = ""
    topic: Optional[str] = ""
    content: Optional[str] = ""
    conclusion: Optional[str] = ""
    counselor: Optional[str] = ""


class GradeIn(BaseModel):
    student_id: str = ""
    name: str = ""
    class_name: Optional[str] = ""
    semester: Optional[str] = ""
    course_name: Optional[str] = ""
    course_code: Optional[str] = ""
    credits: Optional[float] = 0
    score: Optional[float] = 0
    grade_point: Optional[float] = 0
    rank: Optional[int] = None
    make_up_score: Optional[float] = None


class AttendanceIn(BaseModel):
    student_id: str = ""
    name: str = ""
    class_name: Optional[str] = ""
    course_name: Optional[str] = ""
    date: Optional[str] = ""
    period: Optional[str] = ""
    status: Optional[str] = ""
    reason: Optional[str] = ""
    recorder: Optional[str] = ""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    mode: str = "auto"  # internal / external / auto
