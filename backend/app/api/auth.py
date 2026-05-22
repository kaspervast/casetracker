from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_permissions
from app.auth.passwords import hash_password, verify_password
from app.auth.tokens import create_access_token
from app.core.config import get_settings
from app.db.session import get_db
from app.models.core import User
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    user = db.scalar(select(User).where(User.username == payload.username))
    now = datetime.now(timezone.utc)

    if not user:
        write_audit(
            db,
            action="LOGIN_FAILURE",
            request=request,
            failure_reason="Unknown username",
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.is_locked and user.locked_until and user.locked_until > now:
        write_audit(
            db,
            action="LOGIN_FAILURE",
            request=request,
            user=user,
            failure_reason="Account locked",
            success=False,
        )
        raise HTTPException(status_code=423, detail="Account is temporarily locked")

    if not user.is_active or not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.login_lockout_attempts:
            user.is_locked = True
            user.locked_until = now + timedelta(minutes=settings.login_lockout_minutes)
        db.commit()
        write_audit(
            db,
            action="LOGIN_FAILURE",
            request=request,
            user=user,
            failure_reason="Invalid password or inactive account",
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    db.commit()
    write_audit(db, action="LOGIN_SUCCESS", request=request, user=user)
    return TokenResponse(access_token=create_access_token(user.username))


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    write_audit(db, action="LOGOUT", request=request, user=user)
    return {"ok": True}


@router.get("/me", response_model=CurrentUserResponse)
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    permissions = sorted(get_user_permissions(db, user))
    roles = [user_role.role.name for user_role in user.roles]
    return CurrentUserResponse(
        id=str(user.id),
        username=user.username,
        full_name=user.full_name,
        roles=roles,
        permissions=permissions,
    )


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        write_audit(
            db,
            action="PASSWORD_CHANGE",
            request=request,
            user=user,
            success=False,
            failure_reason="Current password mismatch",
        )
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    write_audit(db, action="PASSWORD_CHANGE", request=request, user=user)
    return {"ok": True}
