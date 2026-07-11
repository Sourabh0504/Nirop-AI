from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Mailbox, MailboxStatus, MailboxUsageDaily


async def pick_mailbox(db: AsyncSession) -> Mailbox | None:
    mailboxes_result = await db.scalars(
        select(Mailbox).where(Mailbox.status.in_([MailboxStatus.WARMING, MailboxStatus.ACTIVE]))
    )
    mailboxes = list(mailboxes_result.all())
    if not mailboxes:
        return None

    today = date.today()
    usage_result = await db.scalars(select(MailboxUsageDaily).where(MailboxUsageDaily.date == today))
    used_by_mailbox = {u.mailbox_id: u.used_count for u in usage_result.all()}

    eligible: list[tuple[Mailbox, float]] = []
    for mailbox in mailboxes:
        used = used_by_mailbox.get(mailbox.id, 0)
        if used < mailbox.daily_limit:
            eligible.append((mailbox, used / mailbox.daily_limit))

    if not eligible:
        return None

    eligible.sort(key=lambda pair: pair[1])
    return eligible[0][0]


async def bump_usage(db: AsyncSession, mailbox_id: str) -> None:
    today = date.today()
    usage = await db.scalar(
        select(MailboxUsageDaily).where(
            MailboxUsageDaily.mailbox_id == mailbox_id, MailboxUsageDaily.date == today
        )
    )
    if usage is None:
        db.add(MailboxUsageDaily(mailbox_id=mailbox_id, date=today, used_count=1))
    else:
        usage.used_count += 1
