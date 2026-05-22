import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.auth.tokens import decode_access_token
from app.db.session import get_db
from app.models.core import (
    Case,
    CaseAssignment,
    CasePersonRole,
    Permission,
    Relationship,
    RolePermission,
    User,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    username = decode_access_token(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    user = db.scalar(select(User).where(User.username == username))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    return user


def get_user_permissions(db: Session, user: User) -> set[str]:
    role_ids = [user_role.role_id for user_role in user.roles]
    if not role_ids:
        return set()
    rows = db.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id.in_(role_ids))
    )
    return {row[0] for row in rows}


def has_permission(db: Session, user: User, permission: str) -> bool:
    permissions = get_user_permissions(db, user)
    return "*" in permissions or permission in permissions


def require_permission(permission: str) -> Callable:
    def dependency(
        db: Session = Depends(get_db), user: User = Depends(get_current_user)
    ) -> User:
        if not has_permission(db, user, permission):
            raise HTTPException(status_code=403, detail="Permission denied")
        return user

    return dependency


def can_access_case(db: Session, user: User, case_id: uuid.UUID) -> bool:
    if has_permission(db, user, "cases:read_all"):
        return True
    return db.scalar(
        select(CaseAssignment.id).where(
            CaseAssignment.case_id == case_id, CaseAssignment.user_id == user.id
        )
    ) is not None


def accessible_cases_query(db: Session, user: User) -> Select[tuple[Case]]:
    query = select(Case).where(Case.deleted_at.is_(None))
    if has_permission(db, user, "cases:read_all"):
        return query
    assigned_case_ids = select(CaseAssignment.case_id).where(CaseAssignment.user_id == user.id)
    return query.where(Case.id.in_(assigned_case_ids))


def accessible_case_ids(db: Session, user: User) -> set[uuid.UUID]:
    accessible = accessible_cases_query(db, user).subquery()
    return set(db.scalars(select(accessible.c.id)))


def require_case_access(case_id: uuid.UUID, db: Session, user: User) -> None:
    if not can_access_case(db, user, case_id):
        raise HTTPException(status_code=403, detail="Case access denied")


def _person_case_ids(db: Session, person_id: uuid.UUID) -> set[uuid.UUID]:
    return set(
        db.scalars(
            select(CasePersonRole.case_id).where(CasePersonRole.person_id == person_id)
        )
    )


def can_access_person(db: Session, user: User, person_id: uuid.UUID) -> bool:
    linked_case_ids = _person_case_ids(db, person_id)
    return bool(linked_case_ids & accessible_case_ids(db, user))


def require_person_access(person_id: uuid.UUID, db: Session, user: User) -> None:
    if not can_access_person(db, user, person_id):
        raise HTTPException(status_code=403, detail="Person access denied")


def require_person_write_access(person_id: uuid.UUID, db: Session, user: User) -> None:
    linked_case_ids = _person_case_ids(db, person_id)
    allowed_case_ids = accessible_case_ids(db, user)
    if not linked_case_ids or not linked_case_ids.issubset(allowed_case_ids):
        raise HTTPException(status_code=403, detail="Person write access denied")


def _asset_case_ids(db: Session, asset_type: str, asset_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.scalars(
        select(Relationship.case_id).where(
            Relationship.deleted_at.is_(None),
            Relationship.case_id.is_not(None),
            (
                (Relationship.source_entity_type == asset_type)
                & (Relationship.source_entity_id == asset_id)
            )
            | (
                (Relationship.target_entity_type == asset_type)
                & (Relationship.target_entity_id == asset_id)
            ),
        )
    )
    return {case_id for case_id in rows if case_id is not None}


def accessible_asset_ids(db: Session, user: User, asset_type: str) -> set[uuid.UUID]:
    case_ids = accessible_case_ids(db, user)
    if not case_ids:
        return set()
    rows = db.scalars(
        select(Relationship).where(
            Relationship.deleted_at.is_(None),
            Relationship.case_id.in_(case_ids),
            (Relationship.source_entity_type == asset_type)
            | (Relationship.target_entity_type == asset_type),
        )
    )
    ids: set[uuid.UUID] = set()
    for relationship in rows:
        if relationship.source_entity_type == asset_type:
            ids.add(relationship.source_entity_id)
        if relationship.target_entity_type == asset_type:
            ids.add(relationship.target_entity_id)
    return ids


def require_asset_access(
    asset_type: str, asset_id: uuid.UUID, db: Session, user: User, *, write: bool = False
) -> None:
    linked_case_ids = _asset_case_ids(db, asset_type, asset_id)
    allowed_case_ids = accessible_case_ids(db, user)
    if not linked_case_ids or not (linked_case_ids & allowed_case_ids):
        raise HTTPException(status_code=403, detail="Asset access denied")
    if write and not linked_case_ids.issubset(allowed_case_ids):
        raise HTTPException(status_code=403, detail="Asset write access denied")
