import threading
import time

from ..neople_client import clean_text, fetch_character_payload_from_api


CHARACTER_RESPONSE_CACHE_TTL_SECONDS = 15
_CHARACTER_RESPONSE_CACHE_LOCK = threading.Lock()
_CHARACTER_RESPONSE_CACHE = {}


def get_character_cached_payload(server_id: str, character_id: str, resource: str, path: str) -> dict:
    cache_key = (clean_text(server_id).lower(), clean_text(character_id), resource)
    now = time.time()
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        cached = _CHARACTER_RESPONSE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            return cached.get("payload") or {}

    payload = fetch_character_payload_from_api(server_id, character_id, path)
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        _CHARACTER_RESPONSE_CACHE[cache_key] = {
            "payload": payload,
            "expires_at": now + CHARACTER_RESPONSE_CACHE_TTL_SECONDS,
        }
    return payload
