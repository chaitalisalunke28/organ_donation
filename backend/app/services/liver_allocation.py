"""
Liver Allocation & Clinical Compatibility Engine (Phase 16)
============================================================
Implements organ-specific allocation logic for deceased donor Liver allocation according to
National Liver Allocation Guidelines (NOTTO & UNOS MELD-Na / PELD framework).

Key Variables:
  Donor:
    - Age, Height, Weight, Blood Group
    - Liver Function: Total Bilirubin, AST, ALT, INR, Albumin
    - Steatosis % (<10% optimal, 10-30% moderate, >30% high risk)
    - Infection Status & Organ Condition
  Recipient:
    - Diagnosis (Cirrhosis, Fulminant Hepatic Failure, HCC, Biliary Atresia)
    - Urgency Level & Exception Status (Status 1A, HCC Milan criteria)
    - MELD-Na Score (Bilirubin, INR, Creatinine, Sodium, Dialysis history)
    - PELD Score (for pediatric < 12 years)
    - Waiting Time & Pediatric Status

Allocation Architecture:
  Status 1A (Fulminant Liver Failure / Anhepatic) -> 1000 base pts
  Tier 2: MELD-Na (6 to 40) / PELD (for pediatric) + Exception points + Pediatric bonus + Geo Proximity + Wait Time.
"""
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.organ import Organ
from app.services.compatibility import check_blood_compatibility, compute_size_compatibility


def calculate_meld_score(
    bilirubin: float,
    inr: float,
    creatinine: float,
    sodium: Optional[float] = None,
    dialysis_twice_past_week: bool = False,
) -> Dict[str, Any]:
    """
    Calculates MELD (Model for End-Stage Liver Disease) and MELD-Na scores.
    Standard OPTN / NOTTO Formula:
      MELD = 9.57 * ln(Cr) + 3.78 * ln(Bili) + 11.20 * ln(INR) + 6.43
      Bounds: Values < 1.0 are set to 1.0. Creatinine is capped at 4.0 (or 4.0 if dialyzed >=2x).
      MELD-Na = MELD + 1.32 * (137 - Na) - [0.033 * MELD * (137 - Na)]  (Na bounded between 125 and 137)
    """
    bili_val = max(1.0, float(bilirubin or 1.0))
    inr_val = max(1.0, float(inr or 1.0))
    
    if dialysis_twice_past_week:
        cr_val = 4.0
    else:
        cr_val = min(4.0, max(1.0, float(creatinine or 1.0)))

    # Base MELD
    raw_meld = (
        9.57 * math.log(cr_val)
        + 3.78 * math.log(bili_val)
        + 11.20 * math.log(inr_val)
        + 6.43
    )
    base_meld = max(6, min(40, round(raw_meld)))

    # MELD-Na calculation if Sodium provided
    na_val = float(sodium) if sodium is not None else 135.0
    na_bounded = max(125.0, min(137.0, na_val))
    
    if base_meld > 11:
        meld_na_calc = base_meld + 1.32 * (137.0 - na_bounded) - (0.033 * base_meld * (137.0 - na_bounded))
        final_meld_na = max(6, min(40, round(meld_na_calc)))
    else:
        final_meld_na = base_meld

    # Mortality Risk Tier
    if final_meld_na >= 35:
        mortality_tier = "CRITICAL_3_MONTH_MORTALITY (>80%)"
    elif final_meld_na >= 25:
        mortality_tier = "HIGH_3_MONTH_MORTALITY (50-80%)"
    elif final_meld_na >= 15:
        mortality_tier = "MODERATE_3_MONTH_MORTALITY (15-50%)"
    else:
        mortality_tier = "LOW_3_MONTH_MORTALITY (<15%)"

    return {
        "base_meld": base_meld,
        "meld_na": final_meld_na,
        "final_meld_score": final_meld_na,
        "parameters_used": {
            "bilirubin_mg_dl": bili_val,
            "inr": inr_val,
            "creatinine_mg_dl": cr_val,
            "sodium_meq_l": na_bounded,
            "dialysis_past_week": dialysis_twice_past_week,
        },
        "mortality_risk_tier": mortality_tier,
    }


def calculate_peld_score(
    bilirubin: float,
    inr: float,
    albumin: float,
    growth_failure: bool = False,
    age_less_than_1_yr: bool = False,
) -> Dict[str, Any]:
    """
    Calculates PELD (Pediatric End-Stage Liver Disease) for candidates < 12 years old.
    PELD = 4.80 * ln(Bili) + 18.57 * ln(INR) - 6.87 * ln(Albumin) + 4.36 (if age < 1) + 6.67 (if growth failure)
    """
    bili_val = max(1.0, float(bilirubin or 1.0))
    inr_val = max(1.0, float(inr or 1.0))
    alb_val = max(1.0, float(albumin or 3.0))

    score = (
        4.80 * math.log(bili_val)
        + 18.57 * math.log(inr_val)
        - 6.87 * math.log(alb_val)
    )
    if age_less_than_1_yr:
        score += 4.36
    if growth_failure:
        score += 6.67

    peld_final = max(6, min(40, round(score)))
    return {
        "peld_score": peld_final,
        "parameters_used": {
            "bilirubin": bili_val,
            "inr": inr_val,
            "albumin": alb_val,
            "growth_failure": growth_failure,
            "age_less_than_1_yr": age_less_than_1_yr,
        }
    }


def evaluate_liver_compatibility(organ: Organ, receiver: Patient) -> Dict[str, Any]:
    """
    Evaluates Liver-specific biological and anthropometric compatibility.
    1. ABO Blood Group barrier
    2. Size & Weight Ratio (Graft-to-Recipient Weight Ratio proxy)
       - Optimal ratio: 0.80 - 1.25
       - Acceptable: 0.65 - 1.45
       - Caution / High Risk: <0.60 (Small-for-size syndrome) or >1.50 (Large-for-size)
    3. Donor Liver Quality Screening (Steatosis %, Bilirubin, AST/ALT)
    """
    d_bg = organ.donor.blood_group.value if organ.donor else "O+"
    r_bg = receiver.blood_group.value if receiver.blood_group else "O+"
    
    abo_compatible = check_blood_compatibility(d_bg, r_bg)
    is_exact_abo = (d_bg.strip().upper() == r_bg.strip().upper())

    # Size evaluation
    d_w = organ.donor.weight_kg if (organ.donor and organ.donor.weight_kg) else 70.0
    r_w = receiver.weight_kg if receiver.weight_kg else 65.0
    d_h = organ.donor.height_cm if (organ.donor and organ.donor.height_cm) else 170.0
    r_h = receiver.height_cm if receiver.height_cm else 165.0

    weight_ratio = round(d_w / r_w, 2) if r_w > 0 else 1.0
    height_diff = round(r_h - d_h, 1)

    if 0.80 <= weight_ratio <= 1.25:
        size_status = "OPTIMAL"
        size_label = f"Optimal Liver Mass Match (Weight Ratio {weight_ratio})"
    elif 0.65 <= weight_ratio < 0.80:
        size_status = "ACCEPTABLE"
        size_label = f"Acceptable Match — Slightly Smaller Donor (Ratio {weight_ratio})"
    elif 1.25 < weight_ratio <= 1.45:
        size_status = "ACCEPTABLE"
        size_label = f"Acceptable Match — Slightly Larger Donor (Ratio {weight_ratio})"
    elif weight_ratio < 0.65:
        size_status = "MISMATCH_CAUTION"
        size_label = f"Small-for-Size Risk — Donor Weight Ratio {weight_ratio} < 0.65"
    else:
        size_status = "MISMATCH_CAUTION"
        size_label = f"Large-for-Size Risk — Donor Weight Ratio {weight_ratio} > 1.45"

    # Donor Quality
    steatosis = float(organ.liver_steatosis_pct or 5.0)
    ast = float(organ.donor_ast or 35.0)
    alt = float(organ.donor_alt or 30.0)
    bili = float(organ.donor_bilirubin or 0.8)

    quality_warnings = []
    if steatosis > 30.0:
        quality_warnings.append(f"Severe Macrosteatosis ({steatosis}%)")
    elif steatosis > 15.0:
        quality_warnings.append(f"Moderate Macrosteatosis ({steatosis}%)")
    if ast > 200.0 or alt > 200.0:
        quality_warnings.append(f"Elevated Transaminases (AST {ast}, ALT {alt})")
    if bili > 2.5:
        quality_warnings.append(f"Donor Hyperbilirubinemia ({bili} mg/dL)")

    is_hard_compatible = (abo_compatible and size_status != "INCOMPATIBLE")
    
    return {
        "is_hard_compatible": is_hard_compatible,
        "overall_status": "COMPATIBLE" if (is_hard_compatible and not quality_warnings) else ("CONDITIONALLY_COMPATIBLE" if is_hard_compatible else "INCOMPATIBLE"),
        "organ_type": "LIVER",
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
            "size_label": size_label,
            "donor_weight_kg": d_w,
            "receiver_weight_kg": r_w,
        },
        "donor_quality": {
            "macrosteatosis_pct": steatosis,
            "donor_ast_u_l": ast,
            "donor_alt_u_l": alt,
            "donor_bilirubin_mg_dl": bili,
            "donor_condition": organ.liver_condition or "Normal appearance",
            "quality_warnings": quality_warnings,
        },
        "preservation_window": {
            "max_safe_ischemia_hours": 14.0,
            "optimal_ischemia_hours": 8.0,
        }
    }


def score_liver_receiver(organ: Organ, receiver: Patient, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Computes dedicated Liver Priority Score according to NOTTO Liver Allocation Policy.
    Score Components:
      1. Status 1A (Fulminant Liver Failure) -> 1000 base points (Overriding priority)
      2. MELD-Na / PELD Score (Continuous 6-40 scaled to priority score)
      3. Medical Urgency & Exception Points (HCC Milan Criteria +22 pts, etc.)
      4. Pediatric Priority Bonus (+30 pts)
      5. ABO Identical Match Bonus (+15 pts)
      6. Geographic Proximity (+15 local, +10 city, +5 state)
      7. Waiting Time Vintage (days on list / 50)
    """
    rp = receiver.receiver_profile
    compat = evaluate_liver_compatibility(organ, receiver)

    total_score = 0.0
    breakdown = {}
    tier_qualifications = []

    is_pediatric = (receiver.age < 18)
    is_status_1a = False

    # Check Status 1A (Fulminant hepatic failure)
    urg_str = (rp.urgency_level.value if hasattr(rp.urgency_level, 'value') else str(rp.urgency_level or '')).upper() if rp else ''
    if rp and (
        rp.liver_exception_status == "Status 1A Fulminant"
        or (rp.special_status and "1A" in rp.special_status)
        or (urg_str == "CRITICAL" and rp.liver_diagnosis and "fulminant" in rp.liver_diagnosis.lower())
    ):
        is_status_1a = True
        status_1a_pts = 1000.0
        total_score += status_1a_pts
        breakdown["status_1a_override_points"] = status_1a_pts
        tier_qualifications.append("STATUS 1A EMERGENCY: Fulminant Hepatic Failure (+1000 pts)")

    # Compute MELD-Na or PELD
    bili = float(rp.receiver_bilirubin) if (rp and rp.receiver_bilirubin is not None) else 2.5
    inr = float(rp.receiver_inr) if (rp and rp.receiver_inr is not None) else 1.8
    cr = float(rp.receiver_creatinine) if (rp and rp.receiver_creatinine is not None) else 1.4
    na = float(rp.receiver_sodium) if (rp and rp.receiver_sodium is not None) else 134.0
    dialysis = bool(rp and rp.dialysis_past_week)

    if is_pediatric and receiver.age < 12:
        peld_res = calculate_peld_score(bili, inr, albumin=3.0)
        meld_val = peld_res["peld_score"]
        meld_type = "PELD"
    else:
        meld_res = calculate_meld_score(bili, inr, cr, sodium=na, dialysis_twice_past_week=dialysis)
        meld_val = meld_res["final_meld_score"]
        meld_type = "MELD-Na"

    if not is_status_1a:
        # Scale MELD score (e.g. MELD 40 -> 80 pts, MELD 20 -> 40 pts)
        meld_points = round(meld_val * 2.0, 2)
        total_score += meld_points
        breakdown["meld_peld_points"] = meld_points
        breakdown["calculated_meld_score"] = meld_val
        breakdown["score_type"] = meld_type
        tier_qualifications.append(f"{meld_type} Score: {meld_val} (+{meld_points} pts)")

        # Exception points (e.g. HCC)
        if rp and rp.liver_exception_points and rp.liver_exception_points > 0:
            exc_pts = float(rp.liver_exception_points)
            total_score += exc_pts
            breakdown["exception_points"] = exc_pts
            tier_qualifications.append(f"Approved Liver Exception ({rp.liver_exception_status}): +{exc_pts} pts")

    # Pediatric Bonus
    if is_pediatric:
        ped_pts = 30.0
        total_score += ped_pts
        breakdown["pediatric_bonus"] = ped_pts
        tier_qualifications.append(f"Pediatric Candidate ({receiver.age}y): +{ped_pts} pts")

    # ABO Identical Matching Bonus
    if compat["abo"]["is_exact_match"]:
        abo_pts = 15.0
        total_score += abo_pts
        breakdown["abo_exact_match_points"] = abo_pts
        tier_qualifications.append(f"Identical ABO Match ({receiver.blood_group.value}): +{abo_pts} pts")

    # Geographic Proximity
    d_hosp = organ.donor.hospital if organ.donor else None
    r_hosp = receiver.hospital
    geo_pts = 0.0
    if d_hosp and r_hosp:
        if d_hosp.id == r_hosp.id:
            geo_pts = 15.0
            geo_label = "Local Retrieval Center (+15 pts)"
        elif d_hosp.city and r_hosp.city and d_hosp.city.lower() == r_hosp.city.lower():
            geo_pts = 10.0
            geo_label = f"Same Metro Area ({d_hosp.city}) (+10 pts)"
        elif d_hosp.state and r_hosp.state and d_hosp.state.lower() == r_hosp.state.lower():
            geo_pts = 5.0
            geo_label = f"Same State ROTTO ({d_hosp.state}) (+5 pts)"
        else:
            geo_pts = 0.0
            geo_label = "Interstate National Allocation (0 pts)"
    else:
        geo_pts = 5.0
        geo_label = "Standard Proximity (+5 pts)"

    total_score += geo_pts
    breakdown["geographic_points"] = geo_pts
    tier_qualifications.append(geo_label)

    # Waiting Time Tiebreaker
    waiting_days = 60
    if rp and rp.waiting_start_date:
        start_dt = rp.waiting_start_date
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - start_dt
        waiting_days = max(1, delta.days)
    wait_pts = min(20.0, round(waiting_days / 30.0, 2))
    total_score += wait_pts
    breakdown["waiting_time_points"] = wait_pts
    tier_qualifications.append(f"Waiting List Vintage: {waiting_days} days (+{wait_pts} pts)")

    # Multi-organ candidate priority boost (Phase 19)
    if rp and rp.is_multi_organ_candidate and rp.secondary_organ == "KIDNEY":
        slk_pts = 25.0
        total_score += slk_pts
        breakdown["multi_organ_slk_boost"] = slk_pts
        tier_qualifications.append("Simultaneous Liver-Kidney (SLK) Candidate Priority (+25 pts)")

    total_score = round(total_score, 2)

    return {
        "receiver_id": receiver.id,
        "receiver_uid": receiver.patient_uid,
        "receiver_name": receiver.name,
        "age": receiver.age,
        "blood_group": receiver.blood_group.value,
        "hospital_id": receiver.hospital_id,
        "hospital_name": receiver.hospital.name if receiver.hospital else "Hospital",
        "organ_type": "LIVER",
        "total_score": total_score,
        "priority_score": total_score,
        "is_status_1a": is_status_1a,
        "meld_score": meld_val,
        "score_breakdown": breakdown,
        "tier_qualifications": tier_qualifications,
        "compatibility": compat,
    }
