from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser
from app.core.db import DbSession
from app.models.models import Subscriber, SubscriberStatus
from app.schemas.subscriber import DedupeReport, SubscriberCreate, SubscriberRead, SubscriberUpdate

router = APIRouter(prefix="/api/subscribers", tags=["subscribers"])


@router.get("", response_model=list[SubscriberRead])
async def list_subscribers(
    db: DbSession,
    _current_user: CurrentUser,
    status_filter: SubscriberStatus | None = None,
    site: str | None = None,
) -> list[Subscriber]:
    query = select(Subscriber).order_by(Subscriber.created_at.desc())
    if status_filter is not None:
        query = query.where(Subscriber.status == status_filter)
    if site is not None:
        query = query.where(Subscriber.source_site == site)
    result = await db.scalars(query)
    return list(result.all())


@router.get("/dedupe-report", response_model=DedupeReport)
async def dedupe_report(db: DbSession, _current_user: CurrentUser) -> DedupeReport:
    rows = await db.execute(
        select(Subscriber.status, func.count()).group_by(Subscriber.status)
    )
    counts = {status_value: count for status_value, count in rows.all()}
    return DedupeReport(
        total=sum(counts.values()),
        active=counts.get(SubscriberStatus.ACTIVE, 0),
        unsubscribed=counts.get(SubscriberStatus.UNSUBSCRIBED, 0),
        bounced=counts.get(SubscriberStatus.BOUNCED, 0),
        suppressed=counts.get(SubscriberStatus.SUPPRESSED, 0),
    )


@router.post("", response_model=SubscriberRead, status_code=status.HTTP_201_CREATED)
async def create_subscriber(
    payload: SubscriberCreate, db: DbSession, _current_user: CurrentUser
) -> Subscriber:
    email = payload.email.lower()
    existing = await db.scalar(select(Subscriber).where(Subscriber.email == email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A subscriber with this email already exists")

    subscriber = Subscriber(
        email=email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        source_site=payload.source_site,
        tags=payload.tags,
    )
    db.add(subscriber)
    await db.commit()
    await db.refresh(subscriber)
    return subscriber


@router.patch("/{subscriber_id}", response_model=SubscriberRead)
async def update_subscriber(
    subscriber_id: str, payload: SubscriberUpdate, db: DbSession, _current_user: CurrentUser
) -> Subscriber:
    subscriber = await db.get(Subscriber, subscriber_id)
    if subscriber is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscriber not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subscriber, field, value)
    await db.commit()
    await db.refresh(subscriber)
    return subscriber


@router.delete("/{subscriber_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscriber(subscriber_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    subscriber = await db.get(Subscriber, subscriber_id)
    if subscriber is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscriber not found")
    await db.delete(subscriber)
    await db.commit()
