import threading

from ..neople_client import clean_item_display_name, clean_text, fetch_item_details_from_api, get_item_icon_url, search_items_by_name_from_api


_ITEM_DETAIL_CACHE_LOCK = threading.Lock()
_ITEM_DETAIL_CACHE: dict[str, dict] = {}
_ITEM_SEARCH_CACHE_LOCK = threading.Lock()
_ITEM_SEARCH_CACHE: dict[str, list] = {}


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


def search_items_by_name(item_name: str, max_pages: int = 1, word_type: str = "full", limit: int = 100) -> list:
    max_pages = max(1, int(max_pages or 1))
    word_type = clean_text(word_type) or "full"
    limit = max(1, min(100, int(limit or 100)))
    cache_key = f"{clean_text(item_name)}::word={word_type}::limit={limit}::pages={max_pages}"
    with _ITEM_SEARCH_CACHE_LOCK:
        cached = _ITEM_SEARCH_CACHE.get(cache_key)
        if cached is not None:
            return [dict(row) for row in cached]
    rows = []
    for page in range(max_pages):
        offset = page * limit
        page_rows = search_items_by_name_from_api(item_name, word_type=word_type, limit=limit, offset=offset)
        rows.extend(page_rows)
        if len(page_rows) < 100:
            break
    with _ITEM_SEARCH_CACHE_LOCK:
        _ITEM_SEARCH_CACHE[cache_key] = [dict(row) for row in rows]
    return rows


def resolve_exact_item_by_name(item_name: str, item_type_detail: str = "") -> dict:
    clean_name = clean_text(item_name)
    if not clean_name:
        return {}
    rows = search_items_by_name(clean_name)

    def item_match_key(value):
        return clean_text(value).replace(" ", "").replace("%%", "%")

    compact_name = item_match_key(clean_name)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == clean_name
        or item_match_key(row.get("itemName")) == compact_name
    ]
    if item_type_detail:
        exact_rows = [
            row for row in exact_rows
            if clean_text(row.get("itemTypeDetail")) == clean_text(item_type_detail)
        ]
    row = exact_rows[0] if exact_rows else None
    if not row:
        return {}
    item_id = row.get("itemId")
    return {
        "itemId": item_id,
        "itemName": clean_item_display_name(row.get("itemName")),
        "itemRarity": clean_text(row.get("itemRarity")),
        "itemType": clean_text(row.get("itemType")),
        "itemTypeDetail": clean_text(row.get("itemTypeDetail")),
        "itemAvailableLevel": row.get("itemAvailableLevel"),
        "fame": row.get("fame"),
        "iconUrl": get_item_icon_url(item_id),
    }
