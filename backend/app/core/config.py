from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "organ-allocation-mvp-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = "sqlite:///./organ_allocation.db"
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"


settings = Settings()
