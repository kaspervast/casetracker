import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_case_access
from app.db.session import get_db
from app.models.core import Relationship, User
from app.schemas.cases import DeleteRequest
from app.schemas.relationships import (
    RelationshipCreate,
    RelationshipOut,
    RelationshipUpdate,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("", response_model=list[RelationshipOut])
def list_relationships(
    case_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Relationship).where(Relationship.deleted_at.is_(None))
    if case_id:
        require_case_access(case_id, db, user)
        query = query.where(Relationship.case_id == case_id)
    return list(db.scalars(query.order_by(Relationship.updated_at.desc())))


@router.post("", response_model=RelationshipOut, status_code=201)
def create_relationship(
    payload: RelationshipCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.case_id:
        require_case_access(payload.case_id, db, user)
    relationship = Relationship(**payload.model_dump(), created_by=user.id, updated_by=user.id)
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    write_audit(
        db,
        action="RELATIONSHIP_CREATED",
        request=request,
        user=user,
        entity_type="relationship",
        entity_id=relationship.id,
        case_id=relationship.case_id,
        new_value=RelationshipOut.model_validate(relationship).model_dump(mode="json"),
    )
    return relationship


@router.get("/{relationship_id}", response_model=RelationshipOut)
def get_relationship(
    relationship_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    relationship = db.get(Relationship, relationship_id)
    if not relationship or relationship.deleted_at:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if relationship.case_id:
        require_case_access(relationship.case_id, db, user)
    return relationship


@router.put("/{relationship_id}", response_model=RelationshipOut)
def update_relationship(
    relationship_id: uuid.UUID,
    payload: RelationshipUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    relationship = db.get(Relationship, relationship_id)
    if not relationship or relationship.deleted_at:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if relationship.case_id:
        require_case_access(relationship.case_id, db, user)
    old = RelationshipOut.model_validate(relationship).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(relationship, key, value)
    relationship.updated_by = user.id
    db.commit()
    db.refresh(relationship)
    write_audit(
        db,
        action="RELATIONSHIP_UPDATED",
        request=request,
        user=user,
        entity_type="relationship",
        entity_id=relationship.id,
        case_id=relationship.case_id,
        old_value=old,
        new_value=RelationshipOut.model_validate(relationship).model_dump(mode="json"),
    )
    return relationship


@router.delete("/{relationship_id}")
def delete_relationship(
    relationship_id: uuid.UUID,
    payload: DeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    relationship = db.get(Relationship, relationship_id)
    if not relationship or relationship.deleted_at:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if relationship.case_id:
        require_case_access(relationship.case_id, db, user)
    relationship.deleted_at = datetime.now(timezone.utc)
    relationship.deleted_by = user.id
    relationship.delete_reason = payload.delete_reason
    db.commit()
    write_audit(
        db,
        action="RELATIONSHIP_DELETED",
        request=request,
        user=user,
        entity_type="relationship",
        entity_id=relationship.id,
        case_id=relationship.case_id,
    )
    return {"ok": True}
