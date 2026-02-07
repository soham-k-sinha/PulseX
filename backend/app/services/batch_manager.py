import asyncio
import time
import logging
from datetime import datetime, timezone
from xrpl.models.transactions import Memo
from app.config import settings
from app.database import SessionLocal
from app.models.donation import Donation
from app.models.batch_escrow import BatchEscrow
from app.services.xrpl_client import xrpl_client
from app.utils.ripple_time import (
    ripple_epoch, to_drops, from_drops, str_to_hex, json_to_hex,
)

logger = logging.getLogger(__name__)

BATCH_ESCROW_LOCK_SECONDS = 5  # 5 seconds for testing


class BatchManager:
    def __init__(self):
        self.threshold_drops = to_drops(settings.BATCH_THRESHOLD_XRP)
        self.time_window = settings.BATCH_TIME_WINDOW_SECONDS
        self.last_batch_time = time.time()

    async def run(self):
        logger.info("Batch Manager started")
        while True:
            try:
                await self.check_triggers()
            except Exception as e:
                logger.error(f"Batch Manager error: {e}")
            await asyncio.sleep(30)

    async def check_triggers(self):
        db = SessionLocal()
        try:
            pending = db.query(Donation).filter_by(batch_status="pending").all()
            if not pending:
                return

            total_pending_drops = sum(d.amount_drops for d in pending)
            time_since_batch = time.time() - self.last_batch_time

            if total_pending_drops >= self.threshold_drops:
                logger.info(f"Threshold trigger: {from_drops(total_pending_drops)} XRP >= {settings.BATCH_THRESHOLD_XRP} XRP")
                await self.create_batch(db, pending, "threshold")
            elif time_since_batch >= self.time_window and total_pending_drops > 0:
                logger.info(f"Time trigger: {time_since_batch:.0f}s >= {self.time_window}s")
                await self.create_batch(db, pending, "time")
        finally:
            db.close()

    async def create_batch(self, db, donations, trigger: str):
        total_drops = sum(d.amount_drops for d in donations)
        batch_id = f"batch_{int(time.time())}"
        now = int(time.time())
        finish_after = ripple_epoch(now + BATCH_ESCROW_LOCK_SECONDS)

        donor_list = [
            {"addr": d.donor_address, "amt": d.amount_drops, "tx": d.payment_tx_hash}
            for d in donations
        ]

        memos = [
            Memo(
                memo_type=str_to_hex("batch_escrow"),
                memo_data=json_to_hex({
                    "batch_id": batch_id,
                    "trigger": trigger,
                    "donor_count": len(donations),
                    "total_xrp": from_drops(total_drops),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }),
            )
        ]

        try:
            result = await xrpl_client.create_escrow(
                wallet=xrpl_client.pool_wallet,
                destination=settings.RESERVE_WALLET_ADDRESS,
                amount_drops=total_drops,
                finish_after=finish_after,
                memos=memos,
            )

            tx_hash = result.get("hash", "")
            # Sequence can be in result directly or in tx_json
            sequence = result.get("Sequence") or result.get("tx_json", {}).get("Sequence", 0)

            batch_escrow = BatchEscrow(
                batch_id=batch_id,
                escrow_tx_hash=tx_hash,
                total_amount_drops=total_drops,
                donor_count=len(donations),
                status="locked",
                trigger_type=trigger,
                finish_after=finish_after,
                sequence=sequence,
            )
            db.add(batch_escrow)

            for d in donations:
                d.batch_id = batch_id
                d.batch_status = "locked_in_escrow"

            db.commit()
            self.last_batch_time = time.time()

            logger.info(
                f"Batch {batch_id} created: {from_drops(total_drops)} XRP "
                f"from {len(donations)} donors | tx: {tx_hash}"
            )

        except Exception as e:
            logger.error(f"Failed to create batch escrow: {e}")
            db.rollback()


batch_manager = BatchManager()
