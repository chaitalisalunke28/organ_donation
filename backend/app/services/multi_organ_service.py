"""
Multi-Organ Procurement & Allocation Coordination Engine (Phase 19)
===================================================================
Enables deceased multi-organ donor management (D001 -> Kidney L, Kidney R, Liver, Heart, Lung),
concurrent matching runners across organs, and multi-organ allocation policies (e.g. Simultaneous
Liver-Kidney SLK, Heart-Kidney HK).
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.patient import Patient, ReceiverProfile
from app.models.organ import Organ
from app.models.hospital import Hospital
from app.models.enums import OrganType, OrganAvailabilityStatus, CandidateStatus, EligibilityStatus, PatientType
from app.services.priority import generate_priority_list
from app.services.compatibility import evaluate_full_compatibility
from app.services.liver_allocation import score_liver_receiver, evaluate_liver_compatibility
from app.services.heart_allocation import score_heart_receiver, evaluate_heart_compatibility
from app.services.lung_allocation import score_lung_receiver, evaluate_lung_compatibility


def get_donor_organs_summary(donor_id: int, db: Session) -> Dict[str, Any]:
    """
    Retrieves all available and allocated organs associated with a multi-organ donor.
    """
    donor = db.query(Patient).filter(Patient.id == donor_id).first()
    if not donor:
        raise ValueError(f"Donor with ID {donor_id} not found")

    organs = db.query(Organ).filter(Organ.donor_patient_id == donor_id).all()

    organ_list = []
    for org in organs:
        alloc = org.allocation
        organ_list.append({
            "organ_id": org.id,
            "organ_uid": org.organ_uid,
            "organ_type": org.organ_type.value,
            "availability_status": org.availability_status.value,
            "organ_condition": org.organ_condition,
            "retrieval_time": org.retrieval_time.isoformat() if org.retrieval_time else None,
            "allocation_id": alloc.id if alloc else None,
            "allocation_status": alloc.status.value if alloc else None,
            "allocated_recipient": alloc.receiver.name if (alloc and alloc.receiver) else None,
            "allocated_hospital": alloc.receiver_hospital.name if (alloc and alloc.receiver_hospital) else None,
        })

    return {
        "donor_id": donor.id,
        "donor_uid": donor.patient_uid,
        "donor_name": donor.name,
        "donor_blood_group": donor.blood_group.value if donor.blood_group else None,
        "donor_age": donor.age,
        "donor_hospital": donor.hospital.name if donor.hospital else "Hospital",
        "total_organs_procured": len(organs),
        "organs": organ_list,
    }


def run_multi_organ_matching_batch(donor_id: int, db: Session) -> Dict[str, Any]:
    """
    Executes concurrent organ-specific matching for all available organs procured from a single donor.
    Dispatches to Kidney NOTTO, Liver MELD-Na, Heart Status 1A/1B, and Lung LAS engines.
    """
    donor = db.query(Patient).filter(Patient.id == donor_id).first()
    if not donor:
        raise ValueError(f"Donor with ID {donor_id} not found")

    organs = db.query(Organ).filter(
        Organ.donor_patient_id == donor_id,
        Organ.availability_status.in_([OrganAvailabilityStatus.AVAILABLE, OrganAvailabilityStatus.OFFERED])
    ).all()

    if not organs:
        return {
            "donor_uid": donor.patient_uid,
            "donor_name": donor.name,
            "message": "No available unallocated organs for matching on this donor.",
            "results": [],
        }

    results = []
    for org in organs:
        candidates = db.query(Patient).join(ReceiverProfile).filter(
            Patient.patient_type == PatientType.RECEIVER,
            Patient.candidate_status == CandidateStatus.ACTIVE,
            ReceiverProfile.required_organ == org.organ_type.value
        ).all()
        compatible = [r for r in candidates if evaluate_full_compatibility(org, r).get("is_compatible", False)]
        priority_matches = generate_priority_list(org, compatible, db)

        serialized_matches = []
        for m in priority_matches:
            recv = m["receiver"]
            serialized_matches.append({
                "priority_number": m["priority_number"],
                "receiver_id": recv.id,
                "receiver_uid": recv.patient_uid,
                "receiver_name": recv.name,
                "receiver_blood_group": recv.blood_group.value if recv.blood_group else None,
                "receiver_hospital": recv.hospital.name if recv.hospital else None,
                "priority_score": m["score_breakdown"].get("total", 0.0),
                "stability_score": m.get("stability_score"),
                "stability_tier": m.get("stability_tier"),
                "tier_qualifications": m["score_breakdown"].get("tier_qualifications", []),
            })

        results.append({
            "organ_id": org.id,
            "organ_uid": org.organ_uid,
            "organ_type": org.organ_type.value,
            "total_candidates_matched": len(compatible),
            "top_candidate": serialized_matches[0] if serialized_matches else None,
            "priority_list": serialized_matches[:5],  # Top 5
            "policy_used": priority_matches[0].get("rule_set_id", "STANDARD") if priority_matches else "STANDARD",
        })

    return {
        "donor_uid": donor.patient_uid,
        "donor_name": donor.name,
        "donor_blood_group": donor.blood_group.value if donor.blood_group else None,
        "donor_hospital": donor.hospital.name if donor.hospital else "Donor Facility",
        "matched_at": datetime.now(timezone.utc).isoformat(),
        "total_organs_evaluated": len(results),
        "results": results,
    }
