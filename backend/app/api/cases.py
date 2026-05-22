import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import accessible_cases_query, get_current_user, require_case_access
from app.db.session import get_db
from app.models.core import Case, CaseAssignment, User
from app.schemas.cases import CaseCreate, CaseOut, CaseUpdate, DeleteRequest
from app.services.audit import write_audit

router = APIRouter(prefix="/cases", tags=["cases"])

CASE_UPDATE_FIELDS = {
    "case_number",
    "police_station",
    "district",
    "city",
    "case_title",
    "case_type",
    "primary_legal_act",
    "sections_acts_applied",
    "date_of_registration",
    "pending_limit_days",
    "incident_datetime",
    "reporting_datetime",
    "complainant_summary",
    "investigating_officer",
    "supervising_officer",
    "case_status",
    "priority",
    "short_summary",
    "detailed_case_narrative",
    "tags",
    "confidentiality_level",
}


@router.get("", response_model=list[CaseOut])
def list_cases(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(db.scalars(accessible_cases_query(db, user).order_by(Case.updated_at.desc())))


@router.post("", response_model=CaseOut, status_code=201)
def create_case(
    payload: CaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = Case(**payload.model_dump(), created_by=user.id, updated_by=user.id)
    db.add(case)
    try:
        db.flush()
        db.add(CaseAssignment(case_id=case.id, user_id=user.id, role_in_case="Creator"))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Case number already exists") from exc
    db.refresh(case)
    write_audit(
        db,
        action="CASE_CREATED",
        request=request,
        user=user,
        entity_type="case",
        entity_id=case.id,
        case_id=case.id,
        new_value=CaseOut.model_validate(case).model_dump(mode="json"),
    )
    return case


@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_case_access(case_id, db, user)
    case = db.get(Case, case_id)
    if not case or case.deleted_at:
        raise HTTPException(status_code=404, detail="Case not found")
    write_audit(db, action="CASE_VIEWED", request=request, user=user, entity_type="case", entity_id=case.id, case_id=case.id)
    return case


@router.put("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: uuid.UUID,
    payload: CaseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_case_access(case_id, db, user)
    case = db.get(Case, case_id)
    if not case or case.deleted_at:
        raise HTTPException(status_code=404, detail="Case not found")
    old = CaseOut.model_validate(case).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in CASE_UPDATE_FIELDS:
            setattr(case, key, value)
    case.updated_by = user.id
    db.commit()
    db.refresh(case)
    write_audit(
        db,
        action="CASE_UPDATED",
        request=request,
        user=user,
        entity_type="case",
        entity_id=case.id,
        case_id=case.id,
        old_value=old,
        new_value=CaseOut.model_validate(case).model_dump(mode="json"),
    )
    return case


@router.delete("/{case_id}")
def delete_case(
    case_id: uuid.UUID,
    payload: DeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_case_access(case_id, db, user)
    case = db.get(Case, case_id)
    if not case or case.deleted_at:
        raise HTTPException(status_code=404, detail="Case not found")
    case.deleted_at = datetime.now(timezone.utc)
    case.deleted_by = user.id
    case.delete_reason = payload.delete_reason
    db.commit()
    write_audit(db, action="CASE_DELETED", request=request, user=user, entity_type="case", entity_id=case.id, case_id=case.id)
    return {"ok": True}
