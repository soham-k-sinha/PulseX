import asyncio
import logging
from datetime import datetime, timezone
from xrpl.wallet import Wallet
from app.database import SessionLocal
from app.models.batch_escrow import BatchEscrow
from app.models.org_escrow import OrgEscrow
from app.models.disaster import Disaster
from app.models.organization import Organization
from app.services.xrpl_client import xrpl_client
from app.utils.crypto import decrypt_seed
from app.utils.ripple_time import ripple_epoch_now, from_drops

logger = logging.getLogger(__name__)


class EscrowScheduler:
    def __init__(self):
        self.check_interval = 30

    async def run(self):
        logger.info("Escrow Scheduler started")
        while True:
            try:
                await self.process_batch_escrows()
                await self.process_org_escrows()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(self.check_interval)

    async def process_batch_escrows(self):
        db = SessionLocal()
        try:
            locked = db.query(BatchEscrow).filter_by(status="locked").all()
            current_time = ripple_epoch_now()

            for batch in locked:
                if current_time >= batch.finish_after + 1:
                    logger.info(f"Batch {batch.batch_id} ready to finish")
                    await self.finish_batch(db, batch)
        finally:
            db.close()

    async def finish_batch(self, db, batch: BatchEscrow):
        try:
            result = await xrpl_client.finish_escrow(
                wallet=xrpl_client.pool_wallet,
                owner=xrpl_client.pool_wallet.address,
                offer_sequence=batch.sequence,
            )

            tx_result = result.get("meta", {})
            if isinstance(tx_result, dict) and tx_result.get("TransactionResult") == "tesSUCCESS":
                batch.status = "finished"
                batch.finish_tx_hash = result.get("hash", "")
                batch.finished_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"Batch {batch.batch_id} finished: {result.get('hash', '')}")
            else:
                logger.error(f"Batch finish failed: {result}")

        except Exception as e:
            logger.error(f"Error finishing batch {batch.batch_id}: {e}")

    async def process_org_escrows(self):
        db = SessionLocal()
        try:
            locked = db.query(OrgEscrow).filter_by(status="locked").all()
            current_time = ripple_epoch_now()

            # Group ready escrows by disaster_id
            ready_by_disaster: dict[str, list[OrgEscrow]] = {}
            for escrow in locked:
                if current_time >= escrow.finish_after:
                    ready_by_disaster.setdefault(escrow.disaster_id, []).append(escrow)

            for disaster_id, escrows in ready_by_disaster.items():
                logger.info(f"Finishing {len(escrows)} org escrows for disaster {disaster_id}")
                await self.finish_org_escrows_batch(db, disaster_id, escrows)
        finally:
            db.close()

    async def finish_org_escrows_batch(self, db, disaster_id: str, escrows: list[OrgEscrow]):
        try:
            disaster = db.query(Disaster).filter_by(disaster_id=disaster_id).first()
            if not disaster:
                logger.error(f"Disaster {disaster_id} not found")
                return

            disaster_wallet = Wallet.from_seed(decrypt_seed(disaster.wallet_seed_encrypted))

            # Build batch params
            batch_params = []
            for escrow in escrows:
                batch_params.append({
                    "owner": disaster_wallet.address,
                    "offer_sequence": escrow.sequence,
                })

            results = await xrpl_client.finish_escrows_batch(
                wallet=disaster_wallet,
                escrow_params=batch_params,
            )

            for escrow, result in zip(escrows, results):
                if "error" in result:
                    logger.error(f"Failed to finish org escrow {escrow.id}: {result['error']}")
                    continue

                tx_result = result.get("meta", {})
                if isinstance(tx_result, dict) and tx_result.get("TransactionResult") == "tesSUCCESS":
                    escrow.status = "finished"
                    escrow.finish_tx_hash = result.get("hash", "")
                    escrow.finished_at = datetime.now(timezone.utc)

                    org = db.query(Organization).filter_by(org_id=escrow.org_id).first()
                    if org:
                        org.total_received_drops += escrow.amount_drops

                    logger.info(
                        f"Org escrow finished: org {escrow.org_id} received "
                        f"{from_drops(escrow.amount_drops)} XRP | tx: {result.get('hash', '')}"
                    )
                else:
                    logger.error(f"Org escrow finish failed for {escrow.id}: {result}")

            db.commit()

            # Check if all escrows for this disaster are now finished
            remaining = db.query(OrgEscrow).filter_by(
                disaster_id=disaster_id, status="locked"
            ).count()
            if remaining == 0:
                disaster.status = "completed"
                disaster.completed_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"Disaster {disaster_id} completed - all escrows finished")

        except Exception as e:
            logger.error(f"Error finishing org escrows batch for {disaster_id}: {e}")


escrow_scheduler = EscrowScheduler()
