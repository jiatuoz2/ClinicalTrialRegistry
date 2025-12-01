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
from sqlalchemy import select, func

from app.db import get_db
from app.models import Patient, SelfReport, AccessLog

router = APIRouter()

# ============================================================
# GET basic patient info by wallet address
# ============================================================

@router.get("/patient/basic-info/{wallet}")
def get_patient_basic_info(wallet: str, db: Session = Depends(get_db)):
    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
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
# GET all patients (registry list)
# ============================================================

@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):
    stmt = select(Patient)
    patients = db.execute(stmt).scalars().all()

    result = []
    for p in patients:
        result.append({
            "study_id": p.study_id,
            "wallet_address": p.wallet_address,
            "authorized": p.authorized,
            "reports": len(p.self_reports),
            "last_update": p.updated_at.isoformat() if p.updated_at else None,
        })

    return {"patients": result}


# ============================================================
# POST: save basic info + initial PDF record
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
    # find or create patient
    stmt = select(Patient).where(Patient.wallet_address == wallet_address)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        patient = Patient(wallet_address=wallet_address)
        db.add(patient)
        db.flush()

        # generate study ID like CT-2025-0001
        year = datetime.now().year
        padded = str(patient.id).zfill(4)
        patient.study_id = f"CT-{year}-{padded}"
        patient.created_at = datetime.now()

    # save PDF
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
# Self-report submission
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
        raise HTTPException(404, f"Patient {wallet} not found")

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
# Record hospital access
# ============================================================

@router.post("/access-log")
def record_access(data: dict, db: Session = Depends(get_db)):
    study_id = data.get("study_id")
    hospital_wallet = data.get("hospital_wallet")
    purpose = data.get("purpose")
    tx_hash = data.get("tx_hash")

    if not study_id or not hospital_wallet or not tx_hash:
        raise HTTPException(400, "study_id, hospital_wallet, tx_hash required")

    stmt = select(Patient).where(Patient.study_id == study_id)
    patient = db.execute(stmt).scalar_one_or_none()
    if not patient:
        raise HTTPException(404, "Patient not found")

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
# Get patient + self-reports (hospital view)
# ============================================================

@router.get("/self-report/{study_id}")
def get_patient_full_info(study_id: str, db: Session = Depends(get_db)):
    stmt = select(Patient).where(Patient.study_id == study_id)
    patient = db.execute(stmt).scalar_one_or_none()

    if not patient:
        raise HTTPException(404, "Patient not found")

    stmt_reports = select(SelfReport).where(SelfReport.patient_id == patient.id)
    reports = db.execute(stmt_reports).scalars().all()

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
        "self_reports": [
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
    }


# ============================================================
# Get wallet address by study ID
# ============================================================

@router.get("/patient/wallet/{study_id}")
def get_patient_wallet(study_id: str, db: Session = Depends(get_db)):
    stmt = select(Patient).where(Patient.study_id == study_id)
    patient = db.execute(stmt).scalar_one_or_none()

    return {"wallet_address": patient.wallet_address if patient else None}


# ============================================================
# Get ALL access logs (for dashboard UI)
# ============================================================

@router.get("/access-logs")
def get_access_logs(db: Session = Depends(get_db)):
    stmt = (
        select(AccessLog)
        .order_by(AccessLog.db_timestamp.desc())
    )
    logs = db.execute(stmt).scalars().all()

    return {
        "logs": [
            {
                "id": log.id,
                "hospital_wallet": log.hospital_wallet,
                "study_id": log.patient.study_id if log.patient else None,
                "purpose": log.purpose,
                "tx_hash": log.tx_hash,
                "chain_timestamp": log.chain_timestamp,
                "db_timestamp": log.db_timestamp,
            }
            for log in logs
        ]
    }


# ============================================================
# Dashboard Analytics API
# ============================================================

# 1. Enrollment trend (monthly new patients)
@router.get("/stats/enrollment-trend")
def enrollment_trend(db: Session = Depends(get_db)):
    stmt = (
        select(
            func.date_trunc("month", Patient.created_at).label("month"),
            func.count(Patient.id).label("count")
        )
        .group_by("month")
        .order_by("month")
    )
    rows = db.execute(stmt).all()

    return {
        "items": [
            {"month": r.month.strftime("%Y-%m"), "patients": r.count}
            for r in rows
        ]
    }


# 2. Symptom distribution
@router.get("/stats/symptoms")
def symptom_distribution(db: Session = Depends(get_db)):
    stmt = select(SelfReport.symptoms)
    rows = db.execute(stmt).scalars().all()

    counter = {}
    for symptoms in rows:
        if symptoms:
            for s in symptoms:
                name = s.get("symptom")
                counter[name] = counter.get(name, 0) + 1

    return {"items": [{"name": k, "value": v} for k, v in counter.items()]}


# 3. Medication adherence stats
@router.get("/stats/adherence")
def adherence_stats(db: Session = Depends(get_db)):
    total = db.query(SelfReport).count()
    compliant = db.query(SelfReport).filter(SelfReport.medication_compliance == True).count()
    non_compliant = total - compliant

    return {
        "total": total,
        "compliant": compliant,
        "non_compliant": non_compliant,
        "rate": compliant / total if total > 0 else 0,
    }


# 4. Severe adverse events (severity >= 4)
@router.get("/stats/severe-events")
def severe_events(db: Session = Depends(get_db)):
    stmt = select(SelfReport.symptoms)
    rows = db.execute(stmt).scalars().all()

    severe = 0
    for symptoms in rows:
        if symptoms:
            for s in symptoms:
                if int(s.get("severity", 0)) >= 4:
                    severe += 1

    return {"severe_events": severe}


# 5. Summary cards (top KPI)
@router.get("/stats/summary")
def summary_stats(db: Session = Depends(get_db)):
    total_patients = db.query(Patient).count()
    total_reports = db.query(SelfReport).count()
    compliant = db.query(SelfReport).filter(SelfReport.medication_compliance == True).count()

    # calculate severe events
    severe = 0
    rows = db.query(SelfReport.symptoms).all()
    for r in rows:
        symptoms = r[0]
        if symptoms:
            for s in symptoms:
                if int(s.get("severity", 0)) >= 4:
                    severe += 1

    return {
        "total_patients": total_patients,
        "total_reports": total_reports,
        "adherence_rate": compliant / total_reports if total_reports else 0,
        "severe_events": severe,
    }
