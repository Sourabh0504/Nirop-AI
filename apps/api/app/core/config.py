from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Mail-AI"
    environment: str = "development"

    database_url: str = "postgresql+asyncpg://mailai:mailai@localhost:5432/mailai"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    smtp_encryption_key: str = "change-me-32-bytes-min-for-aesgcm"

    anthropic_api_key: str | None = None

    google_service_account_json: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
