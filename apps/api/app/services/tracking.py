import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import TrackedLink

settings = get_settings()

HREF_PATTERN = re.compile(r'href="([^"]+)"')


async def apply_click_tracking(db: AsyncSession, send_event_id: str, html_body: str) -> str:
    """Rewrites every <a href> in html_body to a /r/{tracked_link_id} redirect that logs a ClickEvent."""
    urls = set(HREF_PATTERN.findall(html_body))
    url_to_tracked: dict[str, str] = {}

    for url in urls:
        if url.startswith("mailto:") or url.startswith("#"):
            continue
        link = TrackedLink(send_event_id=send_event_id, original_url=url)
        db.add(link)
        await db.flush()
        url_to_tracked[url] = f"{settings.public_url}/r/{link.id}"

    def _replace(match: re.Match) -> str:
        original = match.group(1)
        tracked = url_to_tracked.get(original)
        return f'href="{tracked}"' if tracked else match.group(0)

    return HREF_PATTERN.sub(_replace, html_body)


def open_pixel_tag(send_event_id: str) -> str:
    return (
        f'<img src="{settings.public_url}/o/{send_event_id}.gif" '
        'width="1" height="1" alt="" style="display:none" />'
    )
