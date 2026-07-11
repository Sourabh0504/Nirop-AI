from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)

# Celery (solo pool on Windows) runs each task in its own asyncio.run() call, i.e. a
# fresh event loop per task. A pooled engine's connections get bound to whichever loop
# created them and break on the next task's loop, so Celery tasks get a NullPool engine
# instead — every task opens and closes its own connection.
celery_engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
celery_session_factory = async_sessionmaker(celery_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]
