from datetime import datetime

from pydantic import BaseModel, Field

from app.models.models import CampaignStatus


class CampaignCreate(BaseModel):
    name: str
    site: str


class CampaignUpdate(BaseModel):
    name: str | None = None
    site: str | None = None
    status: CampaignStatus | None = None
    batch_size: int | None = None


class CampaignVariantCreate(BaseModel):
    subject: str
    html_body: str
    text_body: str


class CampaignVariantUpdate(BaseModel):
    subject: str | None = None
    html_body: str | None = None
    text_body: str | None = None
    approved: bool | None = None


class CampaignVariantRead(BaseModel):
    id: str
    campaign_id: str
    variant_index: int
    subject: str
    html_body: str
    text_body: str
    approved: bool

    model_config = {"from_attributes": True}


class CampaignRead(BaseModel):
    id: str
    name: str
    site: str
    status: CampaignStatus
    batch_size: int
    scheduled_at: datetime | None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CampaignDetail(CampaignRead):
    variants: list[CampaignVariantRead]


class VariantGenerateRequest(BaseModel):
    base_subject: str
    base_html_body: str
    base_text_body: str
    count: int = Field(default=10, ge=1, le=12)


class VariantGenerateResponse(BaseModel):
    variants: list[CampaignVariantRead]
    flagged_count: int
