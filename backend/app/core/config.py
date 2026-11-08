"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET_KEY = "change-me-in-production-please-use-a-long-random-string"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    # --- App ---
    APP_NAME: str = "AI Football Predictor API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    # --- Database ---
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/football_predictor"
    PREDICTION_MODEL_PATH: str = "models/football-model.json"
    FOOTBALL_DATA_FUNCTION_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None

    # --- JWT ---
    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- CORS ---
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @model_validator(mode="after")
    def require_production_jwt_secret(self) -> "Settings":
        if self.ENVIRONMENT != "development" and (
            self.JWT_SECRET_KEY == DEFAULT_JWT_SECRET_KEY
            or len(self.JWT_SECRET_KEY) < 32
        ):
            raise ValueError(
                "Set JWT_SECRET_KEY to a unique random value of at least 32 characters "
                "outside development"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
