from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


class Theme(str, Enum):
    UX = "UX"
    Performance = "Performance"
    Support = "Support"
    Pricing = "Pricing"
    Communication = "Communication"


class Status(str, Enum):
    Open = "Open"
    InProgress = "In Progress"
    Actioned = "Actioned"


class FeedbackCreate(BaseModel):
    client_name: str = Field(..., max_length=255)
    summary: str = Field(..., max_length=500)
    detail: Optional[str] = None
    theme: Theme
    status: Status = Status.Open


class FeedbackUpdate(BaseModel):
    client_name: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = Field(None, max_length=500)
    detail: Optional[str] = None
    theme: Optional[Theme] = None
    status: Optional[Status] = None


class FeedbackRead(BaseModel):
    id: int
    client_name: str
    summary: str
    detail: Optional[str] = None
    theme: Theme
    status: Status
    date_logged: datetime

    model_config = {"from_attributes": True}
