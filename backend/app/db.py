from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

_is_sqlite = settings.database_url.startswith("sqlite")

_engine_kwargs: dict = {
    "echo": (settings.app_env == "development"),
}

if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs.update(
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
    )
    if settings.database_ssl_require:
        # ``require`` matches PostgreSQL's sslmode=require: traffic is encrypted
        # without assuming that the platform CA exists in the container image.
        _engine_kwargs["connect_args"] = {"ssl": "require"}

engine = create_async_engine(settings.database_url, **_engine_kwargs)


# Habilitar WAL y foreign keys en SQLite
if _is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
