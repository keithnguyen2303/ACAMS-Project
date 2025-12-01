from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models import AnimalStatus, UserRole, RequestStatus

class AnimalOut(BaseModel):
    A_ANIMALID: int
    A_NAME: str
    A_SPECIES: str
    A_BREED: Optional[str] = None
    A_STATUS: AnimalStatus
    A_INTAKEDATE: date

    model_config = ConfigDict(from_attributes=True)

from app.models import UserRole

class UserBase(BaseModel):
    U_NAME: str
    U_EMAIL: str
    U_ROLE: UserRole

class UserCreate(UserBase):
    U_PASSWORD: str

class UserOut(UserBase):
    U_USERID: int

    model_config = ConfigDict(from_attributes=True)

class AdoptionRequestBase(BaseModel):
    AR_USERID: int
    AR_ANIMALID: int
    AR_STATUS: RequestStatus

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

class AdoptionRequestCreate(BaseModel):
    AR_USERID: int
    AR_ANIMALID: int

class AdoptionRequestOut(AdoptionRequestBase):
    AR_CREATEDAT: datetime
    AR_UPDATEDAT: datetime

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

class AdoptionRequestStatusUpdate(BaseModel):
    AR_STATUS: RequestStatus

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(UserOut):
    pass

class MedicalRecordOut(BaseModel):
    MR_RECORDID: int
    MR_ANIMALID: int
    MR_TREATMENTTYPE: str
    MR_TREATMENTDATE: date

    model_config = ConfigDict(from_attributes=True)

class IntakeRecordOut(BaseModel):
    IR_INTAKEID: int
    IR_ANIMALID: int
    IR_INTAKETYPE: str
    IR_INTAKEDATE: date
    IR_CONDITION: str

    model_config = ConfigDict(from_attributes=True)
