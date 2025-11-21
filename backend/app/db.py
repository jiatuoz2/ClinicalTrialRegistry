# backend/app/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base  # your models file

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:zoujiatuo@localhost:5432/clinical",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    # optional: you can call this at startup instead of using a separate db_init.py
    Base.metadata.create_all(bind=engine)
    print("DB initialized")


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
