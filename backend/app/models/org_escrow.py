import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class OrgEscrow(Base):
    __tablename__ = "org_escrows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disaster_id = Column(String(64), ForeignKey("disasters.disaster_id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=False, index=True)
    org_address = Column(String(64), nullable=False)
    escrow_tx_hash = Column(String(128), unique=True, nullable=False)
    finish_tx_hash = Column(String(128), nullable=True)
    amount_drops = Column(BigInteger, nullable=False)
    currency = Column(String(10), default="XRP", nullable=False)
    status = Column(String(20), default="locked", index=True)
    finish_after = Column(Integer, nullable=False)
    cancel_after = Column(Integer, nullable=True)
    sequence = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
