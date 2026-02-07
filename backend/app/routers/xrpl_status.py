import logging
from fastapi import APIRouter
from app.config import settings
from app.services.xrpl_client import xrpl_client
from app.utils.ripple_time import from_drops

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/xrpl", tags=["xrpl"])


@router.get("/status")
async def get_xrpl_status():
    pool_balance = 0
    reserve_balance = 0

    try:
        pool_info = await xrpl_client.get_account_info(settings.POOL_WALLET_ADDRESS)
        pool_balance = int(pool_info["account_data"]["Balance"])
    except Exception as e:
        logger.warning(f"Failed to get pool balance: {e}")

    try:
        reserve_info = await xrpl_client.get_account_info(settings.RESERVE_WALLET_ADDRESS)
        reserve_balance = int(reserve_info["account_data"]["Balance"])
    except Exception as e:
        logger.warning(f"Failed to get reserve balance: {e}")

    return {
        "network": settings.XRPL_NETWORK,
        "node_url": settings.XRPL_NODE_URL,
        "accounts": {
            "pool": {
                "address": settings.POOL_WALLET_ADDRESS,
                "balance_xrp": from_drops(pool_balance),
                "balance_drops": pool_balance,
            },
            "reserve": {
                "address": settings.RESERVE_WALLET_ADDRESS,
                "balance_xrp": from_drops(reserve_balance),
                "balance_drops": reserve_balance,
            },
        },
    }
