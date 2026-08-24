from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.config import settings
from backend.app.database.models import Base

# SQLite connect args for thread safety
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes database tables and seeds initial data."""
    Base.metadata.create_all(bind=engine)
    from backend.app.database.seed_data import seed_database
    seed_database()
