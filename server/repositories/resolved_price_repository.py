import threading
import time
from copy import deepcopy

from ..api_fanout_trace import record_cache_event


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


def get_cached_resolved_price(cache_key: tuple, resolver):
    now = time.time()
    with _RESOLVED_PRICE_CACHE_LOCK:
        cached = _RESOLVED_PRICE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            record_cache_event("resolved_price", "hit")
            return deepcopy(cached.get("value") or {})

    record_cache_event("resolved_price", "miss")
    value = resolver()
    if not value:
        return value

    with _RESOLVED_PRICE_CACHE_LOCK:
        _RESOLVED_PRICE_CACHE[cache_key] = {
            "value": deepcopy(value),
            "stored_at": now,
            "expires_at": now + RESOLVED_PRICE_CACHE_TTL_SECONDS,
        }
        _prune_resolved_price_cache(now)
    return deepcopy(value)
