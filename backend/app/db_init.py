from sqlmodel import SQLModel
from db import get_engine
from models.models import Patient, Trial, AccessLog, IntegrityEvent, Base

def main():
    engine = get_engine()
    Base.metadata.create_all(engine)
    print("DB initialized")

if __name__ == "__main__":
    main()
