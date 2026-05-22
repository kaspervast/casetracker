from fastapi import APIRouter, Depends, HTTPException, Request
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.core import BankAccount, MobileNumber, User
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


@router.get("/mobile-numbers", response_model=list[MobileNumberOut])
def list_mobile_numbers(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return list(
        db.scalars(
            select(MobileNumber)
            .where(MobileNumber.deleted_at.is_(None))
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
    mobile = MobileNumber(**payload.model_dump(), created_by=user.id, updated_by=user.id)
    db.add(mobile)
    try:
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
    mobile = db.get(MobileNumber, mobile_id)
    if not mobile or mobile.deleted_at:
        raise HTTPException(status_code=404, detail="Mobile number not found")
    old = MobileNumberOut.model_validate(mobile).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
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
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return list(
        db.scalars(
            select(BankAccount)
            .where(BankAccount.deleted_at.is_(None))
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
    account = BankAccount(**payload.model_dump(), created_by=user.id, updated_by=user.id)
    db.add(account)
    try:
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
    account = db.get(BankAccount, account_id)
    if not account or account.deleted_at:
        raise HTTPException(status_code=404, detail="Bank account not found")
    old = BankAccountOut.model_validate(account).model_dump(mode="json")
    for key, value in payload.model_dump(exclude_unset=True).items():
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
