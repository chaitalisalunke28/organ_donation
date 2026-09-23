"""
Change Impact Analyzer Service (Phase 11)
Determines multi-dimensional causal impacts when clinical, operational, or logistics data changes:
- Biological Compatibility Impact
- NOTTO Priority Ranking Impact
- Operational Feasibility Impact
- Machine Learning Risk Shift Impact
- Revalidation Requirements & Actionable Clinical Recommendations
"""
from typing import Dict, Any, Optional
from datetime import datetime


def analyze_change_impact(
    entity_type: str,
    field_changed: str,
    old_value: Any,
    new_value: Any,
    organ: Optional[Any] = None,
    patient: Optional[Any] = None,
    readiness: Optional[Any] = None,
    transport: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Analyzes the clinical, logistical, and policy consequences of any state mutation.
    Returns structured impact assessment.
    """
    old_val_str = str(old_value).strip().lower() if old_value is not None else ""
    new_val_str = str(new_value).strip().lower() if new_value is not None else ""
    
    affects_compatibility = False
    affects_priority = False
    affects_operational_feasibility = False
    affects_ml_risk = False
    requires_revalidation = False
    impact_severity = "NEGLIGIBLE"
    impact_summary = f"Field '{field_changed}' changed from '{old_value}' to '{new_value}'."
    recommendations = ["Monitor standard allocation progress."]

    # 1. HOSPITAL READINESS MUTATIONS (Phase 5 Operational Feasibility Changes)
    if entity_type in ["HOSPITAL_READINESS", "READINESS"]:
        crit_readiness_fields = [
            "icu_available", "ot_available", "surgeon_available", 
            "transplant_team_available", "recipient_ready", "recipient_present",
            "blood_bank_ready", "documents_complete"
        ]
        
        if field_changed in crit_readiness_fields:
            if new_val_str in ["false", "0", "unavailable", "no"]:
                affects_operational_feasibility = True
                affects_ml_risk = True
                requires_revalidation = True
                impact_severity = "CRITICAL"
                human_field = field_changed.replace("_", " ").upper()
                impact_summary = (
                    f"CRITICAL OPERATIONAL BOTTLENECK: {human_field} transitioned from AVAILABLE to UNAVAILABLE. "
                    f"Recipent hospital cannot proceed with surgery until bottleneck is resolved."
                )
                recommendations = [
                    f"Immediate coordinator outreach to hospital surgical team to assess {human_field} resolution ETA.",
                    "If bottleneck exceeds 45 minutes, initiate provisional notification to Backup Priority #2 candidate.",
                    "Require coordinator revalidation confirmation before organ handover."
                ]
            elif old_val_str in ["false", "0", "unavailable", "no"] and new_val_str in ["true", "1", "available", "yes"]:
                affects_operational_feasibility = True
                affects_ml_risk = True
                impact_severity = "MODERATE"
                human_field = field_changed.replace("_", " ").upper()
                impact_summary = (
                    f"OPERATIONAL READINESS RESTORED: {human_field} resolved and verified available. "
                    f"Facility ready for surgical intake."
                )
                recommendations = [
                    "Proceed with scheduled recipient admission and final pre-op crossmatch."
                ]

    # 2. LOGISTICS & TRANSPORT DELAYS (Phase 6 Preservation & Ischemia Window)
    elif entity_type in ["ORGAN_TRANSPORT", "TRANSPORT"]:
        if field_changed in ["delay_minutes", "traffic_delay_minutes", "estimated_duration_minutes"]:
            try:
                old_num = int(old_value) if old_value is not None else 0
                new_num = int(new_value) if new_value is not None else 0
                delta = new_num - old_num
            except (ValueError, TypeError):
                delta = 30

            if delta >= 30:
                affects_operational_feasibility = True
                affects_ml_risk = True
                requires_revalidation = delta >= 45
                impact_severity = "CRITICAL" if delta >= 60 else "MODERATE"
                impact_summary = (
                    f"TRANSPORT DELAY SURGE: Route delay increased by +{delta} minutes (total: {new_value} mins). "
                    f"Cold ischemia preservation buffer significantly eroded. Remaining ischemic reserve reduced."
                )
                recommendations = [
                    "Request immediate Green Corridor Express police escort / traffic intervention.",
                    "Recalculate remaining cold ischemia time against maximum safe preservation window.",
                    "Alert surgical team to prepare recipient for zero-delay immediate organ docking on arrival."
                ]
            elif delta < 0:
                affects_operational_feasibility = True
                impact_severity = "NEGLIGIBLE"
                impact_summary = f"Transit duration optimized by {abs(delta)} minutes. Preservation buffer expanded."

        elif field_changed == "route_status":
            if new_value in ["WEATHER_DELAY", "SEVERE_TRAFFIC", "BLOCKED"]:
                affects_operational_feasibility = True
                affects_ml_risk = True
                requires_revalidation = True
                impact_severity = "CRITICAL"
                impact_summary = f"ROUTE IMPEDED: Route status changed to {new_value}. Significant transit delay expected."
                recommendations = [
                    "Evaluate alternative air charter or express emergency routing.",
                    "Assess whether remaining preservation time permits route redirection."
                ]

    # 3. CANDIDATE STATUS MUTATIONS (Phase 7 Lifecycle Safeguards)
    elif entity_type in ["PATIENT_STATUS", "PATIENT"]:
        if field_changed == "candidate_status":
            if new_value != "ACTIVE":
                affects_compatibility = True
                affects_priority = True
                requires_revalidation = True
                impact_severity = "CRITICAL"
                impact_summary = (
                    f"CANDIDATE DISQUALIFIED: Patient status changed from {old_value} to {new_value}. "
                    f"Patient is no longer legally/clinically eligible for active organ offer."
                )
                recommendations = [
                    "AUTOMATIC ALLOCATION HOLD: Immediately withdraw active offer if pending.",
                    "Advance organ offer to Next Priority Rank on NOTTO allocation roster.",
                    "Log reason for candidate status change in national audit registry."
                ]
            else:
                affects_compatibility = True
                affects_priority = True
                impact_severity = "MODERATE"
                impact_summary = "Candidate status restored to ACTIVE. Patient returned to eligible matching pool."

        elif field_changed in ["urgency_level", "dialysis_start_date", "previous_transplants"]:
            affects_priority = True
            impact_severity = "MODERATE"
            impact_summary = f"Recipient priority factor '{field_changed}' updated. Policy score requires recalculation."
            recommendations = [
                "Re-run NOTTO Priority Matrix calculation for affected organ pool."
            ]

    # 4. CLINICAL & CROSSMATCH MUTATIONS
    elif entity_type in ["CLINICAL_PARAM", "COMPATIBILITY"]:
        if "crossmatch" in field_changed.lower() or "hla" in field_changed.lower():
            affects_compatibility = True
            affects_ml_risk = True
            requires_revalidation = True
            impact_severity = "CRITICAL"
            impact_summary = f"IMMUNE COMPATIBILITY MUTATION: {field_changed} updated to {new_value}."
            recommendations = [
                "Verify crossmatch report documentation.",
                "Halt organ dispatch until compatibility verification is completed by coordinator."
            ]

    return {
        "entity_type": entity_type,
        "field_changed": field_changed,
        "old_value": str(old_value) if old_value is not None else None,
        "new_value": str(new_value) if new_value is not None else None,
        "affects_compatibility": affects_compatibility,
        "affects_priority": affects_priority,
        "affects_operational_feasibility": affects_operational_feasibility,
        "affects_ml_risk": affects_ml_risk,
        "requires_revalidation": requires_revalidation,
        "impact_severity": impact_severity,
        "impact_summary": impact_summary,
        "recommendations": recommendations,
        "analyzed_at": datetime.now().isoformat(),
    }
