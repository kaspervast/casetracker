import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RelationshipBase(BaseModel):
    source_entity_type: str
    source_entity_id: uuid.UUID
    target_entity_type: str
    target_entity_id: uuid.UUID
    relationship_type: str
    confidence: str = "Medium"
    source_of_relationship: str = "Manual"
    case_id: uuid.UUID | None = None
    notes: str | None = None


class RelationshipCreate(RelationshipBase):
    pass


class RelationshipUpdate(BaseModel):
    relationship_type: str | None = None
    confidence: str | None = None
    source_of_relationship: str | None = None
    notes: str | None = None


class RelationshipOut(RelationshipBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
