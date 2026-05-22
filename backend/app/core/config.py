from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CaseGraph LE"
    app_version: str = "0.1.0"
    environment: str = "local"
    api_prefix: str = "/api"
    secret_key: str = Field(default="change-this-in-production")
    access_token_minutes: int = 480
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    database_url: str = (
        "postgresql+psycopg://postgress:caseMgmt%232026@localhost:5566/casegraph_le"
    )
    upload_dir: str = "uploads"
    login_lockout_attempts: int = 5
    login_lockout_minutes: int = 15

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
