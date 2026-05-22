import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class MobileNumberBase(BaseModel):
    mobile_number: str = Field(min_length=5, max_length=30)
    country_code: str = "+91"
    sim_provider: str | None = None
    subscriber_name: str | None = None
    current_status: str = "Unknown"
    source: str | None = "Manual entry"
    verification_status: str = "Unverified"
    cdr_reported: bool = False
    cdr_reported_date: date | None = None
    cdr_available: bool = False
    brief_details: str | None = None
    notes: str | None = None


class MobileNumberCreate(MobileNumberBase):
    case_id: uuid.UUID


class MobileNumberUpdate(BaseModel):
    mobile_number: str | None = Field(default=None, min_length=5, max_length=30)
    country_code: str | None = None
    sim_provider: str | None = None
    subscriber_name: str | None = None
    current_status: str | None = None
    source: str | None = None
    verification_status: str | None = None
    cdr_reported: bool | None = None
    cdr_reported_date: date | None = None
    cdr_available: bool | None = None
    brief_details: str | None = None
    notes: str | None = None


class MobileNumberOut(MobileNumberBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BankAccountBase(BaseModel):
    bank_name: str | None = None
    branch_name: str | None = None
    ifsc: str | None = None
    account_number: str = Field(min_length=4, max_length=60)
    account_holder_name: str | None = None
    account_type: str | None = None
    current_status: str = "Unknown"
    freeze_amount: float | None = None
    source: str | None = "Manual entry"
    notes: str | None = None


class BankAccountCreate(BankAccountBase):
    case_id: uuid.UUID


class BankAccountUpdate(BaseModel):
    bank_name: str | None = None
    branch_name: str | None = None
    ifsc: str | None = None
    account_number: str | None = Field(default=None, min_length=4, max_length=60)
    account_holder_name: str | None = None
    account_type: str | None = None
    current_status: str | None = None
    freeze_amount: float | None = None
    source: str | None = None
    notes: str | None = None


class BankAccountOut(BankAccountBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
