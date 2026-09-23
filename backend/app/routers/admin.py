from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.hospital import Hospital
from app.models.user import User
from app.models.patient import Patient
from app.models.organ import Organ
from app.models.enums import UserRole, HospitalStatus, PatientType, EligibilityStatus
from app.schemas.hospital import HospitalCreate, HospitalOut, HospitalStatusUpdate
from app.core.security import require_role, get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"])
require_admin = require_role(UserRole.ADMIN)


@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    total_hospitals = db.query(Hospital).count()
    active_hospitals = db.query(Hospital).filter(Hospital.status == HospitalStatus.ACTIVE).count()
    inactive_hospitals = db.query(Hospital).filter(Hospital.status == HospitalStatus.INACTIVE).count()
    total_donors = db.query(Patient).filter(Patient.patient_type == PatientType.DONOR).count()
    total_receivers = db.query(Patient).filter(Patient.patient_type == PatientType.RECEIVER).count()
    eligible_donors = db.query(Patient).filter(
        Patient.patient_type == PatientType.DONOR,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).count()
    eligible_receivers = db.query(Patient).filter(
        Patient.patient_type == PatientType.RECEIVER,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).count()

    return {
        "total_hospitals": total_hospitals,
        "active_hospitals": active_hospitals,
        "inactive_hospitals": inactive_hospitals,
        "total_donors": total_donors,
        "total_receivers": total_receivers,
        "eligible_donors": eligible_donors,
        "eligible_receivers": eligible_receivers,
    }


@router.get("/hospitals", response_model=List[HospitalOut])
def list_hospitals(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return db.query(Hospital).all()


@router.get("/hospitals/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.post("/hospitals", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(data: HospitalCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    # Check duplicates
    if db.query(Hospital).filter(Hospital.hospital_id == data.hospital_id).first():
        raise HTTPException(status_code=400, detail="Hospital ID already exists")
    if db.query(Hospital).filter(Hospital.email == data.email).first():
        raise HTTPException(status_code=400, detail="Hospital email already exists")

    hospital = Hospital(
        hospital_id=data.hospital_id,
        name=data.name,
        address=data.address,
        city=data.city,
        state=data.state,
        contact=data.contact,
        email=data.email,
        hospital_type=data.hospital_type,
        verification_status=data.verification_status,
        status=HospitalStatus.ACTIVE,
    )
    db.add(hospital)
    db.flush()

    # Create hospital login user
    if db.query(User).filter(User.email == data.user_email).first():
        raise HTTPException(status_code=400, detail="User email already exists")

    hospital_user = User(
        name=data.user_name,
        email=data.user_email,
        password_hash=get_password_hash(data.user_password),
        role=UserRole.HOSPITAL,
        hospital_id=hospital.id,
        is_active=True,
    )
    db.add(hospital_user)
    db.commit()
    db.refresh(hospital)
    return hospital


@router.patch("/hospitals/{hospital_id}/status")
def update_hospital_status(
    hospital_id: int,
    data: HospitalStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    hospital.status = data.status

    # Deactivate/activate associated hospital users
    hospital_users = db.query(User).filter(User.hospital_id == hospital_id, User.role == UserRole.HOSPITAL).all()
    for u in hospital_users:
        u.is_active = (data.status == HospitalStatus.ACTIVE)

    db.commit()
    return {"message": f"Hospital status updated to {data.status}"}


@router.get("/hospitals/{hospital_id}/details")
def hospital_details(hospital_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    donors = db.query(Patient).filter(Patient.hospital_id == hospital_id, Patient.patient_type == PatientType.DONOR).count()
    receivers = db.query(Patient).filter(Patient.hospital_id == hospital_id, Patient.patient_type == PatientType.RECEIVER).count()
    eligible_donors = db.query(Patient).filter(
        Patient.hospital_id == hospital_id,
        Patient.patient_type == PatientType.DONOR,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).count()
    eligible_receivers = db.query(Patient).filter(
        Patient.hospital_id == hospital_id,
        Patient.patient_type == PatientType.RECEIVER,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).count()

    users = db.query(User).filter(User.hospital_id == hospital_id).all()

    return {
        "hospital": {
            "id": hospital.id,
            "hospital_id": hospital.hospital_id,
            "name": hospital.name,
            "address": hospital.address,
            "city": hospital.city,
            "state": hospital.state,
            "contact": hospital.contact,
            "email": hospital.email,
            "hospital_type": hospital.hospital_type,
            "status": hospital.status,
            "created_at": hospital.created_at,
        },
        "stats": {
            "total_donors": donors,
            "eligible_donors": eligible_donors,
            "total_receivers": receivers,
            "eligible_receivers": eligible_receivers,
        },
        "users": [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users]
    }
