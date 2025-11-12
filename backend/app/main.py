import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from .models.models import Patient, AccessLog, get_engine, Base
from .web3util import send_tx_via_role, compute_hash, Roles

app = FastAPI(title="Patient-Hospital Blockchain API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = get_engine()
# Base.metadata.create_all(engine)

@app.post("/patient/register")
def register_patient(data: dict):
    address = data.get("patient_address") or os.getenv("PATIENT_ADDRESS")
    name = data.get("display_name", "Unknown")
    with Session(engine) as session:
        existing = session.execute(select(Patient).where(Patient.address == address)).scalars().first()
        if existing:
            return {"status": "already registered", "address": address}
        p = Patient(address=address, display_name=name)
        session.add(p)
        session.commit()
        return {"status": "registered", "address": address}

@app.post("/patient/consent/grant")
def grant_consent(data: dict):
    address = data.get("patient_address") or os.getenv("PATIENT_ADDRESS")
    try:
        tx_hash = send_tx_via_role(Roles.patient, "grantConsent", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain tx failed: {e}")
    with Session(engine) as session:
        p = session.execute(select(Patient).where(Patient.address == address)).scalars().first()
        if not p:
            raise HTTPException(status_code=404, detail="Patient not found")
        p.consent_active = True
        session.add(p)
        session.commit()
    return {"status": "consent granted (on-chain)", "patient": address, "tx_hash": tx_hash}

@app.post("/patient/consent/revoke")
def revoke_consent(data: dict):
    address = data.get("patient_address") or os.getenv("PATIENT_ADDRESS")
    try:
        tx_hash = send_tx_via_role(Roles.patient, "revokeConsent", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain tx failed: {e}")
    with Session(engine) as session:
        p = session.execute(select(Patient).where(Patient.address == address)).scalars().first()
        if not p:
            raise HTTPException(status_code=404, detail="Patient not found")
        p.consent_active = False
        session.add(p)
        session.commit()
    return {"status": "consent revoked (on-chain)", "patient": address, "tx_hash": tx_hash}

@app.post("/patient/upload")
def upload_data(data: dict):
    address = data.get("patient_address") or os.getenv("PATIENT_ADDRESS")
    content = data.get("content", "")
    data_hash = compute_hash(content)
    try:
        tx_hash = send_tx_via_role(Roles.patient, "uploadData", [data_hash])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain tx failed: {e}")
    return {"status": "data uploaded (on-chain)", "patient": address, "tx_hash": tx_hash, "data_hash": data_hash.hex()}

@app.post("/hospital/view")
def hospital_view_data(data: dict):
    patient_address = data.get("patient_address") or os.getenv("PATIENT_ADDRESS")
    hospital_actor = data.get("hospital_address") or os.getenv("HOSPITAL_ADDRESS")
    purpose = data.get("purpose", "clinical review")
    with Session(engine) as session:
        p = session.execute(select(Patient).where(Patient.address == patient_address)).scalars().first()
        if not p:
            raise HTTPException(status_code=404, detail="Patient not found")
        if not p.consent_active:
            session.add(AccessLog(patient_address=patient_address, actor=hospital_actor, purpose=purpose, success=False))
            session.commit()
            raise HTTPException(status_code=403, detail="Access denied: consent not active")
        try:
            tx_hash = send_tx_via_role(Roles.hospital, "viewData", [patient_address, purpose])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Blockchain tx failed: {e}")
        session.add(AccessLog(patient_address=patient_address, actor=hospital_actor, purpose=purpose, success=True))
        session.commit()
    return {"status": "data viewed (on-chain)", "patient": patient_address, "hospital": hospital_actor, "tx_hash": tx_hash}

@app.get("/audit/patient/{address}")
def audit_patient(address: str):
    with Session(engine) as session:
        logs = session.execute(select(AccessLog).where(AccessLog.patient_address == address)).scalars().all()
        return {"access_logs": [str(x) for x in logs]}
