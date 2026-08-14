from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from datetime import datetime
from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    name = Column(String(64), index=True)
    gender = Column(String(8))
    major = Column(String(64))
    class_name = Column(String(64), index=True)
    grade = Column(String(8))
    phone = Column(String(32))
    email = Column(String(64))
    dormitory = Column(String(64))
    political_status = Column(String(16))
    hometown = Column(String(64))
    birth_date = Column(String(16))
    guardian_name = Column(String(32))
    guardian_phone = Column(String(32))
    special_info = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class EmploymentRecord(Base):
    __tablename__ = "employment"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    name = Column(String(64))
    class_name = Column(String(64), index=True)
    status = Column(String(32), index=True)  # 已就业/待就业/考研/考公/出国/自主创业
    company = Column(String(128))
    position = Column(String(64))
    salary = Column(String(32))
    offer_date = Column(String(16))
    contract_type = Column(String(32))
    region = Column(String(64))
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class PsychologyRecord(Base):
    __tablename__ = "psychology"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    name = Column(String(64))
    class_name = Column(String(64), index=True)
    assess_date = Column(String(16))
    level = Column(String(16), index=True)  # 正常/关注/预警/危机
    category = Column(String(64))
    symptoms = Column(Text)
    intervention = Column(Text)
    counselor = Column(String(32))
    next_follow_up = Column(String(16))
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class TalkRecord(Base):
    __tablename__ = "talks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    name = Column(String(64))
    class_name = Column(String(64), index=True)
    talk_date = Column(String(16))
    talk_type = Column(String(32), index=True)
    topic = Column(String(128))
    content = Column(Text)
    conclusion = Column(Text)
    counselor = Column(String(32))
    created_at = Column(DateTime, default=datetime.now)


class GradeRecord(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    name = Column(String(64))
    class_name = Column(String(64), index=True)
    semester = Column(String(16), index=True)
    course_name = Column(String(64), index=True)
    course_code = Column(String(32))
    credits = Column(Float)
    score = Column(Float)
    grade_point = Column(Float)
    rank = Column(Integer)
    make_up_score = Column(Float)
    created_at = Column(DateTime, default=datetime.now)


class AttendanceRecord(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    name = Column(String(64))
    class_name = Column(String(64), index=True)
    course_name = Column(String(64))
    date = Column(String(16))
    period = Column(String(16))
    status = Column(String(16), index=True)  # 出勤/迟到/早退/请假/旷课
    reason = Column(Text)
    recorder = Column(String(32))
    created_at = Column(DateTime, default=datetime.now)


class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    ledger_type = Column(String(32), index=True)
    filename = Column(String(256))
    file_type = Column(String(16))
    rows_imported = Column(Integer)
    rows_skipped = Column(Integer)
    detail = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128))
    mode = Column(String(16), default="internal")  # internal/external/student
    summary = Column(Text, default="")  # 长上下文 rolling summary
    student_account_id = Column(
        Integer, index=True, nullable=True
    )  # student 模式关联学生账号
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    role = Column(String(16))
    content = Column(Text)
    meta_json = Column(Text, default="")  # 工具调用结果 / 预警标记等
    created_at = Column(DateTime, default=datetime.now)


class StudentAccount(Base):
    """学生登录账号：辅导员预先发放的学号 + 密码"""

    __tablename__ = "student_accounts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)  # 学号，关联学生信息台账
    name = Column(String(64))
    password = Column(String(64))  # 明文简单密码（本地内部部署）
    class_name = Column(String(64))
    major = Column(String(64))
    grade = Column(String(8))
    enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)


class StudentProfile(Base):
    """学生画像：从对话中动态学习（爱好 / 选课意向 / 状态等）"""

    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True, unique=True)
    hobbies = Column(Text, default="")  # 爱好（逗号分隔）
    interests = Column(Text, default="")  # 学术/职业兴趣
    preferred_topics = Column(Text, default="")  # 喜欢聊的话题
    personality = Column(Text, default="")  # 性格画像
    distressed = Column(Integer, default=0)  # 当前是否困难状态 0/1
    last_distress_type = Column(
        String(32), default=""
    )  # 最近压力类型: 学业/家庭/经济/心理
    last_updated_by_agent = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class AlertNotification(Base):
    """预警通知：发送给辅导员顶栏铃铛"""

    __tablename__ = "alert_notifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(32), index=True)
    student_name = Column(String(64))
    distress_type = Column(String(32), index=True)
    severity = Column(String(16), default="关注")
    evidence = Column(Text)
    suggestion = Column(Text)
    session_id = Column(Integer, nullable=True)
    read = Column(Integer, default=0, index=True)
    created_at = Column(DateTime, default=datetime.now, index=True)


class CounselorAccount(Base):
    """辅导员账号：username + password + name + email + avatar + theme"""

    __tablename__ = "counselor_accounts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), index=True, unique=True)
    password = Column(String(128))
    name = Column(String(64))
    email = Column(String(128), default="")
    avatar = Column(String(256), default="辅")  # 单字 / 或 "/api/avatars/xxx.jpg" 路径
    avatar_color = Column(String(16), default="#5b8cff")
    theme = Column(String(16), default="dark")  # dark/warm/green/purple/light
    is_admin = Column(Integer, default=0)
    enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)
    last_login_at = Column(DateTime, nullable=True)
