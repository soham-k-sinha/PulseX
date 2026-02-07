from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.organization import Organization
from app.utils.ripple_time import from_drops

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("")
async def list_organizations(db: Session = Depends(get_db)):
    orgs = db.query(Organization).order_by(Organization.org_id).all()
    return {
        "organizations": [
            {
                "org_id": o.org_id,
                "name": o.name,
                "cause_type": o.cause_type,
                "wallet_address": o.wallet_address,
                "need_score": o.need_score,
                "total_received_xrp": from_drops(o.total_received_drops),
            }
            for o in orgs
        ]
    }
