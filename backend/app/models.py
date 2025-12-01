import enum
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from app.db import Base

# Enums
class AnimalStatus(str, enum.Enum):
    Adoptable = "Adoptable"
    Foster = "Foster"
    Adopted = "Adopted"
    Hold = "Hold"
    Pending = "Pending"

class UserRole(str, enum.Enum):
    Staff = "Staff"
    Adopter = "Adopter"

class RequestStatus(str, enum.Enum):
    Submitted = "Submitted"
    Under_Review = "Under Review"
    Approved = "Approved"
    Rejected = "Rejected"
    Cancelled = "Cancelled"

class IntakeType(str, enum.Enum):
    Stray = "Stray"
    Surrendered = "Surrendered"
    Transfer = "Transfer"

class IntakeCondition(str, enum.Enum):
    Normal = "Normal"
    Injured = "Injured"
    Sick = "Sick"

# Models
class Animal(Base):
    __tablename__ = "animal"

    A_ANIMALID = Column("a_animalid", Integer, primary_key=True, index=True)
    A_NAME = Column("a_name", String(100), nullable=False)
    A_SPECIES = Column("a_species", String(30), nullable=False)
    A_BREED = Column("a_breed", String(30))
    A_STATUS = Column("a_status", Enum(AnimalStatus, name="ANIMAL_STATUS"), nullable=False)
    A_INTAKEDATE = Column("a_intakedate", Date, nullable=False)

class AppUser(Base):
    __tablename__ = "app_user"

    U_USERID = Column("u_userid", Integer, primary_key=True, index=True)
    U_NAME = Column("u_name", String(100), nullable=False)
    U_EMAIL = Column("u_email", String(255), unique=True, nullable=False)
    U_PASSWORD = Column("u_password", String(100), nullable=False)
    U_ROLE = Column("u_role", Enum(UserRole, name="USER_ROLE"), nullable=False)

class AdoptionRequest(Base):
    __tablename__ = "adoption_request"

    AR_USERID = Column("ar_userid", Integer, ForeignKey("app_user.u_userid"), primary_key=True)
    AR_ANIMALID = Column("ar_animalid", Integer, ForeignKey("animal.a_animalid"), primary_key=True)
    AR_STATUS = Column("ar_status", Enum(RequestStatus, name="REQUEST_STATUS", values_callable=lambda x: [e.value for e in x]), nullable=False, default=RequestStatus.Submitted)
    AR_CREATEDAT = Column("ar_createdat", DateTime(timezone=True), nullable=False, server_default=func.now())
    AR_UPDATEDAT = Column("ar_updatedat", DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

class MedicalRecord(Base):
    __tablename__ = "medical_record"

    MR_RECORDID = Column("mr_recordid", Integer, primary_key=True, index=True)
    MR_ANIMALID = Column("mr_animalid", Integer, ForeignKey("animal.a_animalid"), nullable=False)
    MR_TREATMENTTYPE = Column("mr_treatmenttype", String, nullable=False)
    MR_TREATMENTDATE = Column("mr_treatmentdate", Date, nullable=False)

class IntakeRecord(Base):
    __tablename__ = "intake_record"

    IR_INTAKEID = Column("ir_intakeid", Integer, primary_key=True, index=True)
    IR_ANIMALID = Column("ir_animalid", Integer, ForeignKey("animal.a_animalid"), nullable=False)
    IR_INTAKETYPE = Column("ir_intaketype", Enum(IntakeType, name="INTAKE_TYPE"), nullable=False)
    IR_INTAKEDATE = Column("ir_intakedate", Date, nullable=False)
    IR_CONDITION = Column("ir_condition", Enum(IntakeCondition, name="INTAKE_CONDITION"), nullable=False)
