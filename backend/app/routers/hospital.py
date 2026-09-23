import os
import uuid
import mimetypes
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.patient import Patient, DonorProfile, ReceiverProfile
from app.models.organ import Organ
from app.models.allocation import MedicalReport, AllocationOffer, Allocation, Notification
from app.models.enums import (UserRole, PatientType, EligibilityStatus, OrganType,
                               OrganAvailabilityStatus, OfferStatus, AllocationStatus, ReportType)
from app.schemas.patient import PatientCreate, PatientOut, OrganCreate, OrganOut
from app.core.security import require_role
from app.core.config import settings, resolve_upload_path
from app.services.eligibility import run_eligibility_check

router = APIRouter(prefix="/hospital", tags=["Hospital"])
require_hospital = require_role(UserRole.HOSPITAL)

ORGAN_TYPES = ["KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA", "OTHER"]


def get_hospital_id(current_user) -> int:
    if not current_user.hospital_id:
        raise HTTPException(status_code=400, detail="User not associated with a hospital")
    return current_user.hospital_id


def get_own_patient(patient_id: int, db: Session, current_user) -> Patient:
    """Fetch a patient registered at the current user's hospital, else 404."""
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.hospital_id == get_hospital_id(current_user),
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard")
def hospital_dashboard(db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    hid = get_hospital_id(current_user)

    total_donors = db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.DONOR).count()
    eligible_donors = db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.DONOR, Patient.eligibility_status == EligibilityStatus.ELIGIBLE).count()
    not_eligible_donors = db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.DONOR, Patient.eligibility_status == EligibilityStatus.NOT_ELIGIBLE).count()
    total_receivers = db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.RECEIVER).count()
    eligible_receivers = db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.RECEIVER, Patient.eligibility_status == EligibilityStatus.ELIGIBLE).count()
    not_eligible_receivers = db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.RECEIVER, Patient.eligibility_status == EligibilityStatus.NOT_ELIGIBLE).count()

    # Organ-wise counts from ELIGIBLE donors
    eligible_donor_ids = [p.id for p in db.query(Patient).filter(
        Patient.hospital_id == hid, Patient.patient_type == PatientType.DONOR,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).all()]

    organ_counts = {}
    for organ_type in ORGAN_TYPES:
        count = db.query(Organ).filter(
            Organ.donor_patient_id.in_(eligible_donor_ids),
            Organ.organ_type == organ_type,
            Organ.availability_status == OrganAvailabilityStatus.AVAILABLE
        ).count()
        organ_counts[organ_type.lower()] = count

    # Active allocation requests (offers pending)
    active_requests = db.query(AllocationOffer).join(Patient, AllocationOffer.receiver_id == Patient.id).filter(
        Patient.hospital_id == hid,
        AllocationOffer.status == OfferStatus.PENDING
    ).count()

    completed_allocations = db.query(Allocation).filter(
        Allocation.receiver_hospital_id == hid,
        Allocation.status == AllocationStatus.COMPLETED
    ).count()

    return {
        "donors": {"total": total_donors, "eligible": eligible_donors, "not_eligible": not_eligible_donors},
        "receivers": {"total": total_receivers, "eligible": eligible_receivers, "not_eligible": not_eligible_receivers},
        "organs": organ_counts,
        "active_allocation_requests": active_requests,
        "completed_allocations": completed_allocations,
    }


# ─── Patients ─────────────────────────────────────────────────────────────────

def generate_patient_uid(patient_type: PatientType, db: Session) -> str:
    pt_val = patient_type.value if hasattr(patient_type, 'value') else str(patient_type)
    prefix = "D" if pt_val.upper() == "DONOR" else "R"
    count = db.query(Patient).count() + 1
    uid = f"{prefix}{count:03d}"
    while db.query(Patient).filter(Patient.patient_uid == uid).first() is not None:
        count += 1
        uid = f"{prefix}{count:03d}"
    return uid


def generate_organ_uid(organ_type: str, db: Session) -> str:
    ot_str = organ_type.value.upper() if hasattr(organ_type, 'value') else str(organ_type).upper()
    prefix_map = {
        "KIDNEY": "K",
        "LIVER": "L",
        "HEART": "H",
        "LUNG": "LU",
        "PANCREAS": "P",
        "CORNEA": "C",
        "OTHER": "O"
    }
    prefix = prefix_map.get(ot_str, ot_str[:2] if len(ot_str) > 1 else ot_str)
    count = db.query(Organ).count() + 1
    uid = f"{prefix}{count:03d}"
    while db.query(Organ).filter(Organ.organ_uid == uid).first() is not None:
        count += 1
        uid = f"{prefix}{count:03d}"
    return uid


@router.post("/patients", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def add_patient(data: PatientCreate, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    hid = get_hospital_id(current_user)

    uid = data.patient_uid or generate_patient_uid(data.patient_type, db)

    patient = Patient(
        patient_uid=uid,
        hospital_id=hid,
        patient_type=data.patient_type,
        name=data.name,
        age=data.age,
        gender=data.gender,
        blood_group=data.blood_group,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        medical_condition=data.medical_condition,
        eligibility_status=EligibilityStatus.PENDING_VERIFICATION,
        verification_status="PENDING",
    )
    db.add(patient)
    db.flush()

    if data.patient_type == PatientType.DONOR and data.donor_profile:
        dp = DonorProfile(
            patient_id=patient.id,
            hypertension=data.donor_profile.hypertension or False,
            diabetes=data.donor_profile.diabetes or False,
            renal_history=data.donor_profile.renal_history,
            cardiac_history=data.donor_profile.cardiac_history,
            infection_history=data.donor_profile.infection_history,
            medical_history=data.donor_profile.medical_history,
            infectious_disease_screening=data.donor_profile.infectious_disease_screening,
            relevant_test_results=data.donor_profile.relevant_test_results,
            medical_information=data.donor_profile.medical_information,
        )
        db.add(dp)
    elif data.patient_type == PatientType.RECEIVER and data.receiver_profile:
        rp = ReceiverProfile(
            patient_id=patient.id,
            required_organ=data.receiver_profile.required_organ,
            urgency_level=data.receiver_profile.urgency_level,
            waiting_start_date=data.receiver_profile.waiting_start_date or datetime.now(timezone.utc),
            dialysis_status=data.receiver_profile.dialysis_status,
            dialysis_start_date=data.receiver_profile.dialysis_start_date,
            dialysis_duration_months=data.receiver_profile.dialysis_duration_months,
            previous_transplant=data.receiver_profile.previous_transplant or False,
            previous_graft_failure=data.receiver_profile.previous_graft_failure or False,
            number_of_previous_grafts=data.receiver_profile.number_of_previous_grafts or 0,
            pra=data.receiver_profile.pra,
            cpra=data.receiver_profile.cpra,
            hla_typing=data.receiver_profile.hla_typing,
            hla_antibodies=data.receiver_profile.hla_antibodies,
            crossmatch_result=data.receiver_profile.crossmatch_result,
            pediatric_status=data.receiver_profile.pediatric_status or False,
            prior_living_donor=data.receiver_profile.prior_living_donor or False,
            special_status=data.receiver_profile.special_status,
            medical_history=data.receiver_profile.medical_history,
            medical_information=data.receiver_profile.medical_information,
        )
        db.add(rp)

    db.commit()
    db.refresh(patient)

    result = PatientOut.model_validate(patient)
    result.hospital_name = patient.hospital.name if patient.hospital else None
    return result


@router.get("/patients", response_model=List[PatientOut])
def list_patients(
    patient_type: Optional[str] = None,
    eligibility: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)
    q = db.query(Patient).filter(Patient.hospital_id == hid)
    if patient_type:
        q = q.filter(Patient.patient_type == patient_type.upper())
    if eligibility:
        q = q.filter(Patient.eligibility_status == eligibility.upper())
    patients = q.all()
    result = []
    for p in patients:
        out = PatientOut.model_validate(p)
        out.hospital_name = p.hospital.name if p.hospital else None
        result.append(out)
    return result


@router.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    patient = get_own_patient(patient_id, db, current_user)
    out = PatientOut.model_validate(patient)
    out.hospital_name = patient.hospital.name if patient.hospital else None
    return out


# ─── Organs ───────────────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/organs", response_model=OrganOut, status_code=status.HTTP_201_CREATED)
def add_organ(patient_id: int, data: OrganCreate, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.patient_type == PatientType.DONOR,
        Patient.hospital_id == get_hospital_id(current_user),
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Donor patient not found")

    try:
        ot_val = data.organ_type.value if hasattr(data.organ_type, 'value') else str(data.organ_type)
        uid = data.organ_uid or generate_organ_uid(ot_val, db)
        organ = Organ(
            organ_uid=uid,
            donor_patient_id=patient.id,
            organ_type=data.organ_type,
            organ_condition=data.organ_condition,
            donor_creatinine=data.donor_creatinine,
            kidney_function=data.kidney_function,
            kidney_quality=data.kidney_quality,
            retrieval_time=data.retrieval_time,
            preservation_start=data.preservation_start,
            preservation_method=data.preservation_method,
            availability_status=OrganAvailabilityStatus.AVAILABLE,
        )
        db.add(organ)
        db.commit()
        db.refresh(organ)

        # Re-run eligibility
        run_eligibility_check(patient.id, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to register organ: {str(e)}")

    out = OrganOut.model_validate(organ)
    out.donor_name = patient.name
    out.donor_blood_group = patient.blood_group.value if hasattr(patient.blood_group, 'value') else patient.blood_group
    out.donor_hospital_name = patient.hospital.name if patient.hospital else None
    out.donor_uid = patient.patient_uid
    out.donor_height_cm = patient.height_cm
    out.donor_weight_kg = patient.weight_kg
    return out


@router.get("/patients/{patient_id}/organs", response_model=List[OrganOut])
def list_patient_organs(patient_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    patient = get_own_patient(patient_id, db, current_user)
    organs = db.query(Organ).filter(Organ.donor_patient_id == patient_id).all()
    result = []
    for o in organs:
        out = OrganOut.model_validate(o)
        out.donor_name = patient.name
        out.donor_blood_group = patient.blood_group.value if hasattr(patient.blood_group, 'value') else patient.blood_group
        out.donor_hospital_name = patient.hospital.name if patient.hospital else None
        out.donor_uid = patient.patient_uid
        out.donor_height_cm = patient.height_cm
        out.donor_weight_kg = patient.weight_kg
        result.append(out)
    return result


@router.get("/organs")
def list_hospital_organs(
    organ_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)
    donor_ids = [p.id for p in db.query(Patient).filter(Patient.hospital_id == hid, Patient.patient_type == PatientType.DONOR).all()]
    q = db.query(Organ).filter(Organ.donor_patient_id.in_(donor_ids))
    if organ_type:
        q = q.filter(Organ.organ_type == organ_type.upper())
    organs = q.all()
    result = []
    for o in organs:
        donor = db.query(Patient).filter(Patient.id == o.donor_patient_id).first()
        result.append({
            "id": o.id,
            "organ_uid": o.organ_uid,
            "organ_type": o.organ_type,
            "organ_condition": o.organ_condition,
            "donor_creatinine": o.donor_creatinine,
            "kidney_function": o.kidney_function,
            "kidney_quality": o.kidney_quality,
            "retrieval_time": o.retrieval_time,
            "preservation_start": o.preservation_start,
            "preservation_method": o.preservation_method,
            "availability_status": o.availability_status,
            "created_at": o.created_at,
            "donor_name": donor.name if donor else None,
            "donor_uid": donor.patient_uid if donor else None,
            "donor_blood_group": donor.blood_group.value if donor and hasattr(donor.blood_group, 'value') else (donor.blood_group if donor else None),
            "donor_height_cm": donor.height_cm if donor else None,
            "donor_weight_kg": donor.weight_kg if donor else None,
        })
    return result


# ─── Medical Reports ───────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/reports", status_code=status.HTTP_201_CREATED)
async def upload_report(
    patient_id: int,
    report_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    patient = get_own_patient(patient_id, db, current_user)

    # Save file
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(patient_id))
    os.makedirs(upload_dir, exist_ok=True)
    orig_name = file.filename or f"report_{uuid.uuid4().hex[:6]}.pdf"
    ext = os.path.splitext(orig_name)[1]
    if not ext:
        ext = ".pdf"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Normalize report type to valid ReportType enum
    rt_norm = str(report_type).upper().strip()
    if rt_norm in ["EXAMINATION_REPORT", "MEDICAL_EXAM", "EXAM", "MEDICAL_EXAMINATION_REPORT", "CLINICAL_EXAMINATION"]:
        final_type = ReportType.MEDICAL_EXAMINATION
    elif rt_norm in ["BLOOD", "BLOOD_TEST_REPORT", "BLOOD_TEST"]:
        final_type = ReportType.BLOOD_TEST
    elif rt_norm in ["INFECTIOUS", "INFECTION", "INFECTIOUS_DISEASE", "INFECTIOUS_DISEASE_SCREENING"]:
        final_type = ReportType.INFECTIOUS_DISEASE_SCREENING
    elif rt_norm in ["ORGAN_ASSESSMENT", "ORGAN", "ORGAN_EVALUATION"]:
        final_type = ReportType.ORGAN_ASSESSMENT
    elif rt_norm in ["COMPATIBILITY_TEST", "COMPATIBILITY", "CROSSMATCH", "HLA_TEST"]:
        final_type = ReportType.COMPATIBILITY_TEST
    else:
        try:
            final_type = ReportType[rt_norm]
        except KeyError:
            final_type = ReportType.OTHER

    report = MedicalReport(
        patient_id=patient_id,
        report_type=final_type,
        file_path=file_path,
        original_filename=orig_name,
        verification_status="VERIFIED",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Re-run eligibility
    result = run_eligibility_check(patient_id, db)

    return {
        "message": "Report uploaded & verified successfully",
        "report_id": report.id,
        "report_type": final_type.value,
        "eligibility_updated": True,
        "eligibility_status": result.get("status"),
        "eligibility_issues": result.get("issues", []),
    }


@router.get("/patients/{patient_id}/reports")
def list_reports(patient_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    patient = get_own_patient(patient_id, db, current_user)
    reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient_id).all()
    return [
        {
            "id": r.id,
            "report_type": r.report_type.value if hasattr(r.report_type, 'value') else r.report_type,
            "original_filename": r.original_filename,
            "verification_status": r.verification_status,
            "uploaded_at": r.uploaded_at,
        }
        for r in reports
    ]


# ─── Eligibility Check ────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/check-eligibility")
def check_eligibility(patient_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    patient = get_own_patient(patient_id, db, current_user)
    return run_eligibility_check(patient_id, db)


@router.post("/patients/{patient_id}/verify-eligibility")
def verify_patient_eligibility(patient_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    patient = get_own_patient(patient_id, db, current_user)

    patient.eligibility_status = EligibilityStatus.ELIGIBLE
    patient.verification_status = "VERIFIED"
    db.commit()
    db.refresh(patient)

    return {
        "eligible": True,
        "status": EligibilityStatus.ELIGIBLE.value,
        "verification_status": "VERIFIED",
        "message": f"Candidate {patient.name} ({patient.patient_uid}) successfully certified as ELIGIBLE for allocation matching.",
        "issues": []
    }


# ─── Verified Pool ─────────────────────────────────────────────────────────────

@router.get("/verified-pool")
def verified_pool(
    organ_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)

    donor_q = db.query(Patient).filter(
        Patient.hospital_id == hid,
        Patient.patient_type == PatientType.DONOR,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    )
    receiver_q = db.query(Patient).filter(
        Patient.hospital_id == hid,
        Patient.patient_type == PatientType.RECEIVER,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    )

    donors = donor_q.all()
    receivers = receiver_q.all()

    # Filter by organ type if specified
    if organ_type and organ_type.upper() != "ALL":
        filtered_donors = []
        for d in donors:
            has_organ = db.query(Organ).filter(
                Organ.donor_patient_id == d.id,
                Organ.organ_type == organ_type.upper()
            ).first()
            if has_organ:
                filtered_donors.append(d)
        donors = filtered_donors

        receivers = [
            r for r in receivers
            if r.receiver_profile and r.receiver_profile.required_organ.upper() == organ_type.upper()
        ]

    def format_donor(d):
        organs = db.query(Organ).filter(Organ.donor_patient_id == d.id).all()
        return {
            "id": d.id,
            "patient_uid": d.patient_uid,
            "name": d.name,
            "blood_group": d.blood_group.value if hasattr(d.blood_group, 'value') else d.blood_group,
            "eligibility_status": d.eligibility_status,
            "verification_status": d.verification_status,
            "organs": [{"organ_uid": o.organ_uid, "organ_type": o.organ_type, "status": o.availability_status} for o in organs],
        }

    def format_receiver(r):
        from datetime import datetime, timezone
        waiting_days = 0
        if r.receiver_profile and r.receiver_profile.waiting_start_date:
            now = datetime.now(timezone.utc)
            start = r.receiver_profile.waiting_start_date
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            waiting_days = max(0, (now - start).days)
        return {
            "id": r.id,
            "patient_uid": r.patient_uid,
            "name": r.name,
            "blood_group": r.blood_group.value if hasattr(r.blood_group, 'value') else r.blood_group,
            "required_organ": r.receiver_profile.required_organ if r.receiver_profile else None,
            "urgency_level": r.receiver_profile.urgency_level if r.receiver_profile else None,
            "waiting_days": waiting_days,
            "eligibility_status": r.eligibility_status,
            "verification_status": r.verification_status,
        }

    return {
        "eligible_donors": [format_donor(d) for d in donors],
        "eligible_receivers": [format_receiver(r) for r in receivers],
    }


# ─── Allocation Requests (Offers for this hospital's receivers) ────────────────

@router.get("/allocation-requests")
def allocation_requests(db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    hid = get_hospital_id(current_user)
    offers = db.query(AllocationOffer).filter(AllocationOffer.hospital_id == hid).order_by(AllocationOffer.created_at.desc()).all()

    result = []
    for offer in offers:
        organ = db.query(Organ).filter(Organ.id == offer.organ_id).first()
        receiver = db.query(Patient).filter(Patient.id == offer.receiver_id).first()
        result.append({
            "id": offer.id,
            "organ_id": offer.organ_id,
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": organ.organ_type if organ else None,
            "organ_condition": organ.organ_condition if organ else None,
            "receiver_id": offer.receiver_id,
            "receiver_uid": receiver.patient_uid if receiver else None,
            "receiver_name": receiver.name if receiver else None,
            "priority_number": offer.priority_number,
            "status": offer.status,
            "rejection_reason": offer.rejection_reason,
            "created_at": offer.created_at,
            "responded_at": offer.responded_at,
        })
    return result


@router.post("/offers/{offer_id}/respond")
def respond_to_offer(
    offer_id: int,
    action: str = Form(...),
    rejection_category: Optional[str] = Form(None),
    rejection_reason: Optional[str] = Form(None),
    rejection_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    from app.services.rejection_analytics import classify_rejection_category

    hid = get_hospital_id(current_user)
    offer = db.query(AllocationOffer).filter(AllocationOffer.id == offer_id, AllocationOffer.hospital_id == hid).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status != OfferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Offer is not pending")

    if action.upper() == "ACCEPT":
        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = datetime.now(timezone.utc)
        # Update allocation
        allocation = db.query(Allocation).filter(Allocation.organ_id == offer.organ_id, Allocation.status == AllocationStatus.IN_PROGRESS).first()
        if allocation:
            allocation.receiver_id = offer.receiver_id
            allocation.receiver_hospital_id = hid
            allocation.priority_number = offer.priority_number
            allocation.status = AllocationStatus.ALLOCATED
            allocation.allocated_at = datetime.now(timezone.utc)
        # Update organ status
        organ = db.query(Organ).filter(Organ.id == offer.organ_id).first()
        if organ:
            organ.availability_status = OrganAvailabilityStatus.ALLOCATED
        db.commit()
        return {"message": "Offer accepted. Awaiting coordinator confirmation."}

    elif action.upper() == "REJECT":
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        
        final_category = rejection_category or classify_rejection_category(rejection_reason)
        offer.status = OfferStatus.REJECTED
        offer.rejection_category = final_category
        offer.rejection_reason = rejection_reason
        offer.rejection_notes = rejection_notes
        offer.responded_at = datetime.now(timezone.utc)
        # Return organ to AVAILABLE for next offer
        organ = db.query(Organ).filter(Organ.id == offer.organ_id).first()
        if organ:
            organ.availability_status = OrganAvailabilityStatus.AVAILABLE
        db.commit()
        return {"message": "Offer rejected. Coordinator will be notified."}
    else:
        raise HTTPException(status_code=400, detail="Action must be ACCEPT or REJECT")


# ─── Allocation History ────────────────────────────────────────────────────────

@router.get("/allocation-history")
def allocation_history(db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    hid = get_hospital_id(current_user)
    allocations = db.query(Allocation).filter(
        (Allocation.donor_hospital_id == hid) | (Allocation.receiver_hospital_id == hid)
    ).order_by(Allocation.created_at.desc()).all()

    result = []
    for alloc in allocations:
        organ = db.query(Organ).filter(Organ.id == alloc.organ_id).first()
        result.append({
            "id": alloc.id,
            "allocation_uid": alloc.allocation_uid,
            "organ_type": organ.organ_type if organ else None,
            "organ_uid": organ.organ_uid if organ else None,
            "donor_name": alloc.donor.name if alloc.donor else None,
            "donor_hospital": alloc.donor_hospital.name if alloc.donor_hospital else None,
            "receiver_name": alloc.receiver.name if alloc.receiver else None,
            "receiver_hospital": alloc.receiver_hospital.name if alloc.receiver_hospital else None,
            "status": alloc.status,
            "allocated_at": alloc.allocated_at,
            "completed_at": alloc.completed_at,
            "role": "donor_hospital" if alloc.donor_hospital_id == hid else "receiver_hospital",
        })
    return result


# ─── Notifications ────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{"id": n.id, "title": n.title, "message": n.message, "type": n.notification_type, "is_read": n.is_read, "created_at": n.created_at} for n in notifs]


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if n:
        n.is_read = 1
        db.commit()
    return {"message": "Marked as read"}


# ─── Report Document Viewer ───────────────────────────────────────────────────

@router.get("/reports/{report_id}/view")
@router.get("/reports/{report_id}/pdf")
def view_medical_report(report_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    from fastapi.responses import Response

    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Medical report not found")

    get_own_patient(report.patient_id, db, current_user)

    path = resolve_upload_path(report.file_path)
    if not os.path.isfile(path):
        raise HTTPException(
            status_code=404,
            detail="The file for this report is missing on the server. Please upload it again.",
        )
    with open(path, "rb") as f:
        content = f.read()
    media_type = mimetypes.guess_type(path)[0] or "application/pdf"
    # Header values must be latin-1; keep the name ASCII-safe
    filename = (report.original_filename or os.path.basename(path)).encode("ascii", "ignore").decode().replace('"', "")

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ─── Hospital Allocation Detail & PDF ──────────────────────────────────────────

@router.get("/allocations/{allocation_id}")
def get_hospital_allocation_detail(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    hid = get_hospital_id(current_user)
    a = db.query(Allocation).filter(
        Allocation.id == allocation_id,
        (Allocation.donor_hospital_id == hid) | (Allocation.receiver_hospital_id == hid)
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Allocation record not found or access unauthorized")

    organ = db.query(Organ).filter(Organ.id == a.organ_id).first()
    from app.models.allocation import AllocationHistory, Match
    history = db.query(AllocationHistory).filter(AllocationHistory.allocation_id == a.id).order_by(AllocationHistory.timestamp).all()
    offers = db.query(AllocationOffer).filter(AllocationOffer.organ_id == a.organ_id).order_by(AllocationOffer.created_at).all()
    match = db.query(Match).filter(Match.organ_id == a.organ_id, Match.receiver_id == a.receiver_id).first() if a.receiver_id else None

    import json
    score_breakdown = json.loads(match.score_breakdown) if match and match.score_breakdown else {}

    offers_out = []
    for offer in offers:
        rcvr = db.query(Patient).filter(Patient.id == offer.receiver_id).first()
        offers_out.append({
            "id": offer.id,
            "priority_number": offer.priority_number,
            "receiver_name": rcvr.name if rcvr else None,
            "receiver_uid": rcvr.patient_uid if rcvr else None,
            "hospital_name": rcvr.hospital.name if rcvr and rcvr.hospital else None,
            "status": offer.status,
            "rejection_reason": offer.rejection_reason,
            "rejection_notes": offer.rejection_notes,
            "created_at": offer.created_at,
            "responded_at": offer.responded_at,
        })

    receiver = db.query(Patient).filter(Patient.id == a.receiver_id).first()

    # Pre-dispatch Logistics Advisory
    ischemia_limits = {
        "KIDNEY": "24 - 36 Hours (Optimal < 18h)",
        "LIVER": "8 - 12 Hours (Optimal < 8h)",
        "HEART": "4 - 6 Hours (Immediate transit required)",
        "LUNG": "6 - 8 Hours (Immediate transit required)",
        "PANCREAS": "12 - 18 Hours",
    }
    org_type_str = organ.organ_type.value if organ and hasattr(organ.organ_type, 'value') else (organ.organ_type if organ else "KIDNEY")

    return {
        "allocation": {
            "id": a.id,
            "allocation_uid": a.allocation_uid,
            "status": a.status,
            "priority_number": a.priority_number,
            "coordinator": a.coordinator.name if a.coordinator else None,
            "allocated_at": a.allocated_at,
            "completed_at": a.completed_at,
            "created_at": a.created_at,
            "role": "donor_hospital" if a.donor_hospital_id == hid else "receiver_hospital",
        },
        "organ": {
            "id": organ.id if organ else None,
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": org_type_str,
            "organ_condition": organ.organ_condition if organ else None,
        },
        "donor": {
            "id": a.donor.id if a.donor else None,
            "uid": a.donor.patient_uid if a.donor else None,
            "name": a.donor.name if a.donor else None,
            "blood_group": a.donor.blood_group.value if a.donor and hasattr(a.donor.blood_group, 'value') else None,
            "hospital": a.donor_hospital.name if a.donor_hospital else None,
        },
        "receiver": {
            "id": receiver.id if receiver else None,
            "uid": receiver.patient_uid if receiver else None,
            "name": receiver.name if receiver else None,
            "age": receiver.age if receiver else None,
            "gender": receiver.gender if receiver else None,
            "blood_group": receiver.blood_group.value if receiver and hasattr(receiver.blood_group, 'value') else None,
            "required_organ": receiver.receiver_profile.required_organ if receiver and receiver.receiver_profile else None,
            "urgency_level": receiver.receiver_profile.urgency_level if receiver and receiver.receiver_profile else None,
            "medical_info": receiver.receiver_profile.medical_information if receiver and receiver.receiver_profile else None,
            "hospital": a.receiver_hospital.name if a.receiver_hospital else None,
            "hospital_contact": a.receiver_hospital.contact if a.receiver_hospital else None,
        } if receiver else None,
        "match_breakdown": score_breakdown,
        "pre_dispatch_info": {
            "max_cold_ischemia_time": ischemia_limits.get(org_type_str.upper(), "12 - 24 Hours"),
            "packaging_protocol": "Triple sterile organ bag with UW/HTK solution at 4°C with wet crushed ice",
            "required_documentation": "Organ donor clearance certificate, tissue biopsy report, blood crossmatch tubes, surgical retrieval notes",
            "emergency_coordinator_line": "+91 1800-TRANSPLANT / Coordinator Direct Desk",
        },
        "offers": offers_out,
        "history": [
            {"event_type": h.event_type, "description": h.description, "performed_by": h.performed_by, "timestamp": h.timestamp}
            for h in history
        ],
    }


@router.get("/allocations/{allocation_id}/pdf")
def get_hospital_allocation_pdf(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    from fastapi.responses import Response
    from app.services.pdf_service import generate_allocation_certificate_pdf

    data = get_hospital_allocation_detail(allocation_id, db, current_user)
    pdf_bytes = generate_allocation_certificate_pdf(data)

    alloc_uid = data["allocation"]["allocation_uid"] or f"ALLOC-{allocation_id}"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Allocation_Certificate_{alloc_uid}.pdf"
        }
    )


@router.get("/allocations/{allocation_id}/recipient-dossier-pdf")
def get_hospital_allocation_recipient_dossier_pdf(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_hospital)):
    """
    Provides the Donor Hospital (and Recipient Hospital) with the complete Recipient Clinical Information Dossier in PDF format.
    """
    from fastapi.responses import Response
    from app.services.pdf_service import generate_recipient_dossier_pdf

    data = get_hospital_allocation_detail(allocation_id, db, current_user)
    pdf_bytes = generate_recipient_dossier_pdf(data)

    alloc_uid = data["allocation"]["allocation_uid"] or f"ALLOC-{allocation_id}"
    receiver_uid = data.get("receiver", {}).get("uid", "RECIPIENT")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Recipient_Dossier_{receiver_uid}_{alloc_uid}.pdf"
        }
    )


# ─── Operational Feasibility & Readiness Checklist (Phase 5) ───────────────────

@router.get("/readiness/{patient_id}")
def get_patient_readiness(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.hospital_id == hid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this hospital")

    from app.services.feasibility import get_or_create_hospital_readiness
    readiness = get_or_create_hospital_readiness(hospital_id=hid, patient_id=patient_id, db=db)
    return readiness


@router.post("/readiness/update")
def update_hospital_readiness(
    patient_id: Optional[int] = Form(None),
    offer_id: Optional[int] = Form(None),
    hospital_verified: bool = Form(True),
    recipient_ready: bool = Form(True),
    icu_available: bool = Form(True),
    ot_available: bool = Form(True),
    surgeon_available: bool = Form(True),
    transplant_team_available: bool = Form(True),
    required_equipment: bool = Form(True),
    blood_bank_ready: bool = Form(True),
    recipient_present: bool = Form(True),
    documents_complete: bool = Form(True),
    estimated_prep_minutes: int = Form(30),
    bottleneck_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)
    from app.models.allocation import HospitalReadiness
    from app.services.feasibility import evaluate_operational_readiness

    fields = {
        "hospital_verified": hospital_verified,
        "recipient_ready": recipient_ready,
        "icu_available": icu_available,
        "ot_available": ot_available,
        "surgeon_available": surgeon_available,
        "transplant_team_available": transplant_team_available,
        "required_equipment": required_equipment,
        "blood_bank_ready": blood_bank_ready,
        "recipient_present": recipient_present,
        "documents_complete": documents_complete,
        "estimated_prep_minutes": estimated_prep_minutes,
        "bottleneck_notes": bottleneck_notes,
    }

    eval_result = evaluate_operational_readiness(fields)

    # Find existing or create new
    q = db.query(HospitalReadiness).filter(HospitalReadiness.hospital_id == hid)
    if patient_id:
        q = q.filter(HospitalReadiness.patient_id == patient_id)
    record = q.order_by(HospitalReadiness.updated_at.desc()).first()

    if not record:
        record = HospitalReadiness(hospital_id=hid, patient_id=patient_id, offer_id=offer_id)
        db.add(record)

    # Check for state changes to log dynamic revalidation events (Phase 10 & 11)
    from app.services.revalidation import log_allocation_event
    readiness_fields_to_check = {
        "icu_available": (record.icu_available, icu_available),
        "ot_available": (record.ot_available, ot_available),
        "surgeon_available": (record.surgeon_available, surgeon_available),
        "recipient_ready": (record.recipient_ready, recipient_ready),
        "transplant_team_available": (record.transplant_team_available, transplant_team_available),
        "blood_bank_ready": (record.blood_bank_ready, blood_bank_ready),
        "documents_complete": (record.documents_complete, documents_complete),
    }

    for field, (old_v, new_v) in readiness_fields_to_check.items():
        if old_v != new_v and old_v is not None:
            log_allocation_event(
                db=db,
                entity_type="HOSPITAL_READINESS",
                field_changed=field,
                old_value=old_v,
                new_value=new_v,
                patient_id=patient_id,
                entity_id=record.id,
                changed_by=f"Hospital Staff ({current_user.name})",
                reason=bottleneck_notes or f"Routine readiness checklist update by {current_user.name}"
            )

    record.hospital_verified = hospital_verified
    record.recipient_ready = recipient_ready
    record.icu_available = icu_available
    record.ot_available = ot_available
    record.surgeon_available = surgeon_available
    record.transplant_team_available = transplant_team_available
    record.required_equipment = required_equipment
    record.blood_bank_ready = blood_bank_ready
    record.recipient_present = recipient_present
    record.documents_complete = documents_complete
    record.readiness_status = eval_result["readiness_status"]
    record.readiness_score = eval_result["readiness_score"]
    record.estimated_prep_minutes = estimated_prep_minutes
    record.bottleneck_notes = bottleneck_notes
    record.reported_by = current_user.name
    record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)

    return {
        "message": "Operational readiness checklist recorded successfully",
        "readiness_status": eval_result["readiness_status"],
        "readiness_score": eval_result["readiness_score"],
        "evaluation": eval_result
    }


# ─── Candidate Clinical Status Lifecycle (Phase 7) ────────────────────────────

@router.post("/receivers/{patient_id}/status")
def update_candidate_status(
    patient_id: int,
    candidate_status: str = Form(...),
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.hospital_id == hid).first()
    if not patient or patient.patient_type != PatientType.RECEIVER:
        raise HTTPException(status_code=404, detail="Candidate receiver not found in this hospital")

    from app.models.enums import CandidateStatus
    cand_upper = candidate_status.upper()
    valid_statuses = [s.value for s in CandidateStatus]
    if cand_upper not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid candidate status. Allowed: {valid_statuses}")

    old_status = patient.candidate_status
    patient.candidate_status = cand_upper

    # Log dynamic lifecycle event (Phase 10 & 11)
    from app.services.revalidation import log_allocation_event
    event_res = log_allocation_event(
        db=db,
        entity_type="PATIENT_STATUS",
        field_changed="candidate_status",
        old_value=old_status,
        new_value=cand_upper,
        patient_id=patient.id,
        changed_by=f"Hospital Staff ({current_user.name})",
        reason=reason or f"Clinical status changed from {old_status} to {cand_upper}"
    )

    db.commit()

    return {
        "message": f"Candidate status updated to {cand_upper}",
        "patient_id": patient.id,
        "candidate_status": patient.candidate_status,
        "impact_analysis": event_res.get("impact")
    }


# ─── Allocation Decision Record (Phase 14) ───────────────────────────────────

@router.get("/allocations/{allocation_id}/decision-record")
def get_hospital_decision_record(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_hospital)
):
    hid = get_hospital_id(current_user)
    alloc = db.query(Allocation).filter(
        Allocation.id == allocation_id,
        (Allocation.donor_hospital_id == hid) | (Allocation.receiver_hospital_id == hid)
    ).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation record not accessible by this hospital")

    from app.services.decision_record import get_allocation_decision_record
    record = get_allocation_decision_record(db, allocation_id)
    if not record:
        raise HTTPException(status_code=404, detail="Allocation Decision Record not yet generated. Awaiting coordinator confirmation.")
    return record



