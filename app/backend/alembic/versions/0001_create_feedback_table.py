"""create feedback table

Revision ID: 0001
Revises:
Create Date: 2026-03-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_name", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column(
            "theme",
            sa.Enum("UX", "Performance", "Support", "Pricing", "Communication", name="theme"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("Open", "In Progress", "Actioned", name="status"),
            nullable=False,
            server_default="Open",
        ),
        sa.Column(
            "date_logged",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(op.f("ix_feedback_id"), "feedback", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_id"), table_name="feedback")
    op.drop_table("feedback")
    op.execute("DROP TYPE IF EXISTS theme")
    op.execute("DROP TYPE IF EXISTS status")
