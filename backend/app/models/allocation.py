from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import ReportType, OfferStatus, AllocationStatus


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    file_path = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    verification_status = Column(String, default="PENDING")
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="medical_reports")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    organ_id = Column(Integer, ForeignKey("organs.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    compatibility_result = Column(String, nullable=True)  # COMPATIBLE, INCOMPATIBLE
    priority_score = Column(Float, default=0.0)
    priority_number = Column(Integer, nullable=True)
    score_breakdown = Column(Text, nullable=True)  # JSON string with score details
    stability_score = Column(Float, nullable=True)  # 0.0 - 100.0 %
    stability_tier = Column(String, nullable=True)   # VERY_HIGH, HIGH, MODERATE, LOW, CRITICAL_FRAGILITY
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organ = relationship("Organ", back_populates="matches")
    receiver = relationship("Patient", foreign_keys=[receiver_id])


class AllocationOffer(Base):
    __tablename__ = "allocation_offers"

    id = Column(Integer, primary_key=True, index=True)
    organ_id = Column(Integer, ForeignKey("organs.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    priority_number = Column(Integer, nullable=False)
    status = Column(Enum(OfferStatus), default=OfferStatus.PENDING)
    rejection_category = Column(String, nullable=True)  # Phase 15: Medical reason, Hospital unavailable, etc.
    rejection_reason = Column(String, nullable=True)
    rejection_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    organ = relationship("Organ", back_populates="allocation_offers")
    receiver = relationship("Patient", foreign_keys=[receiver_id])
    hospital = relationship("Hospital")


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    allocation_uid = Column(String, unique=True, index=True)  # e.g., ALLOC-001
    organ_id = Column(Integer, ForeignKey("organs.id"), nullable=False)
    donor_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    donor_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    receiver_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    priority_number = Column(Integer, nullable=True)
    status = Column(Enum(AllocationStatus), default=AllocationStatus.IN_PROGRESS)
    revalidation_status = Column(String, default="VALID")  # VALID, REVALIDATION_REQUIRED, REVALIDATED, SUPERSEDED
    last_revalidated_at = Column(DateTime(timezone=True), nullable=True)
    stability_score = Column(Float, nullable=True)
    stability_tier = Column(String, nullable=True)
    coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    allocated_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organ = relationship("Organ", back_populates="allocation")
    donor = relationship("Patient", foreign_keys=[donor_id])
    donor_hospital = relationship("Hospital", foreign_keys=[donor_hospital_id])
    receiver = relationship("Patient", foreign_keys=[receiver_id])
    receiver_hospital = relationship("Hospital", foreign_keys=[receiver_hospital_id])
    coordinator = relationship("User", foreign_keys=[coordinator_id])
    history = relationship("AllocationHistory", back_populates="allocation")


class AllocationHistory(Base):
    __tablename__ = "allocation_history"

    id = Column(Integer, primary_key=True, index=True)
    allocation_id = Column(Integer, ForeignKey("allocations.id"), nullable=False)
    event_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    performed_by = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    allocation = relationship("Allocation", back_populates="history")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, nullable=True)
    is_read = Column(Integer, default=0)  # 0=unread, 1=read
    related_id = Column(Integer, nullable=True)  # offer_id or allocation_id
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class AllocationRuleSet(Base):
    __tablename__ = "allocation_rule_sets"

    id = Column(Integer, primary_key=True, index=True)
    rule_set_id = Column(String, unique=True, index=True, nullable=False)  # e.g., "NOTTO_KIDNEY_2024_V1"
    organ_type = Column(String, nullable=False, default="KIDNEY")          # KIDNEY, LIVER, HEART, etc.
    jurisdiction = Column(String, nullable=False, default="INDIA_NATIONAL")# INDIA_NATIONAL, ROTTO_WEST, SOTTO_MAHARASHTRA
    policy_version = Column(String, nullable=False, default="v2.4 (2024)") # v2.4 (2024)
    effective_from = Column(DateTime(timezone=True), nullable=True)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Integer, default=1)                                 # 1=active, 0=inactive
    
    # Rules configurations stored as JSON text
    eligibility_rules = Column(Text, nullable=True)
    priority_rules = Column(Text, nullable=True)
    geographic_rules = Column(Text, nullable=True)
    special_population_rules = Column(Text, nullable=True)
    
    source_reference = Column(Text, nullable=True)                         # Official guideline citation
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class HospitalReadiness(Base):
    __tablename__ = "hospital_readiness_checklists"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    offer_id = Column(Integer, ForeignKey("allocation_offers.id"), nullable=True)
    
    # 10 Feasibility Dimensions (Phase 5)
    hospital_verified = Column(Boolean, default=True)
    recipient_ready = Column(Boolean, default=True)
    icu_available = Column(Boolean, default=True)
    ot_available = Column(Boolean, default=True)
    surgeon_available = Column(Boolean, default=True)
    transplant_team_available = Column(Boolean, default=True)
    required_equipment = Column(Boolean, default=True)
    blood_bank_ready = Column(Boolean, default=True)
    recipient_present = Column(Boolean, default=True)
    documents_complete = Column(Boolean, default=True)
    
    readiness_status = Column(String, default="READY")  # READY, PARTIALLY_READY, NOT_READY, UNKNOWN
    readiness_score = Column(Float, default=100.0)      # 0.0 - 100.0 %
    bottleneck_notes = Column(Text, nullable=True)
    estimated_prep_minutes = Column(Integer, default=30)
    reported_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    hospital = relationship("Hospital")
    patient = relationship("Patient")
    offer = relationship("AllocationOffer")


class OrganTransport(Base):
    __tablename__ = "organ_transports"

    id = Column(Integer, primary_key=True, index=True)
    organ_id = Column(Integer, ForeignKey("organs.id"), nullable=False)
    allocation_id = Column(Integer, ForeignKey("allocations.id"), nullable=True)
    donor_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    receiver_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    
    # Transport Logistics (Phase 6)
    transport_mode = Column(String, default="AMBULANCE_ROAD")  # AMBULANCE_ROAD, AIR_CHARTER, COMMERCIAL_AIR, GREEN_CORRIDOR_EXPRESS
    transport_provider = Column(String, nullable=True)
    departure_time = Column(DateTime(timezone=True), nullable=True)
    estimated_arrival = Column(DateTime(timezone=True), nullable=True)
    actual_arrival = Column(DateTime(timezone=True), nullable=True)
    distance_km = Column(Float, default=25.0)
    estimated_duration_minutes = Column(Integer, default=45)
    delay_minutes = Column(Integer, default=0)
    route_status = Column(String, default="OPTIMAL_CLEAR")  # OPTIMAL_CLEAR, MODERATE_TRAFFIC, WEATHER_DELAY, IN_TRANSIT, DELIVERED
    transport_available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organ = relationship("Organ")
    allocation = relationship("Allocation")
    donor_hospital = relationship("Hospital", foreign_keys=[donor_hospital_id])
    receiver_hospital = relationship("Hospital", foreign_keys=[receiver_hospital_id])


class AllocationEvent(Base):
    __tablename__ = "allocation_events"

    id = Column(Integer, primary_key=True, index=True)
    event_uid = Column(String, unique=True, index=True)  # e.g., EVT-0001
    allocation_id = Column(Integer, ForeignKey("allocations.id"), nullable=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    organ_id = Column(Integer, ForeignKey("organs.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    
    entity_type = Column(String, nullable=False)   # HOSPITAL_READINESS, ORGAN_TRANSPORT, PATIENT_STATUS, etc.
    entity_id = Column(Integer, nullable=True)
    field_changed = Column(String, nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(String, default="SYSTEM")
    reason = Column(Text, nullable=True)
    
    # Change Impact Analysis outputs (Phase 11)
    affects_compatibility = Column(Boolean, default=False)
    affects_priority = Column(Boolean, default=False)
    affects_operational_feasibility = Column(Boolean, default=False)
    affects_ml_risk = Column(Boolean, default=False)
    requires_revalidation = Column(Boolean, default=False)
    impact_severity = Column(String, default="NEGLIGIBLE")  # NEGLIGIBLE, MODERATE, CRITICAL
    impact_summary = Column(Text, nullable=True)
    revalidation_recommendations = Column(Text, nullable=True)

    allocation = relationship("Allocation")
    organ = relationship("Organ")
    patient = relationship("Patient")


class AllocationDecisionRecord(Base):
    __tablename__ = "allocation_decision_records"

    id = Column(Integer, primary_key=True, index=True)
    record_uid = Column(String, unique=True, index=True)  # e.g., ADR-ALLOC-0001
    allocation_id = Column(Integer, ForeignKey("allocations.id"), unique=True, nullable=False)
    allocation_uid = Column(String, index=True)

    # Organ & Clinical Data
    organ_id = Column(Integer, ForeignKey("organs.id"), nullable=False)
    organ_type = Column(String, nullable=False)
    organ_uid = Column(String, nullable=True)

    # Donor Profile
    donor_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    donor_uid = Column(String, nullable=True)
    donor_name = Column(String, nullable=True)
    donor_hospital_name = Column(String, nullable=True)

    # Recipient Profile
    receiver_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    receiver_uid = Column(String, nullable=True)
    receiver_name = Column(String, nullable=True)
    receiver_hospital_name = Column(String, nullable=True)

    # Biological Compatibility Snapshot
    compatibility_result = Column(String, default="COMPATIBLE")
    crossmatch_result = Column(String, default="NEGATIVE")
    size_compatibility = Column(String, default="OPTIMAL")
    hla_mismatches = Column(Integer, default=0)

    # Allocation Policy & Priority Snapshot
    policy_rule_set_id = Column(String, default="NOTTO_KIDNEY_2024_V1")
    policy_version = Column(String, default="v2.4 (2024)")
    priority_number = Column(Integer, nullable=False)
    priority_score = Column(Float, default=0.0)
    priority_score_breakdown = Column(Text, nullable=True)

    # Operational Risk, Stability & Readiness Snapshot
    operational_risk_tier = Column(String, default="LOW_RISK")
    operational_risk_probability = Column(Float, default=0.12)
    match_stability_tier = Column(String, default="HIGH")
    match_stability_score = Column(Float, default=85.0)
    hospital_readiness_status = Column(String, default="READY")
    hospital_readiness_score = Column(Float, default=100.0)
    remaining_preservation_buffer_hours = Column(Float, default=18.0)

    # Coordinator Decision Sign-off
    coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    coordinator_name = Column(String, nullable=False)
    decision_status = Column(String, default="CONFIRMED")
    clinical_justification = Column(
        Text,
        default="All required biological compatibility, NOTTO priority ranking, and operational readiness conditions satisfied."
    )
    rejection_history_summary = Column(Text, nullable=True)
    digital_signature_hash = Column(String, nullable=True)  # SHA-256 tamper-evident integrity hash
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    allocation = relationship("Allocation")
    organ = relationship("Organ")
    donor = relationship("Patient", foreign_keys=[donor_id])
    receiver = relationship("Patient", foreign_keys=[receiver_id])
    coordinator = relationship("User", foreign_keys=[coordinator_id])



