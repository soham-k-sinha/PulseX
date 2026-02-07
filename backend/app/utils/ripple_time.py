import json
import time
from datetime import datetime, timezone

RIPPLE_EPOCH_OFFSET = 946684800


def ripple_epoch(unix_timestamp: float) -> int:
    return int(unix_timestamp - RIPPLE_EPOCH_OFFSET)


def ripple_epoch_now() -> int:
    return ripple_epoch(time.time())


def from_ripple_epoch(ripple_time: int) -> datetime:
    return datetime.fromtimestamp(ripple_time + RIPPLE_EPOCH_OFFSET, tz=timezone.utc)


def to_drops(xrp: float) -> int:
    return int(xrp * 1_000_000)


def from_drops(drops: int) -> float:
    return drops / 1_000_000


def json_to_hex(data: dict) -> str:
    json_str = json.dumps(data, separators=(",", ":"))
    return json_str.encode("utf-8").hex().upper()


def hex_to_json(hex_str: str) -> dict:
    json_str = bytes.fromhex(hex_str).decode("utf-8")
    return json.loads(json_str)


def str_to_hex(text: str) -> str:
    return text.encode("utf-8").hex().upper()
