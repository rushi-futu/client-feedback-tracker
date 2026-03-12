"""create feedback_items table

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
        "feedback_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_name", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.String(length=255), nullable=False),
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
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_items_id"), "feedback_items", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_items_id"), table_name="feedback_items")
    op.drop_table("feedback_items")
    op.execute("DROP TYPE IF EXISTS theme")
    op.execute("DROP TYPE IF EXISTS status")
