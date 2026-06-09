from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Create engine
engine = create_engine(settings.database_url, pool_pre_ping=True)  # pool_pre_ping=True
# means that the connection pool will ping the database
# before returning a connection to the application.

# Create session
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
