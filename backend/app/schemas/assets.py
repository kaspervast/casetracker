import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MobileNumberBase(BaseModel):
    mobile_number: str = Field(min_length=5, max_length=30)
    country_code: str = "+91"
    sim_provider: str | None = None
    subscriber_name: str | None = None
    current_status: str = "Unknown"
    source: str | None = "Manual entry"
    verification_status: str = "Unverified"
    notes: str | None = None


class MobileNumberCreate(MobileNumberBase):
    pass


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
    pass


class BankAccountOut(BankAccountBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
