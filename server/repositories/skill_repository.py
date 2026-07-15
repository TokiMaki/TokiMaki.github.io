import threading
from copy import deepcopy

from ..api_fanout_trace import record_cache_event
from ..neople_client import clean_text, fetch_skill_detail_from_api


_SKILL_DETAIL_CACHE_LOCK = threading.Lock()
_SKILL_DETAIL_CACHE: dict[tuple[str, str], dict] = {}
_SKILL_DETAIL_IN_FLIGHT: dict[tuple[str, str], dict] = {}


def get_skill_detail(job_id: str, skill_id: str) -> dict:
    cache_key = (clean_text(job_id), clean_text(skill_id))
    with _SKILL_DETAIL_CACHE_LOCK:
        cached = _SKILL_DETAIL_CACHE.get(cache_key)
        if cached is not None:
            record_cache_event("skill_detail", "hit")
            return deepcopy(cached)

        flight = _SKILL_DETAIL_IN_FLIGHT.get(cache_key)
        if flight is None:
            flight = {
                "event": threading.Event(),
                "value": None,
                "error": None,
            }
            _SKILL_DETAIL_IN_FLIGHT[cache_key] = flight
            is_owner = True
            record_cache_event("skill_detail", "miss")
        else:
            is_owner = False
            record_cache_event("skill_detail", "wait")

    if not is_owner:
        flight["event"].wait()
        if flight["error"] is not None:
            raise flight["error"]
        return deepcopy(flight["value"] or {})

    try:
        record_cache_event("skill_detail", "fetch")
        value = fetch_skill_detail_from_api(*cache_key)
        normalized_value = deepcopy(value) if isinstance(value, dict) else {}
        with _SKILL_DETAIL_CACHE_LOCK:
            flight["value"] = normalized_value
            if normalized_value:
                _SKILL_DETAIL_CACHE[cache_key] = deepcopy(normalized_value)
        return deepcopy(normalized_value)
    except Exception as exc:
        with _SKILL_DETAIL_CACHE_LOCK:
            flight["error"] = exc
        raise
    finally:
        with _SKILL_DETAIL_CACHE_LOCK:
            _SKILL_DETAIL_IN_FLIGHT.pop(cache_key, None)
            flight["event"].set()
