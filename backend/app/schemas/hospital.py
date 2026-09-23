from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.enums import HospitalStatus


class HospitalCreate(BaseModel):
    hospital_id: str
    name: str
    address: str
    city: str
    state: str
    contact: str
    email: EmailStr
    hospital_type: str
    verification_status: str = "VERIFIED"
    # login credentials
    user_name: str
    user_email: EmailStr
    user_password: str


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact: Optional[str] = None
    hospital_type: Optional[str] = None


class HospitalOut(BaseModel):
    id: int
    hospital_id: str
    name: str
    address: str
    city: str
    state: str
    contact: str
    email: str
    hospital_type: str
    verification_status: str
    status: HospitalStatus
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HospitalStatusUpdate(BaseModel):
    status: HospitalStatus
