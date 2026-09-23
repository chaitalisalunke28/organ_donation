from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import OfferStatus, AllocationStatus


class OfferRespondRequest(BaseModel):
    action: str  # "ACCEPT" or "REJECT"
    rejection_reason: Optional[str] = None
    rejection_notes: Optional[str] = None


class MatchRequest(BaseModel):
    organ_id: int


class OfferCreateRequest(BaseModel):
    organ_id: int
    receiver_id: int
    priority_number: int


class AllocationConfirmRequest(BaseModel):
    allocation_id: int


class ExpireOfferRequest(BaseModel):
    offer_id: int


class MatchOut(BaseModel):
    id: int
    organ_id: int
    receiver_id: int
    compatibility_result: Optional[str]
    priority_score: float
    priority_number: Optional[int]
    score_breakdown: Optional[str]
    created_at: Optional[datetime]
    receiver_name: Optional[str] = None
    receiver_blood_group: Optional[str] = None
    required_organ: Optional[str] = None
    urgency_level: Optional[str] = None
    waiting_days: Optional[int] = None
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True


class AllocationOfferOut(BaseModel):
    id: int
    organ_id: int
    receiver_id: int
    hospital_id: int
    priority_number: int
    status: OfferStatus
    rejection_reason: Optional[str]
    rejection_notes: Optional[str]
    created_at: Optional[datetime]
    responded_at: Optional[datetime]
    organ_type: Optional[str] = None
    organ_uid: Optional[str] = None
    receiver_name: Optional[str] = None
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True


class AllocationOut(BaseModel):
    id: int
    allocation_uid: Optional[str]
    organ_id: int
    donor_id: int
    donor_hospital_id: int
    receiver_id: Optional[int]
    receiver_hospital_id: Optional[int]
    priority_number: Optional[int]
    status: AllocationStatus
    coordinator_id: int
    allocated_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: Optional[datetime]
    organ_type: Optional[str] = None
    organ_uid: Optional[str] = None
    donor_name: Optional[str] = None
    donor_hospital_name: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_hospital_name: Optional[str] = None
    coordinator_name: Optional[str] = None

    class Config:
        from_attributes = True


class AllocationHistoryOut(BaseModel):
    id: int
    allocation_id: int
    event_type: str
    description: Optional[str]
    performed_by: Optional[str]
    timestamp: Optional[datetime]

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: Optional[str]
    is_read: int
    related_id: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AllocationRuleSetOut(BaseModel):
    id: int
    rule_set_id: str
    organ_type: str
    jurisdiction: str
    policy_version: str
    effective_from: Optional[datetime]
    effective_to: Optional[datetime]
    is_active: int
    eligibility_rules: Optional[str]
    priority_rules: Optional[str]
    geographic_rules: Optional[str]
    special_population_rules: Optional[str]
    source_reference: Optional[str]
    description: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class AllocationRuleSetCreate(BaseModel):
    rule_set_id: str
    organ_type: str
    jurisdiction: str
    policy_version: str
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    is_active: Optional[int] = 1
    eligibility_rules: Optional[str] = None
    priority_rules: Optional[str] = None
    geographic_rules: Optional[str] = None
    special_population_rules: Optional[str] = None
    source_reference: Optional[str] = None
    description: Optional[str] = None

