from pydantic import BaseModel, EmailStr, Field

from app.models.models import MailboxStatus


class MailboxCreate(BaseModel):
    label: str
    from_name: str
    from_email: EmailStr
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str = Field(min_length=1)
    daily_limit: int = 50


class MailboxUpdate(BaseModel):
    label: str | None = None
    daily_limit: int | None = None
    status: MailboxStatus | None = None
    smtp_password: str | None = None


class MailboxRead(BaseModel):
    id: str
    label: str
    from_name: str
    from_email: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    daily_limit: int
    warmup_stage: int
    status: MailboxStatus

    model_config = {"from_attributes": True}
