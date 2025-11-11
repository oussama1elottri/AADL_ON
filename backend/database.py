import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Try to get database URL from environment variable, fall back to SQLite if not set
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./aadl_on.db"  # SQLite fallback
)

# Create engine with appropriate connection settings
try:
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
    else:
        # SQLite engine with connection pooling and foreign key support
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False}  # Needed for SQLite
        )
except Exception as e:
    print(f"Failed to connect to {SQLALCHEMY_DATABASE_URL.split('://')[0]}, falling back to SQLite")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./aadl_on.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()



