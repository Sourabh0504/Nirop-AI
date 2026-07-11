from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser
from app.core.db import DbSession
from app.core.security import encrypt_secret
from app.models.models import Mailbox
from app.schemas.mailbox import MailboxCreate, MailboxRead, MailboxUpdate

router = APIRouter(prefix="/api/mailboxes", tags=["mailboxes"])


@router.get("", response_model=list[MailboxRead])
async def list_mailboxes(db: DbSession, _current_user: CurrentUser) -> list[Mailbox]:
    result = await db.scalars(select(Mailbox).order_by(Mailbox.label))
    return list(result.all())


@router.post("", response_model=MailboxRead, status_code=status.HTTP_201_CREATED)
async def create_mailbox(payload: MailboxCreate, db: DbSession, _current_user: CurrentUser) -> Mailbox:
    mailbox = Mailbox(
        label=payload.label,
        from_name=payload.from_name,
        from_email=payload.from_email,
        smtp_host=payload.smtp_host,
        smtp_port=payload.smtp_port,
        smtp_user=payload.smtp_user,
        smtp_pass_enc=encrypt_secret(payload.smtp_password),
        daily_limit=payload.daily_limit,
    )
    db.add(mailbox)
    await db.commit()
    await db.refresh(mailbox)
    return mailbox


@router.patch("/{mailbox_id}", response_model=MailboxRead)
async def update_mailbox(
    mailbox_id: str, payload: MailboxUpdate, db: DbSession, _current_user: CurrentUser
) -> Mailbox:
    mailbox = await db.get(Mailbox, mailbox_id)
    if mailbox is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mailbox not found")

    updates = payload.model_dump(exclude_unset=True, exclude={"smtp_password"})
    for field, value in updates.items():
        setattr(mailbox, field, value)
    if payload.smtp_password:
        mailbox.smtp_pass_enc = encrypt_secret(payload.smtp_password)

    await db.commit()
    await db.refresh(mailbox)
    return mailbox


@router.delete("/{mailbox_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mailbox(mailbox_id: str, db: DbSession, _current_user: CurrentUser) -> None:
    mailbox = await db.get(Mailbox, mailbox_id)
    if mailbox is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mailbox not found")
    await db.delete(mailbox)
    await db.commit()
