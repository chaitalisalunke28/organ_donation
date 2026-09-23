"""
Match Stability & Sensitivity Engine (Phase 12)
Separates allocation priority from match stability to answer the critical research question:
'How sensitive is the proposed allocation to real-world operational and temporal shocks?'

Features:
- 6-Factor Composite Stability Score
- Stability Tier Classification (VERY_HIGH, HIGH, MODERATE, LOW, CRITICAL_FRAGILITY)
- Dynamic Multi-Horizon Sensitivity Simulation (+0m, +30m, +60m, +90m, +120m, +180m)
- Maximum Delay Tolerance Threshold calculation
"""
from typing import Dict, Any, List, Optional
from datetime import datetime


def compute_match_stability(
    compatibility_assessment: Dict[str, Any],
    readiness_data: Dict[str, Any],
    preservation_data: Dict[str, Any],
    transport_data: Dict[str, Any],
    patient: Optional[Any] = None,
    organ: Optional[Any] = None,
    custom_added_delay_minutes: int = 0
) -> Dict[str, Any]:
    """
    Computes multidimensional match stability for a donor-organ-receiver pair.
    """
    # 1. Compatibility Certainty (20%)
    compat_status = compatibility_assessment.get("overall_status", "UNKNOWN")
    crossmatch_res = compatibility_assessment.get("crossmatch", {}).get("crossmatch_result", "NEGATIVE")
    
    if compat_status == "COMPATIBLE":
        if crossmatch_res == "NEGATIVE":
            compat_certainty = 100.0
        else:
            compat_certainty = 85.0
    elif compat_status == "CONDITIONALLY_COMPATIBLE":
        compat_certainty = 65.0
    else:
        compat_certainty = 10.0

    # 2. Hospital Operational Readiness (25%)
    readiness_score = float(readiness_data.get("readiness_score", 80.0))
    readiness_status = readiness_data.get("readiness_status", "READY")
    if readiness_status == "NOT_READY":
        readiness_score = min(readiness_score, 30.0)

    # 3. Preservation Buffer Robustness (25%)
    max_safe_hours = float(preservation_data.get("max_safe_preservation_hours", 24.0))
    base_remaining_hours = float(preservation_data.get("remaining_preservation_buffer_hours", 18.0))
    
    # Apply any custom delay for simulation
    effective_remaining_hours = max(0.0, base_remaining_hours - (custom_added_delay_minutes / 60.0))
    
    if max_safe_hours > 0:
        buffer_ratio = effective_remaining_hours / max_safe_hours
    else:
        buffer_ratio = 0.5

    if effective_remaining_hours <= 0:
        buffer_score = 0.0
    elif effective_remaining_hours < 2.0:
        buffer_score = 20.0
    elif effective_remaining_hours < 4.0:
        buffer_score = 50.0
    else:
        buffer_score = min(100.0, buffer_ratio * 120.0)

    # 4. Transport Logistics Robustness (15%)
    route_status = transport_data.get("route_status", "OPTIMAL_CLEAR")
    mode = transport_data.get("transport_mode", "AMBULANCE_ROAD")
    
    if route_status == "OPTIMAL_CLEAR":
        transport_score = 95.0
    elif route_status in ["MODERATE_TRAFFIC", "IN_TRANSIT"]:
        transport_score = 75.0
    elif route_status == "WEATHER_DELAY":
        transport_score = 40.0
    else:
        transport_score = 60.0

    if mode in ["GREEN_CORRIDOR_EXPRESS", "AIR_CHARTER"]:
        transport_score = min(100.0, transport_score + 10.0)

    # 5. Documentation & Clinical Data Completeness (15%)
    docs_complete = readiness_data.get("documents_complete", True)
    doc_score = 100.0 if docs_complete else 45.0

    # Composite Weighted Stability Score
    composite_score = (
        (0.20 * compat_certainty) +
        (0.25 * readiness_score) +
        (0.25 * buffer_score) +
        (0.15 * transport_score) +
        (0.15 * doc_score)
    )
    composite_score = round(max(0.0, min(100.0, composite_score)), 1)

    # Tier Classification
    if composite_score >= 85.0:
        tier = "VERY_HIGH"
        tier_description = "Extremely resilient allocation. Wide ischemic margin and full operational preparedness."
    elif composite_score >= 70.0:
        tier = "HIGH"
        tier_description = "Stable allocation with strong operational buffer and minimal vulnerability."
    elif composite_score >= 50.0:
        tier = "MODERATE"
        tier_description = "Moderately sensitive. Requires active tracking of transit delays and hospital readiness."
    elif composite_score >= 30.0:
        tier = "LOW"
        tier_description = "High vulnerability. Narrow ischemic buffer or operational bottlenecks present."
    else:
        tier = "CRITICAL_FRAGILITY"
        tier_description = "Critical operational fragility. Any additional disruption risks organ wastage."

    return {
        "stability_score": composite_score,
        "stability_tier": tier,
        "tier_description": tier_description,
        "simulated_delay_minutes": custom_added_delay_minutes,
        "effective_remaining_buffer_hours": round(effective_remaining_hours, 2),
        "is_ischemia_exhausted": effective_remaining_hours <= 0.0,
        "sub_scores": {
            "compatibility_certainty": round(compat_certainty, 1),
            "hospital_readiness": round(readiness_score, 1),
            "preservation_buffer": round(buffer_score, 1),
            "transport_robustness": round(transport_score, 1),
            "documentation_completeness": round(doc_score, 1),
        }
    }


def simulate_delay_sensitivity(
    compatibility_assessment: Dict[str, Any],
    readiness_data: Dict[str, Any],
    preservation_data: Dict[str, Any],
    transport_data: Dict[str, Any],
    patient: Optional[Any] = None,
    organ: Optional[Any] = None,
    horizons: List[int] = [0, 30, 60, 90, 120, 180]
) -> Dict[str, Any]:
    """
    Performs 'stress testing' on the allocation across simulated delay horizons.
    Answers: 'How does stability degrade if transport or OT prep is delayed?'
    """
    base_remaining_hours = float(preservation_data.get("remaining_preservation_buffer_hours", 18.0))
    simulation_results = []
    
    for delay in horizons:
        sim = compute_match_stability(
            compatibility_assessment=compatibility_assessment,
            readiness_data=readiness_data,
            preservation_data=preservation_data,
            transport_data=transport_data,
            patient=patient,
            organ=organ,
            custom_added_delay_minutes=delay
        )
        simulation_results.append({
            "delay_minutes": delay,
            "label": f"+{delay} min" if delay > 0 else "Baseline (Current)",
            "stability_score": sim["stability_score"],
            "stability_tier": sim["stability_tier"],
            "remaining_buffer_hours": sim["effective_remaining_buffer_hours"],
            "is_ischemia_exhausted": sim["is_ischemia_exhausted"]
        })

    # Calculate Maximum Tolerable Delay Threshold (in minutes)
    max_delay_tolerance_minutes = max(0, int(base_remaining_hours * 60) - 60)  # Safe reserve of 60 mins

    return {
        "baseline_stability_score": simulation_results[0]["stability_score"],
        "baseline_stability_tier": simulation_results[0]["stability_tier"],
        "max_delay_tolerance_minutes": max_delay_tolerance_minutes,
        "horizons": simulation_results,
        "sensitivity_summary": (
            f"Baseline stability is {simulation_results[0]['stability_tier']} ({simulation_results[0]['stability_score']}%). "
            f"Maximum tolerable delay before ischemic jeopardy is {max_delay_tolerance_minutes} minutes."
        )
    }
