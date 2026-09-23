"""
Unified Research Dataset & Data Lake Export Engine (Phase 20)
============================================================
Compiles the comprehensive, research-grade organ allocation dataset structured directly
according to the 9-domain conceptual architecture:

  1. DONOR (Demographics, Medical History, Labs, Infection Screening, Immunology)
  2. ORGAN (Type, Condition, Organ-specific Data, Retrieval, Preservation, Verification)
  3. RECEIVER (Demographics, Diagnosis, Medical Condition, Urgency, Waiting Time, Immunology, Transplant History, Listing Status)
  4. COMPATIBILITY (ABO, Size, HLA, Crossmatch, Organ-specific Compatibility)
  5. ALLOCATION (Policy Version, Eligibility, Priority, Candidate Order, Geography, Offers)
  6. OPERATIONAL (ICU, OT, Surgeon, Recipient Readiness, Hospital Readiness, Transport, Preservation)
  7. DYNAMIC (Changes, Revalidation, Risk, Stability, Impact Analysis)
  8. OUTCOME (Accepted, Rejected, Dispatch, Received, Transplant, SHA-256 Seal)

Provides:
  - Full hierarchical JSON data export
  - Flat tabular CSV export for statistical research, Pandas, and ML training
"""
import csv
import io
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.organ import Organ
from app.models.hospital import Hospital
from app.models.allocation import (
    Allocation,
    AllocationOffer,
    AllocationEvent,
    AllocationDecisionRecord,
    HospitalReadiness,
    OrganTransport,
    Match,
)
from app.models.enums import PatientType, AllocationStatus


def build_research_dataset_json(db: Session, organ_type_filter: Optional[str] = None) -> Dict[str, Any]:
    """
    Builds the full 9-layer research dataset across all donors, organs, allocations, and outcomes.
    """
    allocations_q = db.query(Allocation)
    if organ_type_filter:
        allocations_q = allocations_q.join(Organ).filter(Organ.organ_type == organ_type_filter.upper())
    
    allocations = allocations_q.all()
    records = []

    for alloc in allocations:
        organ = alloc.organ
        donor = alloc.donor
        recv = alloc.receiver
        decision_rec = db.query(AllocationDecisionRecord).filter(AllocationDecisionRecord.allocation_id == alloc.id).first()
        readiness = db.query(HospitalReadiness).filter(HospitalReadiness.patient_id == alloc.receiver_id).first()
        transport = db.query(OrganTransport).filter(OrganTransport.organ_id == alloc.organ_id).first()
        events = db.query(AllocationEvent).filter(AllocationEvent.allocation_id == alloc.id).all()
        offers = db.query(AllocationOffer).filter(AllocationOffer.organ_id == alloc.organ_id).all()

        # 1. DONOR DOMAIN
        dp = donor.donor_profile if donor else None
        donor_domain = {
            "donor_uid": donor.patient_uid if donor else None,
            "age": donor.age if donor else None,
            "gender": donor.gender if donor else None,
            "blood_group": donor.blood_group.value if donor else None,
            "height_cm": donor.height_cm if donor else None,
            "weight_kg": donor.weight_kg if donor else None,
            "hospital_name": donor.hospital.name if (donor and donor.hospital) else None,
            "city": donor.hospital.city if (donor and donor.hospital) else None,
            "state": donor.hospital.state if (donor and donor.hospital) else None,
            "hypertension": dp.hypertension if dp else False,
            "diabetes": dp.diabetes if dp else False,
            "renal_history": dp.renal_history if dp else None,
            "cardiac_history": dp.cardiac_history if dp else None,
            "infection_screening": dp.infectious_disease_screening if dp else "Negative (HIV/HCV/HBV)",
            "medical_history": dp.medical_history if dp else None,
        }

        # 2. ORGAN DOMAIN
        organ_domain = {
            "organ_uid": organ.organ_uid if organ else None,
            "organ_type": organ.organ_type.value if organ else None,
            "organ_condition": organ.organ_condition if organ else "Standard",
            "retrieval_time": organ.retrieval_time.isoformat() if (organ and organ.retrieval_time) else None,
            "preservation_method": organ.preservation_method if organ else "Static Cold Storage",
            "availability_status": organ.availability_status.value if organ else None,
            "donor_creatinine": organ.donor_creatinine if organ else None,
            "donor_bilirubin": organ.donor_bilirubin if organ else None,
            "donor_ast": organ.donor_ast if organ else None,
            "donor_alt": organ.donor_alt if organ else None,
            "donor_lvef": organ.donor_lvef if organ else None,
            "donor_pao2_fio2": organ.donor_pao2_fio2_ratio if organ else None,
            "steatosis_pct": organ.liver_steatosis_pct if organ else None,
        }

        # 3. RECEIVER DOMAIN
        rp = recv.receiver_profile if recv else None
        receiver_domain = {
            "receiver_uid": recv.patient_uid if recv else None,
            "age": recv.age if recv else None,
            "gender": recv.gender if recv else None,
            "blood_group": recv.blood_group.value if recv else None,
            "height_cm": recv.height_cm if recv else None,
            "weight_kg": recv.weight_kg if recv else None,
            "hospital_name": recv.hospital.name if (recv and recv.hospital) else None,
            "urgency_level": rp.urgency_level if rp else "MEDIUM",
            "candidate_status": recv.candidate_status.value if recv else "ACTIVE",
            "dialysis_status": rp.dialysis_status if rp else None,
            "pra": rp.pra if rp else 0.0,
            "cpra": rp.cpra if rp else 0.0,
            "meld_score": rp.meld_score if rp else None,
            "las_score": rp.las_score if rp else None,
            "heart_urgency_category": rp.heart_urgency_category if rp else None,
            "pediatric_status": rp.pediatric_status if rp else False,
            "prior_living_donor": rp.prior_living_donor if rp else False,
            "waiting_start_date": rp.waiting_start_date.isoformat() if (rp and rp.waiting_start_date) else None,
        }

        # 4. COMPATIBILITY DOMAIN
        compat_domain = {
            "abo_compatibility": decision_rec.compatibility_result if decision_rec else "COMPATIBLE",
            "size_compatibility": decision_rec.size_compatibility if decision_rec else "OPTIMAL",
            "crossmatch_result": decision_rec.crossmatch_result if decision_rec else "NEGATIVE",
            "hla_mismatches": decision_rec.hla_mismatches if decision_rec else 0,
        }

        # 5. ALLOCATION DOMAIN
        alloc_domain = {
            "allocation_uid": alloc.allocation_uid,
            "priority_number": alloc.priority_number,
            "priority_score": decision_rec.priority_score if decision_rec else 0.0,
            "policy_rule_set_id": decision_rec.policy_rule_set_id if decision_rec else "NOTTO_2024",
            "policy_version": decision_rec.policy_version if decision_rec else "v2.4",
            "total_offers_count": len(offers),
            "allocated_at": alloc.allocated_at.isoformat() if alloc.allocated_at else None,
        }

        # 6. OPERATIONAL DOMAIN
        op_domain = {
            "readiness_status": readiness.readiness_status if readiness else "READY",
            "readiness_score": readiness.readiness_score if readiness else 100.0,
            "icu_available": readiness.icu_available if readiness else True,
            "ot_available": readiness.ot_available if readiness else True,
            "surgeon_available": readiness.surgeon_available if readiness else True,
            "transport_mode": transport.transport_mode if transport else "AMBULANCE_ROAD",
            "transit_minutes": transport.estimated_duration_minutes if transport else 45,
            "distance_km": transport.distance_km if transport else 25.0,
            "remaining_preservation_buffer_hours": decision_rec.remaining_preservation_buffer_hours if decision_rec else 18.0,
        }

        # 7. DYNAMIC DOMAIN
        dynamic_domain = {
            "events_count": len(events),
            "revalidation_status": alloc.revalidation_status or "VALID",
            "match_stability_score": alloc.stability_score or 85.0,
            "match_stability_tier": alloc.stability_tier or "HIGH",
            "operational_risk_tier": decision_rec.operational_risk_tier if decision_rec else "LOW_RISK",
            "operational_risk_probability": decision_rec.operational_risk_probability if decision_rec else 0.12,
        }

        # 8. OUTCOME DOMAIN
        offers_history = []
        for off in offers:
            offers_history.append({
                "offer_id": off.id,
                "priority_number": off.priority_number,
                "status": off.status.value,
                "rejection_category": off.rejection_category,
                "rejection_reason": off.rejection_reason,
            })

        outcome_domain = {
            "final_status": alloc.status.value,
            "decision_status": decision_rec.decision_status if decision_rec else "CONFIRMED",
            "decision_reason": decision_rec.clinical_justification if decision_rec else "Approved",
            "digital_seal_sha256": decision_rec.digital_signature_hash if decision_rec else None,
            "completed_at": alloc.completed_at.isoformat() if alloc.completed_at else None,
            "offers_history": offers_history,
        }

        records.append({
            "allocation_id": alloc.id,
            "donor": donor_domain,
            "organ": organ_domain,
            "receiver": receiver_domain,
            "compatibility": compat_domain,
            "allocation": alloc_domain,
            "operational": op_domain,
            "dynamic": dynamic_domain,
            "outcome": outcome_domain,
        })

    return {
        "dataset_metadata": {
            "title": "National Organ Allocation & Transplant Coordination Research Dataset",
            "version": "1.0.0-RESEARCH",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_allocation_records": len(records),
            "domains_covered": [
                "1. DONOR",
                "2. ORGAN",
                "3. RECEIVER",
                "4. COMPATIBILITY",
                "5. ALLOCATION",
                "6. OPERATIONAL",
                "7. DYNAMIC",
                "8. OUTCOME",
            ],
            "academic_citation": "OrganConnect Research Data Repository, EDI Project SEM 5, 2026",
        },
        "records": records,
    }


def build_research_dataset_csv(db: Session, organ_type_filter: Optional[str] = None) -> str:
    """
    Builds flat tabular CSV representation of the complete research data lake.
    """
    data = build_research_dataset_json(db, organ_type_filter)
    records = data["records"]

    output = io.StringIO()
    writer = csv.writer(output)

    # Flat CSV Header across all 8 domains
    headers = [
        "allocation_uid",
        "organ_type",
        "organ_uid",
        "donor_uid",
        "donor_age",
        "donor_gender",
        "donor_blood_group",
        "donor_creatinine",
        "donor_bilirubin",
        "donor_lvef",
        "donor_pao2_fio2",
        "receiver_uid",
        "receiver_age",
        "receiver_gender",
        "receiver_blood_group",
        "receiver_urgency",
        "meld_score",
        "las_score",
        "pra_percentage",
        "compatibility_result",
        "size_compatibility",
        "hla_mismatches",
        "priority_number",
        "priority_score",
        "policy_rule_set_id",
        "readiness_status",
        "readiness_score",
        "transport_mode",
        "transit_minutes",
        "preservation_buffer_hours",
        "match_stability_score",
        "match_stability_tier",
        "operational_risk_probability",
        "operational_risk_tier",
        "revalidation_status",
        "events_count",
        "final_allocation_status",
        "digital_seal_sha256",
    ]
    writer.writerow(headers)

    for r in records:
        d = r["donor"]
        org = r["organ"]
        recv = r["receiver"]
        comp = r["compatibility"]
        al = r["allocation"]
        op = r["operational"]
        dyn = r["dynamic"]
        out = r["outcome"]

        row = [
            al.get("allocation_uid"),
            org.get("organ_type"),
            org.get("organ_uid"),
            d.get("donor_uid"),
            d.get("age"),
            d.get("gender"),
            d.get("blood_group"),
            org.get("donor_creatinine"),
            org.get("donor_bilirubin"),
            org.get("donor_lvef"),
            org.get("donor_pao2_fio2"),
            recv.get("receiver_uid"),
            recv.get("age"),
            recv.get("gender"),
            recv.get("blood_group"),
            recv.get("urgency_level"),
            recv.get("meld_score"),
            recv.get("las_score"),
            recv.get("pra"),
            comp.get("abo_compatibility"),
            comp.get("size_compatibility"),
            comp.get("hla_mismatches"),
            al.get("priority_number"),
            al.get("priority_score"),
            al.get("policy_rule_set_id"),
            op.get("readiness_status"),
            op.get("readiness_score"),
            op.get("transport_mode"),
            op.get("transit_minutes"),
            op.get("remaining_preservation_buffer_hours"),
            dyn.get("match_stability_score"),
            dyn.get("match_stability_tier"),
            dyn.get("operational_risk_probability"),
            dyn.get("operational_risk_tier"),
            dyn.get("revalidation_status"),
            dyn.get("events_count"),
            out.get("final_status"),
            out.get("digital_seal_sha256"),
        ]
        writer.writerow(row)

    return output.getvalue()
