from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.logging import logger

# Check if SQLite is used, which requires connect_args for multithreading
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

try:
    if is_sqlite:
        logger.info("Initializing SQLite database connection.")
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        logger.info("Initializing PostgreSQL database connection.")
        # Pool size and max overflow are good practices for production PostgreSQL configurations
        engine = create_engine(
            settings.DATABASE_URL,
            pool_size=10,
            max_overflow=20
        )
except Exception as e:
    logger.critical(f"Failed to create database engine: {e}")
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependency generator for retrieving database sessions in FastAPI routes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
