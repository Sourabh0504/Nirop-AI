from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser
from app.core.db import DbSession
from app.models.models import Campaign, Mailbox, SendBatch, SendEvent, Subscriber
from app.schemas.logs import SendEventRead

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=list[SendEventRead])
async def list_send_events(db: DbSession, _current_user: CurrentUser, limit: int = 100) -> list[SendEventRead]:
    query = (
        select(
            SendEvent.id,
            SendEvent.status,
            SendEvent.error,
            SendEvent.created_at,
            Campaign.name.label("campaign_name"),
            Subscriber.email.label("subscriber_email"),
            Mailbox.label.label("mailbox_label"),
        )
        .join(SendBatch, SendEvent.batch_id == SendBatch.id)
        .join(Campaign, SendBatch.campaign_id == Campaign.id)
        .join(Subscriber, SendEvent.subscriber_id == Subscriber.id)
        .outerjoin(Mailbox, SendEvent.mailbox_id == Mailbox.id)
        .order_by(SendEvent.created_at.desc())
        .limit(limit)
    )
    rows = await db.execute(query)
    return [SendEventRead.model_validate(row, from_attributes=True) for row in rows.all()]
