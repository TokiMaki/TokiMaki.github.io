import json
import threading
import time
from copy import deepcopy
from pathlib import Path

from ..neople_client import clean_item_display_name, clean_text


ROOT = Path(__file__).resolve().parents[2]
AUCTION_LAST_KNOWN_CACHE_PATH = ROOT / "Docs" / ".price_cache" / "auction_last_known.json"
AUCTION_LAST_KNOWN_CACHE_VERSION = 1
AUCTION_LAST_KNOWN_MAX_ENTRIES = 10000
_AUCTION_LAST_KNOWN_LOCK = threading.Lock()
_AUCTION_LAST_KNOWN_LOADED = False
_AUCTION_LAST_KNOWN_DIRTY = False
_AUCTION_LAST_KNOWN_SAVE_SCHEDULED = False
_AUCTION_LAST_KNOWN_CACHE = {
    "items": {},
    "names": {},
}


def _has_positive_price(auction: dict) -> bool:
    return (
        isinstance((auction or {}).get("minUnitPrice"), (int, float))
        and (auction or {}).get("minUnitPrice") > 0
    )


def _name_key(item_name: str, item_type_detail: str = "") -> str:
    item_name = clean_item_display_name(item_name)
    item_type_detail = clean_text(item_type_detail)
    return f"{item_name}\u0000{item_type_detail}" if item_name else ""


def _normalize_record(item: dict) -> dict:
    auction = dict((item or {}).get("auction") or {})
    if not _has_positive_price(auction):
        return {}
    auction.pop("isLastKnownPrice", None)
    auction.pop("lookupPriceStatus", None)
    auction["priceStatus"] = "priced"
    return {
        "itemId": clean_text((item or {}).get("itemId")),
        "itemName": clean_item_display_name((item or {}).get("itemName")),
        "itemTypeDetail": clean_text((item or {}).get("itemTypeDetail")),
        "itemRarity": clean_text((item or {}).get("itemRarity")),
        "iconUrl": clean_text((item or {}).get("iconUrl")),
        "auction": auction,
        "updatedAtMs": int(time.time() * 1000),
    }


def _merge_record_metadata(previous: dict, current: dict) -> dict:
    return {
        **(previous or {}),
        **current,
        "itemId": current.get("itemId") or (previous or {}).get("itemId") or "",
        "itemName": current.get("itemName") or (previous or {}).get("itemName") or "",
        "itemTypeDetail": (
            current.get("itemTypeDetail")
            or (previous or {}).get("itemTypeDetail")
            or ""
        ),
        "itemRarity": current.get("itemRarity") or (previous or {}).get("itemRarity") or "",
        "iconUrl": current.get("iconUrl") or (previous or {}).get("iconUrl") or "",
        "auction": dict(current.get("auction") or {}),
    }


def _prune_last_known_cache():
    items = _AUCTION_LAST_KNOWN_CACHE.get("items") or {}
    overflow = len(items) - AUCTION_LAST_KNOWN_MAX_ENTRIES
    if overflow <= 0:
        return
    remove_ids = {
        item_id
        for item_id, _record in sorted(
            items.items(),
            key=lambda pair: int((pair[1] or {}).get("updatedAtMs") or 0),
        )[:overflow]
    }
    for item_id in remove_ids:
        items.pop(item_id, None)
    names = _AUCTION_LAST_KNOWN_CACHE.get("names") or {}
    for key, record in list(names.items()):
        if clean_text((record or {}).get("itemId")) in remove_ids:
            names.pop(key, None)


def _load_last_known_cache():
    global _AUCTION_LAST_KNOWN_LOADED
    if _AUCTION_LAST_KNOWN_LOADED:
        return
    with _AUCTION_LAST_KNOWN_LOCK:
        if _AUCTION_LAST_KNOWN_LOADED:
            return
        payload = {}
        try:
            with AUCTION_LAST_KNOWN_CACHE_PATH.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except Exception:
            payload = {}
        if int(payload.get("version") or 0) == AUCTION_LAST_KNOWN_CACHE_VERSION:
            items = payload.get("items") or {}
            names = payload.get("names") or {}
            if isinstance(items, dict):
                _AUCTION_LAST_KNOWN_CACHE["items"] = items
            if isinstance(names, dict):
                _AUCTION_LAST_KNOWN_CACHE["names"] = names
        _AUCTION_LAST_KNOWN_LOADED = True


def _save_last_known_cache_snapshot(snapshot: dict):
    path = AUCTION_LAST_KNOWN_CACHE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    with temporary_path.open("w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, separators=(",", ":"))
    temporary_path.replace(path)


def _save_last_known_cache_worker():
    global _AUCTION_LAST_KNOWN_DIRTY, _AUCTION_LAST_KNOWN_SAVE_SCHEDULED
    time.sleep(0.25)
    while True:
        with _AUCTION_LAST_KNOWN_LOCK:
            snapshot = {
                "version": AUCTION_LAST_KNOWN_CACHE_VERSION,
                "items": deepcopy(_AUCTION_LAST_KNOWN_CACHE.get("items") or {}),
                "names": deepcopy(_AUCTION_LAST_KNOWN_CACHE.get("names") or {}),
            }
            _AUCTION_LAST_KNOWN_DIRTY = False
        try:
            _save_last_known_cache_snapshot(snapshot)
        except Exception:
            pass
        with _AUCTION_LAST_KNOWN_LOCK:
            if _AUCTION_LAST_KNOWN_DIRTY:
                continue
            _AUCTION_LAST_KNOWN_SAVE_SCHEDULED = False
            return


def _schedule_last_known_cache_save():
    global _AUCTION_LAST_KNOWN_DIRTY, _AUCTION_LAST_KNOWN_SAVE_SCHEDULED
    with _AUCTION_LAST_KNOWN_LOCK:
        _AUCTION_LAST_KNOWN_DIRTY = True
        if _AUCTION_LAST_KNOWN_SAVE_SCHEDULED:
            return
        _AUCTION_LAST_KNOWN_SAVE_SCHEDULED = True
    threading.Thread(target=_save_last_known_cache_worker, daemon=True).start()


def flush_last_known_auction_prices():
    global _AUCTION_LAST_KNOWN_DIRTY
    _load_last_known_cache()
    with _AUCTION_LAST_KNOWN_LOCK:
        snapshot = {
            "version": AUCTION_LAST_KNOWN_CACHE_VERSION,
            "items": deepcopy(_AUCTION_LAST_KNOWN_CACHE.get("items") or {}),
            "names": deepcopy(_AUCTION_LAST_KNOWN_CACHE.get("names") or {}),
        }
        _AUCTION_LAST_KNOWN_DIRTY = False
    _save_last_known_cache_snapshot(snapshot)


def get_last_known_auction_item(item_id: str) -> dict:
    item_id = clean_text(item_id)
    if not item_id:
        return {}
    _load_last_known_cache()
    with _AUCTION_LAST_KNOWN_LOCK:
        return deepcopy((_AUCTION_LAST_KNOWN_CACHE.get("items") or {}).get(item_id) or {})


def get_last_known_auction_item_by_name(
    item_name: str,
    item_type_detail: str = "",
) -> dict:
    item_name = clean_item_display_name(item_name)
    if not item_name:
        return {}
    _load_last_known_cache()
    keys = [
        _name_key(item_name, item_type_detail),
        _name_key(item_name, ""),
    ]
    with _AUCTION_LAST_KNOWN_LOCK:
        names = _AUCTION_LAST_KNOWN_CACHE.get("names") or {}
        for key in keys:
            if key and names.get(key):
                return deepcopy(names.get(key) or {})
    return {}


def remember_last_known_auction_item(item: dict) -> bool:
    global _AUCTION_LAST_KNOWN_DIRTY
    record = _normalize_record(item)
    if not record:
        return False
    item_id = record.get("itemId") or ""
    item_name = record.get("itemName") or ""
    item_type_detail = record.get("itemTypeDetail") or ""
    if not item_id and not item_name:
        return False

    _load_last_known_cache()
    changed = False
    with _AUCTION_LAST_KNOWN_LOCK:
        if item_id:
            previous = (_AUCTION_LAST_KNOWN_CACHE.get("items") or {}).get(item_id) or {}
            record = _merge_record_metadata(previous, record)
            item_name = record.get("itemName") or ""
            item_type_detail = record.get("itemTypeDetail") or ""
            if previous != record:
                _AUCTION_LAST_KNOWN_CACHE["items"][item_id] = deepcopy(record)
                changed = True
        if item_name:
            for key in {
                _name_key(item_name, item_type_detail),
                _name_key(item_name, ""),
            }:
                if not key:
                    continue
                previous = (_AUCTION_LAST_KNOWN_CACHE.get("names") or {}).get(key) or {}
                named_record = _merge_record_metadata(previous, record)
                if previous != named_record:
                    _AUCTION_LAST_KNOWN_CACHE["names"][key] = deepcopy(named_record)
                    changed = True
        if changed:
            _prune_last_known_cache()
            _AUCTION_LAST_KNOWN_DIRTY = True
    if changed:
        _schedule_last_known_cache_save()
    return changed
