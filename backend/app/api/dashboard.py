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
    accessible_cases = cases_query.subquery()
    total_cases = db.scalar(select(func.count()).select_from(accessible_cases)) or 0
    active_cases = db.scalar(
        select(func.count())
        .select_from(accessible_cases)
        .where(accessible_cases.c.case_status != "Closed")
    ) or 0
    closed_cases = db.scalar(
        select(func.count())
        .select_from(accessible_cases)
        .where(accessible_cases.c.case_status == "Closed")
    ) or 0
    assigned_cases = db.scalar(
        select(func.count()).select_from(CaseAssignment).where(CaseAssignment.user_id == user.id)
    ) or 0
    role_count = lambda role: db.scalar(
        select(func.count()).select_from(CasePersonRole).where(CasePersonRole.role == role)
    ) or 0
    recent_cases = list(db.scalars(cases_query.order_by(Case.updated_at.desc()).limit(5)))
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
        recent_cases=recent_cases,
        recent_audit_activity=recent_audit,
    )
