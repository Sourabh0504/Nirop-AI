from datetime import datetime

from pydantic import BaseModel, computed_field

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
    opened: int
    clicked: int

    @computed_field
    @property
    def open_rate(self) -> float:
        return round(self.opened / self.sent, 4) if self.sent else 0.0

    @computed_field
    @property
    def click_rate(self) -> float:
        return round(self.clicked / self.sent, 4) if self.sent else 0.0
