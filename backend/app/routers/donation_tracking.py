"""
Donation tracking endpoint - shows donors how their funds were used
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.donation import Donation
from app.models.batch_escrow import BatchEscrow
from app.models.disaster import Disaster
from app.models.org_escrow import OrgEscrow
from app.models.organization import Organization
from app.utils.ripple_time import from_drops

router = APIRouter(prefix="/api/donations", tags=["donations"])


@router.get("/track/{donor_address}")
def track_donations(donor_address: str, db: Session = Depends(get_db)):
    """
    Get detailed tracking for all donations by a donor, including:
    - Current status in the flow
    - Which batch they're in (if batched)
    - Which disaster they funded (if allocated)
    - Which organizations received their funds (if distributed)
    """
    # Get all donations by this donor
    donations = db.query(Donation).filter(
        Donation.donor_address == donor_address
    ).order_by(Donation.created_at.desc()).all()

    tracked_donations = []
    for donation in donations:
        tracking = {
            "donation_id": str(donation.id),
            "amount_xrp": from_drops(donation.amount_drops),
            "payment_tx_hash": donation.payment_tx_hash,
            "created_at": donation.created_at.isoformat(),
            "status": donation.batch_status,
            "batch_id": donation.batch_id,
            "lifecycle": {
                "received": True,
                "batched": False,
                "released_to_reserve": False,
                "allocated_to_disaster": False,
                "sent_to_orgs": False,
                "released_to_orgs": False,
            },
            "batch_info": None,
            "disaster_allocations": [],
        }

        # Check batch status
        if donation.batch_id:
            tracking["lifecycle"]["batched"] = True

            # Get batch escrow details
            batch = db.query(BatchEscrow).filter(
                BatchEscrow.batch_id == donation.batch_id
            ).first()

            if batch:
                tracking["batch_info"] = {
                    "batch_id": batch.batch_id,
                    "escrow_tx_hash": batch.escrow_tx_hash,
                    "finish_tx_hash": batch.finish_tx_hash,
                    "status": batch.status,
                    "total_amount_xrp": from_drops(batch.total_amount_drops),
                    "donor_count": batch.donor_count,
                    "created_at": batch.created_at.isoformat(),
                    "finished_at": batch.finished_at.isoformat() if batch.finished_at else None,
                }

                if batch.status == "finished":
                    tracking["lifecycle"]["released_to_reserve"] = True

                    # Calculate pro-rata share: this donation's contribution to the batch
                    donation_drops = donation.amount_drops
                    batch_total_drops = batch.total_amount_drops
                    donation_share_pct = (donation_drops / batch_total_drops) * 100 if batch_total_drops > 0 else 0

                    # Find disasters that were funded after this batch was released
                    if batch.finished_at:
                        disasters = db.query(Disaster).filter(
                            Disaster.created_at >= batch.finished_at
                        ).order_by(Disaster.created_at).all()

                        for disaster in disasters:
                            tracking["lifecycle"]["allocated_to_disaster"] = True

                            # Calculate this donor's pro-rata share of the disaster allocation
                            disaster_total_drops = disaster.total_allocated_drops
                            donor_share_drops = int(disaster_total_drops * donation_drops / batch_total_drops) if batch_total_drops > 0 else 0
                            donor_share_xrp = from_drops(donor_share_drops)

                            # Get org escrows for this disaster with organization details
                            org_escrows = db.query(OrgEscrow, Organization).join(
                                Organization, OrgEscrow.org_id == Organization.org_id
                            ).filter(OrgEscrow.disaster_id == disaster.disaster_id).all()

                            disaster_allocation = {
                                "disaster_id": disaster.disaster_id,
                                "disaster_type": disaster.disaster_type,
                                "location": disaster.location,
                                "severity": disaster.severity,
                                "total_allocated_xrp": from_drops(disaster.total_allocated_drops),
                                "your_share_xrp": donor_share_xrp,
                                "your_share_pct": round(donation_share_pct, 2),
                                "status": disaster.status,
                                "created_at": disaster.created_at.isoformat(),
                                "organizations": [],
                            }

                            if org_escrows:
                                tracking["lifecycle"]["sent_to_orgs"] = True

                            for org_escrow, org in org_escrows:
                                # Calculate donor's share of this org's allocation
                                org_total_drops = org_escrow.amount_drops
                                donor_org_share_drops = int(org_total_drops * donation_drops / batch_total_drops) if batch_total_drops > 0 else 0
                                donor_org_share_xrp = from_drops(donor_org_share_drops)

                                org_info = {
                                    "org_name": org.name,
                                    "cause_type": org.cause_type,
                                    "total_amount_xrp": from_drops(org_escrow.amount_drops),
                                    "your_share_xrp": donor_org_share_xrp,
                                    "escrow_tx_hash": org_escrow.escrow_tx_hash,
                                    "finish_tx_hash": org_escrow.finish_tx_hash,
                                    "status": org_escrow.status,
                                    "created_at": org_escrow.created_at.isoformat(),
                                    "finished_at": org_escrow.finished_at.isoformat() if org_escrow.finished_at else None,
                                }

                                if org_escrow.status == "finished":
                                    tracking["lifecycle"]["released_to_orgs"] = True

                                disaster_allocation["organizations"].append(org_info)

                            tracking["disaster_allocations"].append(disaster_allocation)

        tracked_donations.append(tracking)

    return {
        "donor_address": donor_address,
        "total_donations": len(tracked_donations),
        "donations": tracked_donations,
    }
