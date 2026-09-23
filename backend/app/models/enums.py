import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    HOSPITAL = "HOSPITAL"
    COORDINATOR = "COORDINATOR"


class HospitalStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class PatientType(str, enum.Enum):
    DONOR = "DONOR"
    RECEIVER = "RECEIVER"


class EligibilityStatus(str, enum.Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    ELIGIBLE = "ELIGIBLE"
    NOT_ELIGIBLE = "NOT_ELIGIBLE"


class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class OrganType(str, enum.Enum):
    KIDNEY = "KIDNEY"
    LIVER = "LIVER"
    HEART = "HEART"
    LUNG = "LUNG"
    PANCREAS = "PANCREAS"
    CORNEA = "CORNEA"
    OTHER = "OTHER"


class OrganAvailabilityStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OFFERED = "OFFERED"
    ALLOCATED = "ALLOCATED"
    COMPLETED = "COMPLETED"
    UNALLOCATED = "UNALLOCATED"


class UrgencyLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class OfferStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class AllocationStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    ALLOCATED = "ALLOCATED"
    COMPLETED = "COMPLETED"
    UNALLOCATED = "UNALLOCATED"


class BloodGroup(str, enum.Enum):
    O_POS = "O+"
    O_NEG = "O-"
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"


class ReportType(str, enum.Enum):
    BLOOD_TEST = "BLOOD_TEST"
    MEDICAL_EXAMINATION = "MEDICAL_EXAMINATION"
    INFECTIOUS_DISEASE_SCREENING = "INFECTIOUS_DISEASE_SCREENING"
    ORGAN_ASSESSMENT = "ORGAN_ASSESSMENT"
    COMPATIBILITY_TEST = "COMPATIBILITY_TEST"
    OTHER = "OTHER"


class NotificationType(str, enum.Enum):
    ORGAN_OFFERED = "ORGAN_OFFERED"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    OFFER_REJECTED = "OFFER_REJECTED"
    ALLOCATION_CONFIRMED = "ALLOCATION_CONFIRMED"
    ALLOCATION_COMPLETED = "ALLOCATION_COMPLETED"
    ORGAN_UNALLOCATED = "ORGAN_UNALLOCATED"
    GENERAL = "GENERAL"


class CandidateStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    TEMPORARILY_UNAVAILABLE = "TEMPORARILY_UNAVAILABLE"
    WITHDRAWN = "WITHDRAWN"
    TRANSPLANTED = "TRANSPLANTED"
    DECEASED = "DECEASED"
    LOST_TO_FOLLOWUP = "LOST_TO_FOLLOWUP"


class ReadinessStatus(str, enum.Enum):
    READY = "READY"
    PARTIALLY_READY = "PARTIALLY_READY"
    NOT_READY = "NOT_READY"
    UNKNOWN = "UNKNOWN"


class TransportMode(str, enum.Enum):
    AMBULANCE_ROAD = "AMBULANCE_ROAD"
    AIR_CHARTER = "AIR_CHARTER"
    COMMERCIAL_AIR = "COMMERCIAL_AIR"
    GREEN_CORRIDOR_EXPRESS = "GREEN_CORRIDOR_EXPRESS"


class RouteStatus(str, enum.Enum):
    OPTIMAL_CLEAR = "OPTIMAL_CLEAR"
    MODERATE_TRAFFIC = "MODERATE_TRAFFIC"
    WEATHER_DELAY = "WEATHER_DELAY"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"


class RiskTier(str, enum.Enum):
    LOW_RISK = "LOW_RISK"
    MODERATE_RISK = "MODERATE_RISK"
    HIGH_RISK = "HIGH_RISK"


class ImpactSeverity(str, enum.Enum):
    NEGLIGIBLE = "NEGLIGIBLE"
    MODERATE = "MODERATE"
    CRITICAL = "CRITICAL"


class StabilityTier(str, enum.Enum):
    VERY_HIGH = "VERY_HIGH"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    CRITICAL_FRAGILITY = "CRITICAL_FRAGILITY"


class RevalidationStatus(str, enum.Enum):
    VALID = "VALID"
    REVALIDATION_REQUIRED = "REVALIDATION_REQUIRED"
    REVALIDATED = "REVALIDATED"
    SUPERSEDED = "SUPERSEDED"


class AllocationEventType(str, enum.Enum):
    HOSPITAL_READINESS = "HOSPITAL_READINESS"
    ORGAN_TRANSPORT = "ORGAN_TRANSPORT"
    PATIENT_STATUS = "PATIENT_STATUS"
    CLINICAL_PARAM = "CLINICAL_PARAM"
    POLICY_UPDATE = "POLICY_UPDATE"
    ALLOCATION_LIFECYCLE = "ALLOCATION_LIFECYCLE"
    MANUAL_OVERRIDE = "MANUAL_OVERRIDE"


class RejectionCategory(str, enum.Enum):
    MEDICAL_REASON = "Medical reason"
    RECIPIENT_UNAVAILABLE = "Recipient unavailable"
    HOSPITAL_UNAVAILABLE = "Hospital unavailable"
    TRANSPORT_ISSUE = "Transport issue"
    PRESERVATION_ISSUE = "Preservation issue"
    ORGAN_QUALITY = "Organ quality"
    DOCUMENTATION_ISSUE = "Documentation issue"
    PATIENT_DECLINED = "Patient declined"
    OTHER = "Other"


class HeartUrgencyCategory(str, enum.Enum):
    STATUS_1A = "STATUS_1A"  # Inotrope + Mechanical circulatory support (ECMO, BiVAD, VAD + Inotrope)
    STATUS_1B = "STATUS_1B"  # Single inotrope or stable LVAD
    STATUS_2 = "STATUS_2"    # All other active listed patients


class LungDiagnosticGroup(str, enum.Enum):
    GROUP_A = "GROUP_A"  # Obstructive Lung Disease (COPD, Alpha-1)
    GROUP_B = "GROUP_B"  # Pulmonary Vascular Disease (PAH)
    GROUP_C = "GROUP_C"  # Cystic Fibrosis & Immunodeficiency
    GROUP_D = "GROUP_D"  # Restrictive Lung Disease (IPF, Idiopathic Fibrosis)



