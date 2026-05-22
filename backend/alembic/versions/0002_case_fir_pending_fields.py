"""case fir pending fields

Revision ID: 0002_case_fir_pending_fields
Revises: 0001_initial_schema
Create Date: 2026-05-22
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_case_fir_pending_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("cases")}
    if "primary_legal_act" not in existing_columns:
        op.add_column("cases", sa.Column("primary_legal_act", sa.String(length=80), nullable=True))
    if "pending_limit_days" not in existing_columns:
        op.add_column(
            "cases",
            sa.Column("pending_limit_days", sa.Integer(), server_default="30", nullable=False),
        )
        op.alter_column("cases", "pending_limit_days", server_default=None)


def downgrade() -> None:
    existing_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("cases")}
    if "pending_limit_days" in existing_columns:
        op.drop_column("cases", "pending_limit_days")
    if "primary_legal_act" in existing_columns:
        op.drop_column("cases", "primary_legal_act")
