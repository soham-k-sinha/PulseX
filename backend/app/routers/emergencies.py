import time
import asyncio
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from xrpl.wallet import Wallet
from xrpl.models.transactions import Memo, TrustSet
from xrpl.models.amounts import IssuedCurrencyAmount
from xrpl.asyncio.clients import AsyncWebsocketClient
from xrpl.asyncio.transaction import submit_and_wait
from xrpl.models.requests import AccountInfo
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
    currency: str = "XRP"  # "XRP" or "RLUSD"


@router.post("/trigger")
async def trigger_emergency(req: TriggerRequest, db: Session = Depends(get_db)):
    allocate_xrp = req.currency == "XRP"
    allocate_rlusd = req.currency == "RLUSD" and bool(settings.RLUSD_ISSUER_ADDRESS)

    # 1. Get matching organizations
    orgs = db.query(Organization).filter(
        Organization.cause_type.in_(req.affected_causes)
    ).all()
    if not orgs:
        raise HTTPException(status_code=400, detail="No matching organizations found")

    num_orgs = len(orgs)
    allocations = []
    total_allocation = 0
    fund_amount = 0
    trustline_ok = False

    # 2. XRP allocation calculations (only when allocating XRP)
    if allocate_xrp:
        try:
            reserve_info = await xrpl_client.get_account_info(settings.RESERVE_WALLET_ADDRESS)
            reserve_balance = int(reserve_info["account_data"]["Balance"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cannot read reserve balance: {e}")

        available_to_send = reserve_balance - to_drops(10)  # Reserve must keep 10 XRP minimum

        # Calculate all costs that disaster wallet needs
        disaster_reserve = to_drops(1.5)       # Disaster wallet base reserve + buffer
        owner_reserve = num_orgs * to_drops(0.2)  # XRPL owner reserve per escrow object
        escrow_create_fees = num_orgs * to_drops(0.02)  # Fee per EscrowCreate tx
        escrow_finish_fees = num_orgs * to_drops(0.02)  # Fee per EscrowFinish tx
        disaster_buffer = to_drops(0.5)        # Safety margin
        funding_fee = to_drops(0.02)           # Fee for reserve→disaster payment

        total_overhead = disaster_reserve + owner_reserve + escrow_create_fees + escrow_finish_fees + disaster_buffer + funding_fee
        available_for_allocation = available_to_send - total_overhead

        if available_for_allocation <= 0:
            min_needed = to_drops(10 + 1.5 + 0.5 + 0.1)
            raise HTTPException(status_code=400, detail=f"Insufficient reserve balance. Need at least {from_drops(min_needed)} XRP in reserve to trigger emergency.")

        logger.info(f"Reserve balance: {from_drops(reserve_balance)} XRP, Available to send: {from_drops(available_to_send)} XRP, Available for allocation: {from_drops(available_for_allocation)} XRP")

        allocations = calculate_allocations(orgs, available_for_allocation, req.severity)

        # Safety check
        total_requested = sum(a["amount_drops"] for a in allocations)
        if total_requested > available_for_allocation:
            logger.warning(f"Allocations ({from_drops(total_requested)} XRP) exceed available ({from_drops(available_for_allocation)} XRP). Scaling down.")
            scale_factor = available_for_allocation / total_requested
            for alloc in allocations:
                alloc["amount_drops"] = int(alloc["amount_drops"] * scale_factor)
                alloc["percentage"] = alloc["percentage"] * scale_factor

        total_allocation = sum(a["amount_drops"] for a in allocations)
        fund_amount = total_allocation + disaster_reserve + owner_reserve + escrow_create_fees + escrow_finish_fees + disaster_buffer

    # 3. Create disaster wallet
    disaster_wallet = Wallet.create()
    disaster_id = f"disaster_{int(time.time())}"

    # 4. Fund disaster wallet via faucet + wait for on-ledger existence
    try:
        funded = await xrpl_client.fund_account(disaster_wallet.address)
        logger.info(f"Faucet funding for disaster wallet: {'success' if funded else 'failed'}")
    except Exception as e:
        logger.warning(f"Faucet funding failed (non-critical): {e}")

    # Wait for the disaster wallet to exist on-ledger (faucet is async)
    account_exists = False
    for attempt in range(15):
        try:
            await xrpl_client.get_account_info(disaster_wallet.address)
            account_exists = True
            logger.info(f"Disaster wallet confirmed on-ledger after {attempt + 1} attempt(s)")
            break
        except Exception:
            await asyncio.sleep(2)
    if not account_exists:
        raise HTTPException(status_code=500, detail="Disaster wallet failed to activate on-ledger after faucet funding")

    if allocate_xrp and fund_amount > 0:
        logger.info(f"Funding disaster wallet: {from_drops(total_allocation)} XRP allocation + {from_drops(fund_amount - total_allocation)} XRP overhead = {from_drops(fund_amount)} XRP total")
        try:
            fund_result = await xrpl_client.submit_payment(
                wallet=xrpl_client.reserve_wallet,
                destination=disaster_wallet.address,
                amount_drops=fund_amount,
            )
            logger.info(f"Funded disaster account {disaster_id}: {fund_amount} drops")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fund disaster account: {e}")

    # 4b. Set up RLUSD TrustLine on disaster wallet (required for TokenEscrow)
    trustline_ok = False
    if allocate_rlusd and settings.RLUSD_ISSUER_ADDRESS:
        try:
            async with AsyncWebsocketClient(settings.XRPL_NODE_URL) as ws_client:
                tx = TrustSet(
                    account=disaster_wallet.address,
                    limit_amount=IssuedCurrencyAmount(
                        currency=settings.RLUSD_CURRENCY_HEX,
                        issuer=settings.RLUSD_ISSUER_ADDRESS,
                        value="1000000",
                    ),
                )
                resp = await submit_and_wait(tx, ws_client, disaster_wallet)
                tx_result = resp.result.get("meta", {}).get("TransactionResult", "")
                if tx_result == "tesSUCCESS":
                    trustline_ok = True
                    logger.info(f"RLUSD TrustLine set on disaster wallet {disaster_id}")
                else:
                    logger.error(f"TrustLine tx failed: {tx_result}")
        except Exception as e:
            logger.error(f"Failed to set RLUSD TrustLine on disaster wallet: {e}")
            traceback.print_exc()

        if not trustline_ok:
            logger.error("Cannot proceed with RLUSD allocation — TrustLine setup failed")

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
    batch_results = []
    if batch_params:
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

    # --- RLUSD TokenEscrow Allocation (same architecture as XRP) ---
    rlusd_allocations = []
    actual_rlusd_allocated_drops = 0
    if allocate_rlusd and trustline_ok:
        try:
            pool_rlusd = await xrpl_client.get_rlusd_balance(settings.POOL_WALLET_ADDRESS)
            logger.info(f"Pool RLUSD balance: {pool_rlusd}")
            if pool_rlusd > 1:
                rlusd_available_drops = to_drops(pool_rlusd)
                rlusd_allocs = calculate_allocations(orgs, rlusd_available_drops, req.severity)

                # Fund disaster wallet with RLUSD from pool FIRST
                rlusd_total_value = str(sum(from_drops(a["amount_drops"]) for a in rlusd_allocs))
                logger.info(f"Sending {rlusd_total_value} RLUSD from pool to disaster wallet...")
                fund_resp = await xrpl_client.submit_rlusd_payment(
                    wallet=xrpl_client.pool_wallet,
                    destination=disaster_wallet.address,
                    amount_value=rlusd_total_value,
                )
                fund_result_code = fund_resp.get("meta", {}).get("TransactionResult", "")
                logger.info(f"RLUSD funding result: {fund_result_code}")
                if fund_result_code != "tesSUCCESS":
                    raise Exception(f"RLUSD funding failed: {fund_result_code}")

                # Verify disaster wallet received RLUSD
                disaster_rlusd = await xrpl_client.get_rlusd_balance(disaster_wallet.address)
                logger.info(f"Disaster wallet RLUSD balance after funding: {disaster_rlusd}")

                # Build RLUSD escrow params (same pattern as XRP escrows above)
                rlusd_batch_params = []
                for alloc in rlusd_allocs:
                    rlusd_value = from_drops(alloc["amount_drops"])
                    memos = [
                        Memo(
                            memo_type=str_to_hex("rlusd_allocation"),
                            memo_data=json_to_hex({
                                "disaster_id": disaster_id,
                                "org_id": alloc["org_id"],
                            }),
                        )
                    ]
                    rlusd_batch_params.append({
                        "destination": alloc["org_address"],
                        "amount_drops": IssuedCurrencyAmount(
                            currency=settings.RLUSD_CURRENCY_HEX,
                            issuer=settings.RLUSD_ISSUER_ADDRESS,
                            value=str(rlusd_value),
                        ),
                        "finish_after": finish_after,
                        "cancel_after": cancel_after,
                        "memos": memos,
                    })

                logger.info(f"Creating {len(rlusd_batch_params)} RLUSD TokenEscrows...")
                rlusd_results = await xrpl_client.create_escrows_batch(
                    wallet=disaster_wallet,
                    escrow_params=rlusd_batch_params,
                )

                for alloc, result in zip(rlusd_allocs, rlusd_results):
                    org = db.query(Organization).filter_by(org_id=alloc["org_id"]).first()
                    if "error" in result:
                        logger.error(f"RLUSD escrow for {alloc['org_id']} failed: {result['error']}")
                        rlusd_allocations.append({
                            "org_id": alloc["org_id"],
                            "org_name": org.name if org else "Unknown",
                            "currency": "RLUSD",
                            "error": result["error"],
                        })
                    else:
                        tx_hash = result.get("hash", "")
                        sequence = result.get("Sequence") or result.get("tx_json", {}).get("Sequence", 0)

                        org_escrow = OrgEscrow(
                            disaster_id=disaster_id,
                            org_id=alloc["org_id"],
                            org_address=alloc["org_address"],
                            escrow_tx_hash=tx_hash,
                            amount_drops=alloc["amount_drops"],
                            currency="RLUSD",
                            status="locked",
                            finish_after=finish_after,
                            cancel_after=cancel_after,
                            sequence=sequence,
                        )
                        db.add(org_escrow)

                        actual_rlusd_allocated_drops += alloc["amount_drops"]
                        rlusd_allocations.append({
                            "org_id": alloc["org_id"],
                            "org_name": org.name if org else "Unknown",
                            "amount_rlusd": from_drops(alloc["amount_drops"]),
                            "percentage": alloc["percentage"],
                            "currency": "RLUSD",
                            "escrow_tx_hash": tx_hash,
                            "finish_after": finish_after,
                        })
                        logger.info(f"RLUSD escrow for {org.name if org else alloc['org_id']}: {from_drops(alloc['amount_drops'])} RLUSD (tx: {tx_hash})")

                disaster.total_rlusd_allocated_drops = actual_rlusd_allocated_drops
                db.commit()
            else:
                logger.warning(f"Pool RLUSD balance too low ({pool_rlusd}), skipping RLUSD allocation")
        except Exception as e:
            logger.error(f"RLUSD escrow allocation failed: {e}")
            traceback.print_exc()

    return {
        "disaster_id": disaster_id,
        "disaster_account": disaster_wallet.address,
        "total_allocated_xrp": from_drops(actual_allocated_drops),
        "total_allocated_rlusd": from_drops(actual_rlusd_allocated_drops),
        "allocations": escrow_results,
        "rlusd_allocations": rlusd_allocations,
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
        currency = getattr(e, 'currency', 'XRP') or 'XRP'
        org_escrows.append({
            "org_id": e.org_id,
            "org_name": org.name if org else "Unknown",
            "amount_xrp": from_drops(e.amount_drops),
            "currency": currency,
            "status": e.status,
            "escrow_tx_hash": e.escrow_tx_hash,
            "finish_tx_hash": e.finish_tx_hash,
            "finished_at": e.finished_at.isoformat() if e.finished_at else None,
        })

    rlusd_drops = getattr(disaster, 'total_rlusd_allocated_drops', 0) or 0
    return {
        "disaster_id": disaster.disaster_id,
        "disaster_type": disaster.disaster_type,
        "location": disaster.location,
        "severity": disaster.severity,
        "total_allocated_xrp": from_drops(disaster.total_allocated_drops),
        "total_allocated_rlusd": from_drops(rlusd_drops),
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
        rlusd_drops = getattr(d, 'total_rlusd_allocated_drops', 0) or 0
        result.append({
            "disaster_id": d.disaster_id,
            "disaster_type": d.disaster_type,
            "location": d.location,
            "severity": d.severity,
            "total_allocated_xrp": from_drops(d.total_allocated_drops),
            "total_allocated_rlusd": from_drops(rlusd_drops),
            "status": d.status,
            "org_count": len(escrows),
            "finished_count": finished_count,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return {"disasters": result}
