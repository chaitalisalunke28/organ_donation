"""
Lung Allocation & LAS Proxy Engine (Phase 18)
==============================================
Implements organ-specific allocation logic for deceased donor Lung allocation according to
National Lung Allocation Guidelines (NOTTO & UNOS Lung Allocation Score LAS framework).

Key Variables:
  Donor:
    - Age, Height, Weight, Blood Group
    - PaO2/FiO2 ratio (Optimal >350 mmHg)
    - Bronchoscopy findings & Chest X-ray clear
  Recipient:
    - Diagnostic Group:
        * Group A: Obstructive lung disease (COPD, Alpha-1)
        * Group B: Pulmonary vascular disease (PAH)
        * Group C: Cystic fibrosis & Immunodeficiency
        * Group D: Restrictive lung disease (IPF, Pulmonary Fibrosis) — highest urgency
    - Medical Urgency Factors:
        * Assisted Ventilation (Invasive mechanical, BiPAP, ECMO)
        * PaCO2 (mmHg) & 6-month PaCO2 progression
        * Oxygen requirement at rest (L/min)
        * Serum Creatinine & Total Bilirubin
        * Cardiac Index (L/min/m²) & Mean PAP
    - Post-Transplant Survival Predictors:
        * FVC % predicted, FEV1 % predicted, Age
    - Proximity & Transport (Cold Ischemia limit: 6-8 hours)
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.organ import Organ
from app.services.compatibility import check_blood_compatibility


def calculate_lung_allocation_score(receiver: Patient) -> Dict[str, Any]:
    """
    Computes LAS (Lung Allocation Score) proxy (0 - 100 continuous score).
    Balanced synthesis of Waiting List Urgency (70%) and Post-Transplant Survival (30%).
    """
    rp = receiver.receiver_profile
    if not rp:
        return {"las_score": 35.0, "urgency_subscore": 20.0, "survival_subscore": 15.0}

    # 1. Diagnostic Group Baseline
    group = (rp.lung_diagnostic_group or "GROUP_A").upper()
    group_urgency_baselines = {
        "GROUP_D": 30.0,  # Restrictive (IPF) - highest risk of waitlist death
        "GROUP_B": 25.0,  # Pulmonary Arterial Hypertension
        "GROUP_C": 20.0,  # Cystic Fibrosis
        "GROUP_A": 15.0,  # COPD / Emphysema
    }
    base_urgency = group_urgency_baselines.get(group, 20.0)

    # 2. Ventilatory & Gas Exchange Urgency
    vent_mode = (rp.assisted_ventilation or "None").lower()
    vent_pts = 0.0
    if "ecmo" in vent_mode:
        vent_pts = 35.0
    elif "invasive" in vent_mode or "mechanical" in vent_mode:
        vent_pts = 25.0
    elif "bipap" in vent_mode or "niv" in vent_mode:
        vent_pts = 15.0

    paco2 = float(rp.paco2 or 42.0)
    paco2_pts = 0.0
    if paco2 > 50.0:
        paco2_pts += 10.0
    if float(rp.paco2_change_6m or 0.0) >= 5.0:
        paco2_pts += 8.0  # Rapidly worsening hypercapnia

    o2_rest = float(rp.oxygen_requirement_rest or 0.0)
    o2_pts = min(12.0, o2_rest * 2.0)

    # 3. End-Organ Function & Hemodynamics
    cr = float(rp.receiver_creatinine or 1.0)
    bili = float(rp.receiver_bilirubin or 0.8)
    organ_fail_pts = 0.0
    if cr > 1.5:
        organ_fail_pts += 8.0
    if bili > 1.5:
        organ_fail_pts += 8.0

    urgency_subscore = min(70.0, base_urgency + vent_pts + paco2_pts + o2_pts + organ_fail_pts)

    # 4. Post-Transplant Survival Subscore (0-30 pts)
    fvc = float(rp.fvc_predicted_pct or 50.0)
    ci = float(rp.cardiac_index or 2.2)
    age = receiver.age

    survival_pts = 15.0
    if fvc >= 40.0:
        survival_pts += 5.0
    if ci >= 2.0:
        survival_pts += 5.0
    if age < 50:
        survival_pts += 5.0

    survival_subscore = min(30.0, survival_pts)
    total_las = round(min(100.0, urgency_subscore + survival_subscore), 1)

    return {
        "las_score": total_las,
        "diagnostic_group": group,
        "urgency_subscore": round(urgency_subscore, 1),
        "survival_subscore": round(survival_subscore, 1),
        "ventilator_support": rp.assisted_ventilation or "None",
        "paco2_mmhg": paco2,
        "oxygen_l_min": o2_rest,
    }


def evaluate_lung_compatibility(organ: Organ, receiver: Patient) -> Dict[str, Any]:
    """
    Evaluates Lung-specific biological and anthropometric size matching (Predicted Total Lung Capacity pTLC).
    1. ABO Compatibility (Hard filter)
    2. Predicted TLC / Height Matching:
       - Donor Height / Receiver Height Ratio: 0.85 - 1.15 optimal
       - Ratio < 0.80 -> Severe under-sizing (atelectasis, persistent pneumothorax risk)
       - Ratio > 1.20 -> Severe over-sizing (thoracic compartment syndrome, hemodynamic collapse)
    3. Donor Gas Exchange Screening (PaO2/FiO2 ratio > 300 mmHg)
    4. Cold Ischemia Limit (6 - 8 hours max)
    """
    d_bg = organ.donor.blood_group.value if organ.donor else "O+"
    r_bg = receiver.blood_group.value if receiver.blood_group else "O+"
    
    abo_compatible = check_blood_compatibility(d_bg, r_bg)
    is_exact_abo = (d_bg.strip().upper() == r_bg.strip().upper())

    d_h = organ.donor.height_cm if (organ.donor and organ.donor.height_cm) else 170.0
    r_h = receiver.height_cm if receiver.height_cm else 165.0
    height_ratio = round(d_h / r_h, 2) if r_h > 0 else 1.0
    height_diff = round(r_h - d_h, 1)

    if 0.88 <= height_ratio <= 1.12:
        size_status = "OPTIMAL"
        size_label = f"Optimal Predicted Thoracic Capacity Match (Height Ratio {height_ratio})"
    elif 0.80 <= height_ratio <= 1.20:
        size_status = "ACCEPTABLE"
        size_label = f"Acceptable Lung Volume Match (Height Ratio {height_ratio})"
    elif height_ratio < 0.80:
        size_status = "MISMATCH_CAUTION"
        size_label = f"Under-sized Donor Lung Warning (Height Ratio {height_ratio} < 0.80)"
    else:
        size_status = "MISMATCH_CAUTION"
        size_label = f"Over-sized Donor Lung Warning (Height Ratio {height_ratio} > 1.20)"

    # Donor Oxygenation Capacity
    pao2_fio2 = float(organ.donor_pao2_fio2_ratio or 400.0)
    donor_warnings = []
    if pao2_fio2 < 300.0:
        donor_warnings.append(f"Impaired Donor Oxygenation (PaO2/FiO2 {pao2_fio2} < 300 mmHg)")

    is_hard_compatible = (abo_compatible and 0.75 <= height_ratio <= 1.25)

    return {
        "is_hard_compatible": is_hard_compatible,
        "overall_status": "COMPATIBLE" if (is_hard_compatible and not donor_warnings) else ("CONDITIONALLY_COMPATIBLE" if is_hard_compatible else "INCOMPATIBLE"),
        "organ_type": "LUNG",
        "abo": {
            "status": "COMPATIBLE" if abo_compatible else "INCOMPATIBLE",
            "donor_blood_group": d_bg,
            "receiver_blood_group": r_bg,
            "is_exact_match": is_exact_abo,
        },
        "size": {
            "size_compatibility": size_status,
            "height_ratio": height_ratio,
            "height_diff_cm": height_diff,
            "size_label": size_label,
            "donor_height_cm": d_h,
            "receiver_height_cm": r_h,
        },
        "donor_pulmonary_viability": {
            "pao2_fio2_ratio": pao2_fio2,
            "bronchoscopy": organ.donor_bronchoscopy or "Clear",
            "chest_xray": organ.donor_chest_xray or "Clear fields",
            "donor_warnings": donor_warnings,
        },
        "preservation_window": {
            "max_safe_ischemia_hours": 8.0,
            "optimal_ischemia_hours": 6.0,
            "ischemia_note": "Strict 6-8h Ischemic Window — Requires Rapid Perfusion & Transport"
        }
    }


def score_lung_receiver(organ: Organ, receiver: Patient, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Computes dedicated Lung Priority Score according to NOTTO / LAS Allocation Policy.
    Score Breakdown:
      1. LAS Score (0 - 100 continuous score, main medical driver)
      2. Pediatric Priority Bonus (+30 pts)
      3. Prior Living Donor Preference (+30 pts)
      4. ABO Identical Matching (+15 pts)
      5. Geographic Proximity (+20 local, +10 city, +5 state)
      6. Waiting Time Tiebreaker (days / 30)
    """
    rp = receiver.receiver_profile
    compat = evaluate_lung_compatibility(organ, receiver)
    las_data = calculate_lung_allocation_score(receiver)

    total_score = 0.0
    breakdown = {}
    tier_qualifications = []

    # 1. LAS Core Score
    las_pts = las_data["las_score"]
    total_score += las_pts
    breakdown["las_core_score"] = las_pts
    breakdown["las_details"] = las_data
    tier_qualifications.append(f"Lung Allocation Score (LAS): {las_pts} pts (Urgency {las_data['urgency_subscore']} + Survival {las_data['survival_subscore']})")

    # 2. Pediatric Bonus
    if receiver.age < 18:
        ped_pts = 30.0
        total_score += ped_pts
        breakdown["pediatric_bonus"] = ped_pts
        tier_qualifications.append(f"Pediatric Candidate ({receiver.age}y): +{ped_pts} pts")

    # 3. Prior Living Donor
    if rp and rp.prior_living_donor:
        pld_pts = 30.0
        total_score += pld_pts
        breakdown["prior_living_donor_points"] = pld_pts
        tier_qualifications.append("Prior Living Organ Donor Preference: +30 pts")

    # 4. ABO Identical Matching
    if compat["abo"]["is_exact_match"]:
        abo_pts = 15.0
        total_score += abo_pts
        breakdown["abo_exact_match_points"] = abo_pts
        tier_qualifications.append(f"Identical ABO Match ({receiver.blood_group.value}): +{abo_pts} pts")

    # 5. Geographic Proximity Tier (8h Cold Ischemia Limit)
    d_hosp = organ.donor.hospital if organ.donor else None
    r_hosp = receiver.hospital
    if d_hosp and r_hosp:
        if d_hosp.id == r_hosp.id:
            geo_pts = 20.0
            geo_label = "Local Retrieval Center (+20 pts)"
        elif d_hosp.city and r_hosp.city and d_hosp.city.lower() == r_hosp.city.lower():
            geo_pts = 12.0
            geo_label = f"Same Metro Corridor ({d_hosp.city}) (+12 pts)"
        elif d_hosp.state and r_hosp.state and d_hosp.state.lower() == r_hosp.state.lower():
            geo_pts = 5.0
            geo_label = f"Intra-State Region ({d_hosp.state}) (+5 pts)"
        else:
            geo_pts = 0.0
            geo_label = "Interstate National Allocation (0 pts)"
    else:
        geo_pts = 8.0
        geo_label = "Standard Proximity (+8 pts)"

    total_score += geo_pts
    breakdown["geographic_points"] = geo_pts
    tier_qualifications.append(geo_label)

    # 6. Waiting Time Tiebreaker
    waiting_days = 40
    if rp and rp.waiting_start_date:
        start_dt = rp.waiting_start_date
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - start_dt
        waiting_days = max(1, delta.days)
    wait_pts = min(20.0, round(waiting_days / 25.0, 2))
    total_score += wait_pts
    breakdown["waiting_time_points"] = wait_pts
    tier_qualifications.append(f"Wait Time: {waiting_days} days (+{wait_pts} pts)")

    total_score = round(total_score, 2)

    return {
        "receiver_id": receiver.id,
        "receiver_uid": receiver.patient_uid,
        "receiver_name": receiver.name,
        "age": receiver.age,
        "blood_group": receiver.blood_group.value,
        "hospital_id": receiver.hospital_id,
        "hospital_name": receiver.hospital.name if receiver.hospital else "Hospital",
        "organ_type": "LUNG",
        "total_score": total_score,
        "priority_score": total_score,
        "las_score": las_pts,
        "score_breakdown": breakdown,
        "tier_qualifications": tier_qualifications,
        "compatibility": compat,
    }
