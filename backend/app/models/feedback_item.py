import uuid
from sqlalchemy import Column, String, Text, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.types import Uuid
from app.database import Base
from app.schemas.feedback_item import FeedbackTheme, FeedbackStatus


class FeedbackItem(Base):
    __tablename__ = "feedback_items"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_name = Column(String(255), nullable=False)
    summary = Column(String(255), nullable=False)
    detail = Column(Text, nullable=True)
    theme = Column(SAEnum(FeedbackTheme), nullable=False)
    status = Column(SAEnum(FeedbackStatus), nullable=False, default=FeedbackStatus.open)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)
