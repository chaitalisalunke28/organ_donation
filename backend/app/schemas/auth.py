from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.enums import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    name: str
    hospital_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    hospital_id: Optional[int] = None

    class Config:
        from_attributes = True
