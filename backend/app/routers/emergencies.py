import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from xrpl.wallet import Wallet
from xrpl.models.transactions import Memo
from app.database import get_db
from app.config import settings
from app.models.disaster import Disaster
from app.models.organization import Organization
from app.models.org_escrow import OrgEscrow
from app.services.xrpl_client import xrpl_client
from app.services.allocation_engine import calculate_allocations
from app.utils.crypto import encrypt_seed, decrypt_seed
from app.utils.ripple_time import (
    ripple_epoch, from_drops, to_drops, str_to_hex, json_to_hex,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/emergencies", tags=["emergencies"])

ESCROW_LOCK_SECONDS = 60  # Must exceed batch creation time (~10s per escrow on devnet)
ESCROW_CANCEL_SECONDS = 86400  # 24 hours


class TriggerRequest(BaseModel):
    disaster_type: str
    location: str
    severity: int
    affected_causes: List[str]


@router.post("/trigger")
async def trigger_emergency(req: TriggerRequest, db: Session = Depends(get_db)):
    # 1. Get reserve balance
    try:
        reserve_info = await xrpl_client.get_account_info(settings.RESERVE_WALLET_ADDRESS)
        reserve_balance = int(reserve_info["account_data"]["Balance"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot read reserve balance: {e}")

    # 2. Get matching organizations
    orgs = db.query(Organization).filter(
        Organization.cause_type.in_(req.affected_causes)
    ).all()
    if not orgs:
        raise HTTPException(status_code=400, detail="No matching organizations found")

    # 3. Calculate available to send from Reserve (keeping 10 XRP minimum in Reserve)
    num_orgs = len(orgs)
    available_to_send = reserve_balance - to_drops(10)  # Reserve must keep 10 XRP minimum

    # Calculate all costs that disaster wallet needs
    disaster_reserve = to_drops(1.5)       # Disaster wallet base reserve + buffer
    owner_reserve = num_orgs * to_drops(0.2)  # XRPL owner reserve per escrow object
    escrow_create_fees = num_orgs * to_drops(0.02)  # Fee per EscrowCreate tx
    escrow_finish_fees = num_orgs * to_drops(0.02)  # Fee per EscrowFinish tx
    disaster_buffer = to_drops(0.5)        # Safety margin
    funding_fee = to_drops(0.02)           # Fee for reserve→disaster payment

    total_overhead = disaster_reserve + owner_reserve + escrow_create_fees + escrow_finish_fees + disaster_buffer + funding_fee

    # What's left after all overhead can go to orgs
    available_for_allocation = available_to_send - total_overhead

    if available_for_allocation <= 0:
        min_needed = to_drops(10 + 1.5 + 0.5 + 0.1)  # Reserve min + Disaster min + buffer + fees
        raise HTTPException(status_code=400, detail=f"Insufficient reserve balance. Need at least {from_drops(min_needed)} XRP in reserve to trigger emergency.")

    logger.info(f"Reserve balance: {from_drops(reserve_balance)} XRP, Available to send: {from_drops(available_to_send)} XRP, Available for allocation: {from_drops(available_for_allocation)} XRP")

    # 4. Calculate allocations from the ACTUAL available amount
    allocations = calculate_allocations(orgs, available_for_allocation, req.severity)

    # Safety check: Ensure total allocations don't exceed available_for_allocation
    total_requested = sum(a["amount_drops"] for a in allocations)
    if total_requested > available_for_allocation:
        logger.warning(f"Allocations ({from_drops(total_requested)} XRP) exceed available ({from_drops(available_for_allocation)} XRP). Scaling down.")
        scale_factor = available_for_allocation / total_requested
        for alloc in allocations:
            alloc["amount_drops"] = int(alloc["amount_drops"] * scale_factor)
            alloc["percentage"] = alloc["percentage"] * scale_factor

    # 5. Create disaster wallet
    disaster_wallet = Wallet.create()
    disaster_id = f"disaster_{int(time.time())}"

    # 6. Calculate exact funding needed
    total_allocation = sum(a["amount_drops"] for a in allocations)
    fund_amount = total_allocation + disaster_reserve + owner_reserve + escrow_create_fees + escrow_finish_fees + disaster_buffer

    logger.info(f"Funding disaster wallet: {from_drops(total_allocation)} XRP allocation + {from_drops(disaster_reserve + owner_reserve + escrow_create_fees + escrow_finish_fees + disaster_buffer)} XRP overhead = {from_drops(fund_amount)} XRP total")

    try:
        funded = await xrpl_client.fund_account(disaster_wallet.address)
        logger.info(f"Faucet funding for disaster wallet: {'success' if funded else 'failed'}")
    except Exception as e:
        logger.warning(f"Faucet funding failed (non-critical): {e}")

    try:
        fund_result = await xrpl_client.submit_payment(
            wallet=xrpl_client.reserve_wallet,
            destination=disaster_wallet.address,
            amount_drops=fund_amount,
        )
        logger.info(f"Funded disaster account {disaster_id}: {fund_amount} drops")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fund disaster account: {e}")

    # 6. Save disaster to DB
    disaster = Disaster(
        disaster_id=disaster_id,
        wallet_address=disaster_wallet.address,
        wallet_seed_encrypted=encrypt_seed(disaster_wallet.seed),
        disaster_type=req.disaster_type,
        location=req.location,
        severity=req.severity,
        total_allocated_drops=total_allocation,
        status="active",
    )
    db.add(disaster)
    db.commit()

    # 7. Create org escrows (batched — single WebSocket connection)
    now = int(time.time())
    escrow_results = []
    successful_escrows = 0
    failed_escrows = 0
    actual_allocated_drops = 0

    finish_after = ripple_epoch(now + ESCROW_LOCK_SECONDS)
    cancel_after = ripple_epoch(now + ESCROW_CANCEL_SECONDS)

    # Build all escrow params up front
    batch_params = []
    for alloc in allocations:
        memos = [
            Memo(
                memo_type=str_to_hex("allocation"),
                memo_data=json_to_hex({
                    "disaster_id": disaster_id,
                    "org_id": alloc["org_id"],
                    "disaster_type": req.disaster_type,
                }),
            )
        ]
        batch_params.append({
            "destination": alloc["org_address"],
            "amount_drops": alloc["amount_drops"],
            "finish_after": finish_after,
            "cancel_after": cancel_after,
            "memos": memos,
        })

    # Single batched call — one connection, sequential sequence numbers
    batch_results = await xrpl_client.create_escrows_batch(
        wallet=disaster_wallet,
        escrow_params=batch_params,
    )

    # Process results
    for idx, (alloc, result) in enumerate(zip(allocations, batch_results)):
        org = db.query(Organization).filter_by(org_id=alloc["org_id"]).first()

        if "error" in result:
            failed_escrows += 1
            logger.error(f"Failed to create escrow for org {alloc['org_id']} ({org.name if org else 'Unknown'}): {result['error']}")
            escrow_results.append({
                "org_id": alloc["org_id"],
                "org_name": org.name if org else "Unknown",
                "error": result["error"],
            })
            continue

        tx_hash = result.get("hash", "")
        sequence = result.get("Sequence") or result.get("tx_json", {}).get("Sequence", 0)

        org_escrow = OrgEscrow(
            disaster_id=disaster_id,
            org_id=alloc["org_id"],
            org_address=alloc["org_address"],
            escrow_tx_hash=tx_hash,
            amount_drops=alloc["amount_drops"],
            status="locked",
            finish_after=finish_after,
            cancel_after=cancel_after,
            sequence=sequence,
        )
        db.add(org_escrow)

        successful_escrows += 1
        actual_allocated_drops += alloc["amount_drops"]
        escrow_results.append({
            "org_id": alloc["org_id"],
            "org_name": org.name if org else "Unknown",
            "amount_xrp": from_drops(alloc["amount_drops"]),
            "percentage": alloc["percentage"],
            "escrow_tx_hash": tx_hash,
            "finish_after": finish_after,
        })

        logger.info(f"Created escrow for {org.name if org else alloc['org_id']}: {from_drops(alloc['amount_drops'])} XRP (tx: {tx_hash})")

    # Update disaster record with actual allocation (not intended)
    disaster.total_allocated_drops = actual_allocated_drops
    db.commit()

    logger.info(f"Escrow creation summary: {successful_escrows} successful, {failed_escrows} failed, actual allocated: {from_drops(actual_allocated_drops)} XRP")
    if failed_escrows > 0:
        logger.warning(f"{failed_escrows} escrows failed! Some funds may be stuck in disaster wallet.")

    return {
        "disaster_id": disaster_id,
        "disaster_account": disaster_wallet.address,
        "total_allocated_xrp": from_drops(actual_allocated_drops),
        "allocations": escrow_results,
    }


@router.get("/{disaster_id}")
async def get_disaster(disaster_id: str, db: Session = Depends(get_db)):
    disaster = db.query(Disaster).filter_by(disaster_id=disaster_id).first()
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")

    escrows = db.query(OrgEscrow).filter_by(disaster_id=disaster_id).all()

    org_escrows = []
    for e in escrows:
        org = db.query(Organization).filter_by(org_id=e.org_id).first()
        org_escrows.append({
            "org_id": e.org_id,
            "org_name": org.name if org else "Unknown",
            "amount_xrp": from_drops(e.amount_drops),
            "status": e.status,
            "escrow_tx_hash": e.escrow_tx_hash,
            "finish_tx_hash": e.finish_tx_hash,
            "finished_at": e.finished_at.isoformat() if e.finished_at else None,
        })

    return {
        "disaster_id": disaster.disaster_id,
        "disaster_type": disaster.disaster_type,
        "location": disaster.location,
        "severity": disaster.severity,
        "total_allocated_xrp": from_drops(disaster.total_allocated_drops),
        "status": disaster.status,
        "wallet_address": disaster.wallet_address,
        "org_escrows": org_escrows,
        "created_at": disaster.created_at.isoformat() if disaster.created_at else None,
        "completed_at": disaster.completed_at.isoformat() if disaster.completed_at else None,
    }


@router.get("")
async def list_disasters(db: Session = Depends(get_db)):
    disasters = db.query(Disaster).order_by(Disaster.created_at.desc()).all()
    result = []
    for d in disasters:
        escrows = db.query(OrgEscrow).filter_by(disaster_id=d.disaster_id).all()
        finished_count = sum(1 for e in escrows if e.status == "finished")
        result.append({
            "disaster_id": d.disaster_id,
            "disaster_type": d.disaster_type,
            "location": d.location,
            "severity": d.severity,
            "total_allocated_xrp": from_drops(d.total_allocated_drops),
            "status": d.status,
            "org_count": len(escrows),
            "finished_count": finished_count,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return {"disasters": result}
