from sqlalchemy import Column, Integer, String, Text, Date, DateTime
from sqlalchemy.sql import func
from app.database import Base


class FeedbackItem(Base):
    __tablename__ = "feedback_items"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    summary = Column(String(500), nullable=False)
    detail = Column(Text, nullable=True)
    theme = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, server_default="Open")
    date_logged = Column(Date, nullable=False, server_default=func.current_date())
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
