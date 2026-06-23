import time

from ..neople_client import get_auction_rows_by_name_from_api, get_auction_rows_from_api
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
