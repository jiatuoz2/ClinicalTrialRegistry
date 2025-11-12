import os
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy import create_engine
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, unique=True, index=True)  # e.g. blockchain address
    display_name = Column(String, nullable=True)
    consent_active = Column(Boolean, default=False)

    trials = relationship("Trial", back_populates="patient")

    def __repr__(self):
        return f"<Patient(address={self.address}, consent_active={self.consent_active})>"

class Trial(Base):
    __tablename__ = "trials"

    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(String, unique=True, index=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # Foreign key to patient
    patient_id = Column(Integer, ForeignKey("patients.id"))
    patient = relationship("Patient", back_populates="trials")

    approved_researcher = Column(Boolean, default=False)
    approved_hospital = Column(Boolean, default=False)
    approved_irb = Column(Boolean, default=False)
    finalized = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Trial(trial_id={self.trial_id}, finalized={self.finalized})>"

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_address = Column(String, index=True)
    actor = Column(String, nullable=True)
    purpose = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=False)

    def __repr__(self):
        return f"<AccessLog(patient={self.patient_address}, success={self.success})>"

class IntegrityEvent(Base):
    __tablename__ = "integrity_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, index=True)   # e.g. "Mismatch", "Tampering"
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<IntegrityEvent(type={self.event_type}, time={self.timestamp})>"

# def get_engine():
#     """
#     Returns a SQLite engine pointing to demo.sqlite3 in backend/
#     """
#     return create_engine(
#         "sqlite:///./demo.sqlite3",
#         connect_args={"check_same_thread": False}
#     )

# def get_engine():
#     url = os.getenv(
#         "DATABASE_URL",
#         "postgresql+psycopg://app:app_pw@localhost:5432/clinical"
#     )
#     # pool_pre_ping avoids stale connections after restarts
#     return create_engine(url, pool_pre_ping=True)