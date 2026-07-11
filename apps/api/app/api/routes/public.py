from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse

from app.core.db import DbSession
from app.models.models import ClickEvent, OpenEvent, Subscriber, SubscriberStatus, TrackedLink, Unsubscribe
from app.services.unsubscribe import verify_unsubscribe_token

router = APIRouter(tags=["public"])

# 1x1 transparent GIF, served as the open-tracking pixel.
TRANSPARENT_GIF = bytes.fromhex(
    "47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b"
)


@router.get("/r/{link_id}")
async def track_click(link_id: str, db: DbSession) -> RedirectResponse:
    link = await db.get(TrackedLink, link_id)
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown link")

    db.add(ClickEvent(tracked_link_id=link.id))
    await db.commit()
    return RedirectResponse(link.original_url, status_code=status.HTTP_302_FOUND)


@router.get("/o/{send_event_id}.gif")
async def track_open(send_event_id: str, db: DbSession) -> Response:
    db.add(OpenEvent(send_event_id=send_event_id))
    await db.commit()
    return Response(content=TRANSPARENT_GIF, media_type="image/gif")


async def _do_unsubscribe(sid: str, token: str, db: DbSession) -> Subscriber:
    if not verify_unsubscribe_token(sid, token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired unsubscribe link")

    subscriber = await db.get(Subscriber, sid)
    if subscriber is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscriber not found")

    subscriber.status = SubscriberStatus.UNSUBSCRIBED
    db.add(Unsubscribe(email=subscriber.email, reason="link"))
    await db.commit()
    return subscriber


@router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe_page(sid: str, token: str, db: DbSession) -> str:
    subscriber = await _do_unsubscribe(sid, token, db)
    return f"""<html><body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">
      <h2>You've been unsubscribed</h2>
      <p>{subscriber.email} will no longer receive emails from Nirop AI.</p>
    </body></html>"""


@router.post("/unsubscribe")
async def unsubscribe_one_click(sid: str, token: str, db: DbSession) -> dict[str, bool]:
    # RFC 8058 one-click endpoint — mail clients POST here silently, no HTML response needed.
    await _do_unsubscribe(sid, token, db)
    return {"ok": True}
