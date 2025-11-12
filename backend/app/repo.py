from sqlmodel import Session, select
from .db import get_engine
from .models import Patient, Trial, AccessLog, IntegrityEvent
import time

def update_consent(patient_address: str, status: str):
    with Session(get_engine()) as s:
        p = s.exec(select(Patient).where(Patient.patient_address == patient_address)).first()
        if p:
            p.consent_status = status
            s.add(p)
            s.commit()

def upsert_trial(trial_id: int, local_path: str, hash_hex: str):
    with Session(get_engine()) as s:
        t = s.exec(select(Trial).where(Trial.trial_id == trial_id)).first()
        if t:
            t.local_path = local_path
            t.stored_hash_hex = hash_hex
            s.add(t)
        else:
            s.add(Trial(trial_id=trial_id, local_path=local_path, stored_hash_hex=hash_hex))
        s.commit()

def get_trial(trial_id: int):
    with Session(get_engine()) as s:
        return s.exec(select(Trial).where(Trial.trial_id == trial_id)).first()

def add_access_log(patient_address: str, purpose: str, actor: str):
    with Session(get_engine()) as s:
        s.add(AccessLog(patient_address=patient_address, purpose=purpose, actor=actor, ts=int(time.time())))
        s.commit()

def patient_view(patient_address: str):
    with Session(get_engine()) as s:
        p = s.exec(select(Patient).where(Patient.address == patient_address)).first()
        logs = s.exec(select(AccessLog).where(AccessLog.patient_address == patient_address)).all()
        return {
            "patient": {"address": p.patient_address if p else patient_address, "display_name": p.display_name if p else "Unknown", "consent": p.consent_status if p else "None"},
            "access_summaries": [{"purpose": a.purpose, "actor": a.actor, "timestamp": a.ts} for a in logs]
        }

def researcher_view():
    with Session(get_engine()) as s:
        trials = s.exec(select(Trial)).all()
        logs = s.exec(select(AccessLog)).all()
        return {
            "trials": [{"trial_id": t.trial_id, "hash": t.stored_hash_hex, "local_path": t.local_path} for t in trials],
            "access_logs": [{"patient_address": a.patient_address, "purpose": a.purpose, "actor": a.actor, "timestamp": a.ts} for a in logs]
        }

def record_integrity_event(trial_id: int, old_hex: str, new_hex: str, ts: int):
    with Session(get_engine()) as s:
        s.add(IntegrityEvent(trial_id=trial_id, old_hash_hex=old_hex, new_hash_hex=new_hex, ts=ts))
        s.commit()

def list_integrity_events():
    with Session(get_engine()) as s:
        events = s.exec(select(IntegrityEvent)).all()
        return [{"trial_id": e.trial_id, "old_hash": e.old_hash_hex, "new_hash": e.new_hash_hex, "timestamp": e.ts} for e in events]
