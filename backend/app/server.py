import os
import hashlib
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.models import Patient, SelfReport, AccessLog

router = APIRouter()

# ============================================================
# GET patient basic info
# ============================================================

@router.get("/patient/basic-info/{wallet}")
def get_patient_basic_info(wallet: str, db: Session = Depends(get_db)):

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        return {"exists": False}

    return {
        "exists": True,
        "age": patient.age,
        "gender": patient.gender,
        "initial_record_url": patient.initial_record_url,
        "initial_record_hash": patient.initial_record_hash,
        "initial_record_tx_hash": patient.initial_record_tx_hash,
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
        result.append({
            "study_id": p.study_id,
            "authorized": p.authorized,
            "reports": len(p.self_reports),
            "last_update": p.updated_at.isoformat() if p.updated_at else None
        })

    return {"patients": result}


# ============================================================
# POST basic info + PDF + tx_hash
# ============================================================

@router.post("/patient/basic-info")
async def save_patient_basic_info(
    wallet_address: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    tx_hash: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):

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

    # Save PDF locally
    file_bytes = await file.read()
    os.makedirs("uploads", exist_ok=True)

    filename = f"{wallet_address}_initial_record.pdf"
    filepath = os.path.join("uploads", filename)
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    file_url = f"http://127.0.0.1:8000/uploads/{filename}"

    patient.age = age
    patient.gender = gender
    patient.initial_record_url = file_url
    patient.initial_record_hash = file_hash
    patient.initial_record_tx_hash = tx_hash
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
        "initial_record_tx_hash": patient.initial_record_tx_hash,
        "authorized": patient.authorized,
    }


# ============================================================
# Consent grant / revoke
# ============================================================

@router.post("/patient/consent/grant")
def grant_consent(data: dict, db: Session = Depends(get_db)):

    wallet = data.get("wallet_address")
    tx_hash = data.get("tx_hash")

    if not wallet or not tx_hash:
        raise HTTPException(400, "wallet_address and tx_hash required")

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        raise HTTPException(404, "Patient not found")

    patient.authorized = True
    patient.updated_at = datetime.now()
    db.commit()

    return {"status": "granted", "tx_hash": tx_hash}


@router.post("/patient/consent/revoke")
def revoke_consent(data: dict, db: Session = Depends(get_db)):

    wallet = data.get("wallet_address")
    tx_hash = data.get("tx_hash")

    if not wallet or not tx_hash:
        raise HTTPException(400, "wallet_address and tx_hash required")

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        raise HTTPException(404, "Patient not found")

    patient.authorized = False
    patient.updated_at = datetime.now()
    db.commit()

    return {"status": "revoked", "tx_hash": tx_hash}


@router.get("/patient/consent/status/{wallet}")
def consent_status(wallet: str, db: Session = Depends(get_db)):

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        return {"exists": False}

    return {"exists": True, "authorized": patient.authorized}


# ============================================================
# Self-report
# ============================================================

@router.post("/self-report/submit")
def create_self_report(data: dict, db: Session = Depends(get_db)):

    wallet = data.get("wallet_address")
    symptoms = data.get("symptoms")
    medication_compliance = data.get("medication_compliance")
    content_hash = data.get("content_hash")
    tx_hash = data.get("tx_hash")

    if not wallet or not content_hash or not tx_hash:
        raise HTTPException(400, "wallet_address, content_hash, tx_hash required")

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        raise HTTPException(404, f"Patient with wallet {wallet} not found")

    report = SelfReport(
        patient_id=patient.id,
        symptoms=symptoms,
        medication_compliance=medication_compliance,
        content_hash=content_hash,
        tx_hash=tx_hash,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "created_at": report.created_at,
        "symptoms": report.symptoms,
        "content_hash": report.content_hash,
        "tx_hash": report.tx_hash,
    }


# ============================================================
# Record Hospital Access
# ============================================================

@router.post("/access-log")
def record_access(data: dict, db: Session = Depends(get_db)):

    study_id = data.get("study_id")
    hospital_wallet = data.get("hospital_wallet")
    purpose = data.get("purpose")
    tx_hash = data.get("tx_hash")

    if not study_id or not hospital_wallet or not tx_hash:
        raise HTTPException(400, "study_id, hospital_wallet, tx_hash required")

    # find patient
    stmt = select(Patient).where(Patient.study_id == study_id)
    patient = db.execute(stmt).scalar_one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")

    # write audit
    log = AccessLog(
        hospital_wallet=hospital_wallet,
        patient_id=patient.id,
        purpose=purpose,
        chain_timestamp=datetime.utcnow(),
        tx_hash=tx_hash,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return {"status": "logged", "log_id": log.id, "tx_hash": tx_hash}


# ============================================================
# GET Patient + Reports (Hospital side)
# ============================================================

@router.get("/self-report/{study_id}")
def get_patient_full_info(study_id: str, db: Session = Depends(get_db)):

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
            "initial_record_tx_hash": patient.initial_record_tx_hash,
            "authorized": patient.authorized,
        },
        "self_reports": report_list,
    }


# ============================================================
# Get patient's wallet address from study_id  (Hospital use)
# ============================================================

@router.get("/patient/wallet/{study_id}")
def get_patient_wallet(study_id: str, db: Session = Depends(get_db)):
    stmt = select(Patient).where(Patient.study_id == study_id)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        return {"wallet_address": None}

    return {"wallet_address": patient.wallet_address}

