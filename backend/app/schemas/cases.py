import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CaseBase(BaseModel):
    case_number: str = Field(min_length=1, max_length=120)
    police_station: str | None = None
    district: str | None = None
    city: str | None = None
    case_title: str = Field(min_length=1, max_length=255)
    case_type: str | None = None
    primary_legal_act: str | None = None
    sections_acts_applied: str | None = None
    date_of_registration: date | None = None
    pending_limit_days: int = 30
    incident_datetime: datetime | None = None
    reporting_datetime: datetime | None = None
    complainant_summary: str | None = None
    investigating_officer: str | None = None
    supervising_officer: str | None = None
    case_status: str = "Draft"
    priority: str = "Medium"
    short_summary: str | None = None
    detailed_case_narrative: str | None = None
    tags: list[str] = []
    confidentiality_level: str = "Normal"


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    case_number: str | None = None
    police_station: str | None = None
    district: str | None = None
    city: str | None = None
    case_title: str | None = None
    case_type: str | None = None
    primary_legal_act: str | None = None
    sections_acts_applied: str | None = None
    date_of_registration: date | None = None
    pending_limit_days: int | None = None
    incident_datetime: datetime | None = None
    reporting_datetime: datetime | None = None
    complainant_summary: str | None = None
    investigating_officer: str | None = None
    supervising_officer: str | None = None
    case_status: str | None = None
    priority: str | None = None
    short_summary: str | None = None
    detailed_case_narrative: str | None = None
    tags: list[str] | None = None
    confidentiality_level: str | None = None


class DeleteRequest(BaseModel):
    delete_reason: str = Field(min_length=3)


class CaseOut(CaseBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    total_cases: int
    active_cases: int
    closed_cases: int
    assigned_cases: int
    total_persons: int
    total_accused: int
    total_suspects: int
    total_complainants: int
    total_witnesses: int
    total_mobile_numbers: int
    total_bank_accounts: int
    total_evidence_items: int
    recent_cases: list[CaseOut]
    recent_audit_activity: list[dict[str, Any]]
