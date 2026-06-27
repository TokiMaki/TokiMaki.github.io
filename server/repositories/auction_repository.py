import time

from ..neople_client import clean_text, get_auction_rows_by_item_ids_from_api, get_auction_rows_by_name_from_api, get_auction_rows_from_api
from ..price_cache import (
    AURA_PRICE_CACHE_PATH,
    PRICE_REFRESH_INTERVAL_SECONDS,
    _AURA_PRICE_CACHE,
    _CACHE_LOCK,
    add_cache_status,
    load_price_cache_from_disk,
    save_price_cache_to_disk,
    start_cache_refresh,
)


def get_auction_rows(item_id: str, min_fame=None, max_fame=None, limit: int = 100) -> list:
    return get_auction_rows_from_api(item_id, min_fame=min_fame, max_fame=max_fame, limit=limit)


def get_auction_rows_by_name(item_name: str, word_type: str = "full", limit: int = 100, offset: int = 0) -> list:
    return get_auction_rows_by_name_from_api(item_name, word_type=word_type, limit=limit, offset=offset)


def _auction_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _lowest_auction_price_from_rows(rows: list, require_max_upgrade: bool = False) -> dict:
    priced_rows = [
        row for row in rows
        if isinstance(row.get("unitPrice"), (int, float)) and row.get("unitPrice") > 0
    ]
    if require_max_upgrade:
        candidate_rows = [
            row for row in priced_rows
            if _auction_int(row.get("upgradeMax")) > 0
            and _auction_int(row.get("upgrade")) == _auction_int(row.get("upgradeMax"))
        ]
    else:
        completed_rows = [
            row for row in priced_rows
            if _auction_int(row.get("upgrade")) == _auction_int(row.get("upgradeMax"))
        ]
        if completed_rows:
            candidate_rows = completed_rows
        else:
            max_upgrade = max((_auction_int(row.get("upgrade")) for row in priced_rows), default=0)
            candidate_rows = [
                row for row in priced_rows
                if _auction_int(row.get("upgrade")) == max_upgrade
            ]

    lowest = min(candidate_rows, key=lambda row: row.get("unitPrice"), default=None)
    return {
        "listingCount": sum(int(row.get("regCount") or 0) for row in candidate_rows),
        "minUnitPrice": lowest.get("unitPrice") if lowest else None,
        "averagePrice": lowest.get("averagePrice") if lowest and lowest.get("averagePrice", 0) > 0 else None,
        "auctionNo": lowest.get("auctionNo") if lowest else None,
        "upgrade": lowest.get("upgrade") if lowest else None,
        "upgradeMax": lowest.get("upgradeMax") if lowest else None,
        "isMaxUpgrade": bool(lowest) and _auction_int(lowest.get("upgrade")) == _auction_int(lowest.get("upgradeMax")),
    }


def get_lowest_auction_price(item_id: str, min_fame=None, max_fame=None, require_max_upgrade: bool = False) -> dict:
    return _lowest_auction_price_from_rows(
        get_auction_rows(item_id, min_fame=min_fame, max_fame=max_fame),
        require_max_upgrade=require_max_upgrade,
    )


def get_lowest_auction_prices(item_ids: list[str], fame_by_item_id: dict[str, int] | None = None, limit: int = 100) -> dict[str, dict]:
    unique_ids = []
    seen = set()
    for item_id in item_ids:
        item_id = clean_text(item_id)
        if item_id and item_id not in seen:
            unique_ids.append(item_id)
            seen.add(item_id)
    if not unique_ids:
        return {}

    rows_by_id = {item_id: [] for item_id in unique_ids}
    for index in range(0, len(unique_ids), 10):
        chunk = unique_ids[index:index + 10]
        for row in get_auction_rows_by_item_ids_from_api(chunk, limit=limit):
            item_id = clean_text(row.get("itemId"))
            if item_id in rows_by_id:
                rows_by_id[item_id].append(row)

    prices = {}
    for item_id, rows in rows_by_id.items():
        target_fame = (fame_by_item_id or {}).get(item_id)
        if target_fame is not None:
            rows = [
                row for row in rows
                if int(row.get("fame") or 0) == int(target_fame)
            ]
        prices[item_id] = _lowest_auction_price_from_rows(rows)
    return prices


def get_aura_price_cache_payload(force_refresh: bool, allow_stale: bool, schema_version: int, refresh_fn):
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _AURA_PRICE_CACHE["payload"]
        expires_at = _AURA_PRICE_CACHE["expires_at"]
        if payload is not None and payload.get("schemaVersion") != schema_version:
            payload = None
            _AURA_PRICE_CACHE["payload"] = None
            _AURA_PRICE_CACHE["expires_at"] = 0

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _AURA_PRICE_CACHE)
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: refresh_fn(force_refresh=True, allow_stale=False),
            name="aura",
        )
        return add_cache_status(payload, _AURA_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _AURA_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: refresh_fn(force_refresh=True, allow_stale=False),
            name="aura",
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)
    return None


def save_aura_price_cache_payload(payload: dict, now: float) -> dict:
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _AURA_PRICE_CACHE["payload"] = payload
        _AURA_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(AURA_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _AURA_PRICE_CACHE)
