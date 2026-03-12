from pydantic import BaseModel
from datetime import date, datetime
from enum import Enum


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
    client_name: str
    summary: str
    detail: str | None = None
    theme: Theme
    status: Status = Status.Open


class FeedbackUpdate(BaseModel):
    client_name: str | None = None
    summary: str | None = None
    detail: str | None = None
    theme: Theme | None = None
    status: Status | None = None


class FeedbackRead(BaseModel):
    id: int
    client_name: str
    summary: str
    detail: str | None
    theme: Theme
    status: Status
    date_logged: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
