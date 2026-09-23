"""
Dynamic Revalidation & Event Logging Service (Phase 10 & 11)
Maintains high-integrity audit trail for all operational/clinical mutations and coordinates
dynamic revalidation workflows.
"""
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.allocation import AllocationEvent, Allocation, Match
from app.services.impact_analyzer import analyze_change_impact


def log_allocation_event(
    db: Session,
    entity_type: str,
    field_changed: str,
    old_value: Any,
    new_value: Any,
    allocation_id: Optional[int] = None,
    match_id: Optional[int] = None,
    organ_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    entity_id: Optional[int] = None,
    changed_by: str = "SYSTEM",
    reason: Optional[str] = None,
    organ: Optional[Any] = None,
    patient: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Records an allocation event, triggers the Change Impact Analyzer,
    and updates allocation revalidation state if critical impact is detected.
    """
    event_uid = f"EVT-{uuid.uuid4().hex[:8].upper()}"

    # Run Change Impact Analysis (Phase 11)
    impact = analyze_change_impact(
        entity_type=entity_type,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        organ=organ,
        patient=patient
    )

    event = AllocationEvent(
        event_uid=event_uid,
        allocation_id=allocation_id,
        match_id=match_id,
        organ_id=organ_id,
        patient_id=patient_id,
        entity_type=entity_type,
        entity_id=entity_id,
        field_changed=field_changed,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        changed_by=changed_by,
        reason=reason,
        affects_compatibility=impact["affects_compatibility"],
        affects_priority=impact["affects_priority"],
        affects_operational_feasibility=impact["affects_operational_feasibility"],
        affects_ml_risk=impact["affects_ml_risk"],
        requires_revalidation=impact["requires_revalidation"],
        impact_severity=impact["impact_severity"],
        impact_summary=impact["impact_summary"],
        revalidation_recommendations=json.dumps(impact["recommendations"]),
    )

    db.add(event)

    # Dynamic Revalidation Trigger (Phase 10)
    if impact["requires_revalidation"]:
        if allocation_id:
            alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
            if alloc:
                alloc.revalidation_status = "REVALIDATION_REQUIRED"
        elif organ_id:
            alloc = db.query(Allocation).filter(Allocation.organ_id == organ_id).first()
            if alloc:
                alloc.revalidation_status = "REVALIDATION_REQUIRED"

    db.commit()
    db.refresh(event)

    return {
        "event_id": event.id,
        "event_uid": event.event_uid,
        "entity_type": event.entity_type,
        "field_changed": event.field_changed,
        "old_value": event.old_value,
        "new_value": event.new_value,
        "changed_by": event.changed_by,
        "reason": event.reason,
        "timestamp": event.timestamp.isoformat() if event.timestamp else datetime.now().isoformat(),
        "impact": impact,
    }


def get_allocation_events(
    db: Session,
    allocation_id: Optional[int] = None,
    organ_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Fetches the chronological audit history and impact logs.
    """
    query = db.query(AllocationEvent)
    if allocation_id:
        query = query.filter(AllocationEvent.allocation_id == allocation_id)
    elif organ_id:
        query = query.filter(AllocationEvent.organ_id == organ_id)
    elif patient_id:
        query = query.filter(AllocationEvent.patient_id == patient_id)

    events = query.order_by(AllocationEvent.timestamp.desc()).limit(limit).all()

    results = []
    for ev in events:
        recs = []
        if ev.revalidation_recommendations:
            try:
                recs = json.loads(ev.revalidation_recommendations)
            except Exception:
                recs = [ev.revalidation_recommendations]

        results.append({
            "id": ev.id,
            "event_uid": ev.event_uid,
            "allocation_id": ev.allocation_id,
            "match_id": ev.match_id,
            "organ_id": ev.organ_id,
            "patient_id": ev.patient_id,
            "entity_type": ev.entity_type,
            "entity_id": ev.entity_id,
            "field_changed": ev.field_changed,
            "old_value": ev.old_value,
            "new_value": ev.new_value,
            "changed_by": ev.changed_by,
            "reason": ev.reason,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
            "affects_compatibility": ev.affects_compatibility,
            "affects_priority": ev.affects_priority,
            "affects_operational_feasibility": ev.affects_operational_feasibility,
            "affects_ml_risk": ev.affects_ml_risk,
            "requires_revalidation": ev.requires_revalidation,
            "impact_severity": ev.impact_severity,
            "impact_summary": ev.impact_summary,
            "recommendations": recs,
        })
    return results


def revalidate_allocation_by_coordinator(
    db: Session,
    allocation_id: int,
    coordinator_name: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Allows coordinator to officially revalidate an allocation after reviewing changes.
    """
    alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not alloc:
        raise ValueError("Allocation not found")

    alloc.revalidation_status = "REVALIDATED"
    alloc.last_revalidated_at = datetime.now()
    
    # Log revalidation event
    log_allocation_event(
        db=db,
        allocation_id=alloc.id,
        organ_id=alloc.organ_id,
        patient_id=alloc.receiver_id,
        entity_type="ALLOCATION_LIFECYCLE",
        field_changed="revalidation_status",
        old_value="REVALIDATION_REQUIRED",
        new_value="REVALIDATED",
        changed_by=coordinator_name,
        reason=notes or "Coordinator reviewed change impact report and confirmed allocation safety."
    )
    db.commit()
    return {
        "allocation_id": alloc.id,
        "allocation_uid": alloc.allocation_uid,
        "revalidation_status": alloc.revalidation_status,
        "last_revalidated_at": alloc.last_revalidated_at.isoformat(),
        "message": "Allocation successfully revalidated by Transplant Coordinator."
    }
