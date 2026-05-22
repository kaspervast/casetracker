"""mobile cdr fields

Revision ID: 0003_mobile_cdr_fields
Revises: 0002_case_fir_pending_fields
Create Date: 2026-05-22
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_mobile_cdr_fields"
down_revision = "0002_case_fir_pending_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing_columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("mobile_numbers")
    }
    if "cdr_reported" not in existing_columns:
        op.add_column(
            "mobile_numbers",
            sa.Column("cdr_reported", sa.Boolean(), server_default=sa.false(), nullable=False),
        )
        op.alter_column("mobile_numbers", "cdr_reported", server_default=None)
    if "cdr_reported_date" not in existing_columns:
        op.add_column("mobile_numbers", sa.Column("cdr_reported_date", sa.Date(), nullable=True))
    if "cdr_available" not in existing_columns:
        op.add_column(
            "mobile_numbers",
            sa.Column("cdr_available", sa.Boolean(), server_default=sa.false(), nullable=False),
        )
        op.alter_column("mobile_numbers", "cdr_available", server_default=None)
    if "brief_details" not in existing_columns:
        op.add_column("mobile_numbers", sa.Column("brief_details", sa.Text(), nullable=True))


def downgrade() -> None:
    existing_columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("mobile_numbers")
    }
    for column_name in ["brief_details", "cdr_available", "cdr_reported_date", "cdr_reported"]:
        if column_name in existing_columns:
            op.drop_column("mobile_numbers", column_name)
