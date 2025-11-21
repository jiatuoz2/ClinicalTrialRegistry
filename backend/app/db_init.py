from models import Base
from sqlmodel import SQLModel, create_engine
import os

# DB_PATH = os.path.join(os.path.dirname(__file__), "..", "demo.sqlite3")
# _engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

url = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:zoujiatuo@localhost:5432/clinical")
_engine = create_engine(url, pool_pre_ping=True)

def get_engine():
    return _engine

def main():
    engine = get_engine()
    Base.metadata.create_all(engine)
    print("DB initialized")

if __name__ == "__main__":
    main()
