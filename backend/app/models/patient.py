from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import PatientType, EligibilityStatus, BloodGroup, CandidateStatus


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_uid = Column(String, unique=True, index=True)  # e.g., D001, R001
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    patient_type = Column(Enum(PatientType), nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    blood_group = Column(Enum(BloodGroup), nullable=False)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    medical_condition = Column(Text, nullable=True)
    eligibility_status = Column(Enum(EligibilityStatus), default=EligibilityStatus.PENDING_VERIFICATION)
    candidate_status = Column(Enum(CandidateStatus), default=CandidateStatus.ACTIVE)
    verification_status = Column(String, default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    hospital = relationship("Hospital", back_populates="patients")
    donor_profile = relationship("DonorProfile", back_populates="patient", uselist=False)
    receiver_profile = relationship("ReceiverProfile", back_populates="patient", uselist=False)
    medical_reports = relationship("MedicalReport", back_populates="patient")
    organs = relationship("Organ", back_populates="donor", foreign_keys="Organ.donor_patient_id")


class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    hypertension = Column(Boolean, default=False)
    diabetes = Column(Boolean, default=False)
    renal_history = Column(Text, nullable=True)
    cardiac_history = Column(Text, nullable=True)
    infection_history = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    infectious_disease_screening = Column(Text, nullable=True)
    relevant_test_results = Column(Text, nullable=True)
    medical_information = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="donor_profile")


class ReceiverProfile(Base):
    __tablename__ = "receiver_profiles"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)
    required_organ = Column(Enum("KIDNEY", "LIVER", "HEART", "LUNG", "PANCREAS", "CORNEA", "OTHER", name="receiver_organ_type"), nullable=False)
    urgency_level = Column(Enum("CRITICAL", "HIGH", "MEDIUM", "LOW", name="urgency_enum"), default="MEDIUM")
    waiting_start_date = Column(DateTime(timezone=True), nullable=True)
    
    # Kidney-specific clinical and immunological parameters (Phase 2)
    dialysis_status = Column(String, nullable=True)  # e.g., "Hemodialysis", "Peritoneal Dialysis", "Pre-emptive"
    dialysis_start_date = Column(DateTime(timezone=True), nullable=True)
    dialysis_duration_months = Column(Integer, nullable=True)
    previous_transplant = Column(Boolean, default=False)
    previous_graft_failure = Column(Boolean, default=False)
    number_of_previous_grafts = Column(Integer, default=0)
    pra = Column(Float, nullable=True)   # Panel Reactive Antibody %
    cpra = Column(Float, nullable=True)  # Calculated PRA %
    hla_typing = Column(String, nullable=True)  # e.g., "A*02, A*24, B*07, B*35, DRB1*04, DRB1*15"
    hla_antibodies = Column(String, nullable=True)  # e.g., "Anti-HLA-A1, Anti-HLA-B8"
    crossmatch_result = Column(String, nullable=True)  # e.g., "Negative (CDC & Flow)", "Pending"
    pediatric_status = Column(Boolean, default=False)
    prior_living_donor = Column(Boolean, default=False)
    special_status = Column(String, nullable=True)  # e.g., "Standard", "Highly Sensitized", "Status 1A"

    # Liver-specific parameters (Phase 16)
    liver_diagnosis = Column(String, nullable=True)  # e.g. "Decompensated Cirrhosis (NASH)", "Fulminant Hepatic Failure"
    meld_score = Column(Float, nullable=True)       # MELD / MELD-Na (6-40)
    peld_score = Column(Float, nullable=True)       # PELD (for pediatric < 12 yrs)
    receiver_bilirubin = Column(Float, nullable=True) # Total Bilirubin mg/dL
    receiver_inr = Column(Float, nullable=True)       # PT-INR
    receiver_creatinine = Column(Float, nullable=True)# Serum Creatinine mg/dL
    receiver_sodium = Column(Float, nullable=True)    # Serum Sodium mEq/L
    dialysis_past_week = Column(Boolean, default=False)# >= 2 dialysis sessions in prior 7 days
    liver_exception_status = Column(String, nullable=True) # "None", "HCC Milan Criteria", "Status 1A Fulminant"
    liver_exception_points = Column(Float, default=0.0)

    # Heart-specific parameters (Phase 17)
    heart_failure_status = Column(String, nullable=True) # e.g. "NYHA Class IV End-Stage DCM"
    heart_urgency_category = Column(String, default="STATUS_2") # "STATUS_1A", "STATUS_1B", "STATUS_2"
    inotrope_support = Column(Boolean, default=False)
    inotrope_details = Column(String, nullable=True)     # e.g. "Milrinone + Dobutamine high dose"
    iabp = Column(Boolean, default=False)               # Intra-Aortic Balloon Pump
    lvad = Column(Boolean, default=False)               # Left Ventricular Assist Device
    ecmo = Column(Boolean, default=False)               # Extracorporeal Membrane Oxygenation
    mechanical_ventilation = Column(Boolean, default=False)
    cardiac_index = Column(Float, nullable=True)         # Cardiac Index L/min/m² (e.g. 1.8)
    pcwp = Column(Float, nullable=True)                  # Pulmonary Capillary Wedge Pressure mmHg (e.g. 24)

    # Lung-specific parameters (Phase 18)
    lung_diagnostic_group = Column(String, nullable=True)# "GROUP_A", "GROUP_B", "GROUP_C", "GROUP_D"
    lung_diagnosis = Column(String, nullable=True)       # e.g. "Idiopathic Pulmonary Fibrosis (IPF)"
    las_score = Column(Float, nullable=True)            # Lung Allocation Score proxy (0-100)
    assisted_ventilation = Column(String, default="None")# "None", "BiPAP / NIV", "Invasive Mechanical", "ECMO"
    paco2 = Column(Float, nullable=True)                 # PaCO2 mmHg (e.g. 52.0)
    paco2_change_6m = Column(Float, default=0.0)         # 6-month change in PaCO2 mmHg
    fvc_predicted_pct = Column(Float, nullable=True)     # FVC % predicted (e.g. 48.0)
    fev1_predicted_pct = Column(Float, nullable=True)    # FEV1 % predicted (e.g. 42.0)
    oxygen_requirement_rest = Column(Float, default=0.0) # O2 L/min at rest
    pulmonary_artery_pressure = Column(Float, nullable=True) # Mean PAP mmHg

    # Multi-Organ Transplantation (Phase 19)
    is_multi_organ_candidate = Column(Boolean, default=False)
    secondary_organ = Column(String, nullable=True)     # "KIDNEY" for Simultaneous Liver-Kidney or Heart-Kidney

    medical_history = Column(Text, nullable=True)
    medical_information = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="receiver_profile")
