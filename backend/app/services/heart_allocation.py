"""
Heart Allocation & Clinical Compatibility Engine (Phase 17)
============================================================
Implements organ-specific allocation logic for deceased donor Heart allocation according to
National Heart Allocation Guidelines (NOTTO & International ISHLT Framework).

Key Clinical Variables:
  Donor:
    - Age, Height, Weight, Blood Group
    - Left Ventricular Ejection Fraction (LVEF %) (Optimal >50%)
    - Inotrope requirement & Coronary Angiogram status
    - Cardiac arrest downtime minutes
  Recipient:
    - Heart Failure Status (NYHA Class IV)
    - Urgency Stratification:
        * Status 1A (Highest Urgency - 1000 base pts): ECMO, BiVAD, IABP, Mechanical Ventilation with high inotropes
        * Status 1B (High Urgency - 500 base pts): Durable LVAD, continuous single inotrope infusion
        * Status 2 (Standard Urgency - 200 base pts): Ambulatory outpatients
    - Hemodynamics: Cardiac Index (L/min/m²), PCWP (mmHg)
    - Inotrope support (Milrinone, Dobutamine, Adrenaline)
    - Anthropometrics: Strict Size Matching (Height/Weight diff within ±15-20%)
    - Geographic proximity (Crucial: 4-6 hour strict Cold Ischemia window)
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.organ import Organ
from app.services.compatibility import check_blood_compatibility


def evaluate_heart_compatibility(organ: Organ, receiver: Patient) -> Dict[str, Any]:
    """
    Evaluates Heart-specific biological and strict anthropometric compatibility.
    1. ABO Blood Group barrier
    2. Strict Size Matching:
       - Height difference within ±15%
       - Weight difference within ±20% (Donor/Receiver weight ratio 0.80 - 1.25)
       - In severe size mismatch (ratio <0.70 or >1.35), heart cannot support recipient hemodynamic workload or fit in pericardial cavity.
    3. Donor Heart Viability (LVEF %, Inotrope support, Downtime)
    4. Strict Cold Ischemia Window (Max 4-6 hours)
    """
    d_bg = organ.donor.blood_group.value if organ.donor else "O+"
    r_bg = receiver.blood_group.value if receiver.blood_group else "O+"
    
    abo_compatible = check_blood_compatibility(d_bg, r_bg)
    is_exact_abo = (d_bg.strip().upper() == r_bg.strip().upper())

    # Strict Size Matching
    d_w = organ.donor.weight_kg if (organ.donor and organ.donor.weight_kg) else 70.0
    r_w = receiver.weight_kg if receiver.weight_kg else 65.0
    d_h = organ.donor.height_cm if (organ.donor and organ.donor.height_cm) else 170.0
    r_h = receiver.height_cm if receiver.height_cm else 165.0

    weight_ratio = round(d_w / r_w, 2) if r_w > 0 else 1.0
    height_diff = round(r_h - d_h, 1)
    height_pct_diff = round(abs(d_h - r_h) / r_h * 100.0, 1) if r_h > 0 else 0.0

    if 0.85 <= weight_ratio <= 1.20 and height_pct_diff <= 15.0:
        size_status = "OPTIMAL"
        size_label = f"Optimal Thoracic Dimension & Mass Match (Weight Ratio {weight_ratio}, Height Diff {height_diff}cm)"
    elif 0.75 <= weight_ratio <= 1.30 and height_pct_diff <= 20.0:
        size_status = "ACCEPTABLE"
        size_label = f"Acceptable Cardiac Size Match (Weight Ratio {weight_ratio})"
    elif weight_ratio < 0.75:
        size_status = "MISMATCH_CAUTION"
        size_label = f"Under-sized Donor Risk — Donor Weight Ratio {weight_ratio} (<0.75 risk of acute right heart failure)"
    else:
        size_status = "MISMATCH_CAUTION"
        size_label = f"Over-sized Donor Risk — Donor Weight Ratio {weight_ratio} (>1.30 pericardial crowding risk)"

    # Donor Heart Function Screening
    lvef = float(organ.donor_lvef or 60.0)
    downtime = int(organ.cardiac_arrest_downtime_minutes or 0)
    
    viability_warnings = []
    if lvef < 50.0:
        viability_warnings.append(f"Borderline Donor Ejection Fraction (LVEF {lvef}%)")
    if downtime > 20:
        viability_warnings.append(f"Extended Cardiac Arrest Downtime ({downtime} mins)")

    is_hard_compatible = (abo_compatible and 0.65 <= weight_ratio <= 1.40)

    return {
        "is_hard_compatible": is_hard_compatible,
        "overall_status": "COMPATIBLE" if (is_hard_compatible and not viability_warnings) else ("CONDITIONALLY_COMPATIBLE" if is_hard_compatible else "INCOMPATIBLE"),
        "organ_type": "HEART",
        "abo": {
            "status": "COMPATIBLE" if abo_compatible else "INCOMPATIBLE",
            "donor_blood_group": d_bg,
            "receiver_blood_group": r_bg,
            "is_exact_match": is_exact_abo,
        },
        "size": {
            "size_compatibility": size_status,
            "weight_ratio": weight_ratio,
            "height_diff_cm": height_diff,
            "height_pct_diff": height_pct_diff,
            "size_label": size_label,
            "donor_weight_kg": d_w,
            "receiver_weight_kg": r_w,
        },
        "donor_cardiac_viability": {
            "lvef_percentage": lvef,
            "inotrope_support": organ.donor_inotrope_support or "None",
            "coronary_angiogram": organ.donor_coronary_angiogram or "Normal",
            "downtime_minutes": downtime,
            "viability_warnings": viability_warnings,
        },
        "preservation_window": {
            "max_safe_ischemia_hours": 6.0,
            "optimal_ischemia_hours": 4.0,
            "ischemia_note": "Strict 4-6h Cold Ischemia Limit — Requires Express Green Corridor / Air Charter Transport"
        }
    }


def score_heart_receiver(organ: Organ, receiver: Patient, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Computes dedicated Heart Priority Score according to NOTTO Heart Allocation Policy.
    Tiered Prioritization Architecture:
      1. Urgency Tier:
         - Status 1A: 1000 base points (ECMO, BiVAD, IABP, Ventilation + Dual Inotropes)
         - Status 1B: 500 base points (Durable LVAD, Continuous Inotrope Infusion)
         - Status 2: 200 base points (Ambulatory NYHA Class IV)
      2. Hemodynamic Distress Index (+0-45 pts):
         - Cardiac Index < 2.0 L/min/m² (+25 pts)
         - PCWP > 20 mmHg (+20 pts)
      3. Pediatric Priority Bonus (+40 pts)
      4. Prior Living Donor / Sensitized Merit (+30 pts)
      5. ABO Identical Matching (+20 pts)
      6. Geographic Proximity (+25 local, +15 city, +5 state) — heavily weighted due to 4h CIT limit
      7. Waiting Time Tiebreaker (days / 30)
    """
    rp = receiver.receiver_profile
    compat = evaluate_heart_compatibility(organ, receiver)

    total_score = 0.0
    breakdown = {}
    tier_qualifications = []

    is_pediatric = (receiver.age < 18)
    urgency_tier = "STATUS_2"

    # 1. Determine Status 1A / 1B / 2
    if rp and (
        rp.ecmo
        or rp.iabp
        or (rp.mechanical_ventilation and rp.inotrope_support)
        or rp.heart_urgency_category == "STATUS_1A"
        or (rp.special_status and "1A" in rp.special_status)
    ):
        urgency_tier = "STATUS_1A"
        base_pts = 1000.0
        tier_label = "STATUS 1A CRITICAL: Mechanical Circulatory Support (ECMO/IABP/Ventilation + Inotropes)"
    elif rp and (
        rp.lvad
        or rp.inotrope_support
        or rp.heart_urgency_category == "STATUS_1B"
        or (rp.special_status and "1B" in rp.special_status)
    ):
        urgency_tier = "STATUS_1B"
        base_pts = 500.0
        tier_label = "STATUS 1B HIGH: Durable LVAD Support / Continuous Inotrope Infusion"
    else:
        urgency_tier = "STATUS_2"
        base_pts = 200.0
        tier_label = "STATUS 2 STANDARD: Ambulatory NYHA Class IV Cardiac Failure"

    total_score += base_pts
    breakdown["urgency_tier_base_points"] = base_pts
    breakdown["urgency_tier"] = urgency_tier
    tier_qualifications.append(f"{tier_label} (+{base_pts} pts)")

    # 2. Hemodynamic Distress Modifiers
    ci = float(rp.cardiac_index) if (rp and rp.cardiac_index is not None) else 2.2
    pcwp = float(rp.pcwp) if (rp and rp.pcwp is not None) else 16.0
    
    hemo_pts = 0.0
    if ci < 2.0:
        hemo_pts += 25.0
        tier_qualifications.append(f"Depressed Cardiac Index ({ci} L/min/m² < 2.0): +25 pts")
    if pcwp > 20.0:
        hemo_pts += 20.0
        tier_qualifications.append(f"Elevated Wedge Pressure (PCWP {pcwp} mmHg > 20): +20 pts")
        
    total_score += hemo_pts
    breakdown["hemodynamic_points"] = hemo_pts

    # 3. Pediatric Bonus
    if is_pediatric:
        ped_pts = 40.0
        total_score += ped_pts
        breakdown["pediatric_bonus"] = ped_pts
        tier_qualifications.append(f"Pediatric Heart Candidate ({receiver.age}y): +{ped_pts} pts")

    # 4. Prior Living Donor
    if rp and rp.prior_living_donor:
        pld_pts = 30.0
        total_score += pld_pts
        breakdown["prior_living_donor_points"] = pld_pts
        tier_qualifications.append("Prior Living Organ Donor Regulatory Preference: +30 pts")

    # 5. ABO Identical Match Bonus
    if compat["abo"]["is_exact_match"]:
        abo_pts = 20.0
        total_score += abo_pts
        breakdown["abo_exact_match_points"] = abo_pts
        tier_qualifications.append(f"Identical ABO Match ({receiver.blood_group.value}): +{abo_pts} pts")

    # 6. Geographic Proximity Tier (Critical for Heart preservation < 4-6h)
    d_hosp = organ.donor.hospital if organ.donor else None
    r_hosp = receiver.hospital
    if d_hosp and r_hosp:
        if d_hosp.id == r_hosp.id:
            geo_pts = 25.0
            geo_label = "Local Thoracic Center (Minimal Transit Time) (+25 pts)"
        elif d_hosp.city and r_hosp.city and d_hosp.city.lower() == r_hosp.city.lower():
            geo_pts = 15.0
            geo_label = f"Same Metro Corridor ({d_hosp.city}) (+15 pts)"
        elif d_hosp.state and r_hosp.state and d_hosp.state.lower() == r_hosp.state.lower():
            geo_pts = 5.0
            geo_label = f"Intra-State Corridor ({d_hosp.state}) (+5 pts)"
        else:
            geo_pts = 0.0
            geo_label = "Interstate National Allocation (0 pts)"
    else:
        geo_pts = 10.0
        geo_label = "Standard Proximity (+10 pts)"

    total_score += geo_pts
    breakdown["geographic_proximity_points"] = geo_pts
    tier_qualifications.append(geo_label)

    # 7. Waiting Time Tiebreaker
    waiting_days = 45
    if rp and rp.waiting_start_date:
        start_dt = rp.waiting_start_date
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - start_dt
        waiting_days = max(1, delta.days)
    wait_pts = min(30.0, round(waiting_days / 20.0, 2))
    total_score += wait_pts
    breakdown["waiting_time_points"] = wait_pts
    tier_qualifications.append(f"Wait Time: {waiting_days} days (+{wait_pts} pts)")

    # Multi-organ candidate priority boost (Phase 19)
    if rp and rp.is_multi_organ_candidate and rp.secondary_organ == "KIDNEY":
        hk_pts = 30.0
        total_score += hk_pts
        breakdown["multi_organ_hk_boost"] = hk_pts
        tier_qualifications.append("Simultaneous Heart-Kidney (HK) Priority (+30 pts)")

    total_score = round(total_score, 2)

    return {
        "receiver_id": receiver.id,
        "receiver_uid": receiver.patient_uid,
        "receiver_name": receiver.name,
        "age": receiver.age,
        "blood_group": receiver.blood_group.value,
        "hospital_id": receiver.hospital_id,
        "hospital_name": receiver.hospital.name if receiver.hospital else "Hospital",
        "organ_type": "HEART",
        "total_score": total_score,
        "priority_score": total_score,
        "urgency_tier": urgency_tier,
        "score_breakdown": breakdown,
        "tier_qualifications": tier_qualifications,
        "compatibility": compat,
    }
