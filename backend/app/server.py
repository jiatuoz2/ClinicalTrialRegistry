# backend/app/server.py
"""
Business API routes for the Patient-Hospital system.

Includes:
- Basic patient info (with PDF upload)
- Consent management (grant/revoke/status)
- Self-report creation (ALWAYS create new)
- Fetching patient self-report history
"""

import os
import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.models import Patient, SelfReport

router = APIRouter()

# ============================================================
# GET patient basic info
# ============================================================
@router.get("/patient/basic-info/{wallet}")
def get_patient_basic_info(wallet: str, db: Session = Depends(get_db)):
    """
    Fetch basic info (age, gender, initial PDF URL, study_id, consent).
    """

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        return {"exists": False}

    return {
        "exists": True,
        "age": patient.age,
        "gender": patient.gender,
        "initial_record_url": patient.initial_record_url,
        "study_id": patient.study_id,
        "authorized": patient.authorized,
    }

# ============================================================
# GET all patients
# ============================================================
@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):

    stmt = select(Patient)
    patients = db.execute(stmt).scalars().all()

    result = []
    for p in patients:
        # report count
        report_count = len(p.self_reports) if p.self_reports else 0

        result.append({
            "study_id": p.study_id,
            "authorized": p.authorized,
            "reports": report_count,
            "last_update": p.updated_at.isoformat() if p.updated_at else None
        })

    return {"patients": result}


# ============================================================
# POST create/update patient basic info
# ============================================================
@router.post("/patient/basic-info")
async def save_patient_basic_info(
    wallet_address: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Store patient profile and initial PDF upload.
    """

    # 1) Find or create patient
    stmt = select(Patient).where(Patient.wallet_address == wallet_address)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        patient = Patient(wallet_address=wallet_address)
        db.add(patient)
        db.flush()

        year = datetime.now().year
        padded_id = str(patient.id).zfill(4)
        patient.study_id = f"CT-{year}-{padded_id}"
        patient.created_at = datetime.now()

    # 2) Save file
    file_bytes = await file.read()
    os.makedirs("uploads", exist_ok=True)

    filename = f"{wallet_address}_initial_record.pdf"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # 3) Hash
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # 4) URL served via StaticFiles
    file_url = f"http://127.0.0.1:8000/uploads/{filename}"

    # 5) Update DB
    patient.age = age
    patient.gender = gender
    patient.initial_record_url = file_url
    patient.initial_record_hash = file_hash
    patient.updated_at = datetime.now()

    db.commit()
    db.refresh(patient)

    return {
        "id": patient.id,
        "study_id": patient.study_id,
        "wallet_address": patient.wallet_address,
        "age": patient.age,
        "gender": patient.gender,
        "initial_record_url": patient.initial_record_url,
        "initial_record_hash": patient.initial_record_hash,
        "authorized": patient.authorized,
    }


# ============================================================
# Consent management (grant/revoke/status)
# ============================================================
@router.post("/patient/consent/grant")
def grant_consent(data: dict, db: Session = Depends(get_db)):
    wallet = data.get("wallet_address")
    if not wallet:
        raise HTTPException(400, "wallet_address required")

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")

    patient.authorized = True
    patient.updated_at = datetime.now()
    db.commit()

    return {"status": "granted"}


@router.post("/patient/consent/revoke")
def revoke_consent(data: dict, db: Session = Depends(get_db)):
    wallet = data.get("wallet_address")
    if not wallet:
        raise HTTPException(400, "wallet_address required")

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")

    patient.authorized = False
    patient.updated_at = datetime.now()
    db.commit()

    return {"status": "revoked"}


@router.get("/patient/consent/status/{wallet}")
def consent_status(wallet: str, db: Session = Depends(get_db)):
    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        return {"exists": False}

    return {"exists": True, "authorized": patient.authorized}


# ============================================================
# POST create NEW self-report (never updates)
# ============================================================
@router.post("/self-report/submit")
def create_self_report(data: dict, db: Session = Depends(get_db)):
    """
    ALWAYS create a new self-report record.
    """

    wallet = data.get("wallet_address")
    symptoms = data.get("symptoms")
    medication_compliance = data.get("medication_compliance")

    if not wallet:
        raise HTTPException(400, "wallet_address required")

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        raise HTTPException(404, f"Patient with wallet {wallet} not found")

    report = SelfReport(
        patient_id=patient.id,
        symptoms=symptoms,
        medication_compliance=medication_compliance,
        content_hash="content_hash_here",
        tx_hash="tx_hash_here",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "patient_id": report.patient_id,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "symptoms": report.symptoms,
        "medication_compliance": report.medication_compliance,
        "content_hash": report.content_hash,
        "tx_hash": report.tx_hash,
    }


# ============================================================
# GET all reports for a patient
# ============================================================
@router.get("/self-report/{study_id}")
def get_patient_full_info(study_id: str, db: Session = Depends(get_db)):
    """
    Fetch:
    - patient info
    - all self-reports
    """

    stmt = select(Patient).where(Patient.study_id == study_id)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        raise HTTPException(404, "Patient not found")

    stmt_reports = select(SelfReport).where(SelfReport.patient_id == patient.id)
    reports = db.execute(stmt_reports).scalars().all()

    report_list = [
        {
            "id": r.id,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "symptoms": r.symptoms,
            "medication_compliance": r.medication_compliance,
            "content_hash": r.content_hash,
            "tx_hash": r.tx_hash,
        }
        for r in reports
    ]

    return {
        "patient": {
            "id": patient.id,
            "study_id": patient.study_id,
            "wallet_address": patient.wallet_address,
            "age": patient.age,
            "gender": patient.gender,
            "initial_record_url": patient.initial_record_url,
            "initial_record_hash": patient.initial_record_hash,
            "authorized": patient.authorized,
            "created_at": patient.created_at,
            "updated_at": patient.updated_at,
        },
        "self_reports": report_list,
    }
