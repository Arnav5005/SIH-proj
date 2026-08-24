import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
MODELS_DIR = BASE_DIR / "models"
DEMO_ASSETS_DIR = DATA_DIR / "demo_assets"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DEMO_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "SSB AI Document & Identity Screening System"
    APP_VERSION: str = "v4.8.2-SIH26188"
    ENV: str = "development"
    DEBUG: bool = True
    
    # Directories
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    UPLOAD_DIR: Path = UPLOAD_DIR
    MODELS_DIR: Path = MODELS_DIR
    DEMO_ASSETS_DIR: Path = DEMO_ASSETS_DIR
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'synthetic_registry.db'}"
    
    # AI Models
    FACE_SIMILARITY_THRESHOLD: float = 65.0  # Percentage
    OCR_CONFIDENCE_THRESHOLD: float = 75.0
    TAMPERING_SCORE_THRESHOLD: float = 40.0
    
    # Risk Engine Weights
    WEIGHT_WATCHLIST: float = 40.0
    WEIGHT_TAMPERING: float = 25.0
    WEIGHT_FACE_MISMATCH: float = 20.0
    WEIGHT_FIELD_MISMATCH: float = 15.0
    WEIGHT_EXPIRED_DOC: float = 15.0
    
    # Checkpoint Defaults
    DEFAULT_CHECKPOINT: str = "CHK-00184"
    DEFAULT_SECTOR: str = "Raxaul_Indo_Nepal_Border"
    
    # Groq AI Model Configuration
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "groq/compound")
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
