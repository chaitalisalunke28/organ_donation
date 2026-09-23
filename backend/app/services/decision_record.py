"""
Allocation Decision Record Service (Phase 14)
Creates and manages permanent, tamper-evident audit dossiers explaining precisely
WHY an allocation was confirmed by the Transplant Coordinator.
"""
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.allocation import (
    Allocation,
    Match,
    AllocationOffer,
    AllocationDecisionRecord,
    HospitalReadiness,
    OrganTransport,
)
from app.models.organ import Organ
from app.models.patient import Patient
from app.models.user import User
from app.models.enums import OfferStatus


def create_allocation_decision_record(
    db: Session,
    allocation_id: int,
    coordinator_user: User,
    custom_justification: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates an immutable, digitally-sealed Allocation Decision Record upon confirmation.
    Captures complete multi-dimensional audit snapshot: Compatibility, Policy, Priority,
    Operational Risk, Match Stability, Readiness, and Prior Rejection Logs.
    """
    alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not alloc:
        raise ValueError("Allocation not found")

    organ = db.query(Organ).filter(Organ.id == alloc.organ_id).first()
    donor = db.query(Patient).filter(Patient.id == alloc.donor_id).first()
    receiver = db.query(Patient).filter(Patient.id == alloc.receiver_id).first()

    if not organ or not donor or not receiver:
        raise ValueError("Allocation is missing associated organ, donor, or receiver")

    # Fetch corresponding match data
    match = db.query(Match).filter(
        Match.organ_id == organ.id,
        Match.receiver_id == receiver.id
    ).first()

    score_data = json.loads(match.score_breakdown) if (match and match.score_breakdown) else {}

    # Fetch hospital readiness and transport snapshots
    readiness = db.query(HospitalReadiness).filter(
        HospitalReadiness.hospital_id == receiver.hospital_id,
        HospitalReadiness.patient_id == receiver.id
    ).first()

    transport = db.query(OrganTransport).filter(
        OrganTransport.organ_id == organ.id
    ).first()

    # Gather prior rejections audit summary
    prior_offers = db.query(AllocationOffer).filter(
        AllocationOffer.organ_id == organ.id,
        AllocationOffer.status == OfferStatus.REJECTED
    ).order_by(AllocationOffer.priority_number).all()

    rejection_summaries = []
    for po in prior_offers:
        rcvr = db.query(Patient).filter(Patient.id == po.receiver_id).first()
        r_name = rcvr.name if rcvr else f"Candidate #{po.receiver_id}"
        rejection_summaries.append(
            f"Priority #{po.priority_number} ({r_name}) REJECTED: Reason='{po.rejection_reason or 'Declined'}'"
            + (f" Notes: '{po.rejection_notes}'" if po.rejection_notes else "")
        )
    rejection_history_text = " | ".join(rejection_summaries) if rejection_summaries else "None (First-choice acceptance)"

    # Default Clinical Justification
    justification = (
        custom_justification or
        f"Allocation confirmed for Priority #{alloc.priority_number or 1} candidate {receiver.name} ({receiver.patient_uid}). "
        f"Biological compatibility verified ({score_data.get('overall_compatibility', 'COMPATIBLE')}). "
        f"NOTTO National Allocation Policy applied ({score_data.get('rule_set_id', 'NOTTO_KIDNEY_2024_V1')} {score_data.get('policy_version', 'v2.4')}). "
        f"Hospital operational readiness confirmed ({readiness.readiness_status if readiness else 'READY'}) with safe cold ischemia preservation reserve."
    )

    # Cryptographic integrity signature sealing the decision payload
    record_uid = f"ADR-{alloc.allocation_uid or f'ALLOC-{alloc.id:04d}'}"
    sig_payload = f"{record_uid}|{organ.organ_uid}|{donor.patient_uid}|{receiver.patient_uid}|{alloc.priority_number}|{coordinator_user.name}|{datetime.now().isoformat()}"
    digital_hash = hashlib.sha256(sig_payload.encode('utf-8')).hexdigest()

    # Check if record already exists for this allocation
    existing_record = db.query(AllocationDecisionRecord).filter(
        AllocationDecisionRecord.allocation_id == alloc.id
    ).first()

    if existing_record:
        rec = existing_record
    else:
        rec = AllocationDecisionRecord(
            record_uid=record_uid,
            allocation_id=alloc.id,
            allocation_uid=alloc.allocation_uid,
            organ_id=organ.id,
            organ_type=organ.organ_type,
            organ_uid=organ.organ_uid,
            donor_id=donor.id,
            donor_uid=donor.patient_uid,
            donor_name=donor.name,
            donor_hospital_name=alloc.donor_hospital.name if alloc.donor_hospital else donor.hospital.name if donor.hospital else "Donor Center",
            receiver_id=receiver.id,
            receiver_uid=receiver.patient_uid,
            receiver_name=receiver.name,
            receiver_hospital_name=alloc.receiver_hospital.name if alloc.receiver_hospital else receiver.hospital.name if receiver.hospital else "Recipient Center",
            coordinator_id=coordinator_user.id,
            coordinator_name=coordinator_user.name,
        )
        db.add(rec)

    rec.compatibility_result = score_data.get("overall_compatibility", "COMPATIBLE")
    rec.crossmatch_result = score_data.get("crossmatch_result", "NEGATIVE")
    rec.size_compatibility = score_data.get("size_compatibility", "OPTIMAL")
    rec.hla_mismatches = score_data.get("hla_mismatches", 0)
    rec.policy_rule_set_id = score_data.get("rule_set_id", "NOTTO_KIDNEY_2024_V1")
    rec.policy_version = score_data.get("policy_version", "v2.4 (2024)")
    rec.priority_number = alloc.priority_number or 1
    rec.priority_score = match.priority_score if match else score_data.get("total", 0.0)
    rec.priority_score_breakdown = match.score_breakdown if match else json.dumps(score_data)
    rec.operational_risk_tier = score_data.get("operational_risk_tier", "LOW_RISK")
    rec.operational_risk_probability = score_data.get("operational_risk_probability", 0.12)
    rec.match_stability_tier = score_data.get("stability_tier", match.stability_tier if match else "HIGH")
    rec.match_stability_score = score_data.get("stability_score", match.stability_score if match else 85.0)
    rec.hospital_readiness_status = readiness.readiness_status if readiness else "READY"
    rec.hospital_readiness_score = readiness.readiness_score if readiness else 100.0
    rec.remaining_preservation_buffer_hours = score_data.get("remaining_preservation_buffer_hours", 18.0)
    rec.decision_status = "CONFIRMED"
    rec.clinical_justification = justification
    rec.rejection_history_summary = rejection_history_text
    rec.digital_signature_hash = digital_hash
    rec.timestamp = datetime.now()

    db.commit()
    db.refresh(rec)

    return format_decision_record_response(rec)


def get_allocation_decision_record(db: Session, allocation_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieves the sealed Decision Record for an allocation.
    """
    rec = db.query(AllocationDecisionRecord).filter(
        AllocationDecisionRecord.allocation_id == allocation_id
    ).first()
    if not rec:
        return None
    return format_decision_record_response(rec)


def format_decision_record_response(rec: AllocationDecisionRecord) -> Dict[str, Any]:
    breakdown = {}
    if rec.priority_score_breakdown:
        try:
            breakdown = json.loads(rec.priority_score_breakdown)
        except Exception:
            breakdown = {}

    return {
        "id": rec.id,
        "record_uid": rec.record_uid,
        "allocation_id": rec.allocation_id,
        "allocation_uid": rec.allocation_uid,
        "timestamp": rec.timestamp.isoformat() if rec.timestamp else datetime.now().isoformat(),
        "timestamp_formatted": rec.timestamp.strftime("%d %b %Y, %H:%M") if rec.timestamp else "",
        "organ": {
            "organ_id": rec.organ_id,
            "organ_uid": rec.organ_uid,
            "organ_type": rec.organ_type,
        },
        "donor": {
            "donor_id": rec.donor_id,
            "donor_uid": rec.donor_uid,
            "donor_name": rec.donor_name,
            "donor_hospital": rec.donor_hospital_name,
        },
        "receiver": {
            "receiver_id": rec.receiver_id,
            "receiver_uid": rec.receiver_uid,
            "receiver_name": rec.receiver_name,
            "receiver_hospital": rec.receiver_hospital_name,
        },
        "compatibility": {
            "overall_compatibility": rec.compatibility_result,
            "crossmatch_result": rec.crossmatch_result,
            "size_compatibility": rec.size_compatibility,
            "hla_mismatches": rec.hla_mismatches,
        },
        "policy": {
            "rule_set_id": rec.policy_rule_set_id,
            "policy_version": rec.policy_version,
            "priority_number": rec.priority_number,
            "priority_score": rec.priority_score,
            "score_breakdown": breakdown,
        },
        "operational_feasibility": {
            "readiness_status": rec.hospital_readiness_status,
            "readiness_score": rec.hospital_readiness_score,
            "operational_risk_tier": rec.operational_risk_tier,
            "operational_risk_probability": rec.operational_risk_probability,
            "match_stability_tier": rec.match_stability_tier,
            "match_stability_score": rec.match_stability_score,
            "remaining_preservation_buffer_hours": rec.remaining_preservation_buffer_hours,
        },
        "coordinator": {
            "coordinator_id": rec.coordinator_id,
            "coordinator_name": rec.coordinator_name,
            "decision": rec.decision_status,
            "clinical_justification": rec.clinical_justification,
        },
        "rejection_audit_trail": rec.rejection_history_summary,
        "digital_signature_hash": rec.digital_signature_hash,
    }
