"""
Eligibility Engine
==================
Evaluates configurable eligibility rules for donors and receivers.
This is an academic configurable system — not a replacement for clinical policy.
"""
from sqlalchemy.orm import Session
from app.models.patient import Patient, DonorProfile, ReceiverProfile
from app.models.allocation import MedicalReport
from app.models.enums import EligibilityStatus, PatientType


# Configurable required report types for donors and receivers
DONOR_REQUIRED_REPORT_TYPES = ["BLOOD_TEST", "MEDICAL_EXAMINATION"]
RECEIVER_REQUIRED_REPORT_TYPES = ["BLOOD_TEST", "MEDICAL_EXAMINATION"]


def evaluate_donor_eligibility(patient: Patient, db: Session) -> dict:
    """
    Evaluate donor eligibility based on configurable rules.
    Returns dict with: eligible (bool), reason (str), issues (list)
    """
    issues = []

    # Rule 1: Basic required fields
    if not patient.name or not patient.blood_group:
        issues.append("Missing required patient information (name or blood group)")

    if not patient.age or patient.age <= 0:
        issues.append("Invalid age")

    # Rule 2: Donor profile must exist
    if not patient.donor_profile:
        issues.append("Donor medical profile not completed")

    # Rule 3: At least one organ registered
    if not patient.organs or len(patient.organs) == 0:
        issues.append("No organs registered for donation")

    # Rule 4: Medical reports - eligible if at least 1 report exists or certified
    reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient.id).all()
    if len(reports) == 0 and patient.verification_status != "VERIFIED":
        issues.append("No medical reports uploaded yet (upload supporting PDF/report or certify)")

    eligible = len(issues) == 0
    return {
        "eligible": eligible,
        "status": EligibilityStatus.ELIGIBLE if eligible else EligibilityStatus.NOT_ELIGIBLE,
        "issues": issues,
        "reason": "All eligibility criteria met" if eligible else f"{len(issues)} issue(s) found"
    }


def evaluate_receiver_eligibility(patient: Patient, db: Session) -> dict:
    """
    Evaluate receiver eligibility based on configurable rules.
    Returns dict with: eligible (bool), reason (str), issues (list)
    """
    issues = []

    # Rule 1: Basic required fields
    if not patient.name or not patient.blood_group:
        issues.append("Missing required patient information (name or blood group)")

    if not patient.age or patient.age <= 0:
        issues.append("Invalid age")

    # Rule 2: Receiver profile must exist with required organ
    if not patient.receiver_profile:
        issues.append("Receiver medical profile not completed")
    elif not patient.receiver_profile.required_organ:
        issues.append("Required organ not specified")

    # Rule 3: Medical reports - eligible if at least 1 report exists or certified
    reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient.id).all()
    if len(reports) == 0 and patient.verification_status != "VERIFIED":
        issues.append("No medical reports uploaded yet (upload supporting PDF/report or certify)")

    eligible = len(issues) == 0
    return {
        "eligible": eligible,
        "status": EligibilityStatus.ELIGIBLE if eligible else EligibilityStatus.NOT_ELIGIBLE,
        "issues": issues,
        "reason": "All eligibility criteria met" if eligible else f"{len(issues)} issue(s) found"
    }


def run_eligibility_check(patient_id: int, db: Session) -> dict:
    """Run and persist eligibility evaluation for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"error": "Patient not found"}

    if patient.patient_type == PatientType.DONOR:
        result = evaluate_donor_eligibility(patient, db)
    else:
        result = evaluate_receiver_eligibility(patient, db)

    # Persist
    patient.eligibility_status = result["status"]
    patient.verification_status = "VERIFIED" if result["eligible"] else "REVIEWED"
    db.commit()
    db.refresh(patient)

    return result
