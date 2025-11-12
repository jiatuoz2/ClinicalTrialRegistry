from sqlmodel import SQLModel, create_engine
from models import Patient, Trial, AccessLog, IntegrityEvent
import os

# DB_PATH = os.path.join(os.path.dirname(__file__), "..", "demo.sqlite3")
# _engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

url = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:zoujiatuo@localhost:5432/clinical")
_engine = create_engine(url, pool_pre_ping=True)

def get_engine():
    return _engine