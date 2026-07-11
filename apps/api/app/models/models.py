from datetime import date, datetime
from enum import Enum

from sqlalchemy import ARRAY, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.core.ids import generate_id


class SubscriberStatus(str, Enum):
    ACTIVE = "active"
    UNSUBSCRIBED = "unsubscribed"
    BOUNCED = "bounced"
    SUPPRESSED = "suppressed"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    CONTENT = "content"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class MailboxStatus(str, Enum):
    WARMING = "warming"
    ACTIVE = "active"
    COOLDOWN = "cooldown"
    DISABLED = "disabled"


class SendStatus(str, Enum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    RETRYING = "retrying"


class BounceType(str, Enum):
    HARD = "hard"
    SOFT = "soft"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]
    role: Mapped[str] = mapped_column(default="editor")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class Subscriber(Base):
    __tablename__ = "subscribers"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    first_name: Mapped[str | None]
    last_name: Mapped[str | None]
    source_site: Mapped[str]
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    status: Mapped[SubscriberStatus] = mapped_column(default=SubscriberStatus.ACTIVE, index=True)
    source_row_hash: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    name: Mapped[str]
    site: Mapped[str]
    status: Mapped[CampaignStatus] = mapped_column(default=CampaignStatus.DRAFT)
    batch_size: Mapped[int] = mapped_column(default=100)
    scheduled_at: Mapped[datetime | None]
    created_by: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    variants: Mapped[list["CampaignVariant"]] = relationship(back_populates="campaign")
    batches: Mapped[list["SendBatch"]] = relationship(back_populates="campaign")


class CampaignVariant(Base):
    __tablename__ = "campaign_variants"
    __table_args__ = (UniqueConstraint("campaign_id", "variant_index"),)

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"))
    variant_index: Mapped[int]
    subject: Mapped[str]
    html_body: Mapped[str]
    text_body: Mapped[str]
    approved: Mapped[bool] = mapped_column(default=False)

    campaign: Mapped["Campaign"] = relationship(back_populates="variants")


class Mailbox(Base):
    __tablename__ = "mailboxes"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    label: Mapped[str]
    from_name: Mapped[str]
    from_email: Mapped[str]
    smtp_host: Mapped[str]
    smtp_port: Mapped[int]
    smtp_user: Mapped[str]
    smtp_pass_enc: Mapped[str]
    daily_limit: Mapped[int] = mapped_column(default=50)
    warmup_stage: Mapped[int] = mapped_column(default=0)
    status: Mapped[MailboxStatus] = mapped_column(default=MailboxStatus.WARMING)


class MailboxUsageDaily(Base):
    __tablename__ = "mailbox_usage_daily"
    __table_args__ = (UniqueConstraint("mailbox_id", "date"),)

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    mailbox_id: Mapped[str] = mapped_column(ForeignKey("mailboxes.id"))
    date: Mapped[date]
    used_count: Mapped[int] = mapped_column(default=0)


class SendBatch(Base):
    __tablename__ = "send_batches"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"))
    variant_id: Mapped[str] = mapped_column(ForeignKey("campaign_variants.id"))
    status: Mapped[str] = mapped_column(default="pending")
    scheduled_at: Mapped[datetime]

    campaign: Mapped["Campaign"] = relationship(back_populates="batches")
    events: Mapped[list["SendEvent"]] = relationship(back_populates="batch")


class SendEvent(Base):
    __tablename__ = "send_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    batch_id: Mapped[str] = mapped_column(ForeignKey("send_batches.id"))
    subscriber_id: Mapped[str] = mapped_column(ForeignKey("subscribers.id"))
    mailbox_id: Mapped[str | None] = mapped_column(ForeignKey("mailboxes.id"), default=None)
    status: Mapped[SendStatus] = mapped_column(default=SendStatus.QUEUED, index=True)
    error: Mapped[str | None]
    provider_message_id: Mapped[str | None]
    idempotency_key: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    batch: Mapped["SendBatch"] = relationship(back_populates="events")


class Unsubscribe(Base):
    __tablename__ = "unsubscribes"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    email: Mapped[str]
    reason: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class BounceEvent(Base):
    __tablename__ = "bounce_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    email: Mapped[str]
    type: Mapped[BounceType]
    reason: Mapped[str | None]
    raw_payload: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class TrackedLink(Base):
    __tablename__ = "tracked_links"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    send_event_id: Mapped[str] = mapped_column(ForeignKey("send_events.id"))
    original_url: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class ClickEvent(Base):
    __tablename__ = "click_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    tracked_link_id: Mapped[str] = mapped_column(ForeignKey("tracked_links.id"))
    clicked_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class OpenEvent(Base):
    __tablename__ = "open_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_id)
    send_event_id: Mapped[str] = mapped_column(ForeignKey("send_events.id"))
    opened_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
