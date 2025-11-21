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

# ============================================================
# Patient — Basic Profile
# ============================================================

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)

    # Visible to hospital
    study_id = Column(String, unique=True, index=True, nullable=True)

    # On-chain identity
    wallet_address = Column(String, unique=True, index=True, nullable=False)

    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)

    # Consent (backend cache, truth = on-chain)
    authorized = Column(Boolean, default=True, nullable=False)

    # Off-chain initial record
    initial_record_url = Column(Text, nullable=True)
    initial_record_hash = Column(String, nullable=True)

    # NEW: Chain tx for initial uploadData(pdfHash)
    initial_record_tx_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    self_reports = relationship(
        "SelfReport", back_populates="patient", cascade="all, delete-orphan"
    )

    access_logs = relationship("AccessLog", back_populates="patient")

    def __repr__(self):
        return f"<Patient(id={self.id}, study_id={self.study_id}, wallet={self.wallet_address})>"


# ============================================================
# SelfReport
# ============================================================

class SelfReport(Base):
    __tablename__ = "self_reports"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient = relationship("Patient", back_populates="self_reports")

    symptoms = Column(JSON, nullable=True)
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


# ============================================================
# AccessLog — Hospital Access
# ============================================================

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)

    hospital_wallet = Column(String, nullable=False)

    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient = relationship("Patient", back_populates="access_logs")

    purpose = Column(String, nullable=True)
    chain_timestamp = Column(DateTime, nullable=True)
    db_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    tx_hash = Column(String, nullable=True)

    def __repr__(self):
        return (
            f"<AccessLog(id={self.id}, hospital_wallet={self.hospital_wallet}, "
            f"patient_id={self.patient_id}, purpose={self.purpose})>"
        )
