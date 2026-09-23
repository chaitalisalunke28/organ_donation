"""
Priority Scoring Engine (Phase 4 — Dynamic Allocation Rule Sets)
================================================================
Generates a ranked priority list for deceased donor organ allocation based on
configurable and transparent National Allocation Policies (e.g. NOTTO Deceased Donor Kidney Guidelines).

ACADEMIC DISCLAIMER: This is an academic decision-support prototype.
It assists qualified Transplant Coordinators by executing transparent, auditable policy rule sets.
Final allocation decisions and surgical verifications remain with the authorized Coordinator.

National Policy Architecture (NOTTO Kidney Guidelines v2.4):
  Total Priority Score =
      1. Special Population & Regulatory Priority (0-50 pts)
      2. Verified Dialysis Vintage / Waiting Time (0-40 pts)
      3. HLA Immunologic Matching Merit (0-30 pts)
      4. ABO Compatibility Quality (10-20 pts)
      5. Geographic Proximity Tier (0-15 pts)
"""
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.organ import Organ
from app.models.allocation import Match, AllocationRuleSet
from app.services.compatibility import evaluate_full_compatibility

# Default fallback policy if database table is empty
DEFAULT_NOTTO_KIDNEY_POLICY = {
    "rule_set_id": "NOTTO_KIDNEY_2024_V1",
    "organ_type": "KIDNEY",
    "jurisdiction": "INDIA_NATIONAL",
    "policy_version": "v2.4 (2024)",
    "source_reference": "National Organ and Tissue Transplant Organisation (NOTTO), Directorate General of Health Services, Ministry of Health & Family Welfare, Govt. of India — Deceased Donor Kidney Allocation Guidelines (2024 Edition)",
    "description": "Standardized deceased donor kidney allocation policy prioritizing prior living donors, pediatric recipients, highly sensitized patients, verified dialysis vintage, HLA immunologic match, and geographic proximity.",
    "special_population_rules": {
        "prior_living_donor_points": 50.0,
        "pediatric_points": 30.0,
        "highly_sensitized_points": 25.0,
        "highly_sensitized_cpra_threshold": 80.0,
        "previous_graft_failure_points": 15.0,
        "critical_urgency_points": 30.0,
        "high_urgency_points": 20.0,
        "medium_urgency_points": 10.0,
        "low_urgency_points": 5.0,
    },
    "priority_rules": {
        "dialysis_vintage_points_per_year": 10.0,
        "max_dialysis_vintage_points": 40.0,
        "hla_0_mismatch_points": 30.0,
        "hla_1_2_mismatch_points": 15.0,
        "hla_3_4_mismatch_points": 5.0,
        "hla_5_6_mismatch_points": 0.0,
        "abo_exact_match_points": 20.0,
        "abo_compatible_points": 10.0,
    },
    "geographic_rules": {
        "local_hospital_points": 15.0,
        "same_city_points": 10.0,
        "state_rotto_points": 5.0,
        "interstate_points": 0.0,
    }
}


def get_active_rule_set(organ_type: str, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Retrieve the active AllocationRuleSet for the organ type from DB or return the default NOTTO policy.
    """
    if db:
        # Try matching exact organ type
        rule_set = db.query(AllocationRuleSet).filter(
            AllocationRuleSet.organ_type == organ_type.upper(),
            AllocationRuleSet.is_active == 1
        ).first()

        # Fallback to ALL organs
        if not rule_set:
            rule_set = db.query(AllocationRuleSet).filter(
                AllocationRuleSet.organ_type == "ALL",
                AllocationRuleSet.is_active == 1
            ).first()

        if rule_set:
            try:
                spec_rules = json.loads(rule_set.special_population_rules) if rule_set.special_population_rules else {}
            except Exception:
                spec_rules = {}
            try:
                prio_rules = json.loads(rule_set.priority_rules) if rule_set.priority_rules else {}
            except Exception:
                prio_rules = {}
            try:
                geo_rules = json.loads(rule_set.geographic_rules) if rule_set.geographic_rules else {}
            except Exception:
                geo_rules = {}

            return {
                "rule_set_id": rule_set.rule_set_id,
                "organ_type": rule_set.organ_type,
                "jurisdiction": rule_set.jurisdiction,
                "policy_version": rule_set.policy_version,
                "source_reference": rule_set.source_reference or DEFAULT_NOTTO_KIDNEY_POLICY["source_reference"],
                "description": rule_set.description,
                "special_population_rules": spec_rules or DEFAULT_NOTTO_KIDNEY_POLICY["special_population_rules"],
                "priority_rules": prio_rules or DEFAULT_NOTTO_KIDNEY_POLICY["priority_rules"],
                "geographic_rules": geo_rules or DEFAULT_NOTTO_KIDNEY_POLICY["geographic_rules"],
            }

    return DEFAULT_NOTTO_KIDNEY_POLICY


def calculate_waiting_days(receiver: Patient) -> int:
    """Calculate how many days receiver has been on the active waiting list."""
    if not receiver.receiver_profile:
        return 0
    start = receiver.receiver_profile.waiting_start_date or receiver.created_at
    if not start:
        return 0
    now = datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    return max(0, (now - start).days)


def calculate_special_population_tier(receiver: Patient, rules: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tier 1: Special Population & Regulatory Priority.
    Prior Living Donor (+50), Pediatric (+30), CPRA Sensitization (+25), Previous Graft Failure (+15), Clinical Urgency (+5 to +30).
    """
    rp = receiver.receiver_profile
    points = 0.0
    qualifications = []

    # 1. Prior Living Donor Preference
    if rp and rp.prior_living_donor:
        pld_pts = float(rules.get("prior_living_donor_points", 50.0))
        points += pld_pts
        qualifications.append(f"Prior Living Donor (+{pld_pts} pts)")

    # 2. Pediatric Candidate (< 18 yrs)
    is_pediatric = (rp and rp.pediatric_status) or (receiver.age is not None and receiver.age < 18)
    if is_pediatric:
        ped_pts = float(rules.get("pediatric_points", 30.0))
        points += ped_pts
        qualifications.append(f"Pediatric Candidate <18y (+{ped_pts} pts)")

    # 3. Highly Sensitized Recipient (CPRA >= 80%)
    cpra = float(rp.cpra) if (rp and rp.cpra is not None) else 0.0
    cpra_threshold = float(rules.get("highly_sensitized_cpra_threshold", 80.0))
    if cpra >= cpra_threshold:
        sens_pts = float(rules.get("highly_sensitized_points", 25.0))
        points += sens_pts
        qualifications.append(f"Highly Sensitized CPRA {cpra}% (+{sens_pts} pts)")

    # 4. Previous Graft Failure
    prev_failure = (rp and (rp.previous_graft_failure or (rp.number_of_previous_grafts and rp.number_of_previous_grafts > 0)))
    if prev_failure:
        fail_pts = float(rules.get("previous_graft_failure_points", 15.0))
        points += fail_pts
        qualifications.append(f"Previous Graft Failure (+{fail_pts} pts)")

    # 5. Clinical Medical Urgency
    urgency = (rp.urgency_level if rp and rp.urgency_level else "MEDIUM").upper()
    urgency_map = {
        "CRITICAL": float(rules.get("critical_urgency_points", 30.0)),
        "HIGH": float(rules.get("high_urgency_points", 20.0)),
        "MEDIUM": float(rules.get("medium_urgency_points", 10.0)),
        "LOW": float(rules.get("low_urgency_points", 5.0)),
    }
    urg_pts = urgency_map.get(urgency, 10.0)
    points += urg_pts
    qualifications.append(f"Clinical Urgency: {urgency} (+{urg_pts} pts)")

    return {
        "points": round(points, 2),
        "urgency_level": urgency,
        "is_pediatric": is_pediatric,
        "is_prior_living_donor": bool(rp and rp.prior_living_donor),
        "is_highly_sensitized": cpra >= cpra_threshold,
        "previous_graft_failure": bool(prev_failure),
        "qualifications": qualifications,
    }


def calculate_dialysis_vintage_tier(receiver: Patient, rules: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tier 2: Dialysis Vintage / Verified Waiting Time.
    10 points per verified year of dialysis (max 40 pts).
    """
    rp = receiver.receiver_profile
    waiting_days = calculate_waiting_days(receiver)

    # Use verified dialysis vintage in months if recorded, else waiting days
    if rp and rp.dialysis_duration_months and rp.dialysis_duration_months > 0:
        vintage_years = rp.dialysis_duration_months / 12.0
        vintage_source = f"{rp.dialysis_duration_months} months dialysis vintage"
    else:
        vintage_years = waiting_days / 365.0
        vintage_source = f"{waiting_days} days on waiting list"

    rate_per_year = float(rules.get("dialysis_vintage_points_per_year", 10.0))
    max_pts = float(rules.get("max_dialysis_vintage_points", 40.0))
    points = min(max_pts, vintage_years * rate_per_year)

    return {
        "points": round(points, 2),
        "vintage_years": round(vintage_years, 2),
        "vintage_source": vintage_source,
        "waiting_days": waiting_days,
        "max_points_cap": max_pts,
    }


def calculate_hla_matching_tier(compat_assessment: Dict[str, Any], rules: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tier 3: Immunologic HLA Matching Merit.
    0-MM (+30 pts), 1-2 MM (+15 pts), 3-4 MM (+5 pts), 5-6 MM (0 pts).
    """
    hla_info = compat_assessment.get("hla_immune", {})
    mismatches = int(hla_info.get("hla_mismatches", 0))

    if mismatches == 0:
        pts = float(rules.get("hla_0_mismatch_points", 30.0))
        tier_label = "0-Mismatch (Zero MM)"
    elif mismatches in [1, 2]:
        pts = float(rules.get("hla_1_2_mismatch_points", 15.0))
        tier_label = f"{mismatches}-Mismatch (Favorable 1-2 MM)"
    elif mismatches in [3, 4]:
        pts = float(rules.get("hla_3_4_mismatch_points", 5.0))
        tier_label = f"{mismatches}-Mismatch (Moderate 3-4 MM)"
    else:
        pts = float(rules.get("hla_5_6_mismatch_points", 0.0))
        tier_label = f"{mismatches}-Mismatch (High 5-6 MM)"

    return {
        "points": round(pts, 2),
        "hla_mismatches": mismatches,
        "tier_label": tier_label,
        "immune_compatibility": hla_info.get("immune_compatibility", "COMPATIBLE"),
        "sensitization_risk": hla_info.get("sensitization_risk", "LOW"),
    }


def calculate_abo_compatibility_tier(compat_assessment: Dict[str, Any], rules: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tier 4: ABO Compatibility Quality.
    Exact Match (+20 pts) vs Compatible (+10 pts).
    """
    abo_info = compat_assessment.get("abo", {})
    is_exact = abo_info.get("is_exact_match", False)

    if is_exact:
        pts = float(rules.get("abo_exact_match_points", 20.0))
        label = "Exact Match ABO"
    else:
        pts = float(rules.get("abo_compatible_points", 10.0))
        label = "Compatible ABO (Universal Donor / Acceptor)"

    return {
        "points": round(pts, 2),
        "is_exact_match": is_exact,
        "compatibility_type": abo_info.get("compatibility_type", "COMPATIBLE"),
        "label": label,
    }


def calculate_geographic_tier(organ: Organ, receiver: Patient, rules: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tier 5: Geographic Proximity Tier.
    Local Hospital (+15 pts), Same City (+10 pts), State / ROTTO (+5 pts), Interstate (0 pts).
    """
    donor_hospital = organ.donor.hospital if (organ.donor and organ.donor.hospital) else None
    recv_hospital = receiver.hospital if receiver.hospital else None

    tier = "INTERSTATE"
    pts = float(rules.get("interstate_points", 0.0))
    tier_name = "National / Interstate Allocation"

    if donor_hospital and recv_hospital:
        if donor_hospital.id == recv_hospital.id:
            tier = "LOCAL_HOSPITAL"
            pts = float(rules.get("local_hospital_points", 15.0))
            tier_name = f"Local Transplant Center ({donor_hospital.name})"
        elif donor_hospital.city and recv_hospital.city and donor_hospital.city.strip().lower() == recv_hospital.city.strip().lower():
            tier = "SAME_CITY"
            pts = float(rules.get("same_city_points", 10.0))
            tier_name = f"City Cluster ({donor_hospital.city})"
        elif donor_hospital.state and recv_hospital.state and donor_hospital.state.strip().lower() == recv_hospital.state.strip().lower():
            tier = "STATE_ROTTO"
            pts = float(rules.get("state_rotto_points", 5.0))
            tier_name = f"State / ROTTO Region ({donor_hospital.state})"

    return {
        "points": round(pts, 2),
        "tier": tier,
        "tier_name": tier_name,
        "donor_hospital_name": donor_hospital.name if donor_hospital else None,
        "receiver_hospital_name": recv_hospital.name if recv_hospital else None,
    }


def score_receiver(
    organ: Organ,
    receiver: Patient,
    db: Optional[Session] = None,
    rule_set_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculate multi-factor priority score based on the active National Allocation Policy.
    Returns comprehensive scoring breakdown and multi-dimensional compatibility assessment.
    """
    policy = rule_set_data or get_active_rule_set(organ.organ_type, db)
    org_type_str = organ.organ_type.value.upper() if hasattr(organ.organ_type, "value") else str(organ.organ_type).upper()

    # Defaults for tier objects
    tier1 = {"points": 0.0, "qualifications": []}
    tier2 = {"points": 0.0, "vintage_source": "Standard Listing", "waiting_days": 0}
    tier3 = {"points": 0.0, "tier_label": "N/A (Organ-specific)"}
    tier4 = {"points": 0.0, "label": "ABO Evaluation"}
    tier5 = {"points": 0.0, "tier_name": "Standard Logistics"}

    # 1. Organ-Specific Priority Scoring (Phases 4, 16, 17, 18)
    if org_type_str == "LIVER":
        from app.services.liver_allocation import score_liver_receiver
        organ_specific_res = score_liver_receiver(organ, receiver, db)
        total_score = organ_specific_res["total_score"]
        compat_assessment = organ_specific_res["compatibility"]
        tier_qualifications = organ_specific_res["tier_qualifications"]
        score_breakdown_dict = organ_specific_res["score_breakdown"]
        tier1 = {"points": organ_specific_res.get("score_breakdown", {}).get("status_1a_override_points", 0.0), "qualifications": []}
        tier2 = {"points": organ_specific_res.get("score_breakdown", {}).get("meld_peld_points", 0.0), "vintage_source": f"MELD {organ_specific_res.get('meld_score', 15)}", "waiting_days": 0}
        tier4 = {"points": organ_specific_res.get("score_breakdown", {}).get("abo_exact_match_points", 0.0), "label": "ABO Compatibility"}
        tier5 = {"points": organ_specific_res.get("score_breakdown", {}).get("geographic_points", 0.0), "tier_name": "Proximity Tier"}
    elif org_type_str == "HEART":
        from app.services.heart_allocation import score_heart_receiver
        organ_specific_res = score_heart_receiver(organ, receiver, db)
        total_score = organ_specific_res["total_score"]
        compat_assessment = organ_specific_res["compatibility"]
        tier_qualifications = organ_specific_res["tier_qualifications"]
        score_breakdown_dict = organ_specific_res["score_breakdown"]
        tier1 = {"points": organ_specific_res.get("score_breakdown", {}).get("urgency_tier_base_points", 0.0), "qualifications": []}
        tier2 = {"points": organ_specific_res.get("score_breakdown", {}).get("hemodynamic_points", 0.0), "vintage_source": "Hemodynamic Scoring", "waiting_days": 0}
        tier4 = {"points": organ_specific_res.get("score_breakdown", {}).get("abo_exact_match_points", 0.0), "label": "ABO Compatibility"}
        tier5 = {"points": organ_specific_res.get("score_breakdown", {}).get("geographic_proximity_points", 0.0), "tier_name": "Proximity Tier"}
    elif org_type_str == "LUNG":
        from app.services.lung_allocation import score_lung_receiver
        organ_specific_res = score_lung_receiver(organ, receiver, db)
        total_score = organ_specific_res["total_score"]
        compat_assessment = organ_specific_res["compatibility"]
        tier_qualifications = organ_specific_res["tier_qualifications"]
        score_breakdown_dict = organ_specific_res["score_breakdown"]
        tier1 = {"points": organ_specific_res.get("score_breakdown", {}).get("las_core_score", 0.0), "qualifications": []}
        tier2 = {"points": organ_specific_res.get("score_breakdown", {}).get("waiting_time_points", 0.0), "vintage_source": "LAS Waiting Time", "waiting_days": 0}
        tier4 = {"points": organ_specific_res.get("score_breakdown", {}).get("abo_exact_match_points", 0.0), "label": "ABO Compatibility"}
        tier5 = {"points": organ_specific_res.get("score_breakdown", {}).get("geographic_points", 0.0), "tier_name": "Proximity Tier"}
    else:
        # Standard Deceased Donor Kidney NOTTO Policy
        compat_assessment = evaluate_full_compatibility(organ, receiver)
        tier1 = calculate_special_population_tier(receiver, policy.get("special_population_rules", {}))
        tier2 = calculate_dialysis_vintage_tier(receiver, policy.get("priority_rules", {}))
        tier3 = calculate_hla_matching_tier(compat_assessment, policy.get("priority_rules", {}))
        tier4 = calculate_abo_compatibility_tier(compat_assessment, policy.get("priority_rules", {}))
        tier5 = calculate_geographic_tier(organ, receiver, policy.get("geographic_rules", {}))
        total_score = tier1["points"] + tier2["points"] + tier3["points"] + tier4["points"] + tier5["points"]
        tier_qualifications = (
            tier1["qualifications"]
            + [f"{tier2['vintage_source']} (+{tier2['points']} pts)"]
            + [f"HLA: {tier3['tier_label']} (+{tier3['points']} pts)"]
            + [f"ABO: {tier4['label']} (+{tier4['points']} pts)"]
            + [f"Location: {tier5['tier_name']} (+{tier5['points']} pts)"]
        )
        score_breakdown_dict = {
            "tier1_special_population": tier1,
            "tier2_dialysis_vintage": tier2,
            "tier3_hla_matching": tier3,
            "tier4_abo_compatibility": tier4,
            "tier5_geographic_proximity": tier5,
        }

    # 7. Operational Intelligence Layer (Phases 5, 6, 8, 9, 12)
    from app.services.feasibility import get_or_create_hospital_readiness
    from app.services.transport import compute_full_transport_and_preservation
    from app.services.ml_risk_engine import compute_operational_risk
    from app.services.stability_engine import compute_match_stability, simulate_delay_sensitivity

    readiness = get_or_create_hospital_readiness(
        hospital_id=receiver.hospital_id,
        patient_id=receiver.id,
        db=db
    )

    logistics = compute_full_transport_and_preservation(organ, receiver, db=db)

    ml_risk = compute_operational_risk(
        preservation_info=logistics["preservation"],
        transport_info=logistics["transport"],
        readiness_info=readiness,
        organ_condition=organ.organ_condition,
        donor_creatinine=organ.donor_creatinine,
    )

    # Phase 12: Match Stability & Sensitivity Engine
    stability = compute_match_stability(
        compatibility_assessment=compat_assessment,
        readiness_data=readiness,
        preservation_data=logistics["preservation"],
        transport_data=logistics["transport"],
        patient=receiver,
        organ=organ
    )

    sensitivity = simulate_delay_sensitivity(
        compatibility_assessment=compat_assessment,
        readiness_data=readiness,
        preservation_data=logistics["preservation"],
        transport_data=logistics["transport"],
        patient=receiver,
        organ=organ
    )

    return {
        "total": round(total_score, 2),
        "rule_set_id": policy["rule_set_id"],
        "policy_version": policy["policy_version"],
        "jurisdiction": policy["jurisdiction"],
        "source_reference": policy["source_reference"],
        # Individual Tier Breakdowns
        "special_population": tier1,
        "dialysis_vintage": tier2,
        "hla_matching": tier3,
        "abo_compatibility": tier4,
        "geographic_proximity": tier5,
        # Point values
        "special_population_points": tier1["points"],
        "dialysis_vintage_points": tier2["points"],
        "hla_points": tier3["points"],
        "abo_points": tier4["points"],
        "geographic_points": tier5["points"],
        "tier_qualifications": tier_qualifications,
        # Operational Feasibility & Readiness (Phase 5)
        "hospital_readiness": readiness,
        "readiness_status": readiness["readiness_status"],
        "readiness_score": readiness["readiness_score"],
        # Preservation & Transport Logistics (Phase 6)
        "transport": logistics["transport"],
        "preservation": logistics["preservation"],
        "remaining_preservation_buffer_hours": logistics["preservation"]["remaining_preservation_buffer_hours"],
        "preservation_risk_status": logistics["preservation"]["preservation_risk_status"],
        "transport_duration_minutes": logistics["transport"]["total_transit_minutes"],
        # Machine Learning Operational Risk & Explainable AI (Phases 8 & 9)
        "ml_risk": ml_risk,
        "operational_risk_probability": ml_risk["risk_probability"],
        "operational_risk_tier": ml_risk["risk_tier"],
        "is_operationally_feasible": ml_risk["is_operationally_feasible"],
        "xai_positive_factors": ml_risk["positive_factors"],
        "xai_risk_factors": ml_risk["risk_factors"],
        "xai_disclaimer": ml_risk["disclaimer"],
        # Match Stability & Sensitivity Simulation (Phase 12)
        "stability": stability,
        "stability_score": stability["stability_score"],
        "stability_tier": stability["stability_tier"],
        "stability_tier_description": stability["tier_description"],
        "stability_sub_scores": stability["sub_scores"],
        "sensitivity": sensitivity,
        "max_delay_tolerance_minutes": sensitivity["max_delay_tolerance_minutes"],
        # Compatibility Assessment Object
        "compatibility_assessment": compat_assessment,
        "overall_compatibility": compat_assessment.get("overall_status", "COMPATIBLE"),
        "size_compatibility": compat_assessment.get("size", {}).get("size_compatibility", "ACCEPTABLE") if isinstance(compat_assessment.get("size"), dict) else compat_assessment.get("size_compatibility", "ACCEPTABLE"),
        "immune_compatibility": compat_assessment.get("hla_immune", {}).get("immune_compatibility", "COMPATIBLE"),
        "crossmatch_result": compat_assessment.get("crossmatch", {}).get("crossmatch_result", "NEGATIVE") if isinstance(compat_assessment.get("crossmatch"), dict) else compat_assessment.get("crossmatch_result", "NEGATIVE"),
        "hla_mismatches": compat_assessment.get("hla_immune", {}).get("hla_mismatches", 0),
        # Backward-compatible fields for legacy UI calls
        "urgency": tier1.get("urgency_level", "STANDARD"),
        "urgency_score": tier1.get("points", 0.0),
        "waiting_days": tier2.get("waiting_days", 0),
        "waiting_score": tier2.get("points", 0.0),
        "compatibility": tier4.get("compatibility_type", "COMPATIBLE"),
        "compatibility_score": tier4.get("points", 0.0),
    }


def generate_priority_list(organ: Organ, compatible_receivers: List[Patient], db: Session) -> List[Dict]:
    """
    Score all compatible receivers using the active National Allocation Policy, rank them, and persist matches.
    Returns sorted list of match records.
    """
    # Fetch active policy once for efficiency
    policy = get_active_rule_set(organ.organ_type, db)

    # Clear existing matches for this organ
    db.query(Match).filter(Match.organ_id == organ.id).delete()
    db.flush()

    scored = []
    for receiver in compatible_receivers:
        breakdown = score_receiver(organ, receiver, db=db, rule_set_data=policy)
        scored.append((receiver, breakdown))

    # Sort strictly descending by total score
    scored.sort(key=lambda x: x[1]["total"], reverse=True)

    matches = []
    for priority_num, (receiver, breakdown) in enumerate(scored, start=1):
        match = Match(
            organ_id=organ.id,
            receiver_id=receiver.id,
            compatibility_result=breakdown["overall_compatibility"],
            priority_score=breakdown["total"],
            priority_number=priority_num,
            score_breakdown=json.dumps(breakdown, default=str),
            stability_score=breakdown.get("stability_score"),
            stability_tier=breakdown.get("stability_tier"),
        )
        db.add(match)
        matches.append({
            "priority_number": priority_num,
            "receiver": receiver,
            "score_breakdown": breakdown,
            "match": match,
            "stability_score": breakdown.get("stability_score"),
            "stability_tier": breakdown.get("stability_tier"),
            "rule_set_id": policy["rule_set_id"],
            "policy_version": policy["policy_version"],
            "source_reference": policy["source_reference"],
        })

    db.commit()
    return matches
