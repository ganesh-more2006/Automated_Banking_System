import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server Info
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    API_V1_STR: str = "/api/v1"

    # Security
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str

    # Environment
    ENV: str = "development"
    LOG_LEVEL: str = "info"

    # ML Fraud Detection Config
    FRAUD_MODEL_PATH: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models", "isolation_forest.joblib")
    )
    FRAUD_SCALER_PATH: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models", "scaler.joblib")
    )
    FRAUD_MODEL_VERSION: str = "v1.0.0"
    FRAUD_THRESHOLD_MEDIUM: int = 30
    FRAUD_THRESHOLD_HIGH: int = 60
    FRAUD_THRESHOLD_CRITICAL: int = 80

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

settings = Settings()
