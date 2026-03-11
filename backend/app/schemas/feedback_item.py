import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional


class FeedbackTheme(str, Enum):
    ux = "ux"
    performance = "performance"
    support = "support"
    pricing = "pricing"
    communication = "communication"


class FeedbackStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    actioned = "actioned"


class FeedbackItemCreate(BaseModel):
    client_name: str                  # required, min length enforced by validator
    summary: str                      # required, min length enforced by validator
    detail: Optional[str] = None      # optional
    theme: FeedbackTheme              # required

    @field_validator("client_name", "summary")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v


class FeedbackItemUpdate(BaseModel):
    client_name: Optional[str] = None
    summary: Optional[str] = None
    detail: Optional[str] = None
    theme: Optional[FeedbackTheme] = None
    status: Optional[FeedbackStatus] = None

    @model_validator(mode="after")
    def check_non_nullable_fields(self) -> "FeedbackItemUpdate":
        # PATCH semantics: field not sent = fine (excluded by exclude_unset).
        # Field sent as null = 422 for client_name and summary (they cannot be unset).
        if "client_name" in self.model_fields_set and self.client_name is None:
            raise ValueError("client_name cannot be set to null")
        if "summary" in self.model_fields_set and self.summary is None:
            raise ValueError("summary cannot be set to null")
        return self


class FeedbackItemRead(BaseModel):
    id: uuid.UUID
    client_name: str
    summary: str
    detail: Optional[str]
    theme: FeedbackTheme
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
