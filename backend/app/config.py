from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    XRPL_NETWORK: str = "devnet"
    XRPL_NODE_URL: str = "wss://s.devnet.rippletest.net:51233"

    POOL_WALLET_ADDRESS: str = ""
    POOL_WALLET_SECRET: str = ""
    RESERVE_WALLET_ADDRESS: str = ""
    RESERVE_WALLET_SECRET: str = ""

    DATABASE_URL: str = "postgresql://emergency_user:emergency_pass@localhost:5432/emergency_platform"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "changeme"
    ENCRYPTION_KEY: str = "0" * 64

    BATCH_THRESHOLD_XRP: int = 100
    BATCH_TIME_WINDOW_SECONDS: int = 1

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
