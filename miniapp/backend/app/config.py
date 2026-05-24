from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "dev"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: str = "*"

    BOT_TOKEN: str
    BOT_USERNAME: str = "HarmonyVPNBot"

    REMNAWAVE_BASE_URL: str
    REMNAWAVE_API_TOKEN: str

    DATABASE_URL: str
    SECRET_KEY: str
    SESSION_TTL_HOURS: int = 24

    REFERRAL_COMMISSION_PERCENT: int = 20
    WHEEL_COOLDOWN_DAYS: int = 7
    TRIAL_DAYS: int = 3
    DEFAULT_DEVICE_LIMIT: int = 3

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()