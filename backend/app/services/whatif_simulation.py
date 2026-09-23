"""
What-If Simulation Engine (Phase 13)
Pure in-memory scenario testbench allowing Transplant Coordinators to stress-test hypothetical
disruptions (transport delays, ICU shortages, OT delays, document issues) without modifying
live database records.
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.organ import Organ
from app.models.patient import Patient
from app.services.compatibility import evaluate_full_compatibility
from app.services.feasibility import get_or_create_hospital_readiness, evaluate_feasibility
from app.services.transport import compute_full_transport_and_preservation
from app.services.ml_risk_engine import compute_operational_risk
from app.services.stability_engine import compute_match_stability


def run_whatif_scenario(
    organ_id: int,
    receiver_id: int,
    db: Session,
    simulated_delay_minutes: int = 0,
    icu_available: Optional[bool] = None,
    ot_available: Optional[bool] = None,
    surgeon_available: Optional[bool] = None,
    transplant_team_available: Optional[bool] = None,
    recipient_ready: Optional[bool] = None,
    recipient_present: Optional[bool] = None,
    documents_complete: Optional[bool] = None,
    transport_mode: Optional[str] = None,
    route_status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes a non-destructive what-if simulation comparing baseline vs hypothetical scenario.
    GUARANTEE: Does not mutate or persist any database records.
    """
    organ = db.query(Organ).filter(Organ.id == organ_id).first()
    if not organ:
        raise ValueError("Organ not found")
    receiver = db.query(Patient).filter(Patient.id == receiver_id).first()
    if not receiver:
        raise ValueError("Receiver not found")

    # 1. EVALUATE BASELINE (Actual Current State)
    compat_baseline = evaluate_full_compatibility(organ, receiver)
    readiness_baseline = get_or_create_hospital_readiness(receiver.hospital_id, receiver.id, db)
    logistics_baseline = compute_full_transport_and_preservation(organ, receiver, db)
    
    ml_risk_baseline = compute_operational_risk(
        preservation_info=logistics_baseline["preservation"],
        transport_info=logistics_baseline["transport"],
        readiness_info=readiness_baseline,
        organ_condition=organ.organ_condition,
        donor_creatinine=organ.donor_creatinine,
    )

    stability_baseline = compute_match_stability(
        compatibility_assessment=compat_baseline,
        readiness_data=readiness_baseline,
        preservation_data=logistics_baseline["preservation"],
        transport_data=logistics_baseline["transport"],
        patient=receiver,
        organ=organ,
        custom_added_delay_minutes=0
    )

    # 2. CONSTRUCT HYPOTHETICAL SIMULATED SCENARIO
    sim_readiness_params = {
        "hospital_verified": readiness_baseline.get("hospital_verified", True),
        "recipient_ready": recipient_ready if recipient_ready is not None else readiness_baseline.get("recipient_ready", True),
        "icu_available": icu_available if icu_available is not None else readiness_baseline.get("icu_available", True),
        "ot_available": ot_available if ot_available is not None else readiness_baseline.get("ot_available", True),
        "surgeon_available": surgeon_available if surgeon_available is not None else readiness_baseline.get("surgeon_available", True),
        "transplant_team_available": transplant_team_available if transplant_team_available is not None else readiness_baseline.get("transplant_team_available", True),
        "required_equipment": readiness_baseline.get("required_equipment", True),
        "blood_bank_ready": readiness_baseline.get("blood_bank_ready", True),
        "recipient_present": recipient_present if recipient_present is not None else readiness_baseline.get("recipient_present", True),
        "documents_complete": documents_complete if documents_complete is not None else readiness_baseline.get("documents_complete", True),
    }
    sim_readiness_eval = evaluate_feasibility(sim_readiness_params)
    sim_readiness_data = {
        **sim_readiness_params,
        "readiness_status": sim_readiness_eval["readiness_status"],
        "readiness_score": sim_readiness_eval["readiness_score"],
        "bottlenecks": sim_readiness_eval["bottlenecks"],
    }

    # Simulate Logistics & Preservation
    base_pres = logistics_baseline["preservation"]
    base_trans = logistics_baseline["transport"]
    
    sim_delay = max(0, simulated_delay_minutes)
    sim_total_transit = base_trans["total_transit_minutes"] + sim_delay
    sim_elapsed_hours = base_pres.get("elapsed_preservation_hours", 0.0) + (sim_delay / 60.0)
    sim_remaining_buffer_hours = max(0.0, round(base_pres.get("remaining_preservation_buffer_hours", 20.0) - (sim_delay / 60.0), 2))
    
    if sim_remaining_buffer_hours <= 0:
        sim_pres_risk = "CRITICAL_ISCHEMIA"
        sim_pres_label = "Ischemic Tolerance Exhausted"
    elif sim_remaining_buffer_hours < 4.0:
        sim_pres_risk = "CAUTION"
        sim_pres_label = "Narrow Ischemic Reserve"
    else:
        sim_pres_risk = "SAFE"
        sim_pres_label = "Adequate Ischemic Buffer"

    sim_preservation_data = {
        **base_pres,
        "elapsed_preservation_hours": round(sim_elapsed_hours, 2),
        "remaining_preservation_buffer_hours": sim_remaining_buffer_hours,
        "preservation_risk_status": sim_pres_risk,
        "risk_label": sim_pres_label,
    }

    sim_transport_data = {
        **base_trans,
        "transport_mode": transport_mode if transport_mode else base_trans["transport_mode"],
        "route_status": route_status if route_status else ("MODERATE_TRAFFIC" if sim_delay > 30 else base_trans["route_status"]),
        "total_transit_minutes": sim_total_transit,
        "delay_minutes": base_trans.get("delay_minutes", 0) + sim_delay,
    }

    # Recalculate Simulated ML Risk
    sim_ml_risk = compute_operational_risk(
        preservation_info=sim_preservation_data,
        transport_info=sim_transport_data,
        readiness_info=sim_readiness_data,
        organ_condition=organ.organ_condition,
        donor_creatinine=organ.donor_creatinine,
    )

    # Recalculate Simulated Match Stability
    sim_stability = compute_match_stability(
        compatibility_assessment=compat_baseline,
        readiness_data=sim_readiness_data,
        preservation_data=sim_preservation_data,
        transport_data=sim_transport_data,
        patient=receiver,
        organ=organ,
        custom_added_delay_minutes=sim_delay
    )

    # 3. COMPUTE COMPARATIVE SHIFT DELTAS
    buffer_delta = round(sim_remaining_buffer_hours - base_pres["remaining_preservation_buffer_hours"], 2)
    risk_delta_pct = round(sim_ml_risk["risk_percentage"] - ml_risk_baseline["risk_percentage"], 1)
    stability_delta_pct = round(sim_stability["stability_score"] - stability_baseline["stability_score"], 1)
    readiness_delta_score = round(sim_readiness_eval["readiness_score"] - readiness_baseline.get("readiness_score", 100), 1)

    # Scenario Guidance & Narrative
    advisory_warnings = []
    if sim_delay >= 60:
        advisory_warnings.append(f"Transport delay of +{sim_delay}m erodes preservation reserve by {abs(buffer_delta)} hours.")
    if icu_available is False:
        advisory_warnings.append("ICU unreadiness compromises post-operative recovery bed availability.")
    if ot_available is False or surgeon_available is False:
        advisory_warnings.append("Surgical team/OT bottleneck will delay immediate organ docking upon arrival.")
    if documents_complete is False:
        advisory_warnings.append("Incomplete legal clearance documents risk regulatory dispatch hold.")
    if sim_ml_risk["risk_tier"] == "HIGH_RISK":
        advisory_warnings.append("Operational risk escalates to HIGH_RISK tier under this simulated configuration.")

    if not advisory_warnings:
        advisory_summary = "Simulated scenario indicates allocation remains operationally resilient with safe buffers."
    else:
        advisory_summary = " | ".join(advisory_warnings)

    return {
        "is_simulated": True,
        "disclaimer": "WHAT-IF SIMULATION ONLY: This is an advisory stress-test calculation. No active database records were modified.",
        "organ_info": {
            "organ_id": organ.id,
            "organ_uid": organ.organ_uid,
            "organ_type": organ.organ_type.value if hasattr(organ.organ_type, 'value') else organ.organ_type,
            "donor_hospital": organ.donor.hospital.name if (organ.donor and organ.donor.hospital) else "Donor Facility",
        },
        "receiver_info": {
            "receiver_id": receiver.id,
            "receiver_uid": receiver.patient_uid,
            "receiver_name": receiver.name,
            "receiver_hospital": receiver.hospital.name if receiver.hospital else "Recipient Facility",
        },
        "scenario_parameters_applied": {
            "simulated_delay_minutes": sim_delay,
            "icu_available": sim_readiness_params["icu_available"],
            "ot_available": sim_readiness_params["ot_available"],
            "surgeon_available": sim_readiness_params["surgeon_available"],
            "recipient_ready": sim_readiness_params["recipient_ready"],
            "documents_complete": sim_readiness_params["documents_complete"],
            "transport_mode": sim_transport_data["transport_mode"],
            "route_status": sim_transport_data["route_status"],
        },
        "baseline": {
            "preservation_buffer_hours": base_pres["remaining_preservation_buffer_hours"],
            "preservation_risk_status": base_pres["preservation_risk_status"],
            "readiness_status": readiness_baseline.get("readiness_status", "READY"),
            "readiness_score": readiness_baseline.get("readiness_score", 100.0),
            "operational_risk_percentage": ml_risk_baseline["risk_percentage"],
            "operational_risk_tier": ml_risk_baseline["risk_tier"],
            "match_stability_score": stability_baseline["stability_score"],
            "match_stability_tier": stability_baseline["stability_tier"],
        },
        "simulated": {
            "preservation_buffer_hours": sim_remaining_buffer_hours,
            "preservation_risk_status": sim_pres_risk,
            "readiness_status": sim_readiness_data["readiness_status"],
            "readiness_score": sim_readiness_data["readiness_score"],
            "operational_risk_percentage": sim_ml_risk["risk_percentage"],
            "operational_risk_tier": sim_ml_risk["risk_tier"],
            "match_stability_score": sim_stability["stability_score"],
            "match_stability_tier": sim_stability["stability_tier"],
            "bottlenecks": sim_readiness_eval["bottlenecks"],
        },
        "comparative_deltas": {
            "preservation_buffer_delta_hours": buffer_delta,
            "operational_risk_delta_pct": risk_delta_pct,
            "match_stability_delta_pct": stability_delta_pct,
            "readiness_delta_score": readiness_delta_score,
            "risk_tier_transition": f"{ml_risk_baseline['risk_tier']} -> {sim_ml_risk['risk_tier']}",
            "stability_tier_transition": f"{stability_baseline['stability_tier']} -> {sim_stability['stability_tier']}",
            "readiness_status_transition": f"{readiness_baseline.get('readiness_status', 'READY')} -> {sim_readiness_data['readiness_status']}",
        },
        "advisory_summary": advisory_summary,
        "advisory_warnings": advisory_warnings,
    }
