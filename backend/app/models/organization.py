from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Integer, DateTime
from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    org_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    cause_type = Column(String(50), nullable=False)
    wallet_address = Column(String(64), unique=True, nullable=False)
    need_score = Column(Integer, nullable=False)
    total_received_drops = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
