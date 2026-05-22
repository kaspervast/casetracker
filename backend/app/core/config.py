from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CaseGraph LE"
    app_version: str = "0.1.0"
    environment: str = "local"
    api_prefix: str = "/api"
    secret_key: str
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

    @model_validator(mode="after")
    def validate_secret_key(self):
        insecure_values = {
            "change-this-in-production",
            "replace-with-a-long-random-secret",
            "local-dev-change-me",
        }
        if self.environment != "local" and self.secret_key in insecure_values:
            raise ValueError("SECRET_KEY must be set to a strong environment-specific value")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
