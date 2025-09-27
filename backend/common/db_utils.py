# common/db_utils.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from common.config import Settings
from .schema import Base

settings = Settings()

engine = create_engine(settings.database_url, echo=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def init_db():
    """Create all tables from schema if they don't exist"""
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
