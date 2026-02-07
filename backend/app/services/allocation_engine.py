import logging
from typing import List

logger = logging.getLogger(__name__)


def calculate_allocations(orgs: list, total_drops: int, severity: int) -> List[dict]:
    """
    AI-style allocation engine.
    Weights organizations by their need_score relative to disaster severity.
    """
    if not orgs:
        return []

    weighted_orgs = []
    for org in orgs:
        weight = org.need_score * (severity / 10.0)
        weighted_orgs.append({
            "org_id": org.org_id,
            "org_address": org.wallet_address,
            "name": org.name,
            "weight": weight,
        })

    total_weight = sum(o["weight"] for o in weighted_orgs)
    if total_weight == 0:
        equal_share = total_drops // len(weighted_orgs)
        return [
            {
                "org_id": o["org_id"],
                "org_address": o["org_address"],
                "amount_drops": equal_share,
                "percentage": round(100 / len(weighted_orgs), 1),
            }
            for o in weighted_orgs
        ]

    allocations = []
    allocated_so_far = 0

    for i, org in enumerate(weighted_orgs):
        pct = org["weight"] / total_weight
        if i == len(weighted_orgs) - 1:
            # Last org gets remainder to avoid rounding issues
            amount = total_drops - allocated_so_far
        else:
            amount = int(total_drops * pct)
        allocated_so_far += amount

        allocations.append({
            "org_id": org["org_id"],
            "org_address": org["org_address"],
            "amount_drops": amount,
            "percentage": round(pct * 100, 1),
        })

    logger.info(f"Allocation complete: {len(allocations)} orgs, {total_drops} drops total")
    return allocations
