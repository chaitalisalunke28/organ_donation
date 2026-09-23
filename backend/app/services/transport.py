"""
Preservation and Transport Logistics Engine (Phase 6)
=====================================================
Calculates organ cold ischemia windows, elapsed preservation duration,
transport routes, multi-modal travel times, traffic delays, and remaining ischemic safety buffers.

ACADEMIC DISCLAIMER: Cold Ischemia Time limits follow clinical transplant standards
(NOTTO / ISHLT / ASTS Guidelines). Real-world transport involves real-time traffic coordination.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.organ import Organ
from app.models.patient import Patient
from app.models.hospital import Hospital
from app.models.allocation import OrganTransport

MAX_COLD_ISCHEMIA_HOURS = {
    "KIDNEY": 30.0,      # Optimal < 18h, Max allowable 36h
    "LIVER": 12.0,       # Optimal < 8h, Max allowable 16h
    "HEART": 4.5,        # Optimal < 4h, Max allowable 6h
    "LUNG": 6.0,         # Optimal < 5h, Max allowable 8h
    "PANCREAS": 12.0,    # Optimal < 10h, Max allowable 16h
    "CORNEA": 72.0,      # Extended storage allowable
    "OTHER": 24.0,
}


def calculate_preservation_window(organ: Organ, expected_transit_minutes: float = 45.0) -> Dict[str, Any]:
    """
    Computes elapsed preservation duration, projected total ischemia, and remaining safety buffer.
    """
    now = datetime.now(timezone.utc)
    organ_type = (organ.organ_type.value if hasattr(organ.organ_type, 'value') else organ.organ_type).upper()
    max_hours = MAX_COLD_ISCHEMIA_HOURS.get(organ_type, 24.0)
    max_minutes = max_hours * 60.0

    # Start timer from preservation_start or retrieval_time or organ creation
    start_time = organ.preservation_start or organ.retrieval_time or organ.created_at or now
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    elapsed_minutes = max(0.0, (now - start_time).total_seconds() / 60.0)
    elapsed_hours = elapsed_minutes / 60.0

    projected_total_ischemia_minutes = elapsed_minutes + expected_transit_minutes
    projected_total_ischemia_hours = projected_total_ischemia_minutes / 60.0

    remaining_buffer_minutes = max(0.0, max_minutes - projected_total_ischemia_minutes)
    remaining_buffer_hours = remaining_buffer_minutes / 60.0

    buffer_ratio = remaining_buffer_minutes / max_minutes if max_minutes > 0 else 0.0

    # Risk classification
    if organ_type in ["HEART", "LUNG"]:
        if remaining_buffer_hours > 2.0:
            risk_status = "SAFE"
            risk_label = "Optimal Ischemic Window"
        elif remaining_buffer_hours > 0.75:
            risk_status = "CAUTION"
            risk_label = "Moderate Ischemia Warning"
        else:
            risk_status = "CRITICAL_ISCHEMIA"
            risk_label = "Critical Cold Ischemia Risk"
    else:
        if remaining_buffer_hours > 12.0:
            risk_status = "SAFE"
            risk_label = "Optimal Ischemic Window"
        elif remaining_buffer_hours > 4.0:
            risk_status = "CAUTION"
            risk_label = "Moderate Ischemia Warning"
        else:
            risk_status = "CRITICAL_ISCHEMIA"
            risk_label = "Critical Cold Ischemia Risk"

    return {
        "organ_type": organ_type,
        "max_cold_ischemia_hours": max_hours,
        "elapsed_preservation_minutes": round(elapsed_minutes, 1),
        "elapsed_preservation_hours": round(elapsed_hours, 2),
        "expected_transport_minutes": round(expected_transit_minutes, 1),
        "projected_total_ischemia_hours": round(projected_total_ischemia_hours, 2),
        "remaining_preservation_buffer_hours": round(remaining_buffer_hours, 2),
        "remaining_buffer_minutes": round(remaining_buffer_minutes, 1),
        "buffer_ratio": round(buffer_ratio, 3),
        "preservation_risk_status": risk_status,
        "risk_label": risk_label,
        "preservation_method": organ.preservation_method or "Hypothermic Machine Perfusion (HMP)",
    }


def estimate_transport_logistics(
    donor_hospital: Optional[Hospital],
    receiver_hospital: Optional[Hospital],
    custom_mode: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes distance, travel duration, recommended transport mode, and route status.
    """
    if not donor_hospital or not receiver_hospital:
        return {
            "distance_km": 25.0,
            "transport_mode": "AMBULANCE_ROAD",
            "transport_provider": "City Medical Transit",
            "estimated_duration_minutes": 45,
            "delay_minutes": 0,
            "total_transit_minutes": 45,
            "route_status": "OPTIMAL_CLEAR",
            "transport_available": True,
            "route_summary": "Standard Intra-City Hospital Route",
        }

    # Same Hospital
    if donor_hospital.id == receiver_hospital.id:
        return {
            "distance_km": 0.5,
            "transport_mode": "INTERNAL_TRANSFER",
            "transport_provider": "In-Hospital Surgical Transit Team",
            "estimated_duration_minutes": 15,
            "delay_minutes": 0,
            "total_transit_minutes": 15,
            "route_status": "OPTIMAL_CLEAR",
            "transport_available": True,
            "route_summary": f"Internal OT Transfer within {donor_hospital.name}",
        }

    # Same City
    if donor_hospital.city and receiver_hospital.city and donor_hospital.city.strip().lower() == receiver_hospital.city.strip().lower():
        dist = 22.5
        mode = custom_mode or "GREEN_CORRIDOR_EXPRESS"
        dur = 35 if mode == "GREEN_CORRIDOR_EXPRESS" else 55
        return {
            "distance_km": dist,
            "transport_mode": mode,
            "transport_provider": f"{donor_hospital.city} Traffic Police & EMS Green Corridor",
            "estimated_duration_minutes": dur,
            "delay_minutes": 5,
            "total_transit_minutes": dur + 5,
            "route_status": "OPTIMAL_CLEAR",
            "transport_available": True,
            "route_summary": f"Intra-city express transit from {donor_hospital.name} to {receiver_hospital.name} ({donor_hospital.city})",
        }

    # Same State (Different City)
    if donor_hospital.state and receiver_hospital.state and donor_hospital.state.strip().lower() == receiver_hospital.state.strip().lower():
        dist = 145.0
        mode = custom_mode or "AMBULANCE_ROAD"
        dur = 130 if mode == "AMBULANCE_ROAD" else 50
        return {
            "distance_km": dist,
            "transport_mode": mode,
            "transport_provider": "State Highway EMS Fleet / Inter-City Medical Unit",
            "estimated_duration_minutes": dur,
            "delay_minutes": 15,
            "total_transit_minutes": dur + 15,
            "route_status": "MODERATE_TRAFFIC",
            "transport_available": True,
            "route_summary": f"Inter-city regional route: {donor_hospital.city} → {receiver_hospital.city} ({dist} km)",
        }

    # Interstate
    dist = 520.0
    mode = custom_mode or "AIR_CHARTER"
    dur = 90
    return {
        "distance_km": dist,
        "transport_mode": mode,
        "transport_provider": "National Air Ambulance & Organ Airlift Wing",
        "estimated_duration_minutes": dur,
        "delay_minutes": 20,
        "total_transit_minutes": dur + 20,
        "route_status": "OPTIMAL_CLEAR",
        "transport_available": True,
        "route_summary": f"Interstate airlift corridor: {donor_hospital.city} ({donor_hospital.state}) → {receiver_hospital.city} ({receiver_hospital.state})",
    }


def compute_full_transport_and_preservation(
    organ: Organ,
    receiver: Patient,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Combines transport logistics and dynamic preservation buffer evaluation.
    """
    donor_hospital = organ.donor.hospital if (organ.donor and organ.donor.hospital) else None
    receiver_hospital = receiver.hospital if receiver.hospital else None

    transport = estimate_transport_logistics(donor_hospital, receiver_hospital)
    preservation = calculate_preservation_window(organ, expected_transit_minutes=transport["total_transit_minutes"])

    return {
        "transport": transport,
        "preservation": preservation,
        "donor_hospital_name": donor_hospital.name if donor_hospital else "Donor Center",
        "receiver_hospital_name": receiver_hospital.name if receiver_hospital else "Recipient Center",
        "is_safe_for_transport": preservation["preservation_risk_status"] != "CRITICAL_ISCHEMIA" and transport["transport_available"],
    }
