import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"
)
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "workbench.db")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def auto_migrate():
    """对已有 SQLite 表自动追加缺失列与索引（不删除数据）。"""
    insp = inspect(engine)
    Base.metadata.create_all(bind=engine, checkfirst=True)
    for table in Base.metadata.sorted_tables:
        if not insp.has_table(table.name):
            continue
        existing = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in existing:
                continue
            type_name = col.type.compile(dialect=engine.dialect)
            if col.nullable:
                default_clause = " DEFAULT NULL"
            else:
                if "INT" in type_name.upper():
                    default_clause = " DEFAULT 0"
                else:
                    default_clause = " DEFAULT ''"
            sql = text(
                f"ALTER TABLE {table.name} ADD COLUMN {col.name} {type_name}{default_clause}"
            )
            with engine.begin() as conn:
                conn.execute(sql)
        existing_idx = {idx["name"] for idx in insp.get_indexes(table.name)}
        for idx in table.indexes:
            if idx.name in existing_idx:
                continue
            cols = ", ".join(f'"{c.name}"' for c in idx.columns)
            sql = text(
                f'CREATE INDEX IF NOT EXISTS "{idx.name}" ON {table.name} ({cols})'
            )
            with engine.begin() as conn:
                conn.execute(sql)
