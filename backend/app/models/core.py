import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    ActorMixin,
    Base,
    ShortString,
    SoftDeleteMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class Permission(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    )


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(ShortString, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    police_station: Mapped[str | None] = mapped_column(ShortString)
    district: Mapped[str | None] = mapped_column(ShortString)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    roles: Mapped[list["UserRole"]] = relationship(
        cascade="all, delete-orphan", back_populates="user"
    )


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    user: Mapped[User] = relationship(back_populates="roles")
    role: Mapped[Role] = relationship()


class Case(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "cases"

    case_number: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    police_station: Mapped[str | None] = mapped_column(ShortString)
    district: Mapped[str | None] = mapped_column(ShortString)
    city: Mapped[str | None] = mapped_column(ShortString)
    case_title: Mapped[str] = mapped_column(ShortString, nullable=False)
    case_type: Mapped[str | None] = mapped_column(String(80))
    sections_acts_applied: Mapped[str | None] = mapped_column(Text)
    date_of_registration: Mapped[date | None] = mapped_column(Date)
    incident_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reporting_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    complainant_summary: Mapped[str | None] = mapped_column(Text)
    investigating_officer: Mapped[str | None] = mapped_column(ShortString)
    supervising_officer: Mapped[str | None] = mapped_column(ShortString)
    case_status: Mapped[str] = mapped_column(String(80), default="Draft", nullable=False)
    priority: Mapped[str] = mapped_column(String(40), default="Medium", nullable=False)
    short_summary: Mapped[str | None] = mapped_column(Text)
    detailed_case_narrative: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    confidentiality_level: Mapped[str] = mapped_column(
        String(80), default="Normal", nullable=False
    )


Index("ix_cases_case_number", Case.case_number)
Index("ix_cases_status_priority", Case.case_status, Case.priority)


class CaseAssignment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "case_assignments"
    __table_args__ = (UniqueConstraint("case_id", "user_id", name="uq_case_user"),)

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role_in_case: Mapped[str] = mapped_column(String(80), default="Investigating Officer")


class Person(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "persons"

    full_name: Mapped[str] = mapped_column(ShortString, nullable=False)
    alias_or_nickname: Mapped[str | None] = mapped_column(ShortString)
    father_name: Mapped[str | None] = mapped_column(ShortString)
    mother_name: Mapped[str | None] = mapped_column(ShortString)
    spouse_name: Mapped[str | None] = mapped_column(ShortString)
    gender: Mapped[str | None] = mapped_column(String(40))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    approximate_age: Mapped[int | None] = mapped_column(Integer)
    occupation: Mapped[str | None] = mapped_column(ShortString)
    nationality: Mapped[str | None] = mapped_column(ShortString)
    id_document_type: Mapped[str | None] = mapped_column(String(80))
    id_document_number: Mapped[str | None] = mapped_column(String(120))
    photo_file_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    notes: Mapped[str | None] = mapped_column(Text)
    risk_level: Mapped[str] = mapped_column(String(40), default="Unknown", nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(80), default="Unverified", nullable=False
    )
    is_absconding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_arrested: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    arrest_date: Mapped[date | None] = mapped_column(Date)
    bail_status: Mapped[str | None] = mapped_column(ShortString)
    custody_details: Mapped[str | None] = mapped_column(Text)


Index("ix_persons_name_father", Person.full_name, Person.father_name)
Index("ix_persons_id_document", Person.id_document_type, Person.id_document_number)


class CasePersonRole(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "case_person_roles"
    __table_args__ = (UniqueConstraint("case_id", "person_id", "role", name="uq_case_person_role"),)

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(80), nullable=False)


class MobileNumber(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "mobile_numbers"

    mobile_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    country_code: Mapped[str] = mapped_column(String(8), default="+91", nullable=False)
    sim_provider: Mapped[str | None] = mapped_column(ShortString)
    subscriber_name: Mapped[str | None] = mapped_column(ShortString)
    current_status: Mapped[str] = mapped_column(String(40), default="Unknown", nullable=False)
    source: Mapped[str | None] = mapped_column(String(80))
    verification_status: Mapped[str] = mapped_column(
        String(80), default="Unverified", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)


class BankAccount(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "bank_accounts"

    bank_name: Mapped[str | None] = mapped_column(ShortString)
    branch_name: Mapped[str | None] = mapped_column(ShortString)
    ifsc: Mapped[str | None] = mapped_column(String(20))
    account_number: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    account_holder_name: Mapped[str | None] = mapped_column(ShortString)
    account_type: Mapped[str | None] = mapped_column(String(80))
    current_status: Mapped[str] = mapped_column(String(40), default="Unknown", nullable=False)
    freeze_amount: Mapped[float | None] = mapped_column(Numeric(14, 2))
    source: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)


class UpiId(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "upi_ids"

    upi_handle: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    provider: Mapped[str | None] = mapped_column(ShortString)
    linked_mobile: Mapped[str | None] = mapped_column(String(30))
    display_name: Mapped[str | None] = mapped_column(ShortString)
    source: Mapped[str | None] = mapped_column(String(80))
    verification_status: Mapped[str] = mapped_column(
        String(80), default="Unverified", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)


class EvidenceItem(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "evidence_items"

    evidence_title: Mapped[str] = mapped_column(ShortString, nullable=False)
    evidence_type: Mapped[str | None] = mapped_column(String(80))
    evidence_number: Mapped[str | None] = mapped_column(String(120))
    sha256_hash: Mapped[str | None] = mapped_column(String(64))
    file_size: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String(120))
    linked_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id")
    )
    confidentiality_level: Mapped[str] = mapped_column(
        String(80), default="Normal", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)


class Relationship(UUIDPrimaryKeyMixin, TimestampMixin, ActorMixin, SoftDeleteMixin, Base):
    __tablename__ = "relationships"

    source_entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    source_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    target_entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(80), nullable=False)
    confidence: Mapped[str] = mapped_column(String(40), default="Medium", nullable=False)
    source_of_relationship: Mapped[str] = mapped_column(
        String(80), default="Manual", nullable=False
    )
    case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id")
    )
    notes: Mapped[str | None] = mapped_column(Text)


Index("ix_relationship_case", Relationship.case_id)
Index(
    "ix_relationship_source_target",
    Relationship.source_entity_type,
    Relationship.source_entity_id,
    Relationship.target_entity_type,
    Relationship.target_entity_id,
)


class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    username: Mapped[str | None] = mapped_column(String(80))
    role: Mapped[str | None] = mapped_column(String(80))
    ip_address: Mapped[str | None] = mapped_column(String(80))
    user_agent: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(80))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    case_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    old_value_json: Mapped[dict | None] = mapped_column(JSONB)
    new_value_json: Mapped[dict | None] = mapped_column(JSONB)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text)


Index("ix_audit_logs_timestamp", AuditLog.timestamp)
Index("ix_audit_logs_case", AuditLog.case_id)
