import json
import time
from copy import deepcopy
from pathlib import Path
from threading import Lock, Thread

from .ops_log import write_ops_log

ROOT = Path(__file__).resolve().parents[1]
PRICE_CACHE_DIR = ROOT / "Docs" / ".price_cache"
ENCHANT_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "enchant_prices.json"
CREATURE_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "creature_prices.json"
TITLE_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "title_prices.json"
AURA_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "aura_prices.json"
PRICE_REFRESH_INTERVAL_SECONDS = 600
PRICE_ERROR_RETRY_INTERVAL_SECONDS = 60
ENCHANT_PRICE_CACHE_SCHEMA_VERSION = 13

_CACHE_LOCK = Lock()
_ENCHANT_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_CREATURE_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_TITLE_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_AURA_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}


def get_price_cache_ttl_seconds(payload: dict) -> int:
    return (
        PRICE_ERROR_RETRY_INTERVAL_SECONDS
        if payload.get("errors")
        else PRICE_REFRESH_INTERVAL_SECONDS
    )


def add_cache_status(payload: dict, cache: dict, stale: bool = False) -> dict:
    result = dict(payload)
    result["cache"] = {
        "stale": stale,
        "refreshing": bool(cache.get("refreshing")),
        "expiresAt": cache.get("expires_at"),
    }
    return result


def _cache_text(value) -> str:
    return str(value or "").strip()


def _is_priced_auction(auction: dict) -> bool:
    return (
        isinstance((auction or {}).get("minUnitPrice"), (int, float))
        and (auction or {}).get("minUnitPrice") > 0
    )


def _get_auction_identity(row: dict):
    price_item = row.get("priceItem") or {}
    item_id = _cache_text(price_item.get("itemId") or row.get("itemId"))
    item_name = _cache_text(price_item.get("itemName") or row.get("itemName"))
    if item_id:
        item_key = ("itemId", item_id)
    elif item_name:
        item_key = (
            "itemName",
            item_name,
            _cache_text(row.get("itemTypeDetail")),
        )
    else:
        return None
    return (
        *item_key,
        _cache_text(row.get("purchaseRoute")),
        _cache_text(row.get("sourceType")),
        _cache_text(row.get("slot")),
        _cache_text(row.get("targetSlotId")),
        int(row.get("needCount") or 0),
        _cache_text(row.get("variant")),
    )


def _collect_priced_auctions(value, result: dict):
    if isinstance(value, dict):
        auction = value.get("auction")
        identity = _get_auction_identity(value)
        if identity and isinstance(auction, dict) and _is_priced_auction(auction):
            previous = result.get(identity)
            if (
                previous is None
                or auction.get("minUnitPrice", 10**30) < previous.get("minUnitPrice", 10**30)
            ):
                result[identity] = deepcopy(auction)
        for item in value.values():
            _collect_priced_auctions(item, result)
    elif isinstance(value, list):
        for item in value:
            _collect_priced_auctions(item, result)


def merge_last_known_auction_prices(previous_payload: dict | None, current_payload: dict) -> dict:
    if not isinstance(current_payload, dict):
        return current_payload
    priced_by_identity = {}
    _collect_priced_auctions(previous_payload or {}, priced_by_identity)
    if not priced_by_identity:
        return current_payload

    def merge(value):
        if isinstance(value, dict):
            result = {
                key: merge(item)
                for key, item in value.items()
            }
            auction = result.get("auction")
            identity = _get_auction_identity(result)
            previous_auction = priced_by_identity.get(identity)
            if (
                identity
                and isinstance(auction, dict)
                and not _is_priced_auction(auction)
                and previous_auction
            ):
                lookup_status = _cache_text(auction.get("priceStatus")) or "unlisted"
                result["auction"] = {
                    **deepcopy(previous_auction),
                    "priceStatus": "priced",
                    "isLastKnownPrice": True,
                    "lookupPriceStatus": lookup_status,
                }
            return result
        if isinstance(value, list):
            return [merge(item) for item in value]
        return deepcopy(value)

    return merge(current_payload)


def load_price_cache_from_disk(cache: dict, path: Path) -> bool:
    if cache.get("payload") is not None or not path.exists():
        return False
    try:
        with path.open("r", encoding="utf-8") as fp:
            stored = json.load(fp)
        payload = stored.get("payload")
        if not isinstance(payload, dict):
            return False
        with _CACHE_LOCK:
            cache["payload"] = payload
            cache["expires_at"] = float(stored.get("expires_at") or 0)
        return True
    except Exception:
        return False


def save_price_cache_to_disk(path: Path, payload: dict, expires_at: float):
    try:
        PRICE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fp:
            json.dump(
                {"expires_at": expires_at, "payload": payload},
                fp,
                ensure_ascii=False,
                indent=2,
            )
    except Exception:
        pass


def start_cache_refresh(cache: dict, refresh_fn, name: str = "price") -> bool:
    with _CACHE_LOCK:
        if cache.get("refreshing"):
            write_ops_log("cache_refresh_skip", cache=name, reason="already_refreshing")
            return False
        cache["refreshing"] = True

    def worker():
        started_at = time.time()
        write_ops_log("cache_refresh_start", cache=name)
        try:
            payload = refresh_fn()
            payload_dict = payload if isinstance(payload, dict) else {}
            write_ops_log(
                "cache_refresh_success",
                cache=name,
                elapsedMs=round((time.time() - started_at) * 1000),
                groups=len(payload_dict.get("groups") or []),
                cards=len(payload_dict.get("cards") or []),
                errors=len(payload_dict.get("errors") or []),
            )
        except Exception as exc:
            write_ops_log(
                "cache_refresh_error",
                cache=name,
                elapsedMs=round((time.time() - started_at) * 1000),
                error=str(exc),
            )
        finally:
            with _CACHE_LOCK:
                cache["refreshing"] = False

    Thread(target=worker, daemon=True).start()
    return True


def start_periodic_price_refresh(refresh_jobs, interval: int = PRICE_REFRESH_INTERVAL_SECONDS, run_immediately: bool = True):
    def refresh_loop():
        if not run_immediately:
            time.sleep(interval)
        while True:
            for job in refresh_jobs:
                if len(job) == 3:
                    cache, refresh_fn, name = job
                else:
                    cache, refresh_fn = job
                    name = "price"
                start_cache_refresh(cache, refresh_fn, name=name)
            time.sleep(interval)

    Thread(target=refresh_loop, daemon=True).start()
