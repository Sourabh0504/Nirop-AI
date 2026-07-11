import asyncio
from datetime import datetime

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.db import celery_session_factory
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
from app.services.circuit_breaker import check_and_maybe_pause
from app.services.mailbox_rotation import bump_usage, pick_mailbox
from app.services.mailer import send_email_smtp
from app.services.rate_limiter import DailyLimitReachedError, RateLimitedError, check_and_increment
from app.services.tracking import apply_click_tracking, open_pixel_tag
from app.services.unsubscribe import build_unsubscribe_url


@celery_app.task(name="dispatch_campaign")
def dispatch_campaign(campaign_id: str) -> dict:
    return asyncio.run(_dispatch_campaign(campaign_id))


async def _dispatch_campaign(campaign_id: str) -> dict:
    async with celery_session_factory() as db:
        campaign = await db.get(Campaign, campaign_id)
        if campaign is None:
            return {"error": "campaign not found"}

        variants_result = await db.scalars(
            select(CampaignVariant)
            .where(CampaignVariant.campaign_id == campaign_id, CampaignVariant.approved.is_(True))
            .order_by(CampaignVariant.variant_index)
        )
        variants = list(variants_result.all())
        if not variants:
            return {"error": "no approved variants"}

        subscribers_result = await db.scalars(
            select(Subscriber).where(
                Subscriber.source_site == campaign.site,
                Subscriber.status == SubscriberStatus.ACTIVE,
            )
        )
        subscribers = list(subscribers_result.all())
        if not subscribers:
            return {"error": "no active subscribers for this site"}

        batch_size = campaign.batch_size
        chunks = [subscribers[i : i + batch_size] for i in range(0, len(subscribers), batch_size)]

        event_ids: list[str] = []
        for chunk_index, chunk in enumerate(chunks):
            variant = variants[chunk_index % len(variants)]
            batch = SendBatch(
                campaign_id=campaign.id,
                variant_id=variant.id,
                status="processing",
                scheduled_at=datetime.utcnow(),
            )
            db.add(batch)
            await db.flush()

            for subscriber in chunk:
                event = SendEvent(
                    batch_id=batch.id,
                    subscriber_id=subscriber.id,
                    idempotency_key=f"{campaign.id}:{batch.id}:{subscriber.id}",
                )
                db.add(event)
                await db.flush()
                event_ids.append(event.id)

        campaign.status = CampaignStatus.ACTIVE
        await db.commit()

    for event_id in event_ids:
        send_email_task.delay(event_id)

    return {"batches": len(chunks), "events": len(event_ids)}


@celery_app.task(name="send_email", bind=True, max_retries=8)
def send_email_task(self, send_event_id: str) -> dict:
    try:
        return asyncio.run(_send_email(send_event_id))
    except RateLimitedError:
        raise self.retry(countdown=15)
    except DailyLimitReachedError:
        raise self.retry(countdown=3600)


async def _send_email(send_event_id: str) -> dict:
    async with celery_session_factory() as db:
        event = await db.get(SendEvent, send_event_id)
        if event is None:
            return {"error": "event not found"}
        if event.status == SendStatus.SENT:
            return {"status": "already sent"}

        batch = await db.get(SendBatch, event.batch_id)
        variant = await db.get(CampaignVariant, batch.variant_id)
        subscriber = await db.get(Subscriber, event.subscriber_id)

        if await check_and_maybe_pause(db, batch.campaign_id):
            # Paused (by this check or a prior one) — leave the event QUEUED so
            # /campaigns/{id}/resume can pick it back up, don't count it as a failure.
            return {"status": "skipped - campaign paused"}

        if subscriber.status != SubscriberStatus.ACTIVE:
            # Caught between dispatch and send (e.g. they unsubscribed via a link in an
            # earlier campaign while this one was queued/retrying).
            event.status = SendStatus.FAILED
            event.error = f"Subscriber no longer active ({subscriber.status.value})"
            await db.commit()
            return {"error": "subscriber not active"}

        mailbox = await pick_mailbox(db)
        if mailbox is None:
            event.status = SendStatus.FAILED
            event.error = "No eligible mailbox available"
            await db.commit()
            await check_and_maybe_pause(db, batch.campaign_id)
            return {"error": "no eligible mailbox"}

        # Raises RateLimitedError/DailyLimitReachedError to the sync task wrapper,
        # which converts it into a Celery retry — must happen before the SMTP call.
        check_and_increment(mailbox.id, mailbox.daily_limit)

        unsubscribe_url = build_unsubscribe_url(subscriber.id)
        tracked_html = await apply_click_tracking(db, event.id, variant.html_body)
        final_html = (
            f"{tracked_html}"
            f'<p style="font-size:12px;color:#888;margin-top:24px;">'
            f'<a href="{unsubscribe_url}">Unsubscribe</a></p>'
            f"{open_pixel_tag(event.id)}"
        )
        final_text = f"{variant.text_body}\n\nUnsubscribe: {unsubscribe_url}"

        try:
            send_email_smtp(
                mailbox, subscriber.email, variant.subject, final_html, final_text, unsubscribe_url
            )
        except Exception as exc:  # noqa: BLE001 - any SMTP failure marks this event failed
            event.status = SendStatus.FAILED
            event.error = str(exc)
            event.mailbox_id = mailbox.id
            await db.commit()
            await check_and_maybe_pause(db, batch.campaign_id)
            return {"error": str(exc)}

        event.status = SendStatus.SENT
        event.mailbox_id = mailbox.id
        await bump_usage(db, mailbox.id)
        await db.commit()
        await check_and_maybe_pause(db, batch.campaign_id)
        return {"status": "sent", "mailbox": mailbox.id}
