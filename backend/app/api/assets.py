from fastapi import APIRouter, Depends, HTTPException, Request
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import (
    accessible_asset_ids,
    get_current_user,
    require_asset_access,
    require_case_access,
)
from app.db.session import get_db
from app.models.core import BankAccount, MobileNumber, Relationship, User
from app.schemas.cases import DeleteRequest
from app.schemas.assets import (
    BankAccountCreate,
    BankAccountOut,
    BankAccountUpdate,
    MobileNumberCreate,
    MobileNumberOut,
    MobileNumberUpdate,
)
from app.services.audit import write_audit

router = APIRouter(tags=["assets"])

MOBILE_UPDATE_FIELDS = {
    "mobile_number",
    "country_code",
    "sim_provider",
    "subscriber_name",
    "current_status",
    "source",
    "verification_status",
    "cdr_reported",
    "cdr_reported_date",
    "cdr_available",
    "brief_details",
    "notes",
}

BANK_ACCOUNT_UPDATE_FIELDS = {
    "bank_name",
    "branch_name",
    "ifsc",
    "account_number",
    "account_holder_name",
    "account_type",
    "current_status",
    "freeze_amount",
    "source",
    "notes",
}

def _asset_ids_for_case(db: Session, case_id: uuid.UUID, asset_type: str) -> set[uuid.UUID]:
    rows = db.scalars(
        select(Relationship).where(
            Relationship.case_id == case_id,
            Relationship.deleted_at.is_(None),
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


def _ensure_case_asset_relationship(
    db: Session,
    *,
    case_id: uuid.UUID,
    asset_type: str,
    asset_id: uuid.UUID,
    relationship_type: str,
    user_id: uuid.UUID,
) -> None:
    existing = db.scalar(
        select(Relationship).where(
            Relationship.case_id == case_id,
            Relationship.deleted_at.is_(None),
            Relationship.source_entity_type == "case",
            Relationship.source_entity_id == case_id,
            Relationship.target_entity_type == asset_type,
            Relationship.target_entity_id == asset_id,
            Relationship.relationship_type == relationship_type,
        )
    )
    if existing:
        return
    db.add(
        Relationship(
            source_entity_type="case",
            source_entity_id=case_id,
            target_entity_type=asset_type,
            target_entity_id=asset_id,
            relationship_type=relationship_type,
            confidence="Confirmed",
            source_of_relationship="Manual",
            case_id=case_id,
            created_by=user_id,
            updated_by=user_id,
        )
    )


@router.get("/mobile-numbers", response_model=list[MobileNumberOut])
def list_mobile_numbers(
    case_id: uuid.UUID | None = None,
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if case_id:
        require_case_access(case_id, db, user)
        asset_ids = _asset_ids_for_case(db, case_id, "mobile_number")
        if not asset_ids:
            return []
        return list(
            db.scalars(
                select(MobileNumber)
                .where(
                    MobileNumber.deleted_at.is_(None),
                    MobileNumber.id.in_(asset_ids),
                )
                .order_by(MobileNumber.updated_at.desc())
            )
        )
    asset_ids = accessible_asset_ids(db, user, "mobile_number")
    if not asset_ids:
        return []
    return list(
        db.scalars(
            select(MobileNumber)
            .where(
                MobileNumber.deleted_at.is_(None),
                MobileNumber.id.in_(asset_ids),
            )
            .order_by(MobileNumber.updated_at.desc())
        )
    )


@router.post("/mobile-numbers", response_model=MobileNumberOut, status_code=201)
def create_mobile_number(
    payload: MobileNumberCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_case_access(payload.case_id, db, user)
    mobile = MobileNumber(
        **payload.model_dump(exclude={"case_id"}), created_by=user.id, updated_by=user.id
    )
    db.add(mobile)
    try:
        db.flush()
        _ensure_case_asset_relationship(
            db,
            case_id=payload.case_id,
            asset_type="mobile_number",
            asset_id=mobile.id,
            relationship_type="HAS_MOBILE",
            user_id=user.id,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Mobile number already exists") from exc
    db.refresh(mobile)
    write_audit(
        db,
        action="MOBILE_NUMBER_CREATED",
        request=request,
        user=user,
        entity_type="mobile_number",
        entity_id=mobile.id,
        case_id=payload.case_id,
        new_value=MobileNumberOut.model_validate(mobile).model_dump(mode="json"),
    )
    return mobile


@router.put("/mobile-numbers/{mobile_id}", response_model=MobileNumberOut)
def update_mobile_number(
    mobile_id: uuid.UUID,
    payload: MobileNumberUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_asset_access("mobile_number", mobile_id, db, user, write=True)
    mobile = db.get(MobileNumber, mobile_id)
    if not mobile or mobile.deleted_at:
        raise HTTPException(status_code=404, detail="Mobile number not found")
    old = MobileNumberOut.model_validate(mobile).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in MOBILE_UPDATE_FIELDS:
            setattr(mobile, key, value)
    mobile.updated_by = user.id
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Mobile number already exists") from exc
    db.refresh(mobile)
    write_audit(
        db,
        action="MOBILE_NUMBER_UPDATED",
        request=request,
        user=user,
        entity_type="mobile_number",
        entity_id=mobile.id,
        old_value=old,
        new_value=MobileNumberOut.model_validate(mobile).model_dump(mode="json"),
    )
    return mobile


@router.delete("/mobile-numbers/{mobile_id}")
def delete_mobile_number(
    mobile_id: uuid.UUID,
    payload: DeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_asset_access("mobile_number", mobile_id, db, user, write=True)
    mobile = db.get(MobileNumber, mobile_id)
    if not mobile or mobile.deleted_at:
        raise HTTPException(status_code=404, detail="Mobile number not found")
    mobile.deleted_at = datetime.now(timezone.utc)
    mobile.deleted_by = user.id
    mobile.delete_reason = payload.delete_reason
    db.commit()
    write_audit(
        db,
        action="MOBILE_NUMBER_DELETED",
        request=request,
        user=user,
        entity_type="mobile_number",
        entity_id=mobile.id,
    )
    return {"ok": True}


@router.get("/bank-accounts", response_model=list[BankAccountOut])
def list_bank_accounts(
    case_id: uuid.UUID | None = None,
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if case_id:
        require_case_access(case_id, db, user)
        asset_ids = _asset_ids_for_case(db, case_id, "bank_account")
        if not asset_ids:
            return []
        return list(
            db.scalars(
                select(BankAccount)
                .where(
                    BankAccount.deleted_at.is_(None),
                    BankAccount.id.in_(asset_ids),
                )
                .order_by(BankAccount.updated_at.desc())
            )
        )
    asset_ids = accessible_asset_ids(db, user, "bank_account")
    if not asset_ids:
        return []
    return list(
        db.scalars(
            select(BankAccount)
            .where(
                BankAccount.deleted_at.is_(None),
                BankAccount.id.in_(asset_ids),
            )
            .order_by(BankAccount.updated_at.desc())
        )
    )


@router.post("/bank-accounts", response_model=BankAccountOut, status_code=201)
def create_bank_account(
    payload: BankAccountCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_case_access(payload.case_id, db, user)
    account = BankAccount(
        **payload.model_dump(exclude={"case_id"}), created_by=user.id, updated_by=user.id
    )
    db.add(account)
    try:
        db.flush()
        _ensure_case_asset_relationship(
            db,
            case_id=payload.case_id,
            asset_type="bank_account",
            asset_id=account.id,
            relationship_type="HAS_BANK_ACCOUNT",
            user_id=user.id,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bank account already exists") from exc
    db.refresh(account)
    write_audit(
        db,
        action="BANK_ACCOUNT_CREATED",
        request=request,
        user=user,
        entity_type="bank_account",
        entity_id=account.id,
        case_id=payload.case_id,
        new_value=BankAccountOut.model_validate(account).model_dump(mode="json"),
    )
    return account


@router.put("/bank-accounts/{account_id}", response_model=BankAccountOut)
def update_bank_account(
    account_id: uuid.UUID,
    payload: BankAccountUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_asset_access("bank_account", account_id, db, user, write=True)
    account = db.get(BankAccount, account_id)
    if not account or account.deleted_at:
        raise HTTPException(status_code=404, detail="Bank account not found")
    old = BankAccountOut.model_validate(account).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in BANK_ACCOUNT_UPDATE_FIELDS:
            setattr(account, key, value)
    account.updated_by = user.id
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bank account already exists") from exc
    db.refresh(account)
    write_audit(
        db,
        action="BANK_ACCOUNT_UPDATED",
        request=request,
        user=user,
        entity_type="bank_account",
        entity_id=account.id,
        old_value=old,
        new_value=BankAccountOut.model_validate(account).model_dump(mode="json"),
    )
    return account


@router.delete("/bank-accounts/{account_id}")
def delete_bank_account(
    account_id: uuid.UUID,
    payload: DeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_asset_access("bank_account", account_id, db, user, write=True)
    account = db.get(BankAccount, account_id)
    if not account or account.deleted_at:
        raise HTTPException(status_code=404, detail="Bank account not found")
    account.deleted_at = datetime.now(timezone.utc)
    account.deleted_by = user.id
    account.delete_reason = payload.delete_reason
    db.commit()
    write_audit(
        db,
        action="BANK_ACCOUNT_DELETED",
        request=request,
        user=user,
        entity_type="bank_account",
        entity_id=account.id,
    )
    return {"ok": True}
