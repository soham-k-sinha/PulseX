from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Integer, DateTime
from app.database import Base


class BatchEscrow(Base):
    __tablename__ = "batch_escrows"

    batch_id = Column(String(64), primary_key=True)
    escrow_tx_hash = Column(String(128), unique=True, nullable=False)
    finish_tx_hash = Column(String(128), nullable=True)
    total_amount_drops = Column(BigInteger, nullable=False)
    donor_count = Column(Integer, nullable=False)
    status = Column(String(20), default="locked", index=True)
    trigger_type = Column(String(20), nullable=True)
    finish_after = Column(Integer, nullable=False)
    sequence = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
