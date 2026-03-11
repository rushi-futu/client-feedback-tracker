from enum import Enum
from pydantic import BaseModel
from datetime import datetime


class Theme(str, Enum):
    ux = "UX"
    performance = "Performance"
    support = "Support"
    pricing = "Pricing"
    communication = "Communication"


class FeedbackStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    actioned = "actioned"


class FeedbackCreate(BaseModel):
    client_name: str
    summary: str
    detail: str | None = None
    theme: Theme
    status: FeedbackStatus


class FeedbackUpdate(BaseModel):
    client_name: str | None = None
    summary: str | None = None
    detail: str | None = None
    theme: Theme | None = None
    status: FeedbackStatus | None = None


class FeedbackRead(BaseModel):
    id: int
    client_name: str
    summary: str
    detail: str | None
    theme: Theme
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
