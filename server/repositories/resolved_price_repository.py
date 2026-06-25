import threading
import time
from copy import deepcopy

from ..api_fanout_trace import record_cache_event, record_resolved_price_cache_event


RESOLVED_PRICE_CACHE_TTL_SECONDS = 300
RESOLVED_PRICE_CACHE_MAX_ENTRIES = 512
_RESOLVED_PRICE_CACHE_LOCK = threading.Lock()
_RESOLVED_PRICE_CACHE = {}


def _prune_resolved_price_cache(now: float):
    expired_keys = [
        key for key, cached in _RESOLVED_PRICE_CACHE.items()
        if float(cached.get("expires_at") or 0) <= now
    ]
    for key in expired_keys:
        _RESOLVED_PRICE_CACHE.pop(key, None)
    overflow = len(_RESOLVED_PRICE_CACHE) - RESOLVED_PRICE_CACHE_MAX_ENTRIES
    if overflow <= 0:
        return
    for key, _cached in sorted(
        _RESOLVED_PRICE_CACHE.items(),
        key=lambda item: float(item[1].get("stored_at") or 0),
    )[:overflow]:
        _RESOLVED_PRICE_CACHE.pop(key, None)


def _get_resolved_price_cache_domain(cache_key: tuple) -> str:
    if isinstance(cache_key, tuple) and cache_key:
        domain = cache_key[0]
        if isinstance(domain, str) and domain:
            return domain
    return "unknown"


def get_cached_resolved_price(cache_key: tuple, resolver, should_cache=None):
    domain = _get_resolved_price_cache_domain(cache_key)
    now = time.time()
    with _RESOLVED_PRICE_CACHE_LOCK:
        cached = _RESOLVED_PRICE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            record_cache_event("resolved_price", "hit")
            record_resolved_price_cache_event(domain, "hit")
            return deepcopy(cached.get("value") or {})

    record_cache_event("resolved_price", "miss")
    record_resolved_price_cache_event(domain, "miss")
    try:
        value = resolver()
    except Exception:
        record_resolved_price_cache_event(domain, "error")
        raise
    if not value:
        record_resolved_price_cache_event(domain, "skip")
        return value
    if should_cache is not None and not should_cache(value):
        record_resolved_price_cache_event(domain, "skip")
        return value

    with _RESOLVED_PRICE_CACHE_LOCK:
        _RESOLVED_PRICE_CACHE[cache_key] = {
            "value": deepcopy(value),
            "stored_at": now,
            "expires_at": now + RESOLVED_PRICE_CACHE_TTL_SECONDS,
        }
        _prune_resolved_price_cache(now)
    record_resolved_price_cache_event(domain, "store")
    return deepcopy(value)
