import threading

from ..neople_client import fetch_item_details_from_api


_ITEM_DETAIL_CACHE_LOCK = threading.Lock()
_ITEM_DETAIL_CACHE: dict[str, dict] = {}


def fetch_item_details(item_ids: list) -> list:
    unique_ids = []
    seen = set()
    for item_id in item_ids:
        if item_id and item_id not in seen:
            unique_ids.append(item_id)
            seen.add(item_id)
    if not unique_ids:
        return []

    rows_by_id = {}
    missing_ids = []
    with _ITEM_DETAIL_CACHE_LOCK:
        for item_id in unique_ids:
            cached = _ITEM_DETAIL_CACHE.get(item_id)
            if cached is not None:
                rows_by_id[item_id] = dict(cached)
            else:
                missing_ids.append(item_id)

    for index in range(0, len(missing_ids), 20):
        chunk = missing_ids[index:index + 20]
        fetched_rows = fetch_item_details_from_api(chunk)
        with _ITEM_DETAIL_CACHE_LOCK:
            for row in fetched_rows:
                item_id = row.get("itemId")
                if item_id:
                    _ITEM_DETAIL_CACHE[item_id] = dict(row)
                    rows_by_id[item_id] = dict(row)
    return [rows_by_id[item_id] for item_id in unique_ids if item_id in rows_by_id]
