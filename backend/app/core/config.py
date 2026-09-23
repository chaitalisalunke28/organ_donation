import os
from pydantic_settings import BaseSettings

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings(BaseSettings):
    SECRET_KEY: str = "organ-allocation-mvp-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = "sqlite:///./organ_allocation.db"
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"


settings = Settings()

# Relative upload paths are anchored to backend/ so files are found no matter
# which directory the server is started from
if not os.path.isabs(settings.UPLOAD_DIR):
    settings.UPLOAD_DIR = os.path.join(BACKEND_DIR, settings.UPLOAD_DIR)


def resolve_upload_path(path: str) -> str:
    """Stored report paths may be relative to backend/ (seed data, older uploads)."""
    # Paths saved on Windows use backslashes; normalise so they work on any OS
    path = path.replace("\\", "/").replace("/", os.sep)
    return path if os.path.isabs(path) else os.path.join(BACKEND_DIR, path)
