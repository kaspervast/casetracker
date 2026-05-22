import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    accessible_cases_query,
    get_current_user,
    require_case_access,
)
from app.db.session import get_db
from app.models.core import CasePersonRole, Person, User
from app.schemas.cases import DeleteRequest
from app.schemas.persons import PersonCreate, PersonOut, PersonUpdate
from app.services.audit import write_audit

router = APIRouter(prefix="/persons", tags=["persons"])


def _accessible_person_ids(db: Session, user: User):
    case_subq = accessible_cases_query(db, user).subquery()
    return select(CasePersonRole.person_id).where(CasePersonRole.case_id.in_(select(case_subq.c.id)))


@router.get("", response_model=list[PersonOut])
def list_persons(
    case_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if case_id:
        require_case_access(case_id, db, user)
        rows = db.execute(
            select(Person, CasePersonRole.role)
            .join(CasePersonRole, CasePersonRole.person_id == Person.id)
            .where(
                Person.deleted_at.is_(None),
                CasePersonRole.case_id == case_id,
            )
            .order_by(Person.updated_at.desc())
        )
        return [
            PersonOut.model_validate(person).model_copy(
                update={"case_id": case_id, "case_role": role}
            )
            for person, role in rows
        ]
    query = select(Person).where(Person.deleted_at.is_(None))
    query = query.where(Person.id.in_(_accessible_person_ids(db, user)))
    return list(db.scalars(query.order_by(Person.updated_at.desc())))


@router.post("", response_model=PersonOut, status_code=201)
def create_person(
    payload: PersonCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"case_id", "role"})
    require_case_access(payload.case_id, db, user)
    person = Person(**data, created_by=user.id, updated_by=user.id)
    db.add(person)
    db.flush()
    db.add(CasePersonRole(case_id=payload.case_id, person_id=person.id, role=payload.role))
    db.commit()
    db.refresh(person)
    write_audit(
        db,
        action="PERSON_CREATED",
        request=request,
        user=user,
        entity_type="person",
        entity_id=person.id,
        case_id=payload.case_id,
        new_value=PersonOut.model_validate(person).model_dump(mode="json"),
    )
    return person


@router.get("/{person_id}", response_model=PersonOut)
def get_person(
    person_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = db.get(Person, person_id)
    if not person or person.deleted_at:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.put("/{person_id}", response_model=PersonOut)
def update_person(
    person_id: uuid.UUID,
    payload: PersonUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = db.get(Person, person_id)
    if not person or person.deleted_at:
        raise HTTPException(status_code=404, detail="Person not found")
    old = PersonOut.model_validate(person).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, key, value)
    person.updated_by = user.id
    db.commit()
    db.refresh(person)
    write_audit(
        db,
        action="PERSON_UPDATED",
        request=request,
        user=user,
        entity_type="person",
        entity_id=person.id,
        old_value=old,
        new_value=PersonOut.model_validate(person).model_dump(mode="json"),
    )
    return person


@router.delete("/{person_id}")
def delete_person(
    person_id: uuid.UUID,
    payload: DeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    person = db.get(Person, person_id)
    if not person or person.deleted_at:
        raise HTTPException(status_code=404, detail="Person not found")
    person.deleted_at = datetime.now(timezone.utc)
    person.deleted_by = user.id
    person.delete_reason = payload.delete_reason
    db.commit()
    write_audit(db, action="PERSON_DELETED", request=request, user=user, entity_type="person", entity_id=person.id)
    return {"ok": True}


@router.get("/{person_id}/cases")
def person_cases(
    person_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    accessible = accessible_cases_query(db, user).subquery()
    rows = db.execute(
        select(accessible, CasePersonRole.role)
        .join(CasePersonRole, CasePersonRole.case_id == accessible.c.id)
        .where(CasePersonRole.person_id == person_id)
    )
    return [
        {
            "case_id": row.id,
            "case_number": row.case_number,
            "case_title": row.case_title,
            "role": row.role,
        }
        for row in rows
    ]
