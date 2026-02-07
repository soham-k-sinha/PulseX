import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from xrpl.models.amounts import IssuedCurrencyAmount
from app.database import get_db
from app.config import settings
from app.models.donation import Donation
from app.services.xrpl_client import xrpl_client
from app.utils.ripple_time import to_drops, from_drops, str_to_hex, json_to_hex

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/donations", tags=["donations"])


class PrepareRequest(BaseModel):
    donor_address: str
    amount_xrp: float


class SubmitSignedRequest(BaseModel):
    tx_blob: str
    donor_address: str


class ConfirmRequest(BaseModel):
    tx_hash: str
    donor_address: str


@router.post("/prepare")
async def prepare_donation(req: PrepareRequest):
    donation_id = f"don_{int(time.time() * 1000)}"
    amount_drops = to_drops(req.amount_xrp)

    # Fetch account info to autofill the tx so Crossmark doesn't need RPC calls.
    # If account doesn't exist on Devnet, fund it via faucet first.
    try:
        account_info = await xrpl_client.get_account_info(req.donor_address)
        sequence = account_info["account_data"]["Sequence"]
    except Exception as e:
        if "actNotFound" in str(e):
            logger.info(f"Account {req.donor_address} not found on Devnet, funding via faucet...")
            funded = await xrpl_client.fund_account(req.donor_address)
            if not funded:
                raise HTTPException(
                    status_code=400,
                    detail="Your account doesn't exist on XRPL Devnet and auto-funding failed. "
                           "Please fund it manually at https://faucet.devnet.rippletest.net/"
                )
            # Retry after funding
            try:
                account_info = await xrpl_client.get_account_info(req.donor_address)
                sequence = account_info["account_data"]["Sequence"]
            except Exception as e2:
                raise HTTPException(status_code=400, detail=f"Account funded but still not found: {e2}")
        else:
            logger.error(f"Failed to get account info for {req.donor_address}: {e}")
            raise HTTPException(status_code=400, detail=f"Could not fetch account info: {e}")

    try:
        server_info = await xrpl_client.get_server_info()
        ledger_index = server_info["info"]["validated_ledger"]["seq"]
    except Exception as e:
        logger.error(f"Failed to get server info: {e}")
        raise HTTPException(status_code=400, detail=f"Could not fetch server info: {e}")

    try:
        fee = await xrpl_client.get_recommended_fee()
    except Exception:
        fee = "12"

    unsigned_tx = {
        "TransactionType": "Payment",
        "Account": req.donor_address,
        "Destination": settings.POOL_WALLET_ADDRESS,
        "Amount": str(amount_drops),
        "Fee": fee,
        "Sequence": sequence,
        "LastLedgerSequence": ledger_index + 20,
        "Memos": [
            {
                "Memo": {
                    "MemoType": str_to_hex("donation"),
                    "MemoData": json_to_hex({"id": donation_id}),
                }
            }
        ],
    }

    return {
        "unsigned_tx": unsigned_tx,
        "donation_id": donation_id,
        "pool_address": settings.POOL_WALLET_ADDRESS,
    }


@router.post("/submit")
async def submit_signed_donation(req: SubmitSignedRequest, db: Session = Depends(get_db)):
    """Accept a signed tx blob from the frontend, submit to XRPL, and confirm."""
    try:
        result = await xrpl_client.submit_signed_tx(req.tx_blob)
    except Exception as e:
        logger.error(f"Failed to submit signed tx: {e}")
        raise HTTPException(status_code=400, detail=f"Transaction submission failed: {e}")

    tx_hash = result.get("tx_json", {}).get("hash", "")
    if not tx_hash:
        raise HTTPException(status_code=400, detail="No transaction hash in response")

    amount_drops = int(result.get("tx_json", {}).get("Amount", "0"))
    destination = result.get("tx_json", {}).get("Destination", "")

    if destination != settings.POOL_WALLET_ADDRESS:
        raise HTTPException(status_code=400, detail="Payment was not sent to pool wallet")

    donation = Donation(
        donor_address=req.donor_address,
        amount_drops=amount_drops,
        payment_tx_hash=tx_hash,
        batch_status="pending",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    pool_balance_drops = 0
    try:
        info = await xrpl_client.get_account_info(settings.POOL_WALLET_ADDRESS)
        pool_balance_drops = int(info["account_data"]["Balance"])
    except Exception:
        pass

    return {
        "status": "confirmed",
        "tx_hash": tx_hash,
        "donation": {
            "id": str(donation.id),
            "amount_xrp": from_drops(donation.amount_drops),
            "batch_status": donation.batch_status,
        },
        "pool_status": {
            "current_balance_xrp": from_drops(pool_balance_drops),
            "threshold_xrp": settings.BATCH_THRESHOLD_XRP,
        },
    }


@router.post("/confirm")
async def confirm_donation(req: ConfirmRequest, db: Session = Depends(get_db)):
    existing = db.query(Donation).filter_by(payment_tx_hash=req.tx_hash).first()
    if existing:
        return {
            "status": "already_confirmed",
            "donation": {
                "id": str(existing.id),
                "amount_xrp": from_drops(existing.amount_drops),
                "batch_status": existing.batch_status,
            },
        }

    try:
        tx_result = await xrpl_client.get_tx(req.tx_hash)
    except Exception as e:
        logger.error(f"Failed to fetch tx {req.tx_hash}: {e}")
        raise HTTPException(status_code=400, detail=f"Transaction not found: {e}")

    meta = tx_result.get("meta", {})
    if isinstance(meta, dict) and meta.get("TransactionResult") != "tesSUCCESS":
        raise HTTPException(status_code=400, detail="Transaction was not successful")

    amount = tx_result.get("Amount", "0")
    if isinstance(amount, dict):
        raise HTTPException(status_code=400, detail="Only XRP payments supported")
    amount_drops = int(amount)

    destination = tx_result.get("Destination", "")
    if destination != settings.POOL_WALLET_ADDRESS:
        raise HTTPException(status_code=400, detail="Payment was not sent to pool wallet")

    donation = Donation(
        donor_address=req.donor_address,
        amount_drops=amount_drops,
        payment_tx_hash=req.tx_hash,
        batch_status="pending",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    pool_balance_drops = 0
    try:
        info = await xrpl_client.get_account_info(settings.POOL_WALLET_ADDRESS)
        pool_balance_drops = int(info["account_data"]["Balance"])
    except Exception:
        pass

    return {
        "status": "confirmed",
        "donation": {
            "id": str(donation.id),
            "amount_xrp": from_drops(donation.amount_drops),
            "batch_status": donation.batch_status,
        },
        "pool_status": {
            "current_balance_xrp": from_drops(pool_balance_drops),
            "threshold_xrp": settings.BATCH_THRESHOLD_XRP,
        },
    }


@router.get("/status/{address}")
async def get_donor_status(address: str, db: Session = Depends(get_db)):
    donations = (
        db.query(Donation)
        .filter_by(donor_address=address)
        .order_by(Donation.created_at.desc())
        .all()
    )
    total_drops = sum(d.amount_drops for d in donations)

    return {
        "total_donated_xrp": from_drops(total_drops),
        "donations": [
            {
                "id": str(d.id),
                "amount_xrp": from_drops(d.amount_drops),
                "payment_tx_hash": d.payment_tx_hash,
                "batch_id": d.batch_id,
                "batch_status": d.batch_status,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in donations
        ],
    }
