from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import OrganType, OrganAvailabilityStatus


class Organ(Base):
    __tablename__ = "organs"

    id = Column(Integer, primary_key=True, index=True)
    organ_uid = Column(String, unique=True, index=True)  # e.g., K001
    donor_patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    organ_type = Column(Enum(OrganType), nullable=False)
    organ_condition = Column(Text, nullable=True)
    # Kidney-specific donor attributes (Phase 2)
    donor_creatinine = Column(Float, nullable=True)  # mg/dL
    kidney_function = Column(String, nullable=True)   # e.g. "eGFR >90 mL/min/1.73m² (Normal)"
    kidney_quality = Column(String, nullable=True)    # e.g. "Standard Criteria Donor (SCD)"

    # Liver-specific donor attributes (Phase 16)
    donor_bilirubin = Column(Float, nullable=True)   # Total Bilirubin mg/dL
    donor_ast = Column(Float, nullable=True)         # AST / SGOT U/L
    donor_alt = Column(Float, nullable=True)         # ALT / SGPT U/L
    donor_inr = Column(Float, nullable=True)         # PT-INR
    donor_albumin = Column(Float, nullable=True)     # Albumin g/dL
    liver_steatosis_pct = Column(Float, nullable=True)# Liver Macrosteatosis % (e.g. 5%)
    liver_condition = Column(String, nullable=True)  # e.g. "Non-steatotic, smooth capsule"

    # Heart-specific donor attributes (Phase 17)
    donor_lvef = Column(Float, nullable=True)        # Left Ventricular Ejection Fraction % (e.g. 60%)
    donor_inotrope_support = Column(String, nullable=True) # e.g. "None", "Low-dose Dobutamine"
    donor_coronary_angiogram = Column(String, nullable=True) # e.g. "Normal coronaries, no CAD"
    cardiac_arrest_downtime_minutes = Column(Integer, default=0)

    # Lung-specific donor attributes (Phase 18)
    donor_pao2_fio2_ratio = Column(Float, nullable=True) # PaO2/FiO2 ratio mmHg (e.g. 450)
    donor_bronchoscopy = Column(String, nullable=True)   # e.g. "Clear airway, no purulent secretions"
    donor_chest_xray = Column(String, nullable=True)     # e.g. "Bilateral clear lung fields"

    retrieval_time = Column(DateTime(timezone=True), nullable=True)
    preservation_start = Column(DateTime(timezone=True), nullable=True)
    preservation_method = Column(String, nullable=True) # e.g. "Hypothermic Machine Perfusion (HMP)", "Static Cold Storage (SCS)"
    availability_status = Column(Enum(OrganAvailabilityStatus), default=OrganAvailabilityStatus.AVAILABLE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    donor = relationship("Patient", back_populates="organs", foreign_keys=[donor_patient_id])
    matches = relationship("Match", back_populates="organ")
    allocation_offers = relationship("AllocationOffer", back_populates="organ")
    allocation = relationship("Allocation", back_populates="organ", uselist=False)
