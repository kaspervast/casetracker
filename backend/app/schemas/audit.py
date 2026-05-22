import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    username: str | None
    role: str | None
    action: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    case_id: uuid.UUID | None
    old_value_json: dict[str, Any] | None
    new_value_json: dict[str, Any] | None
    timestamp: datetime
    success: bool
    failure_reason: str | None

    model_config = ConfigDict(from_attributes=True)
