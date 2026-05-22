import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PersonBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    alias_or_nickname: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    spouse_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    approximate_age: int | None = None
    occupation: str | None = None
    nationality: str | None = None
    id_document_type: str | None = None
    id_document_number: str | None = None
    notes: str | None = None
    risk_level: str = "Unknown"
    verification_status: str = "Unverified"
    is_absconding: bool = False
    is_arrested: bool = False
    arrest_date: date | None = None
    bail_status: str | None = None
    custody_details: str | None = None


class PersonCreate(PersonBase):
    case_id: uuid.UUID
    role: str


class PersonUpdate(BaseModel):
    full_name: str | None = None
    alias_or_nickname: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    spouse_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    approximate_age: int | None = None
    occupation: str | None = None
    nationality: str | None = None
    id_document_type: str | None = None
    id_document_number: str | None = None
    notes: str | None = None
    risk_level: str | None = None
    verification_status: str | None = None
    is_absconding: bool | None = None
    is_arrested: bool | None = None
    arrest_date: date | None = None
    bail_status: str | None = None
    custody_details: str | None = None


class PersonOut(PersonBase):
    id: uuid.UUID
    case_id: uuid.UUID | None = None
    case_role: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
