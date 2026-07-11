from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Nirop AI"
    environment: str = "development"

    database_url: str = "postgresql+asyncpg://mailai:mailai@localhost:5432/mailai"
    redis_url: str = "redis://localhost:6379/0"

    # Base URL used to build absolute tracking/unsubscribe links inside outgoing emails —
    # these are followed from the recipient's mail client, not the frontend dev server.
    public_url: str = "http://localhost:8010"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    smtp_encryption_key: str = "change-me-32-bytes-min-for-aesgcm"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    google_service_account_json: str | None = None

    # Deliverability circuit breaker: a campaign auto-pauses once it has attempted at
    # least `min_sample` sends AND either rate below is exceeded.
    circuit_breaker_min_sample: int = 20
    circuit_breaker_failure_rate: float = 0.15
    circuit_breaker_unsub_rate: float = 0.02


@lru_cache
def get_settings() -> Settings:
    return Settings()
