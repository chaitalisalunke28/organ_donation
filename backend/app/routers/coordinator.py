import json
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.patient import Patient, ReceiverProfile
from app.models.organ import Organ
from app.models.allocation import (Match, AllocationOffer, Allocation,
                                    AllocationHistory, Notification, AllocationRuleSet)
from app.models.user import User
from app.models.enums import (UserRole, PatientType, EligibilityStatus,
                               OrganAvailabilityStatus, OfferStatus, AllocationStatus)
from app.core.security import require_role
from app.services.compatibility import apply_hard_filters
from app.services.priority import generate_priority_list, get_active_rule_set
from app.services.notifications import create_notification

router = APIRouter(prefix="/coordinator", tags=["Coordinator"])
require_coord = require_role(UserRole.COORDINATOR)

ALLOC_COUNTER = {"n": 0}


def next_alloc_uid(db: Session) -> str:
    count = db.query(Allocation).count()
    return f"ALLOC-{count + 1:04d}"


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def coordinator_dashboard(db: Session = Depends(get_db), current_user=Depends(require_coord)):
    available_organs = db.query(Organ).filter(Organ.availability_status == OrganAvailabilityStatus.AVAILABLE).count()
    offered_organs = db.query(Organ).filter(Organ.availability_status == OrganAvailabilityStatus.OFFERED).count()
    eligible_receivers = db.query(Patient).filter(
        Patient.patient_type == PatientType.RECEIVER,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).count()
    active_matches = db.query(Match).count()
    pending_offers = db.query(AllocationOffer).filter(AllocationOffer.status == OfferStatus.PENDING).count()
    completed = db.query(Allocation).filter(Allocation.status == AllocationStatus.COMPLETED).count()
    unallocated = db.query(Organ).filter(Organ.availability_status == OrganAvailabilityStatus.UNALLOCATED).count()
    in_progress = db.query(Allocation).filter(Allocation.status == AllocationStatus.IN_PROGRESS).count()

    return {
        "available_organs": available_organs,
        "offered_organs": offered_organs,
        "eligible_receivers": eligible_receivers,
        "active_matches": active_matches,
        "pending_offers": pending_offers,
        "completed_allocations": completed,
        "unallocated_organs": unallocated,
        "in_progress": in_progress,
    }


# ─── Cross-Hospital Eligible Donors ───────────────────────────────────────────

@router.get("/donors")
def eligible_donors(
    organ_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    q = db.query(Patient).filter(
        Patient.patient_type == PatientType.DONOR,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    )
    donors = q.all()

    result = []
    for d in donors:
        organs = db.query(Organ).filter(Organ.donor_patient_id == d.id).all()
        if organ_type and organ_type.upper() != "ALL":
            organs = [o for o in organs if o.organ_type.value == organ_type.upper()]
        if organ_type and organ_type.upper() != "ALL" and not organs:
            continue
        dp = d.donor_profile
        result.append({
            "id": d.id,
            "patient_uid": d.patient_uid,
            "name": d.name,
            "age": d.age,
            "gender": d.gender,
            "blood_group": d.blood_group.value if hasattr(d.blood_group, 'value') else d.blood_group,
            "height_cm": d.height_cm,
            "weight_kg": d.weight_kg,
            "eligibility_status": d.eligibility_status,
            "hospital_name": d.hospital.name if d.hospital else None,
            "hospital_id": d.hospital_id,
            "hypertension": dp.hypertension if dp else False,
            "diabetes": dp.diabetes if dp else False,
            "renal_history": dp.renal_history if dp else None,
            "cardiac_history": dp.cardiac_history if dp else None,
            "infection_history": dp.infection_history if dp else None,
            "organs": [
                {
                    "id": o.id,
                    "organ_uid": o.organ_uid,
                    "organ_type": o.organ_type,
                    "organ_condition": o.organ_condition,
                    "donor_creatinine": o.donor_creatinine,
                    "kidney_function": o.kidney_function,
                    "kidney_quality": o.kidney_quality,
                    "preservation_method": o.preservation_method,
                    "retrieval_time": o.retrieval_time,
                    "preservation_start": o.preservation_start,
                    "availability_status": o.availability_status,
                }
                for o in organs
            ],
        })
    return result


# ─── Cross-Hospital Eligible Receivers ────────────────────────────────────────

@router.get("/receivers")
def eligible_receivers(
    organ_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    q = db.query(Patient).filter(
        Patient.patient_type == PatientType.RECEIVER,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    )
    receivers = q.all()

    if organ_type and organ_type.upper() != "ALL":
        receivers = [
            r for r in receivers
            if r.receiver_profile and r.receiver_profile.required_organ.upper() == organ_type.upper()
        ]

    result = []
    for r in receivers:
        waiting_days = 0
        rp = r.receiver_profile
        if rp and rp.waiting_start_date:
            now = datetime.now(timezone.utc)
            start = rp.waiting_start_date
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            waiting_days = max(0, (now - start).days)
        result.append({
            "id": r.id,
            "patient_uid": r.patient_uid,
            "name": r.name,
            "age": r.age,
            "gender": r.gender,
            "blood_group": r.blood_group.value if hasattr(r.blood_group, 'value') else r.blood_group,
            "height_cm": r.height_cm,
            "weight_kg": r.weight_kg,
            "required_organ": rp.required_organ if rp else None,
            "urgency_level": rp.urgency_level if rp else None,
            "dialysis_status": rp.dialysis_status if rp else None,
            "dialysis_duration_months": rp.dialysis_duration_months if rp else None,
            "pra": rp.pra if rp else None,
            "cpra": rp.cpra if rp else None,
            "hla_typing": rp.hla_typing if rp else None,
            "crossmatch_result": rp.crossmatch_result if rp else None,
            "pediatric_status": rp.pediatric_status if rp else False,
            "prior_living_donor": rp.prior_living_donor if rp else False,
            "special_status": rp.special_status if rp else None,
            "waiting_days": waiting_days,
            "eligibility_status": r.eligibility_status,
            "hospital_name": r.hospital.name if r.hospital else None,
            "hospital_id": r.hospital_id,
        })
    return result


# ─── Available Organs ────────────────────────────────────────────────────────

@router.get("/organs")
def available_organs(
    organ_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    q = db.query(Organ)
    if organ_type and organ_type.upper() != "ALL":
        q = q.filter(Organ.organ_type == organ_type.upper())
    if status_filter:
        q = q.filter(Organ.availability_status == status_filter.upper())
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
            "preservation_method": o.preservation_method,
            "retrieval_time": o.retrieval_time,
            "preservation_start": o.preservation_start,
            "availability_status": o.availability_status,
            "created_at": o.created_at,
            "donor_name": donor.name if donor else None,
            "donor_uid": donor.patient_uid if donor else None,
            "donor_blood_group": donor.blood_group.value if donor and hasattr(donor.blood_group, 'value') else (donor.blood_group if donor else None),
            "donor_height_cm": donor.height_cm if donor else None,
            "donor_weight_kg": donor.weight_kg if donor else None,
            "donor_hospital": donor.hospital.name if donor and donor.hospital else None,
            "donor_hospital_id": donor.hospital_id if donor else None,
        })
    return result


# ─── Allocation Policy Rules (Phase 4) ────────────────────────────────────────

@router.get("/policies/active")
def get_active_policy(organ_type: Optional[str] = "KIDNEY", db: Session = Depends(get_db), current_user=Depends(require_coord)):
    policy = get_active_rule_set(organ_type or "KIDNEY", db)
    return policy


# ─── Matching ─────────────────────────────────────────────────────────────────

@router.post("/match/{organ_id}")
def match_organ(organ_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail="Organ not found")
    if organ.availability_status not in [OrganAvailabilityStatus.AVAILABLE]:
        raise HTTPException(status_code=400, detail=f"Organ is {organ.availability_status}, cannot match")

    donor = db.query(Patient).filter(Patient.id == organ.donor_patient_id).first()
    if not donor or donor.eligibility_status != EligibilityStatus.ELIGIBLE:
        raise HTTPException(status_code=400, detail="Donor is not eligible")

    # Get active allocation policy
    active_policy = get_active_rule_set(organ.organ_type, db)

    # Get all eligible receivers
    all_receivers = db.query(Patient).filter(
        Patient.patient_type == PatientType.RECEIVER,
        Patient.eligibility_status == EligibilityStatus.ELIGIBLE
    ).all()

    # Apply hard filters
    compatible = apply_hard_filters(organ, all_receivers)
    if not compatible:
        return {
            "message": "No compatible receivers found",
            "organ_id": organ_id,
            "organ_type": organ.organ_type,
            "active_policy": active_policy,
            "priority_list": []
        }

    # Generate priority list
    priority_matches = generate_priority_list(organ, compatible, db)

    result = []
    for item in priority_matches:
        r = item["receiver"]
        breakdown = item["score_breakdown"]
        result.append({
            "priority_number": item["priority_number"],
            "receiver_id": r.id,
            "receiver_uid": r.patient_uid,
            "receiver_name": r.name,
            "blood_group": r.blood_group.value if hasattr(r.blood_group, 'value') else r.blood_group,
            "required_organ": r.receiver_profile.required_organ if r.receiver_profile else None,
            "urgency": breakdown.get("urgency"),
            "urgency_score": breakdown.get("urgency_score", 0),
            "waiting_days": breakdown.get("waiting_days", 0),
            "waiting_score": breakdown.get("waiting_score", 0),
            "compatibility": breakdown.get("compatibility"),
            "compatibility_score": breakdown.get("compatibility_score", 0),
            "total_score": breakdown.get("total", 0),
            "special_population_points": breakdown.get("special_population_points", 0),
            "dialysis_vintage_points": breakdown.get("dialysis_vintage_points", 0),
            "hla_points": breakdown.get("hla_points", 0),
            "abo_points": breakdown.get("abo_points", 0),
            "geographic_points": breakdown.get("geographic_points", 0),
            "readiness_status": breakdown.get("readiness_status", "READY"),
            "readiness_score": breakdown.get("readiness_score", 100.0),
            "hospital_readiness": breakdown.get("hospital_readiness", {}),
            "transport": breakdown.get("transport", {}),
            "preservation": breakdown.get("preservation", {}),
            "remaining_preservation_buffer_hours": breakdown.get("remaining_preservation_buffer_hours", 20.0),
            "preservation_risk_status": breakdown.get("preservation_risk_status", "SAFE"),
            "ml_risk": breakdown.get("ml_risk", {}),
            "operational_risk_probability": breakdown.get("operational_risk_probability", 0.12),
            "operational_risk_tier": breakdown.get("operational_risk_tier", "LOW_RISK"),
            "is_operationally_feasible": breakdown.get("is_operationally_feasible", True),
            "xai_positive_factors": breakdown.get("xai_positive_factors", []),
            "xai_risk_factors": breakdown.get("xai_risk_factors", []),
            "xai_disclaimer": breakdown.get("xai_disclaimer", ""),
            # Match Stability & Sensitivity Simulation (Phase 12)
            "stability_score": breakdown.get("stability_score", 85.0),
            "stability_tier": breakdown.get("stability_tier", "HIGH"),
            "stability_tier_description": breakdown.get("stability_tier_description", ""),
            "stability_sub_scores": breakdown.get("stability_sub_scores", {}),
            "sensitivity": breakdown.get("sensitivity", {}),
            "max_delay_tolerance_minutes": breakdown.get("max_delay_tolerance_minutes", 120),
            "rule_set_id": breakdown.get("rule_set_id", active_policy["rule_set_id"]),
            "policy_version": breakdown.get("policy_version", active_policy["policy_version"]),
            "source_reference": breakdown.get("source_reference", active_policy["source_reference"]),
            "score_breakdown": breakdown,
            "overall_compatibility": breakdown.get("overall_compatibility", "COMPATIBLE"),
            "size_compatibility": breakdown.get("size_compatibility", "OPTIMAL"),
            "immune_compatibility": breakdown.get("immune_compatibility", "COMPATIBLE"),
            "crossmatch_result": breakdown.get("crossmatch_result", "NEGATIVE"),
            "hla_mismatches": breakdown.get("hla_mismatches", 0),
            "compatibility_assessment": breakdown.get("compatibility_assessment", {}),
            "tier_qualifications": breakdown.get("tier_qualifications", []),
            "hospital_name": r.hospital.name if r.hospital else None,
            "hospital_id": r.hospital_id,
        })

    return {
        "organ_id": organ_id,
        "organ_type": organ.organ_type,
        "active_policy": active_policy,
        "priority_list": result
    }


@router.get("/priority-list/{organ_id}")
def get_priority_list(organ_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail="Organ not found")

    active_policy = get_active_rule_set(organ.organ_type, db)
    matches = db.query(Match).filter(Match.organ_id == organ_id).order_by(Match.priority_number).all()
    result = []
    for m in matches:
        r = db.query(Patient).filter(Patient.id == m.receiver_id).first()
        breakdown = json.loads(m.score_breakdown) if m.score_breakdown else {}
        # Check if there's an existing offer for this receiver+organ
        offer = db.query(AllocationOffer).filter(
            AllocationOffer.organ_id == organ_id,
            AllocationOffer.receiver_id == m.receiver_id
        ).order_by(AllocationOffer.created_at.desc()).first()

        result.append({
            "priority_number": m.priority_number,
            "receiver_id": r.id if r else None,
            "receiver_uid": r.patient_uid if r else None,
            "receiver_name": r.name if r else None,
            "blood_group": r.blood_group.value if r and hasattr(r.blood_group, 'value') else None,
            "required_organ": r.receiver_profile.required_organ if r and r.receiver_profile else None,
            "urgency": breakdown.get("urgency"),
            "waiting_days": breakdown.get("waiting_days"),
            "compatibility": breakdown.get("compatibility"),
            "total_score": m.priority_score,
            "special_population_points": breakdown.get("special_population_points", 0),
            "dialysis_vintage_points": breakdown.get("dialysis_vintage_points", 0),
            "hla_points": breakdown.get("hla_points", 0),
            "abo_points": breakdown.get("abo_points", 0),
            "geographic_points": breakdown.get("geographic_points", 0),
            "readiness_status": breakdown.get("readiness_status", "READY"),
            "readiness_score": breakdown.get("readiness_score", 100.0),
            "hospital_readiness": breakdown.get("hospital_readiness", {}),
            "transport": breakdown.get("transport", {}),
            "preservation": breakdown.get("preservation", {}),
            "remaining_preservation_buffer_hours": breakdown.get("remaining_preservation_buffer_hours", 20.0),
            "preservation_risk_status": breakdown.get("preservation_risk_status", "SAFE"),
            "ml_risk": breakdown.get("ml_risk", {}),
            "operational_risk_probability": breakdown.get("operational_risk_probability", 0.12),
            "operational_risk_tier": breakdown.get("operational_risk_tier", "LOW_RISK"),
            "is_operationally_feasible": breakdown.get("is_operationally_feasible", True),
            "xai_positive_factors": breakdown.get("xai_positive_factors", []),
            "xai_risk_factors": breakdown.get("xai_risk_factors", []),
            "xai_disclaimer": breakdown.get("xai_disclaimer", ""),
            # Match Stability & Sensitivity Simulation (Phase 12)
            "stability_score": breakdown.get("stability_score", m.stability_score or 85.0),
            "stability_tier": breakdown.get("stability_tier", m.stability_tier or "HIGH"),
            "stability_tier_description": breakdown.get("stability_tier_description", ""),
            "stability_sub_scores": breakdown.get("stability_sub_scores", {}),
            "sensitivity": breakdown.get("sensitivity", {}),
            "max_delay_tolerance_minutes": breakdown.get("max_delay_tolerance_minutes", 120),
            "rule_set_id": breakdown.get("rule_set_id", active_policy["rule_set_id"]),
            "policy_version": breakdown.get("policy_version", active_policy["policy_version"]),
            "source_reference": breakdown.get("source_reference", active_policy["source_reference"]),
            "score_breakdown": breakdown,
            "hospital_name": r.hospital.name if r and r.hospital else None,
            "hospital_id": r.hospital_id if r else None,
            "offer_status": offer.status if offer else None,
            "offer_id": offer.id if offer else None,
        })
    return {
        "organ_id": organ_id,
        "active_policy": active_policy,
        "priority_list": result
    }


# ─── Operational Intelligence & Risk Assessment Endpoints ────────────────────

@router.get("/readiness/{hospital_id}/{receiver_id}")
def get_coordinator_readiness(
    hospital_id: int,
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    from app.services.feasibility import get_or_create_hospital_readiness
    readiness = get_or_create_hospital_readiness(hospital_id=hospital_id, patient_id=receiver_id, db=db)
    return readiness


@router.get("/transport-plan/{organ_id}/{receiver_id}")
def get_coordinator_transport_plan(
    organ_id: int,
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    receiver = db.query(Patient).filter(Patient.id == receiver_id).first()
    if not organ or not receiver:
        raise HTTPException(status_code=404, detail="Organ or Receiver not found")

    from app.services.transport import compute_full_transport_and_preservation
    plan = compute_full_transport_and_preservation(organ, receiver, db=db)
    return plan


@router.get("/risk-assessment/{organ_id}/{receiver_id}")
def get_coordinator_risk_assessment(
    organ_id: int,
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    receiver = db.query(Patient).filter(Patient.id == receiver_id).first()
    if not organ or not receiver:
        raise HTTPException(status_code=404, detail="Organ or Receiver not found")

    from app.services.ml_risk_engine import evaluate_candidate_operational_risk
    assessment = evaluate_candidate_operational_risk(organ, receiver, db=db)
    return assessment


# ─── Sequential Offer ─────────────────────────────────────────────────────────

@router.post("/offers")
def send_offer(
    organ_id: int = Form(...),
    receiver_id: int = Form(...),
    priority_number: int = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail="Organ not found")

    # Lock check — only one active offer per organ
    active_offer = db.query(AllocationOffer).filter(
        AllocationOffer.organ_id == organ_id,
        AllocationOffer.status == OfferStatus.PENDING
    ).first()
    if active_offer:
        raise HTTPException(status_code=400, detail="Organ already has an active pending offer")

    if organ.availability_status == OrganAvailabilityStatus.ALLOCATED:
        raise HTTPException(status_code=400, detail="Organ already allocated")

    receiver = db.query(Patient).filter(Patient.id == receiver_id).first()
    if not receiver or not receiver.hospital_id:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Create or get allocation record
    allocation = db.query(Allocation).filter(
        Allocation.organ_id == organ_id,
        Allocation.status == AllocationStatus.IN_PROGRESS
    ).first()
    if not allocation:
        donor = db.query(Patient).filter(Patient.id == organ.donor_patient_id).first()
        allocation = Allocation(
            allocation_uid=next_alloc_uid(db),
            organ_id=organ_id,
            donor_id=organ.donor_patient_id,
            donor_hospital_id=donor.hospital_id,
            status=AllocationStatus.IN_PROGRESS,
            coordinator_id=current_user.id,
        )
        db.add(allocation)
        db.flush()

    # Create offer
    offer = AllocationOffer(
        organ_id=organ_id,
        receiver_id=receiver_id,
        hospital_id=receiver.hospital_id,
        priority_number=priority_number,
        status=OfferStatus.PENDING,
    )
    db.add(offer)

    # Lock organ
    organ.availability_status = OrganAvailabilityStatus.OFFERED

    # Log history
    history = AllocationHistory(
        allocation_id=allocation.id,
        event_type="OFFER_SENT",
        description=f"Organ offered to Priority #{priority_number}: {receiver.name} at {receiver.hospital.name if receiver.hospital else 'Unknown'}",
        performed_by=current_user.name,
    )
    db.add(history)

    # Notify hospital user
    hospital_users = db.query(User).filter(User.hospital_id == receiver.hospital_id, User.role == UserRole.HOSPITAL).all()
    for u in hospital_users:
        create_notification(
            db, u.id,
            title=f"Organ Offer: {organ.organ_type}",
            message=f"An organ ({organ.organ_uid or organ.organ_type}) has been offered for your patient {receiver.name}. Please respond.",
            notification_type="ORGAN_OFFERED",
            related_id=offer.id,
        )

    db.commit()
    return {"message": "Offer sent", "offer_id": offer.id, "allocation_id": allocation.id}


@router.get("/offers")
def list_offers(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    q = db.query(AllocationOffer)
    if status_filter:
        q = q.filter(AllocationOffer.status == status_filter.upper())
    offers = q.order_by(AllocationOffer.created_at.desc()).all()

    result = []
    for offer in offers:
        organ = db.query(Organ).filter(Organ.id == offer.organ_id).first()
        receiver = db.query(Patient).filter(Patient.id == offer.receiver_id).first()
        result.append({
            "id": offer.id,
            "organ_id": offer.organ_id,
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": organ.organ_type if organ else None,
            "receiver_id": offer.receiver_id,
            "receiver_name": receiver.name if receiver else None,
            "receiver_uid": receiver.patient_uid if receiver else None,
            "hospital_name": receiver.hospital.name if receiver and receiver.hospital else None,
            "priority_number": offer.priority_number,
            "status": offer.status,
            "rejection_reason": offer.rejection_reason,
            "rejection_notes": offer.rejection_notes,
            "created_at": offer.created_at,
            "responded_at": offer.responded_at,
        })
    return result


@router.post("/offers/{offer_id}/expire")
def expire_offer(offer_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    offer = db.query(AllocationOffer).filter(AllocationOffer.id == offer_id).first()
    if not offer or offer.status != OfferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Offer not found or not pending")

    offer.status = OfferStatus.EXPIRED
    offer.responded_at = datetime.now(timezone.utc)

    organ = db.query(Organ).filter(Organ.id == offer.organ_id).first()
    if organ:
        organ.availability_status = OrganAvailabilityStatus.AVAILABLE

    allocation = db.query(Allocation).filter(Allocation.organ_id == offer.organ_id, Allocation.status == AllocationStatus.IN_PROGRESS).first()
    if allocation:
        history = AllocationHistory(
            allocation_id=allocation.id,
            event_type="OFFER_EXPIRED",
            description=f"Offer to Priority #{offer.priority_number} expired by coordinator",
            performed_by=current_user.name,
        )
        db.add(history)

    db.commit()
    return {"message": "Offer expired. Organ is available for next candidate."}


# ─── Allocation Confirmation ──────────────────────────────────────────────────

@router.post("/allocations/{allocation_id}/confirm")
def confirm_allocation(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if allocation.status != AllocationStatus.ALLOCATED:
        raise HTTPException(status_code=400, detail="Allocation is not in ALLOCATED state (hospital must accept first)")

    allocation.status = AllocationStatus.ALLOCATED  # stays ALLOCATED until COMPLETED
    allocation.allocated_at = allocation.allocated_at or datetime.now(timezone.utc)

    history = AllocationHistory(
        allocation_id=allocation.id,
        event_type="ALLOCATION_CONFIRMED",
        description="Allocation confirmed by Transplant Coordinator",
        performed_by=current_user.name,
    )
    db.add(history)

    # Notify donor hospital
    donor = db.query(Patient).filter(Patient.id == allocation.donor_id).first()
    donor_hospital_users = db.query(User).filter(User.hospital_id == allocation.donor_hospital_id, User.role == UserRole.HOSPITAL).all()
    receiver = db.query(Patient).filter(Patient.id == allocation.receiver_id).first()
    for u in donor_hospital_users:
        create_notification(
            db, u.id,
            title="Allocation Confirmed",
            message=f"Organ allocation confirmed. Recipient: {receiver.name if receiver else 'N/A'} at {allocation.receiver_hospital.name if allocation.receiver_hospital else 'N/A'}.",
            notification_type="ALLOCATION_CONFIRMED",
            related_id=allocation.id,
        )

    # Generate Permanent Allocation Decision Record (Phase 14)
    from app.services.decision_record import create_allocation_decision_record
    decision_record = create_allocation_decision_record(
        db=db,
        allocation_id=allocation.id,
        coordinator_user=current_user
    )

    db.commit()
    return {
        "message": "Allocation confirmed by coordinator",
        "allocation_id": allocation.id,
        "allocation_uid": allocation.allocation_uid,
        "decision_record": decision_record
    }


@router.post("/allocations/{allocation_id}/complete")
def complete_allocation(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if allocation.status not in [AllocationStatus.ALLOCATED]:
        raise HTTPException(status_code=400, detail="Allocation must be in ALLOCATED state to complete")

    allocation.status = AllocationStatus.COMPLETED
    allocation.completed_at = datetime.now(timezone.utc)

    organ = db.query(Organ).filter(Organ.id == allocation.organ_id).first()
    if organ:
        organ.availability_status = OrganAvailabilityStatus.COMPLETED

    history = AllocationHistory(
        allocation_id=allocation.id,
        event_type="COMPLETED",
        description="Allocation marked as COMPLETED by Transplant Coordinator",
        performed_by=current_user.name,
    )
    db.add(history)

    # Notify both hospitals
    for hosp_id in [allocation.donor_hospital_id, allocation.receiver_hospital_id]:
        if not hosp_id:
            continue
        users = db.query(User).filter(User.hospital_id == hosp_id, User.role == UserRole.HOSPITAL).all()
        for u in users:
            create_notification(
                db, u.id,
                title="Allocation Completed",
                message=f"The organ allocation process has been marked as COMPLETED by the coordinator.",
                notification_type="ALLOCATION_COMPLETED",
                related_id=allocation.id,
            )

    db.commit()
    return {"message": "Allocation marked as COMPLETED"}


@router.post("/allocations/{allocation_id}/unallocated")
def mark_unallocated(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    allocation.status = AllocationStatus.UNALLOCATED
    organ = db.query(Organ).filter(Organ.id == allocation.organ_id).first()
    if organ:
        organ.availability_status = OrganAvailabilityStatus.UNALLOCATED

    history = AllocationHistory(
        allocation_id=allocation.id,
        event_type="UNALLOCATED",
        description="All eligible candidates exhausted. Organ marked as UNALLOCATED.",
        performed_by=current_user.name,
    )
    db.add(history)
    db.commit()
    return {"message": "Organ marked as UNALLOCATED — all eligible candidates exhausted"}


# ─── Allocations List ─────────────────────────────────────────────────────────

@router.get("/allocations")
def list_allocations(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    q = db.query(Allocation)
    if status_filter:
        q = q.filter(Allocation.status == status_filter.upper())
    allocations = q.order_by(Allocation.created_at.desc()).all()

    result = []
    for a in allocations:
        organ = db.query(Organ).filter(Organ.id == a.organ_id).first()
        # Get rejection history for this allocation's organ
        rejections = db.query(AllocationOffer).filter(
            AllocationOffer.organ_id == a.organ_id,
            AllocationOffer.status == OfferStatus.REJECTED
        ).all()
        result.append({
            "id": a.id,
            "allocation_uid": a.allocation_uid,
            "organ_id": a.organ_id,
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": organ.organ_type if organ else None,
            "donor_name": a.donor.name if a.donor else None,
            "donor_uid": a.donor.patient_uid if a.donor else None,
            "donor_hospital": a.donor_hospital.name if a.donor_hospital else None,
            "receiver_name": a.receiver.name if a.receiver else None,
            "receiver_uid": a.receiver.patient_uid if a.receiver else None,
            "receiver_hospital": a.receiver_hospital.name if a.receiver_hospital else None,
            "priority_number": a.priority_number,
            "status": a.status,
            "revalidation_status": a.revalidation_status or "VALID",
            "last_revalidated_at": a.last_revalidated_at,
            "stability_score": a.stability_score,
            "stability_tier": a.stability_tier,
            "coordinator": a.coordinator.name if a.coordinator else None,
            "allocated_at": a.allocated_at,
            "completed_at": a.completed_at,
            "created_at": a.created_at,
            "rejection_count": len(rejections),
        })
    return result


@router.get("/allocations/{allocation_id}")
def get_allocation_detail(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    a = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Allocation not found")

    organ = db.query(Organ).filter(Organ.id == a.organ_id).first()
    history = db.query(AllocationHistory).filter(AllocationHistory.allocation_id == a.id).order_by(AllocationHistory.timestamp).all()
    offers = db.query(AllocationOffer).filter(AllocationOffer.organ_id == a.organ_id).order_by(AllocationOffer.created_at).all()

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

    return {
        "allocation": {
            "id": a.id,
            "allocation_uid": a.allocation_uid,
            "status": a.status,
            "revalidation_status": a.revalidation_status or "VALID",
            "last_revalidated_at": a.last_revalidated_at,
            "stability_score": a.stability_score,
            "stability_tier": a.stability_tier,
            "priority_number": a.priority_number,
            "coordinator": a.coordinator.name if a.coordinator else None,
            "allocated_at": a.allocated_at,
            "completed_at": a.completed_at,
            "created_at": a.created_at,
        },
        "organ": {
            "id": organ.id if organ else None,
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": organ.organ_type if organ else None,
            "organ_condition": organ.organ_condition if organ else None,
        },
        "donor": {
            "id": a.donor.id if a.donor else None,
            "uid": a.donor.patient_uid if a.donor else None,
            "name": a.donor.name if a.donor else None,
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
            "medical_info": receiver.receiver_profile.medical_information if receiver and receiver.receiver_profile else None,
            "hospital": a.receiver_hospital.name if a.receiver_hospital else None,
            "hospital_contact": a.receiver_hospital.contact if a.receiver_hospital else None,
        } if receiver else None,
        "offers": offers_out,
        "history": [
            {"event_type": h.event_type, "description": h.description, "performed_by": h.performed_by, "timestamp": h.timestamp}
            for h in history
        ],
    }


@router.get("/rejection-history")
def rejection_history(db: Session = Depends(get_db), current_user=Depends(require_coord)):
    rejections = db.query(AllocationOffer).filter(AllocationOffer.status == OfferStatus.REJECTED).order_by(AllocationOffer.responded_at.desc()).all()
    result = []
    for r in rejections:
        organ = db.query(Organ).filter(Organ.id == r.organ_id).first()
        receiver = db.query(Patient).filter(Patient.id == r.receiver_id).first()
        result.append({
            "id": r.id,
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": organ.organ_type if organ else None,
            "receiver_name": receiver.name if receiver else None,
            "receiver_uid": receiver.patient_uid if receiver else None,
            "hospital_name": receiver.hospital.name if receiver and receiver.hospital else None,
            "priority_number": r.priority_number,
            "rejection_reason": r.rejection_reason,
            "rejection_notes": r.rejection_notes,
            "responded_at": r.responded_at,
        })
    return result


@router.get("/notifications")
def coordinator_notifications(db: Session = Depends(get_db), current_user=Depends(require_coord)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{"id": n.id, "title": n.title, "message": n.message, "type": n.notification_type, "is_read": n.is_read, "created_at": n.created_at} for n in notifs]


# ─── Coordinator Report Viewer & Allocation PDF ───────────────────────────────

@router.get("/reports/{report_id}/view")
@router.get("/reports/{report_id}/pdf")
def view_medical_report_coord(report_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    import os
    from fastapi.responses import Response
    from app.models.allocation import MedicalReport
    from app.services.pdf_service import generate_sample_medical_report_pdf

    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Medical report not found")

    patient = db.query(Patient).filter(Patient.id == report.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Associated patient not found")

    if os.path.exists(report.file_path) and os.path.getsize(report.file_path) > 100:
        with open(report.file_path, "rb") as f:
            content = f.read()
    else:
        hospital_name = patient.hospital.name if patient.hospital else "Accredited Medical Center"
        bg = patient.blood_group.value if hasattr(patient.blood_group, 'value') else patient.blood_group
        content = generate_sample_medical_report_pdf(
            patient_name=patient.name,
            patient_uid=patient.patient_uid or f"PT-{patient.id}",
            report_type=report.report_type.value if hasattr(report.report_type, 'value') else str(report.report_type),
            hospital_name=hospital_name,
            blood_group=bg or "O+"
        )

    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=Report_{report.report_type}_{patient.patient_uid or patient.id}.pdf"
        }
    )


@router.get("/allocations/{allocation_id}/pdf")
def get_coordinator_allocation_pdf(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    from fastapi.responses import Response
    from app.services.pdf_service import generate_allocation_certificate_pdf

    data = get_allocation_detail(allocation_id, db, current_user)
    # Add match breakdown if available
    a = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if a and a.receiver_id:
        m = db.query(Match).filter(Match.organ_id == a.organ_id, Match.receiver_id == a.receiver_id).first()
        if m and m.score_breakdown:
            import json
            data["match_breakdown"] = json.loads(m.score_breakdown)

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
def get_coordinator_allocation_recipient_dossier_pdf(allocation_id: int, db: Session = Depends(get_db), current_user=Depends(require_coord)):
    """
    Provides the Coordinator with the complete Recipient Clinical Information Dossier in PDF format.
    """
    from fastapi.responses import Response
    from app.services.pdf_service import generate_recipient_dossier_pdf

    data = get_allocation_detail(allocation_id, db, current_user)
    # Add match breakdown if available
    a = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if a and a.receiver_id:
        m = db.query(Match).filter(Match.organ_id == a.organ_id, Match.receiver_id == a.receiver_id).first()
        if m and m.score_breakdown:
            import json
            data["match_breakdown"] = json.loads(m.score_breakdown)

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


# ─── Dynamic Revalidation, Impact Analysis & Match Stability (Phases 10-12) ──

@router.get("/events")
def get_all_allocation_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    from app.services.revalidation import get_allocation_events
    return get_allocation_events(db, limit=limit)


@router.get("/allocations/{allocation_id}/events")
def get_allocation_event_timeline(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    from app.services.revalidation import get_allocation_events
    return get_allocation_events(db, allocation_id=allocation_id)


@router.post("/events/simulate-change")
def simulate_dynamic_change(
    entity_type: str = Form(...),
    field_changed: str = Form(...),
    old_value: str = Form(...),
    new_value: str = Form(...),
    allocation_id: Optional[int] = Form(None),
    organ_id: Optional[int] = Form(None),
    patient_id: Optional[int] = Form(None),
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Simulation testbench for dynamic revalidation and change impact analysis.
    Allows testing 'what-if' operational changes (e.g. ICU flipped to unavailable, transport delay jump).
    """
    from app.services.revalidation import log_allocation_event

    result = log_allocation_event(
        db=db,
        entity_type=entity_type,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        allocation_id=allocation_id,
        organ_id=organ_id,
        patient_id=patient_id,
        changed_by=f"Coordinator ({current_user.name})",
        reason=reason or "Simulation of dynamic environmental disruption."
    )
    return result


@router.get("/stability-simulation/{organ_id}/{receiver_id}")
def get_match_stability_simulation(
    organ_id: int,
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Returns full Match Stability assessment and multi-horizon delay sensitivity curves.
    """
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail="Organ not found")
    receiver = db.query(Patient).filter(Patient.id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    from app.services.compatibility import evaluate_full_compatibility
    from app.services.feasibility import get_or_create_hospital_readiness
    from app.services.transport import compute_full_transport_and_preservation
    from app.services.stability_engine import compute_match_stability, simulate_delay_sensitivity

    compat = evaluate_full_compatibility(organ, receiver)
    readiness = get_or_create_hospital_readiness(receiver.hospital_id, receiver.id, db)
    logistics = compute_full_transport_and_preservation(organ, receiver, db)

    stability = compute_match_stability(
        compatibility_assessment=compat,
        readiness_data=readiness,
        preservation_data=logistics["preservation"],
        transport_data=logistics["transport"],
        patient=receiver,
        organ=organ
    )

    sensitivity = simulate_delay_sensitivity(
        compatibility_assessment=compat,
        readiness_data=readiness,
        preservation_data=logistics["preservation"],
        transport_data=logistics["transport"],
        patient=receiver,
        organ=organ
    )

    return {
        "organ_id": organ.id,
        "organ_uid": organ.organ_uid,
        "organ_type": organ.organ_type,
        "receiver_id": receiver.id,
        "receiver_uid": receiver.patient_uid,
        "receiver_name": receiver.name,
        "stability": stability,
        "sensitivity": sensitivity,
        "preservation_summary": logistics["preservation"],
        "transport_summary": logistics["transport"],
        "hospital_readiness": readiness,
    }


@router.post("/allocations/{allocation_id}/revalidate")
def revalidate_allocation(
    allocation_id: int,
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    from app.services.revalidation import revalidate_allocation_by_coordinator
    try:
        return revalidate_allocation_by_coordinator(
            db=db,
            allocation_id=allocation_id,
            coordinator_name=current_user.name,
            notes=notes
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── What-If Scenario Simulation (Phase 13) ──────────────────────────────────

@router.post("/simulate/what-if")
def simulate_what_if_scenario(
    organ_id: int = Form(...),
    receiver_id: int = Form(...),
    simulated_delay_minutes: int = Form(0),
    icu_available: Optional[bool] = Form(None),
    ot_available: Optional[bool] = Form(None),
    surgeon_available: Optional[bool] = Form(None),
    transplant_team_available: Optional[bool] = Form(None),
    recipient_ready: Optional[bool] = Form(None),
    recipient_present: Optional[bool] = Form(None),
    documents_complete: Optional[bool] = Form(None),
    transport_mode: Optional[str] = Form(None),
    route_status: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Non-destructive digital twin simulation testbench.
    Evaluates hypothetical operational scenarios (e.g. +60m delay, ICU shortage, OT bottleneck)
    without mutating active database records.
    """
    from app.services.whatif_simulation import run_whatif_scenario
    try:
        result = run_whatif_scenario(
            organ_id=organ_id,
            receiver_id=receiver_id,
            db=db,
            simulated_delay_minutes=simulated_delay_minutes,
            icu_available=icu_available,
            ot_available=ot_available,
            surgeon_available=surgeon_available,
            transplant_team_available=transplant_team_available,
            recipient_ready=recipient_ready,
            recipient_present=recipient_present,
            documents_complete=documents_complete,
            transport_mode=transport_mode,
            route_status=route_status,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Permanent Allocation Decision Record (Phase 14) ─────────────────────────

@router.get("/allocations/{allocation_id}/decision-record")
def get_decision_record(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Fetches the permanent, tamper-evident Allocation Decision Record explaining
    why this allocation was confirmed.
    """
    from app.services.decision_record import get_allocation_decision_record
    record = get_allocation_decision_record(db, allocation_id)
    if not record:
        raise HTTPException(status_code=404, detail="Allocation Decision Record not found. Allocation must be confirmed first.")
    return record


# ─── Rejection Analytics (Phase 15) ──────────────────────────────────────────

@router.get("/analytics/rejections")
def get_rejection_analytics(
    days: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Computes aggregated rejection reason analytics across the 9 standardized research categories,
    organ-wise distribution, response turnaround metrics, and training data extract.
    """
    from app.services.rejection_analytics import compute_rejection_analytics
    return compute_rejection_analytics(db, time_window_days=days)


# ─── Multi-Organ Procurement & Batch Matching (Phase 19) ─────────────────────

@router.get("/multi-organ/donors/{donor_id}")
def get_multi_organ_donor(
    donor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Retrieves all organs associated with a multi-organ donor.
    """
    from app.services.multi_organ_service import get_donor_organs_summary
    try:
        return get_donor_organs_summary(donor_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/multi-organ/match/{donor_id}")
def match_multi_organ_batch(
    donor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Executes concurrent organ-specific matching for all available organs procured from a single donor.
    """
    from app.services.multi_organ_service import run_multi_organ_matching_batch
    try:
        return run_multi_organ_matching_batch(donor_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Unified Research Data Lake Export (Phase 20) ────────────────────────────

@router.get("/research/dataset")
def get_research_dataset(
    organ_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Comprehensive 9-domain hierarchical research dataset export.
    """
    from app.services.research_dataset import build_research_dataset_json
    return build_research_dataset_json(db, organ_type_filter=organ_type)


@router.get("/research/dataset/csv")
def download_research_csv(
    organ_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_coord)
):
    """
    Downloads flat tabular research data lake CSV for statistical modeling, Pandas, and ML training.
    """
    from fastapi.responses import Response
    from app.services.research_dataset import build_research_dataset_csv
    csv_content = build_research_dataset_csv(db, organ_type_filter=organ_type)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=organ_allocation_research_dataset_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}
    )





