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

ESCROW_LOCK_SECONDS = 5  # 5 seconds for testing
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

    # Keep 10 XRP reserve for account fees
    available_drops = reserve_balance - to_drops(10)
    if available_drops <= 0:
        raise HTTPException(status_code=400, detail="Insufficient reserve balance")

    # 2. Get matching organizations
    orgs = db.query(Organization).filter(
        Organization.cause_type.in_(req.affected_causes)
    ).all()
    if not orgs:
        raise HTTPException(status_code=400, detail="No matching organizations found")

    # 3. Calculate allocations
    allocations = calculate_allocations(orgs, available_drops, req.severity)

    # 4. Create disaster wallet
    disaster_wallet = Wallet.create()
    disaster_id = f"disaster_{int(time.time())}"

    # 5. Fund disaster account from reserve (send enough for allocations + fees)
    total_allocation = sum(a["amount_drops"] for a in allocations)
    fund_amount = total_allocation + to_drops(2)  # extra for escrow fees

    try:
        await xrpl_client.fund_account(disaster_wallet.address)
    except Exception:
        pass

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

    # 7. Create org escrows
    now = int(time.time())
    escrow_results = []

    for alloc in allocations:
        org = db.query(Organization).filter_by(org_id=alloc["org_id"]).first()
        finish_after = ripple_epoch(now + ESCROW_LOCK_SECONDS)
        cancel_after = ripple_epoch(now + ESCROW_CANCEL_SECONDS)

        try:
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

            result = await xrpl_client.create_escrow(
                wallet=disaster_wallet,
                destination=alloc["org_address"],
                amount_drops=alloc["amount_drops"],
                finish_after=finish_after,
                cancel_after=cancel_after,
                memos=memos,
            )

            tx_hash = result.get("hash", "")
            # Sequence can be in result directly or in tx_json
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
            db.commit()

            escrow_results.append({
                "org_id": alloc["org_id"],
                "org_name": org.name if org else "Unknown",
                "amount_xrp": from_drops(alloc["amount_drops"]),
                "percentage": alloc["percentage"],
                "escrow_tx_hash": tx_hash,
                "finish_after": finish_after,
            })

            logger.info(f"Created escrow for {org.name if org else alloc['org_id']}: {from_drops(alloc['amount_drops'])} XRP")

        except Exception as e:
            logger.error(f"Failed to create escrow for org {alloc['org_id']}: {e}")
            escrow_results.append({
                "org_id": alloc["org_id"],
                "org_name": org.name if org else "Unknown",
                "error": str(e),
            })

    return {
        "disaster_id": disaster_id,
        "disaster_account": disaster_wallet.address,
        "total_allocated_xrp": from_drops(total_allocation),
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
