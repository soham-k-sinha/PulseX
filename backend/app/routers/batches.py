from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.batch_escrow import BatchEscrow
from app.models.donation import Donation
from app.utils.ripple_time import from_drops

router = APIRouter(prefix="/api/batches", tags=["batches"])


@router.get("")
async def list_batches(db: Session = Depends(get_db)):
    batches = db.query(BatchEscrow).order_by(BatchEscrow.created_at.desc()).all()

    total_locked = sum(b.total_amount_drops for b in batches if b.status == "locked")
    active = sum(1 for b in batches if b.status == "locked")
    finished = sum(1 for b in batches if b.status == "finished")

    return {
        "batches": [
            {
                "batch_id": b.batch_id,
                "total_xrp": from_drops(b.total_amount_drops),
                "donor_count": b.donor_count,
                "status": b.status,
                "escrow_tx_hash": b.escrow_tx_hash,
                "finish_tx_hash": b.finish_tx_hash,
                "finish_after": b.finish_after,
                "trigger_type": b.trigger_type,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "finished_at": b.finished_at.isoformat() if b.finished_at else None,
            }
            for b in batches
        ],
        "stats": {
            "total_locked_xrp": from_drops(total_locked),
            "active_batches": active,
            "finished_batches": finished,
        },
    }


@router.get("/{batch_id}")
async def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(BatchEscrow).filter_by(batch_id=batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    donations = db.query(Donation).filter_by(batch_id=batch_id).all()

    return {
        "batch_id": batch.batch_id,
        "total_xrp": from_drops(batch.total_amount_drops),
        "donor_count": batch.donor_count,
        "status": batch.status,
        "escrow_tx_hash": batch.escrow_tx_hash,
        "finish_tx_hash": batch.finish_tx_hash,
        "trigger_type": batch.trigger_type,
        "donors": [
            {
                "address": d.donor_address,
                "amount_xrp": from_drops(d.amount_drops),
                "percentage": round(d.amount_drops / batch.total_amount_drops * 100, 1) if batch.total_amount_drops else 0,
                "payment_tx_hash": d.payment_tx_hash,
            }
            for d in donations
        ],
        "timeline": {
            "created": batch.created_at.isoformat() if batch.created_at else None,
            "finish_after": batch.finish_after,
            "finished": batch.finished_at.isoformat() if batch.finished_at else None,
        },
    }
