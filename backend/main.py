import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import models
from database import Base, engine, DATA_DIR, auto_migrate, SessionLocal
from routers import (
    ledgers,
    files,
    charts,
    agent,
    auth,
    students,
    alerts,
    student_accounts,
    counselors,
)

auto_migrate()
Base.metadata.create_all(bind=engine)


def seed_test_account():
    """首次部署时预置测试辅导员账号：1403946941 / 1403946941 / 张辅导"""
    db: Session = SessionLocal()
    try:
        if db.query(models.CounselorAccount).count() == 0:
            db.add(
                models.CounselorAccount(
                    username="1403946941",
                    password="1403946941",
                    name="张辅导",
                    email="",
                    avatar="张",
                    avatar_color="#5b8cff",
                    theme="dark",
                    is_admin=1,
                    enabled=1,
                )
            )
            db.commit()
            print("[seed] 预置测试辅导员账号已创建：1403946941 / 1403946941 (张辅导)")
    finally:
        db.close()


seed_test_account()

app = FastAPI(title="辅导员 Agent 工作台", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 公开/免鉴权路由
app.include_router(
    counselors.router
)  # 含 status / register / login / logout / avatar 上传 等接口
app.include_router(counselors.avatar_router)  # 头像静态文件读取
app.include_router(agent.public_router)
app.include_router(auth.router)
app.include_router(students.router)
# 鉴权路由 -- 注意：原 ledgers/files/charts/agent/student_accounts/alerts 用 admin token
# 现在改为既接受 admin token（向后兼容）又接受 counselor token
app.include_router(ledgers.router)
app.include_router(files.router)
app.include_router(charts.router)
app.include_router(agent.router)
app.include_router(student_accounts.router)
app.include_router(alerts.router)


@app.get("/api/health")
def health():
    return {"ok": True, "app": "辅导员工作台"}


FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"
)
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8321)
