from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser
from app.core.db import DbSession
from app.models.models import (
    Campaign,
    CampaignStatus,
    CampaignVariant,
    SendBatch,
    SendEvent,
    SendStatus,
    Subscriber,
    SubscriberStatus,
)
from app.schemas.campaign import (
    CampaignCreate,
    CampaignDetail,
    CampaignRead,
    CampaignUpdate,
    CampaignVariantCreate,
    CampaignVariantRead,
    CampaignVariantUpdate,
    VariantGenerateRequest,
    VariantGenerateResponse,
)
from app.schemas.logs import CampaignStats
from app.services.ai_variants import VariantGenerationError, generate_variants
from app.workers.tasks import dispatch_campaign

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


async def _get_campaign_or_404(db: DbSession, campaign_id: str) -> Campaign:
    campaign = await db.scalar(
        select(Campaign).where(Campaign.id == campaign_id).options(selectinload(Campaign.variants))
    )
    if campaign is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return campaign


@router.get("", response_model=list[CampaignRead])
async def list_campaigns(db: DbSession, _current_user: CurrentUser) -> list[Campaign]:
    result = await db.scalars(select(Campaign).order_by(Campaign.created_at.desc()))
    return list(result.all())


@router.post("", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignCreate, db: DbSession, current_user: CurrentUser) -> Campaign:
    campaign = Campaign(name=payload.name, site=payload.site, created_by=current_user.id)
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignDetail)
async def get_campaign(campaign_id: str, db: DbSession, _current_user: CurrentUser) -> Campaign:
    return await _get_campaign_or_404(db, campaign_id)


@router.get("/{campaign_id}/stats", response_model=CampaignStats)
async def get_campaign_stats(campaign_id: str, db: DbSession, _current_user: CurrentUser) -> CampaignStats:
    rows = await db.execute(
        select(SendEvent.status, func.count())
        .join(SendBatch, SendEvent.batch_id == SendBatch.id)
        .where(SendBatch.campaign_id == campaign_id)
        .group_by(SendEvent.status)
    )
    counts = {status_value: count for status_value, count in rows.all()}
    return CampaignStats(
        queued=counts.get(SendStatus.QUEUED, 0),
        sent=counts.get(SendStatus.SENT, 0),
        failed=counts.get(SendStatus.FAILED, 0),
        retrying=counts.get(SendStatus.RETRYING, 0),
    )


@router.patch("/{campaign_id}", response_model=CampaignRead)
async def update_campaign(
    campaign_id: str, payload: CampaignUpdate, db: DbSession, _current_user: CurrentUser
) -> Campaign:
    campaign = await _get_campaign_or_404(db, campaign_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(campaign_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    campaign = await _get_campaign_or_404(db, campaign_id)
    await db.delete(campaign)
    await db.commit()


@router.post("/{campaign_id}/send", response_model=CampaignRead)
async def send_campaign(campaign_id: str, db: DbSession, _current_user: CurrentUser) -> Campaign:
    campaign = await _get_campaign_or_404(db, campaign_id)

    if campaign.status in (CampaignStatus.SCHEDULED, CampaignStatus.ACTIVE, CampaignStatus.COMPLETED):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Campaign is already {campaign.status.value} — refusing to re-send"
        )

    if not any(variant.approved for variant in campaign.variants):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Approve at least one variant before sending")

    subscriber_count = await db.scalar(
        select(func.count())
        .select_from(Subscriber)
        .where(Subscriber.source_site == campaign.site, Subscriber.status == SubscriberStatus.ACTIVE)
    )
    if not subscriber_count:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No active subscribers for this site")

    campaign.status = CampaignStatus.SCHEDULED
    await db.commit()
    await db.refresh(campaign)

    dispatch_campaign.delay(campaign.id)
    return campaign


@router.post(
    "/{campaign_id}/variants", response_model=CampaignVariantRead, status_code=status.HTTP_201_CREATED
)
async def create_variant(
    campaign_id: str, payload: CampaignVariantCreate, db: DbSession, _current_user: CurrentUser
) -> CampaignVariant:
    campaign = await _get_campaign_or_404(db, campaign_id)
    next_index = len(campaign.variants)
    variant = CampaignVariant(
        campaign_id=campaign.id,
        variant_index=next_index,
        subject=payload.subject,
        html_body=payload.html_body,
        text_body=payload.text_body,
    )
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    return variant


@router.post("/{campaign_id}/variants/generate", response_model=VariantGenerateResponse)
async def generate_campaign_variants(
    campaign_id: str, payload: VariantGenerateRequest, db: DbSession, _current_user: CurrentUser
) -> VariantGenerateResponse:
    campaign = await _get_campaign_or_404(db, campaign_id)

    try:
        generated = generate_variants(
            payload.base_subject, payload.base_html_body, payload.base_text_body, payload.count
        )
    except VariantGenerationError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    next_index = len(campaign.variants)
    flagged_count = 0
    created: list[CampaignVariant] = []
    for offset, item in enumerate(generated):
        if item["spam_flags"]:
            flagged_count += 1
        variant = CampaignVariant(
            campaign_id=campaign.id,
            variant_index=next_index + offset,
            subject=item["subject"],
            html_body=item["html_body"],
            text_body=item["text_body"],
        )
        db.add(variant)
        created.append(variant)

    await db.commit()
    for variant in created:
        await db.refresh(variant)

    return VariantGenerateResponse(variants=created, flagged_count=flagged_count)


@router.patch("/{campaign_id}/variants/{variant_id}", response_model=CampaignVariantRead)
async def update_variant(
    campaign_id: str,
    variant_id: str,
    payload: CampaignVariantUpdate,
    db: DbSession,
    _current_user: CurrentUser,
) -> CampaignVariant:
    variant = await db.scalar(
        select(CampaignVariant).where(
            CampaignVariant.id == variant_id, CampaignVariant.campaign_id == campaign_id
        )
    )
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Variant not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)
    await db.commit()
    await db.refresh(variant)
    return variant


@router.delete("/{campaign_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    campaign_id: str, variant_id: str, db: DbSession, _current_user: CurrentUser
) -> None:
    variant = await db.scalar(
        select(CampaignVariant).where(
            CampaignVariant.id == variant_id, CampaignVariant.campaign_id == campaign_id
        )
    )
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Variant not found")
    await db.delete(variant)
    await db.commit()
