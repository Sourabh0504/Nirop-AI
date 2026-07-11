import hashlib
import hmac

from app.core.config import get_settings

settings = get_settings()


def generate_unsubscribe_token(subscriber_id: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), subscriber_id.encode(), hashlib.sha256).hexdigest()[:32]


def verify_unsubscribe_token(subscriber_id: str, token: str) -> bool:
    return hmac.compare_digest(generate_unsubscribe_token(subscriber_id), token)


def build_unsubscribe_url(subscriber_id: str) -> str:
    token = generate_unsubscribe_token(subscriber_id)
    return f"{settings.public_url}/unsubscribe?sid={subscriber_id}&token={token}"
