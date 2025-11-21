from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# -----------------------
# Patients
# -----------------------

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)

    # Shown to hospital, not necessarily globally unique but usually is
    study_id = Column(String, unique=True, index=True, nullable=True)

    # On-chain identity
    wallet_address = Column(String, unique=True, index=True, nullable=False)

    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)

    # Off-chain initial record
    initial_record_url = Column(Text, nullable=True)
    initial_record_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    self_reports = relationship(
        "SelfReport", back_populates="patient", cascade="all, delete-orphan"
    )
    access_logs = relationship(
        "AccessLog", back_populates="patient"
    )

    def __repr__(self):
        return f"<Patient(id={self.id}, study_id={self.study_id}, wallet={self.wallet_address})>"


# -----------------------
# Users (Hospital staff)
# -----------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    access_logs = relationship("AccessLog", back_populates="hospital_user")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"


# -----------------------
# Self_reports — Patient Self-Reported Data
# -----------------------

class SelfReport(Base):
    __tablename__ = "self_reports"

    id = Column(Integer, primary_key=True, index=True)

    # FK to patients.id
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient = relationship("Patient", back_populates="self_reports")

    # JSON symptoms array
    symptoms = Column(JSON, nullable=True)
    # e.g., True/False, or you can switch to String/Enum if you want more states
    medication_compliance = Column(Boolean, nullable=True)

    # On-chain integrity fields
    content_hash = Column(String, nullable=True)
    tx_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self):
        return f"<SelfReport(id={self.id}, patient_id={self.patient_id})>"


# -----------------------
# Access_logs — Hospital Access Audit Logs
# -----------------------

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Who accessed
    hospital_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hospital_user = relationship("User", back_populates="access_logs")

    # Whose data was accessed
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient = relationship("Patient", back_populates="access_logs")

    purpose = Column(String, nullable=True)

    # Blockchain timestamp (from event)
    chain_timestamp = Column(DateTime, nullable=True)

    # Application-level timestamp
    db_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    tx_hash = Column(String, nullable=True)

    # JSON array of record ids viewed in this access
    # e.g. ["self_report:12", "initial_record", "lab_result:9"]
    record_ids = Column(JSON, nullable=True)

    def __repr__(self):
        return (
            f"<AccessLog(id={self.id}, user_id={self.hospital_user_id}, "
            f"patient_id={self.patient_id}, purpose={self.purpose})>"
        )

