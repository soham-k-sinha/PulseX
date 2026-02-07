from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, Text
from app.database import Base


class Disaster(Base):
    __tablename__ = "disasters"

    disaster_id = Column(String(64), primary_key=True)
    wallet_address = Column(String(64), unique=True, nullable=False)
    wallet_seed_encrypted = Column(Text, nullable=False)
    disaster_type = Column(String(50), nullable=False)
    location = Column(String(100), nullable=False)
    severity = Column(Integer, nullable=False)
    total_allocated_drops = Column(BigInteger, nullable=False)
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
