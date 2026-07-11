from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import (
    Campaign,
    CampaignStatus,
    SendBatch,
    SendEvent,
    SendStatus,
    Subscriber,
    SubscriberStatus,
)

settings = get_settings()


async def check_and_maybe_pause(
    db: AsyncSession,
    campaign_id: str,
    min_sample: int | None = None,
    failure_rate_threshold: float | None = None,
    unsub_rate_threshold: float | None = None,
) -> bool:
    """Pauses the campaign if its failure or unsubscribe rate has crossed a threshold.

    Returns True if the campaign is paused (whether just now or already). Thresholds
    default to settings but accept overrides so this is testable without env mutation.
    """
    min_sample = settings.circuit_breaker_min_sample if min_sample is None else min_sample
    failure_rate_threshold = (
        settings.circuit_breaker_failure_rate if failure_rate_threshold is None else failure_rate_threshold
    )
    unsub_rate_threshold = (
        settings.circuit_breaker_unsub_rate if unsub_rate_threshold is None else unsub_rate_threshold
    )

    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        return False
    if campaign.status == CampaignStatus.PAUSED:
        return True
    if campaign.status != CampaignStatus.ACTIVE:
        return False

    sent_count = await db.scalar(
        select(func.count())
        .select_from(SendEvent)
        .join(SendBatch, SendEvent.batch_id == SendBatch.id)
        .where(SendBatch.campaign_id == campaign_id, SendEvent.status == SendStatus.SENT)
    ) or 0
    failed_count = await db.scalar(
        select(func.count())
        .select_from(SendEvent)
        .join(SendBatch, SendEvent.batch_id == SendBatch.id)
        .where(SendBatch.campaign_id == campaign_id, SendEvent.status == SendStatus.FAILED)
    ) or 0

    attempted = sent_count + failed_count
    if attempted < min_sample:
        return False

    failure_rate = failed_count / attempted

    unsub_count = await db.scalar(
        select(func.count(func.distinct(Subscriber.id)))
        .select_from(SendEvent)
        .join(SendBatch, SendEvent.batch_id == SendBatch.id)
        .join(Subscriber, SendEvent.subscriber_id == Subscriber.id)
        .where(
            SendBatch.campaign_id == campaign_id,
            SendEvent.status == SendStatus.SENT,
            Subscriber.status == SubscriberStatus.UNSUBSCRIBED,
        )
    ) or 0
    unsub_rate = unsub_count / sent_count if sent_count else 0.0

    reason = None
    if failure_rate > failure_rate_threshold:
        reason = f"Failure rate {failure_rate:.0%} exceeded {failure_rate_threshold:.0%} threshold"
    elif unsub_rate > unsub_rate_threshold:
        reason = f"Unsubscribe rate {unsub_rate:.0%} exceeded {unsub_rate_threshold:.0%} threshold"

    if reason is None:
        return False

    campaign.status = CampaignStatus.PAUSED
    campaign.pause_reason = reason
    await db.commit()
    return True
