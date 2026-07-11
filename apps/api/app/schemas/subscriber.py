from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.models import SubscriberStatus


class SubscriberCreate(BaseModel):
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    tags: list[str] = []


class SubscriberUpdate(BaseModel):
    status: SubscriberStatus | None = None
    tags: list[str] | None = None


class SubscriberRead(BaseModel):
    id: str
    email: str
    first_name: str | None
    last_name: str | None
    tags: list[str]
    status: SubscriberStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class DedupeReport(BaseModel):
    total: int
    active: int
    unsubscribed: int
    bounced: int
    suppressed: int
