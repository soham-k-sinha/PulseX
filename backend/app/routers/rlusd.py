import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from xrpl.models.amounts import IssuedCurrencyAmount
from app.config import settings
from app.services.xrpl_client import xrpl_client
from app.utils.ripple_time import str_to_hex, json_to_hex

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rlusd", tags=["rlusd"])


class TrustlineRequest(BaseModel):
    address: str


class FaucetRequest(BaseModel):
    address: str


@router.post("/trustline")
async def prepare_trustline(req: TrustlineRequest):
    """Prepare an unsigned TrustSet transaction for Crossmark signing."""
    if not settings.RLUSD_ISSUER_ADDRESS:
        raise HTTPException(status_code=400, detail="RLUSD issuer not configured")

    try:
        account_info = await xrpl_client.get_account_info(req.address)
        sequence = account_info["account_data"]["Sequence"]
    except Exception as e:
        if "actNotFound" in str(e):
            funded = await xrpl_client.fund_account(req.address)
            if not funded:
                raise HTTPException(status_code=400, detail="Account not found and auto-funding failed")
            account_info = await xrpl_client.get_account_info(req.address)
            sequence = account_info["account_data"]["Sequence"]
        else:
            raise HTTPException(status_code=400, detail=f"Could not fetch account info: {e}")

    try:
        server_info = await xrpl_client.get_server_info()
        ledger_index = server_info["info"]["validated_ledger"]["seq"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch server info: {e}")

    try:
        fee = await xrpl_client.get_recommended_fee()
    except Exception:
        fee = "12"

    unsigned_tx = {
        "TransactionType": "TrustSet",
        "Account": req.address,
        "LimitAmount": {
            "currency": settings.RLUSD_CURRENCY_HEX,
            "issuer": settings.RLUSD_ISSUER_ADDRESS,
            "value": "1000000",
        },
        "Fee": fee,
        "Sequence": sequence,
        "LastLedgerSequence": ledger_index + 20,
    }

    return {"unsigned_tx": unsigned_tx}


@router.post("/faucet")
async def rlusd_faucet(req: FaucetRequest):
    """Send 500 test RLUSD from issuer to the given address."""
    if not settings.RLUSD_ISSUER_ADDRESS or not xrpl_client.rlusd_issuer_wallet:
        raise HTTPException(status_code=400, detail="RLUSD issuer not configured")

    try:
        result = await xrpl_client.submit_rlusd_payment(
            wallet=xrpl_client.rlusd_issuer_wallet,
            destination=req.address,
            amount_value="500",
        )
        tx_hash = result.get("hash", "")
        return {"status": "success", "tx_hash": tx_hash, "amount": 500}
    except Exception as e:
        logger.error(f"RLUSD faucet failed for {req.address}: {e}")
        raise HTTPException(status_code=400, detail=f"RLUSD faucet failed: {e}")


@router.get("/balance/{address}")
async def get_rlusd_balance(address: str):
    """Get RLUSD balance for an address."""
    if not settings.RLUSD_ISSUER_ADDRESS:
        return {"address": address, "balance": 0, "configured": False}

    try:
        balance = await xrpl_client.get_rlusd_balance(address)
        return {"address": address, "balance": balance, "configured": True}
    except Exception as e:
        logger.error(f"Failed to get RLUSD balance for {address}: {e}")
        return {"address": address, "balance": 0, "configured": True}
