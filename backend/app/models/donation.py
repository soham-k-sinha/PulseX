import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Donation(Base):
    __tablename__ = "donations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_address = Column(String(64), nullable=False, index=True)
    amount_drops = Column(BigInteger, nullable=False)
    payment_tx_hash = Column(String(128), unique=True, nullable=False)
    batch_id = Column(String(64), nullable=True)
    batch_status = Column(String(20), default="pending", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
