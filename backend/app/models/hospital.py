from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.enums import HospitalStatus


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hospital_type = Column(String, nullable=False)
    verification_status = Column(String, default="VERIFIED")
    status = Column(Enum(HospitalStatus), default=HospitalStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="hospital")
    patients = relationship("Patient", back_populates="hospital")
