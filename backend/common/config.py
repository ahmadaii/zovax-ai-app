import logging
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import (
    Field,
    ValidationError,
    model_validator,
    field_validator
)

class Settings(BaseSettings):
    openai_api_key: str | None = Field(default=None, description="OpenAI API key")
    use_openai_embedder: bool = Field(default=True, description="Use OpenAI embedder")
    generator: str = Field(default="openai", description="Generator to use (currently openai only)")
    log_level: str = Field(default="INFO", description="Logging level")

    # --- NEW JWT fields ---
    jwt_secret: str = Field(default=os.getenv("JWT_SECRET"), description="Secret key for JWT signing")
    jwt_algorithm: str = Field(default=os.getenv("JWT_ALGORITHM"), description="JWT signing algorithm")
    jwt_expire_minutes: int = Field(default=os.getenv("JWT_EXPIRE_MINUTES"), description="JWT expiration time in minutes")

    # Database configuration
    db_user: str | None = Field(default=os.getenv("DB_USER"), description="Postgres username")
    db_password: str | None = Field(default=os.getenv("DB_PASSWORD"), description="Postgres password")
    db_host: str | None = Field(default=os.getenv("DB_HOST"), description="Postgres host")
    db_port: int | None = Field(default=int(os.getenv("DB_PORT", 5432)), description="Postgres port")
    db_name: str | None = Field(default=os.getenv("DB_NAME"), description="Postgres database name")
    database_url: str | None = Field(default=None, description="Database connection URL")

    @model_validator(mode="after")
    def build_database_url(self):
        """Construct database_url if not explicitly provided"""
        if not self.database_url:
            if not (self.db_user and self.db_password and self.db_host and self.db_port and self.db_name):
                raise ValueError("Either DATABASE_URL or all DB_* vars must be set")
            self.database_url = (
                f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        return self

    @model_validator(mode="after")
    def validate_openai_api_key(self):
        if (self.generator == 'openai' or self.use_openai_embedder) and not self.openai_api_key:
            raise ValueError(
                "OpenAI API key is required when using the OpenAI generator or OpenAI embedder"
            )
        return self

    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        upper_v = v.upper()
        if upper_v not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {', '.join(valid_levels)}")
        return upper_v

    class Config:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False  # This allows case-insensitive matching of env vars

def load_settings():
    try:
        load_dotenv(Settings.Config.env_file)
        return Settings()
    except ValidationError as e:
        print("Error: Failed to load configuration settings.", file=sys.stderr)
        print("\nMissing or invalid settings:", file=sys.stderr)
        for error in e.errors():
            if "loc" in error and error["loc"]:
                field = ".".join(str(item) for item in error["loc"])
            else:
                field = "Unknown field"
            message = error.get("msg", "No error message provided")
            print(f"- {field}: {message}", file=sys.stderr)
        print("\nPlease check your .env file or environment variables.", file=sys.stderr)
        print(f"Expected .env file location: {Settings.Config.env_file.resolve()}", file=sys.stderr)
        sys.exit(1)

# This will read from environment variables or .env file
settings = load_settings()