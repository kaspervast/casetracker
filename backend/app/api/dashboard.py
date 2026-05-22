from collections import Counter
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import accessible_cases_query, get_current_user
from app.db.session import get_db
from app.models.core import (
    AuditLog,
    BankAccount,
    Case,
    CaseAssignment,
    CasePersonRole,
    EvidenceItem,
    MobileNumber,
    Person,
    User,
)
from app.schemas.cases import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cases_query = accessible_cases_query(db, user)
    cases = list(db.scalars(cases_query))
    accessible_cases = cases_query.subquery()
    today = date.today()
    total_cases = len(cases)
    active_cases = sum(1 for case in cases if case.case_status != "Closed")
    closed_cases = sum(1 for case in cases if case.case_status == "Closed")
    assigned_cases = db.scalar(
        select(func.count()).select_from(CaseAssignment).where(CaseAssignment.user_id == user.id)
    ) or 0
    role_count = lambda role: db.scalar(
        select(func.count()).select_from(CasePersonRole).where(CasePersonRole.role == role)
    ) or 0
    status_counts = Counter(case.case_status or "Unknown" for case in cases)
    priority_counts = Counter(case.priority or "Unknown" for case in cases)
    pending_age_counts = Counter(
        {
            "0-30 days": 0,
            "31-45 days": 0,
            "46-60 days": 0,
            "61-90 days": 0,
            "90+ days": 0,
            "No FIR date": 0,
        }
    )
    for case in cases:
        if not case.date_of_registration:
            pending_age_counts["No FIR date"] += 1
            continue
        days_pending = max(0, (today - case.date_of_registration).days)
        if days_pending <= 30:
            pending_age_counts["0-30 days"] += 1
        elif days_pending <= 45:
            pending_age_counts["31-45 days"] += 1
        elif days_pending <= 60:
            pending_age_counts["46-60 days"] += 1
        elif days_pending <= 90:
            pending_age_counts["61-90 days"] += 1
        else:
            pending_age_counts["90+ days"] += 1

    accused_arrested = db.scalar(
        select(func.count())
        .select_from(CasePersonRole)
        .join(Person, Person.id == CasePersonRole.person_id)
        .join(accessible_cases, accessible_cases.c.id == CasePersonRole.case_id)
        .where(
            CasePersonRole.role == "Accused",
            Person.deleted_at.is_(None),
            Person.is_arrested.is_(True),
        )
    ) or 0
    accused_not_arrested = db.scalar(
        select(func.count())
        .select_from(CasePersonRole)
        .join(Person, Person.id == CasePersonRole.person_id)
        .join(accessible_cases, accessible_cases.c.id == CasePersonRole.case_id)
        .where(
            CasePersonRole.role == "Accused",
            Person.deleted_at.is_(None),
            Person.is_arrested.is_(False),
        )
    ) or 0
    recent_cases = sorted(cases, key=lambda case: case.updated_at, reverse=True)[:5]
    recent_audit = [
        {
            "timestamp": audit.timestamp.isoformat(),
            "username": audit.username,
            "action": audit.action,
            "entity_type": audit.entity_type,
        }
        for audit in db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(8))
    ]
    return DashboardSummary(
        total_cases=total_cases,
        active_cases=active_cases,
        closed_cases=closed_cases,
        assigned_cases=assigned_cases,
        total_persons=db.scalar(select(func.count()).select_from(Person).where(Person.deleted_at.is_(None))) or 0,
        total_accused=role_count("Accused"),
        total_suspects=role_count("Suspect"),
        total_complainants=role_count("Complainant"),
        total_witnesses=role_count("Witness"),
        total_mobile_numbers=db.scalar(select(func.count()).select_from(MobileNumber).where(MobileNumber.deleted_at.is_(None))) or 0,
        total_bank_accounts=db.scalar(select(func.count()).select_from(BankAccount).where(BankAccount.deleted_at.is_(None))) or 0,
        total_evidence_items=db.scalar(select(func.count()).select_from(EvidenceItem).where(EvidenceItem.deleted_at.is_(None))) or 0,
        cases_by_status=[
            {"label": label, "value": value}
            for label, value in status_counts.most_common()
        ],
        cases_by_priority=[
            {"label": label, "value": value}
            for label, value in priority_counts.most_common()
        ],
        cases_by_pending_age=[
            {"label": label, "value": pending_age_counts[label]}
            for label in ["0-30 days", "31-45 days", "46-60 days", "61-90 days", "90+ days", "No FIR date"]
        ],
        accused_arrest_status=[
            {"label": "Arrested", "value": accused_arrested},
            {"label": "Not arrested", "value": accused_not_arrested},
        ],
        recent_cases=recent_cases,
        recent_audit_activity=recent_audit,
    )
