import uuid
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.core import AuditLog, User


def primary_role(user: User | None) -> str | None:
    if not user or not user.roles:
        return None
    return user.roles[0].role.name


def write_audit(
    db: Session,
    *,
    action: str,
    request: Request | None = None,
    user: User | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    case_id: uuid.UUID | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    success: bool = True,
    failure_reason: str | None = None,
) -> None:
    log = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else None,
        role=primary_role(user),
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        case_id=case_id,
        old_value_json=old_value,
        new_value_json=new_value,
        timestamp=datetime.now(timezone.utc),
        success=success,
        failure_reason=failure_reason,
    )
    db.add(log)
    db.commit()
