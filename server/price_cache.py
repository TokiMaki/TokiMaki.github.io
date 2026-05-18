import json
import time
from pathlib import Path
from threading import Lock, Thread

ROOT = Path(__file__).resolve().parents[1]
PRICE_CACHE_DIR = ROOT / "Docs" / ".price_cache"
ENCHANT_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "enchant_prices.json"
CREATURE_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "creature_prices.json"
TITLE_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "title_prices.json"
AURA_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "aura_prices.json"
ENCHANT_PRICE_CACHE_SECONDS = 600
CREATURE_PRICE_CACHE_SECONDS = 600
PRICE_REFRESH_INTERVAL_SECONDS = 1800
ENCHANT_PRICE_CACHE_SCHEMA_VERSION = 9

_CACHE_LOCK = Lock()
_ENCHANT_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_CREATURE_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_TITLE_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_AURA_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}


def add_cache_status(payload: dict, cache: dict, stale: bool = False) -> dict:
    result = dict(payload)
    result["cache"] = {
        "stale": stale,
        "refreshing": bool(cache.get("refreshing")),
        "expiresAt": cache.get("expires_at"),
    }
    return result


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


def start_cache_refresh(cache: dict, refresh_fn) -> bool:
    with _CACHE_LOCK:
        if cache.get("refreshing"):
            return False
        cache["refreshing"] = True

    def worker():
        try:
            refresh_fn()
        finally:
            with _CACHE_LOCK:
                cache["refreshing"] = False

    Thread(target=worker, daemon=True).start()
    return True


def start_periodic_price_refresh(refresh_jobs, interval: int = PRICE_REFRESH_INTERVAL_SECONDS):
    def refresh_loop():
        while True:
            for cache, refresh_fn in refresh_jobs:
                start_cache_refresh(cache, refresh_fn)
            time.sleep(interval)

    Thread(target=refresh_loop, daemon=True).start()
