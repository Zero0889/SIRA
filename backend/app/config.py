from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env vive en la raíz del proyecto (un nivel arriba de backend/)
_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", str(_ROOT_ENV)),
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_env: str = "development"
    app_secret_key: str = "change-me"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./sira.db"
    database_ssl_require: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 5

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_postgres_driver(cls, value: str) -> str:
        """Accept provider URLs and select SQLAlchemy's asyncpg driver."""
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # Notificaciones SMS. Permanecen desactivadas hasta configurar SMSGate.
    sms_provider: str = "disabled"
    smsgate_mode: str = "local"
    smsgate_base_url: str = ""
    smsgate_username: str = ""
    smsgate_password: str = ""
    smsgate_sim_number: int | None = None
    sms_to: str = ""
    sms_cooldown_minutes: int = 60
    sms_notify_irrigation: bool = True
    sms_notify_frost: bool = True
    sms_notify_tank_low: bool = True

    ingest_api_key: str = "dev-ingest-token"
    allow_legacy_device_key: bool = True
    session_days: int = 30
    allow_registration: bool = True
    bootstrap_admin_email: str = "admin@sira.local"
    bootstrap_admin_password: str = "SiraDemo2026!"
    bootstrap_admin_name: str = "Administrador SIRA"

    open_meteo_base_url: str = "https://api.open-meteo.com/v1"
    nasa_power_base_url: str = "https://power.larc.nasa.gov/api"
    senamhi_base_url: str = "https://wis.senamhi.gob.pe/oapi"
    senamhi_verify_ssl: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def validate_runtime(self) -> None:
        if self.app_env != "production":
            return
        unsafe = []
        if self.app_secret_key in {"change-me", "cambia-esto-en-produccion"}:
            unsafe.append("APP_SECRET_KEY")
        if self.bootstrap_admin_password == "SiraDemo2026!":
            unsafe.append("BOOTSTRAP_ADMIN_PASSWORD")
        if self.allow_legacy_device_key:
            unsafe.append("ALLOW_LEGACY_DEVICE_KEY debe ser false")
        if unsafe:
            raise RuntimeError("Configuración insegura para producción: " + ", ".join(unsafe))


@lru_cache
def get_settings() -> Settings:
    return Settings()
