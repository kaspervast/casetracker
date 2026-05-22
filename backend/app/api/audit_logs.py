import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_case_access, require_permission
from app.db.session import get_db
from app.models.core import AuditLog, User
from app.schemas.audit import AuditOut

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditOut])
def list_audit_logs(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("audit:read")),
):
    return list(db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200)))


@router.get("/case/{case_id}", response_model=list[AuditOut])
def case_audit_logs(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("audit:read")),
):
    require_case_access(case_id, db, user)
    return list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.case_id == case_id)
            .order_by(AuditLog.timestamp.desc())
        )
    )


@router.get("/user/{user_id}", response_model=list[AuditOut])
def user_audit_logs(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("audit:read")),
):
    return list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.timestamp.desc())
        )
    )
