from datetime import datetime

from pydantic import BaseModel

from app.models.models import SendStatus


class SendEventRead(BaseModel):
    id: str
    status: SendStatus
    error: str | None
    created_at: datetime
    campaign_name: str
    subscriber_email: str
    mailbox_label: str | None

    model_config = {"from_attributes": True}


class CampaignStats(BaseModel):
    queued: int
    sent: int
    failed: int
    retrying: int
