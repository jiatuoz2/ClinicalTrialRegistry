# backend/app/main.py
from datetime import datetime
from click import File
import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select

from db import get_db, init_db
from models import Patient, SelfReport

app = FastAPI(title="Patient-Hospital Blockchain API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional: initialize tables at startup 
@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/patient/basic-info/{wallet}")
def get_patient_basic_info(wallet: str, db: Session = Depends(get_db)):
    """
    GET /patient/basic-info/{wallet}
    Used by your React fetch(`${backend}/patient/basic-info/${wallet}`)
    """

    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()  

    if patient is None:
        print(f"Patient with wallet {wallet} not found.")
        return {"exists": False}

    return {
        "exists": True,
        "age": patient.age,
        "gender": patient.gender,
        "initial_record_url": patient.initial_record_url,
    }


@app.post("/patient/basic-info")
async def save_patient_basic_info(
    wallet_address: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Create or update a patient's basic info and initial record.

    - wallet_address: patient's on-chain identity
    - age, gender: basic demographics
    - file: initial medical record PDF

    Server handles:
    - created_at / updated_at (via model defaults)
    - study_id = same as id (string)
    - initial_record_url (file path)
    - initial_record_hash (sha256 of file)
    """

    # 1) Find or create patient by wallet_address
    if not wallet_address:
        raise HTTPException(status_code=400, detail="wallet_address required")
    
    stmt = select(Patient).where(Patient.wallet_address == wallet_address)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        patient = Patient(wallet_address=wallet_address)
        db.add(patient)
        db.flush()  # assign patient.id without committing yet

        # study_id == id (store as string or int as you defined)
        patient.study_id = "CT-2025-" + str(patient.id)
        patient.created_at = datetime.now()

    # 2) Read file bytes and save to disk
    file_bytes = await file.read()

    # Make uploads directory if not exists
    os.makedirs("uploads", exist_ok=True)

    # Simple naming: wallet_initial.pdf (you can customize)
    filename = f"{wallet_address}_initial_record.pdf"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)
    
    # TODO: need to store PDF as a URL externally

    # TODO: 3) Compute hash of the file here 
    
    # 4) Update patient fields
    patient.age = age
    patient.gender = gender
    patient.initial_record_url = filepath   
    patient.initial_record_hash = "file_hash_hex_here"
    patient.updated_at = datetime.now() 

    # 5) Commit changes
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
    }

@app.post("/self-report/submit")
def create_self_report(
    data: dict,
    db: Session = Depends(get_db),
):
    # Expecting JSON body like:
    # {
    #   "wallet_address": "0xFAKE123",
    #   "symptoms": [
    #     { "symptom": "Headache", "severity": "moderate" },
    #     { "symptom": "Nausea", "severity": "mild" }
    #   ],
    #   "medication_compliance": true
    # }

    wallet = data.get("wallet_address")
    symptoms = data.get("symptoms")
    medication_compliance = data.get("medication_compliance")

    if not wallet:
        raise HTTPException(status_code=400, detail="wallet_address required")

    # 1. Find patient by wallet
    stmt = select(Patient).where(Patient.wallet_address == wallet)
    patient = db.execute(stmt).scalar_one_or_none()

    if patient is None:
        raise HTTPException(status_code=404, detail="Patient of wallet " + wallet + " not found")
    
    # check if a report exists for this patient
    existing_report_stmt = select(SelfReport).where(SelfReport.patient_id == patient.id)
    report = db.execute(existing_report_stmt).scalar_one_or_none()
    if report is None:
        # 2. Create new SelfReport row
        report = SelfReport(patient_id=patient.id)
        db.add(report)
        db.flush()
        report.created_at = datetime.now()

    report.symptoms = symptoms
    report.medication_compliance = medication_compliance
    report.content_hash = "content_hash_here"
    report.tx_hash = "tx_hash_here"
    report.updated_at = datetime.now()

    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "patient_id": report.patient_id,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "content_hash": report.content_hash,
        "tx_hash": report.tx_hash,
        "symptoms": report.symptoms,
        "medication_compliance": report.medication_compliance,
    }
