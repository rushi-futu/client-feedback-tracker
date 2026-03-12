from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.schemas.feedback import Theme, Status


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    summary = Column(String(500), nullable=False)
    detail = Column(Text, nullable=True)
    theme = Column(SAEnum(Theme), nullable=False)
    status = Column(SAEnum(Status), nullable=False, default=Status.Open)
    date_logged = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
