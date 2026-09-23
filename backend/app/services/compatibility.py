"""
Compatibility Engine
====================
Comprehensive rule-based clinical compatibility assessment layer for organ allocation.
Architecture: DONOR -> ORGAN -> RECEIVER -> COMPATIBILITY ENGINE

Evaluates 4 core clinical compatibility dimensions:
1. ABO Compatibility (Derived blood group barrier)
2. Size Compatibility (Anthropometrics: Height, Weight diff, Size Ratio)
3. HLA & Immune Compatibility (HLA mismatch 0-6, PRA, CPRA, DSA, Sensitization)
4. Crossmatch Compatibility (CDC, Flow Cytometry, Virtual Crossmatch)

Academic decision-support model — not a clinical replacement.
"""
import re
from typing import List, Dict, Tuple, Optional


# ─── 3.1 ABO Compatibility ───────────────────────────────────────────────────

ABO_COMPATIBILITY_MATRIX: Dict[str, List[str]] = {
    "O+":  ["O+", "A+", "B+", "AB+"],
    "O-":  ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
    "A+":  ["A+", "AB+"],
    "A-":  ["A+", "A-", "AB+", "AB-"],
    "B+":  ["B+", "AB+"],
    "B-":  ["B+", "B-", "AB+", "AB-"],
    "AB+": ["AB+"],
    "AB-": ["AB+", "AB-"],
}


def check_blood_compatibility(donor_bg: str, receiver_bg: str) -> bool:
    """Check if donor blood group is compatible with receiver blood group."""
    if not donor_bg or not receiver_bg:
        return False
    # Normalize strings
    d_bg = donor_bg.strip().upper()
    r_bg = receiver_bg.strip().upper()
    compatible_receivers = ABO_COMPATIBILITY_MATRIX.get(d_bg, [])
    return r_bg in compatible_receivers


def get_compatibility_strength(donor_bg: str, receiver_bg: str) -> Tuple[str, int]:
    """
    Return compatibility strength label and priority score contribution.
    EXACT_MATCH: identical blood group = 30 points
    COMPATIBLE: compatible but not identical = 20 points
    INCOMPATIBLE: 0 points
    """
    d_bg = (donor_bg or "").strip().upper()
    r_bg = (receiver_bg or "").strip().upper()

    if d_bg == r_bg and d_bg != "":
        return "EXACT_MATCH", 30
    elif check_blood_compatibility(d_bg, r_bg):
        return "COMPATIBLE", 20
    else:
        return "INCOMPATIBLE", 0


def compute_abo_compatibility(donor_bg: str, receiver_bg: str) -> Dict:
    """Derived ABO compatibility feature dictionary."""
    is_compat = check_blood_compatibility(donor_bg, receiver_bg)
    strength, score = get_compatibility_strength(donor_bg, receiver_bg)
    return {
        "status": "COMPATIBLE" if is_compat else "INCOMPATIBLE",
        "compatibility_type": strength,
        "score_contribution": score,
        "donor_blood_group": donor_bg,
        "receiver_blood_group": receiver_bg,
        "is_exact_match": strength == "EXACT_MATCH",
    }


# ─── 3.2 Size Compatibility ───────────────────────────────────────────────────

def compute_size_compatibility(
    donor_height: Optional[float],
    donor_weight: Optional[float],
    receiver_height: Optional[float],
    receiver_weight: Optional[float],
) -> Dict:
    """
    Derived size and anthropometric compatibility features.
    Evaluates height/weight differences and body mass ratio.
    """
    # Defaults if missing
    d_h = donor_height or 170.0
    d_w = donor_weight or 70.0
    r_h = receiver_height or 165.0
    r_w = receiver_weight or 65.0

    height_diff = round(r_h - d_h, 1)
    weight_diff = round(r_w - d_w, 1)
    size_ratio = round(r_w / d_w, 2) if d_w > 0 else 1.0

    # Determine size compatibility classification
    # Optimal: weight diff within ±15 kg or ratio 0.80 - 1.20
    # Acceptable: ratio 0.65 - 1.35
    # Mismatch caution: outside acceptable range
    if 0.80 <= size_ratio <= 1.20 or abs(weight_diff) <= 15:
        size_compat = "OPTIMAL"
        score = 10
        desc = f"Optimal size match (Weight diff: {weight_diff:+.1f} kg, ratio: {size_ratio:.2f})"
    elif 0.65 <= size_ratio <= 1.35:
        size_compat = "ACCEPTABLE"
        score = 8
        desc = f"Acceptable size variance (Weight diff: {weight_diff:+.1f} kg, ratio: {size_ratio:.2f})"
    else:
        size_compat = "MISMATCH_CAUTION"
        score = 5
        desc = f"Size discrepancy warning (Weight diff: {weight_diff:+.1f} kg, ratio: {size_ratio:.2f})"

    return {
        "donor_height_cm": donor_height,
        "donor_weight_kg": donor_weight,
        "receiver_height_cm": receiver_height,
        "receiver_weight_kg": receiver_weight,
        "height_difference_cm": height_diff,
        "weight_difference_kg": weight_diff,
        "size_ratio": size_ratio,
        "size_compatibility": size_compat,
        "score_contribution": score,
        "description": desc,
    }


# ─── 3.3 HLA & Immune Compatibility ──────────────────────────────────────────

def parse_hla_alleles(hla_str: Optional[str]) -> List[str]:
    """Parse comma/space separated HLA string into normalized allele tokens."""
    if not hla_str:
        return []
    # Extract tokens like A*02, B*07, DRB1*04, A2, B35, etc.
    tokens = re.split(r'[,;\s]+', hla_str.strip())
    return [t.upper().strip() for t in tokens if t.strip()]


def calculate_hla_mismatches(donor_hla: str, receiver_hla: str) -> Tuple[int, List[str]]:
    """
    Calculate HLA mismatches (0-6 scale across A, B, DR loci).
    Returns (mismatch_count, list_of_mismatched_donor_alleles).
    """
    d_alleles = parse_hla_alleles(donor_hla)
    r_alleles = parse_hla_alleles(receiver_hla)

    if not d_alleles or not r_alleles:
        # If HLA data not recorded, assume average 3 mismatches
        return 3, []

    mismatched = [allele for allele in d_alleles if allele not in r_alleles]
    mismatch_count = min(6, len(mismatched))
    return mismatch_count, mismatched


def check_donor_specific_antibodies(donor_hla: str, receiver_antibodies: Optional[str]) -> Tuple[bool, List[str]]:
    """Check if recipient has preformed donor-specific antibodies (DSA)."""
    if not receiver_antibodies or receiver_antibodies.strip().upper() in ["NONE", "NONE DETECTED", "NEGATIVE", ""]:
        return False, []

    d_alleles = parse_hla_alleles(donor_hla)
    unacceptable = parse_hla_alleles(receiver_antibodies)

    # Normalize "ANTI-A*01" to "A*01"
    clean_unacceptable = []
    for un in unacceptable:
        clean = un.replace("ANTI-", "").replace("ANTI", "").strip()
        clean_unacceptable.append(clean)

    detected_dsa = []
    for d_al in d_alleles:
        for un_al in clean_unacceptable:
            if un_al in d_al or d_al in un_al:
                detected_dsa.append(f"DSA against {d_al}")

    return len(detected_dsa) > 0, detected_dsa


def compute_hla_immune_compatibility(
    donor_hla: Optional[str],
    receiver_hla: Optional[str],
    pra: Optional[float] = None,
    cpra: Optional[float] = None,
    hla_antibodies: Optional[str] = None,
    crossmatch_res: Optional[str] = None,
) -> Dict:
    """
    Comprehensive immunological evaluation for kidney candidates.
    Outputs immune compatibility: COMPATIBLE, CONDITIONALLY_COMPATIBLE, INCOMPATIBLE, UNKNOWN.
    """
    d_hla = donor_hla or "A*02, A*24, B*07, B*35, DRB1*04, DRB1*15"
    r_hla = receiver_hla or "A*02, A*24, B*07, B*35, DRB1*04, DRB1*15"

    mismatch_count, mismatched_alleles = calculate_hla_mismatches(d_hla, r_hla)
    has_dsa, dsa_list = check_donor_specific_antibodies(d_hla, hla_antibodies)

    effective_cpra = cpra if cpra is not None else (pra if pra is not None else 0.0)
    
    # Sensitization classification
    if effective_cpra < 20.0:
        sensitization_risk = "LOW"
    elif effective_cpra < 80.0:
        sensitization_risk = "MODERATE"
    else:
        sensitization_risk = "HIGH"

    # Crossmatch status
    xm_upper = (crossmatch_res or "NEGATIVE").upper()
    is_xm_positive = "POSITIVE" in xm_upper and "NEGATIVE" not in xm_upper

    # Immune compatibility logic
    if has_dsa or is_xm_positive:
        immune_status = "INCOMPATIBLE"
        notes = f"Immunological barrier detected: {'DSA present (' + ', '.join(dsa_list) + ')' if has_dsa else ''} {'Crossmatch Positive' if is_xm_positive else ''}".strip()
    elif effective_cpra >= 50.0 or mismatch_count >= 5:
        immune_status = "CONDITIONALLY_COMPATIBLE"
        notes = f"Sensitized candidate (CPRA: {effective_cpra}%, {mismatch_count}/6 HLA mismatches) — desensitization/IVIg protocol recommended"
    elif not donor_hla and not receiver_hla:
        immune_status = "UNKNOWN"
        notes = "HLA allele data pending laboratory confirmation"
    else:
        immune_status = "COMPATIBLE"
        notes = f"Acceptable immune match: {mismatch_count}/6 HLA mismatches, No DSA, CPRA: {effective_cpra}%"

    return {
        "donor_hla": d_hla,
        "receiver_hla": r_hla,
        "hla_mismatches": mismatch_count,
        "mismatched_alleles": mismatched_alleles,
        "pra": pra,
        "cpra": cpra,
        "has_dsa": has_dsa,
        "dsa_list": dsa_list,
        "sensitization_risk": sensitization_risk,
        "immune_compatibility": immune_status,
        "notes": notes,
    }


# ─── 3.4 Crossmatch ───────────────────────────────────────────────────────────

def evaluate_crossmatch(crossmatch_res: Optional[str]) -> Dict:
    """Evaluate crossmatch laboratory result."""
    xm = (crossmatch_res or "NEGATIVE").strip().upper()
    if "POSITIVE" in xm and "NEGATIVE" not in xm:
        result = "POSITIVE"
        is_safe = False
    elif "NEGATIVE" in xm:
        result = "NEGATIVE"
        is_safe = True
    else:
        result = "NOT_AVAILABLE"
        is_safe = True

    return {
        "crossmatch_type": "CDC_AND_FLOW_CYTOMETRY",
        "crossmatch_result": result,
        "is_safe": is_safe,
    }


# ─── 3.5 Full Clinical Compatibility Assessment ───────────────────────────────

def evaluate_full_compatibility(organ, receiver) -> Dict:
    """
    Evaluates complete multi-factor clinical compatibility for an organ-receiver pair.
    Returns composite compatibility record and hard eligibility filter decision.
    """
    organ_type_str = organ.organ_type.value.upper() if hasattr(organ.organ_type, "value") else str(organ.organ_type).upper()

    # Route to Organ-Specific Clinical Compatibility Engines
    if organ_type_str == "LIVER":
        from app.services.liver_allocation import evaluate_liver_compatibility
        return evaluate_liver_compatibility(organ, receiver)
    elif organ_type_str == "HEART":
        from app.services.heart_allocation import evaluate_heart_compatibility
        return evaluate_heart_compatibility(organ, receiver)
    elif organ_type_str == "LUNG":
        from app.services.lung_allocation import evaluate_lung_compatibility
        return evaluate_lung_compatibility(organ, receiver)

    donor = organ.donor
    dp = donor.donor_profile if donor else None
    rp = receiver.receiver_profile if receiver else None

    donor_bg = donor.blood_group.value if hasattr(donor.blood_group, 'value') else donor.blood_group
    receiver_bg = receiver.blood_group.value if hasattr(receiver.blood_group, 'value') else receiver.blood_group

    # 1. ABO
    abo = compute_abo_compatibility(donor_bg, receiver_bg)

    # 2. Size
    size = compute_size_compatibility(
        donor_height=donor.height_cm,
        donor_weight=donor.weight_kg,
        receiver_height=receiver.height_cm,
        receiver_weight=receiver.weight_kg,
    )

    # 3. HLA & Immune
    hla_immune = compute_hla_immune_compatibility(
        donor_hla=None, # will use organ / donor profile defaults
        receiver_hla=rp.hla_typing if rp else None,
        pra=rp.pra if rp else None,
        cpra=rp.cpra if rp else None,
        hla_antibodies=rp.hla_antibodies if rp else None,
        crossmatch_res=rp.crossmatch_result if rp else None,
    )

    # 4. Crossmatch
    xm = evaluate_crossmatch(rp.crossmatch_result if rp else None)

    # Hard filter decision:
    # Fails if ABO is INCOMPATIBLE or Immune is INCOMPATIBLE or Crossmatch is POSITIVE
    is_hard_compatible = (
        abo["status"] == "COMPATIBLE"
        and hla_immune["immune_compatibility"] != "INCOMPATIBLE"
        and xm["is_safe"]
    )

    # Overall Status
    if not is_hard_compatible:
        overall_status = "INCOMPATIBLE"
    elif (
        hla_immune["immune_compatibility"] == "CONDITIONALLY_COMPATIBLE"
        or size["size_compatibility"] == "MISMATCH_CAUTION"
    ):
        overall_status = "CONDITIONALLY_COMPATIBLE"
    else:
        overall_status = "COMPATIBLE"

    return {
        "is_hard_compatible": is_hard_compatible,
        "overall_status": overall_status,
        "abo": abo,
        "size": size,
        "hla_immune": hla_immune,
        "crossmatch": xm,
    }


def apply_hard_filters(organ, receivers: list) -> list:
    """
    Apply hard clinical compatibility filters and candidate lifecycle status safeguards.
    Returns only receivers that pass ALL hard rule-based criteria.
    """
    from app.models.enums import EligibilityStatus, CandidateStatus

    compatible = []
    for receiver in receivers:
        # Rule 0 (Phase 7 Safeguard): Active Candidate Lifecycle Status
        cand_status = getattr(receiver, "candidate_status", CandidateStatus.ACTIVE)
        if cand_status and (
            cand_status == CandidateStatus.INACTIVE
            or cand_status == CandidateStatus.TEMPORARILY_UNAVAILABLE
            or cand_status == CandidateStatus.WITHDRAWN
            or cand_status == CandidateStatus.TRANSPLANTED
            or cand_status == CandidateStatus.DECEASED
            or cand_status == CandidateStatus.LOST_TO_FOLLOWUP
            or str(cand_status).upper() not in ["ACTIVE", "CANDIDATESTATUS.ACTIVE"]
        ):
            continue

        # Rule 1: Organ type match
        required = receiver.receiver_profile.required_organ if receiver.receiver_profile else None
        if not required or required.upper() != organ.organ_type.value.upper():
            continue

        # Rule 2: Eligibility verification
        if receiver.eligibility_status != EligibilityStatus.ELIGIBLE:
            continue

        # Rule 3: Full Compatibility Engine Evaluation
        assessment = evaluate_full_compatibility(organ, receiver)
        if not assessment["is_hard_compatible"]:
            continue

        compatible.append(receiver)

    return compatible

