import threading
import time
from copy import deepcopy

from ..api_fanout_trace import record_cache_event, record_resolved_price_cache_event


RESOLVED_PRICE_CACHE_TTL_SECONDS = 600
RESOLVED_PRICE_UNAVAILABLE_RETRY_SECONDS = 60
RESOLVED_PRICE_UNLISTED_RETRY_SECONDS = 600
RESOLVED_PRICE_CACHE_MAX_ENTRIES = 4096
_RESOLVED_PRICE_CACHE_LOCK = threading.Lock()
_RESOLVED_PRICE_CACHE = {}


def _prune_resolved_price_cache(now: float):
    overflow = len(_RESOLVED_PRICE_CACHE) - RESOLVED_PRICE_CACHE_MAX_ENTRIES
    if overflow <= 0:
        return
    for key, _cached in sorted(
        _RESOLVED_PRICE_CACHE.items(),
        key=lambda item: float(item[1].get("last_accessed_at") or item[1].get("stored_at") or 0),
    )[:overflow]:
        _RESOLVED_PRICE_CACHE.pop(key, None)


def _get_resolved_price_cache_domain(cache_key: tuple) -> str:
    if isinstance(cache_key, tuple) and cache_key:
        domain = cache_key[0]
        if isinstance(domain, str) and domain:
            return domain
    return "unknown"


def _has_positive_price(value) -> bool:
    if isinstance(value, dict):
        selected_price = value.get("selectedPrice")
        if isinstance(selected_price, (int, float)) and selected_price > 0:
            return True
        min_unit_price = value.get("minUnitPrice")
        if isinstance(min_unit_price, (int, float)) and min_unit_price > 0:
            return True
        return any(_has_positive_price(item) for item in value.values())
    if isinstance(value, list):
        return any(_has_positive_price(item) for item in value)
    return False


def _get_lookup_price_status(value) -> str:
    if isinstance(value, dict):
        status = value.get("priceStatus")
        if isinstance(status, str) and status:
            return status
        auction = value.get("auction")
        if isinstance(auction, dict):
            status = auction.get("priceStatus")
            if isinstance(status, str) and status:
                return status
        for item in value.values():
            status = _get_lookup_price_status(item)
            if status:
                return status
    if isinstance(value, list):
        for item in value:
            status = _get_lookup_price_status(item)
            if status:
                return status
    return ""


def _get_retry_ttl_seconds(lookup_price_status: str) -> int:
    return (
        RESOLVED_PRICE_UNLISTED_RETRY_SECONDS
        if lookup_price_status == "unlisted"
        else RESOLVED_PRICE_UNAVAILABLE_RETRY_SECONDS
    )


def _mark_last_known_price(value, lookup_price_status: str, *, root: bool = True):
    if isinstance(value, dict):
        result = {
            key: _mark_last_known_price(item, lookup_price_status, root=False)
            for key, item in value.items()
        }
        has_price_shape = (
            root
            or "minUnitPrice" in result
            or "selectedPrice" in result
            or isinstance(result.get("auction"), dict)
        )
        if has_price_shape:
            result["isLastKnownPrice"] = True
            if lookup_price_status:
                result["lookupPriceStatus"] = lookup_price_status
        return result
    if isinstance(value, list):
        return [
            _mark_last_known_price(item, lookup_price_status, root=False)
            for item in value
        ]
    return deepcopy(value)


def get_fresh_cached_resolved_price(cache_key: tuple):
    now = time.time()
    with _RESOLVED_PRICE_CACHE_LOCK:
        cached = _RESOLVED_PRICE_CACHE.get(cache_key)
        if not cached or float(cached.get("expires_at") or 0) <= now:
            return None
        cached["last_accessed_at"] = now
        value = deepcopy(cached.get("value") or {})
        is_last_known = bool(cached.get("is_last_known"))
        lookup_price_status = str(cached.get("lookup_price_status") or "")
    if is_last_known:
        value = _mark_last_known_price(value, lookup_price_status)
    return value


def _store_resolved_price_cache_entry(
    cache_key: tuple,
    value,
    now: float,
    *,
    is_last_known: bool = False,
    lookup_price_status: str = "",
    ttl_seconds: int = RESOLVED_PRICE_CACHE_TTL_SECONDS,
):
    with _RESOLVED_PRICE_CACHE_LOCK:
        previous = _RESOLVED_PRICE_CACHE.get(cache_key) or {}
        _RESOLVED_PRICE_CACHE[cache_key] = {
            "value": deepcopy(value),
            "stored_at": float(previous.get("stored_at") or now),
            "last_accessed_at": now,
            "expires_at": now + ttl_seconds,
            "is_last_known": is_last_known,
            "lookup_price_status": lookup_price_status,
        }
        _prune_resolved_price_cache(now)


def _get_previous_priced_value(cache_key: tuple):
    with _RESOLVED_PRICE_CACHE_LOCK:
        cached = _RESOLVED_PRICE_CACHE.get(cache_key)
        value = deepcopy((cached or {}).get("value") or {})
    return value if value and _has_positive_price(value) else None


def remember_cached_resolved_price(cache_key: tuple, value, should_cache=None) -> bool:
    if not value or (should_cache is not None and not should_cache(value)):
        return False
    _store_resolved_price_cache_entry(cache_key, value, time.time())
    return True


def seed_last_known_resolved_price(
    cache_key: tuple,
    value,
    *,
    updated_at_ms: int | float | None = None,
) -> bool:
    if not value or not _has_positive_price(value):
        return False
    with _RESOLVED_PRICE_CACHE_LOCK:
        if cache_key in _RESOLVED_PRICE_CACHE:
            return False
        now = time.time()
        updated_at = (
            float(updated_at_ms) / 1000
            if isinstance(updated_at_ms, (int, float)) and updated_at_ms > 0
            else 0
        )
        expires_at = updated_at + RESOLVED_PRICE_CACHE_TTL_SECONDS if updated_at else 0
        is_fresh = expires_at > now
        _RESOLVED_PRICE_CACHE[cache_key] = {
            "value": deepcopy(value),
            "stored_at": updated_at or now,
            "last_accessed_at": now,
            "expires_at": expires_at if is_fresh else 0,
            "is_last_known": not is_fresh,
            "lookup_price_status": "" if is_fresh else "cached",
        }
        _prune_resolved_price_cache(now)
    return True


def get_cached_resolved_price(cache_key: tuple, resolver, should_cache=None):
    domain = _get_resolved_price_cache_domain(cache_key)
    now = time.time()
    fresh = get_fresh_cached_resolved_price(cache_key)
    if fresh is not None:
        record_cache_event("resolved_price", "hit")
        record_resolved_price_cache_event(domain, "hit")
        return fresh

    record_cache_event("resolved_price", "miss")
    record_resolved_price_cache_event(domain, "miss")
    previous_value = _get_previous_priced_value(cache_key)
    try:
        value = resolver()
    except Exception:
        record_resolved_price_cache_event(domain, "error")
        if previous_value is not None:
            _store_resolved_price_cache_entry(
                cache_key,
                previous_value,
                now,
                is_last_known=True,
                lookup_price_status="unavailable",
                ttl_seconds=RESOLVED_PRICE_UNAVAILABLE_RETRY_SECONDS,
            )
            record_resolved_price_cache_event(domain, "stale")
            return _mark_last_known_price(previous_value, "unavailable")
        raise

    cacheable = bool(value) and (should_cache is None or should_cache(value))
    if not cacheable:
        if previous_value is not None:
            lookup_price_status = _get_lookup_price_status(value) or "unlisted"
            _store_resolved_price_cache_entry(
                cache_key,
                previous_value,
                now,
                is_last_known=True,
                lookup_price_status=lookup_price_status,
                ttl_seconds=_get_retry_ttl_seconds(lookup_price_status),
            )
            record_resolved_price_cache_event(domain, "stale")
            return _mark_last_known_price(previous_value, lookup_price_status)
        negative_value = value if value is not None else {}
        lookup_price_status = _get_lookup_price_status(negative_value) or "unavailable"
        _store_resolved_price_cache_entry(
            cache_key,
            negative_value,
            now,
            ttl_seconds=_get_retry_ttl_seconds(lookup_price_status),
        )
        record_resolved_price_cache_event(domain, "store")
        return deepcopy(negative_value)

    _store_resolved_price_cache_entry(cache_key, value, now)
    record_resolved_price_cache_event(domain, "store")
    return deepcopy(value)
