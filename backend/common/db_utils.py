# FOR DB CONFIGURATION AND UTILITIES

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.common.config import Settings

settings = Settings()

engine = create_engine(settings.database_url, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
