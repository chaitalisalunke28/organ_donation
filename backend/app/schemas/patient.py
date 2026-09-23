from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import PatientType, EligibilityStatus, BloodGroup, OrganType


class DonorProfileCreate(BaseModel):
    hypertension: Optional[bool] = False
    diabetes: Optional[bool] = False
    renal_history: Optional[str] = None
    cardiac_history: Optional[str] = None
    infection_history: Optional[str] = None
    medical_history: Optional[str] = None
    infectious_disease_screening: Optional[str] = None
    relevant_test_results: Optional[str] = None
    medical_information: Optional[str] = None


class ReceiverProfileCreate(BaseModel):
    required_organ: str
    urgency_level: str = "MEDIUM"
    waiting_start_date: Optional[datetime] = None
    dialysis_status: Optional[str] = None
    dialysis_start_date: Optional[datetime] = None
    dialysis_duration_months: Optional[int] = None
    previous_transplant: Optional[bool] = False
    previous_graft_failure: Optional[bool] = False
    number_of_previous_grafts: Optional[int] = 0
    pra: Optional[float] = None
    cpra: Optional[float] = None
    hla_typing: Optional[str] = None
    hla_antibodies: Optional[str] = None
    crossmatch_result: Optional[str] = None
    pediatric_status: Optional[bool] = False
    prior_living_donor: Optional[bool] = False
    special_status: Optional[str] = None
    medical_history: Optional[str] = None
    medical_information: Optional[str] = None


class PatientCreate(BaseModel):
    patient_uid: Optional[str] = None
    patient_type: PatientType
    name: str
    age: int
    gender: str
    blood_group: BloodGroup
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    medical_condition: Optional[str] = None
    donor_profile: Optional[DonorProfileCreate] = None
    receiver_profile: Optional[ReceiverProfileCreate] = None


class DonorProfileOut(BaseModel):
    id: int
    patient_id: int
    hypertension: Optional[bool] = False
    diabetes: Optional[bool] = False
    renal_history: Optional[str] = None
    cardiac_history: Optional[str] = None
    infection_history: Optional[str] = None
    medical_history: Optional[str] = None
    infectious_disease_screening: Optional[str] = None
    relevant_test_results: Optional[str] = None
    medical_information: Optional[str] = None

    class Config:
        from_attributes = True


class ReceiverProfileOut(BaseModel):
    id: int
    patient_id: int
    required_organ: str
    urgency_level: str
    waiting_start_date: Optional[datetime] = None
    dialysis_status: Optional[str] = None
    dialysis_start_date: Optional[datetime] = None
    dialysis_duration_months: Optional[int] = None
    previous_transplant: Optional[bool] = False
    previous_graft_failure: Optional[bool] = False
    number_of_previous_grafts: Optional[int] = 0
    pra: Optional[float] = None
    cpra: Optional[float] = None
    hla_typing: Optional[str] = None
    hla_antibodies: Optional[str] = None
    crossmatch_result: Optional[str] = None
    pediatric_status: Optional[bool] = False
    prior_living_donor: Optional[bool] = False
    special_status: Optional[str] = None
    medical_history: Optional[str] = None
    medical_information: Optional[str] = None

    class Config:
        from_attributes = True


class PatientOut(BaseModel):
    id: int
    patient_uid: Optional[str] = None
    hospital_id: int
    patient_type: PatientType
    name: str
    age: int
    gender: str
    blood_group: BloodGroup
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    medical_condition: Optional[str] = None
    eligibility_status: EligibilityStatus
    verification_status: str
    created_at: Optional[datetime] = None
    donor_profile: Optional[DonorProfileOut] = None
    receiver_profile: Optional[ReceiverProfileOut] = None
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True


class OrganCreate(BaseModel):
    organ_uid: Optional[str] = None
    organ_type: OrganType
    organ_condition: Optional[str] = None
    donor_creatinine: Optional[float] = None
    kidney_function: Optional[str] = None
    kidney_quality: Optional[str] = None
    retrieval_time: Optional[datetime] = None
    preservation_start: Optional[datetime] = None
    preservation_method: Optional[str] = None


class OrganOut(BaseModel):
    id: int
    organ_uid: Optional[str] = None
    donor_patient_id: int
    organ_type: OrganType
    organ_condition: Optional[str] = None
    donor_creatinine: Optional[float] = None
    kidney_function: Optional[str] = None
    kidney_quality: Optional[str] = None
    retrieval_time: Optional[datetime] = None
    preservation_start: Optional[datetime] = None
    preservation_method: Optional[str] = None
    availability_status: str
    created_at: Optional[datetime] = None
    donor_name: Optional[str] = None
    donor_blood_group: Optional[str] = None
    donor_hospital_name: Optional[str] = None
    donor_uid: Optional[str] = None
    donor_height_cm: Optional[float] = None
    donor_weight_kg: Optional[float] = None

    class Config:
        from_attributes = True
