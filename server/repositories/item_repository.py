import json
import sqlite3
import threading
import time
from contextlib import closing

from ..api_fanout_trace import record_cache_event
from ..neople_client import clean_item_display_name, clean_text, fetch_item_details_from_api, get_item_icon_url, search_items_by_name_from_api
from .character_repository import CHARACTER_CACHE_DIR, CHARACTER_SQLITE_CACHE_PATH


MULTI_ITEM_DETAIL_CHUNK_SIZE = 15
ITEM_DETAIL_CACHE_TTL_MS = 24 * 60 * 60 * 1000
_ITEM_DETAIL_CACHE_LOCK = threading.Lock()
_ITEM_DETAIL_CACHE: dict[str, dict] = {}
_ITEM_DETAIL_SQLITE_CACHE_LOCK = threading.Lock()
_ITEM_DETAIL_SQLITE_CACHE_INITIALIZED = False
_ITEM_SEARCH_CACHE_LOCK = threading.Lock()
_ITEM_SEARCH_CACHE: dict[str, list] = {}


def _connect_item_detail_cache():
    CHARACTER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CHARACTER_SQLITE_CACHE_PATH), timeout=1.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=1000")
    return conn


def _ensure_item_detail_cache():
    global _ITEM_DETAIL_SQLITE_CACHE_INITIALIZED
    if _ITEM_DETAIL_SQLITE_CACHE_INITIALIZED:
        return
    with _ITEM_DETAIL_SQLITE_CACHE_LOCK:
        if _ITEM_DETAIL_SQLITE_CACHE_INITIALIZED:
            return
        with closing(_connect_item_detail_cache()) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS item_detail_cache (
                    item_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    cached_at_ms INTEGER NOT NULL,
                    expires_at_ms INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_item_detail_cache_expires_at "
                "ON item_detail_cache(expires_at_ms)"
            )
            conn.commit()
        _ITEM_DETAIL_SQLITE_CACHE_INITIALIZED = True


def _load_item_detail_sqlite_cache(item_ids: list, now_ms: int) -> dict:
    if not item_ids:
        return {}
    try:
        _ensure_item_detail_cache()
        placeholders = ",".join("?" for _ in item_ids)
        with closing(_connect_item_detail_cache()) as conn:
            rows = conn.execute(
                f"""
                SELECT item_id, payload_json, expires_at_ms
                FROM item_detail_cache
                WHERE item_id IN ({placeholders}) AND expires_at_ms > ?
                """,
                (*item_ids, now_ms),
            ).fetchall()
    except Exception:
        return {}

    cached_by_id = {}
    for item_id, payload_json, expires_at_ms in rows:
        try:
            payload = json.loads(payload_json)
        except Exception:
            continue
        if isinstance(payload, dict):
            cached_by_id[item_id] = {
                "payload": payload,
                "expires_at_ms": int(expires_at_ms),
            }
    return cached_by_id


def _save_item_detail_sqlite_cache(rows: list, now_ms: int):
    cache_rows = []
    expires_at_ms = now_ms + ITEM_DETAIL_CACHE_TTL_MS
    for row in rows:
        if not isinstance(row, dict):
            continue
        item_id = clean_text(row.get("itemId"))
        if not item_id:
            continue
        try:
            payload_json = json.dumps(row, ensure_ascii=False, separators=(",", ":"))
        except (TypeError, ValueError):
            continue
        cache_rows.append((item_id, payload_json, now_ms, expires_at_ms))
    if not cache_rows:
        return

    try:
        _ensure_item_detail_cache()
        with _ITEM_DETAIL_SQLITE_CACHE_LOCK:
            with closing(_connect_item_detail_cache()) as conn:
                conn.executemany(
                    """
                    INSERT INTO item_detail_cache (
                        item_id,
                        payload_json,
                        cached_at_ms,
                        expires_at_ms
                    )
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(item_id) DO UPDATE SET
                        payload_json = excluded.payload_json,
                        cached_at_ms = excluded.cached_at_ms,
                        expires_at_ms = excluded.expires_at_ms
                    """,
                    cache_rows,
                )
                conn.execute("DELETE FROM item_detail_cache WHERE expires_at_ms <= ?", (now_ms,))
                conn.commit()
    except Exception:
        return


def fetch_item_details(item_ids: list) -> list:
    unique_ids = []
    seen = set()
    for item_id in item_ids:
        if item_id and item_id not in seen:
            unique_ids.append(item_id)
            seen.add(item_id)
    if not unique_ids:
        return []

    now_ms = int(time.time() * 1000)
    rows_by_id = {}
    memory_missing_ids = []
    with _ITEM_DETAIL_CACHE_LOCK:
        for item_id in unique_ids:
            cached = _ITEM_DETAIL_CACHE.get(item_id)
            if cached and int(cached.get("expires_at_ms") or 0) > now_ms:
                rows_by_id[item_id] = dict(cached.get("payload") or {})
            else:
                _ITEM_DETAIL_CACHE.pop(item_id, None)
                memory_missing_ids.append(item_id)

    sqlite_cached = _load_item_detail_sqlite_cache(memory_missing_ids, now_ms)
    if sqlite_cached:
        with _ITEM_DETAIL_CACHE_LOCK:
            for item_id, cached in sqlite_cached.items():
                _ITEM_DETAIL_CACHE[item_id] = cached
                rows_by_id[item_id] = dict(cached.get("payload") or {})

    missing_ids = [item_id for item_id in memory_missing_ids if item_id not in rows_by_id]
    record_cache_event("item_detail", "hit", len(unique_ids) - len(missing_ids))
    record_cache_event("item_detail", "miss", len(missing_ids))

    for index in range(0, len(missing_ids), MULTI_ITEM_DETAIL_CHUNK_SIZE):
        chunk = missing_ids[index:index + MULTI_ITEM_DETAIL_CHUNK_SIZE]
        fetched_rows = fetch_item_details_from_api(chunk)
        fetched_at_ms = int(time.time() * 1000)
        expires_at_ms = fetched_at_ms + ITEM_DETAIL_CACHE_TTL_MS
        valid_rows = [
            dict(row)
            for row in fetched_rows
            if isinstance(row, dict) and clean_text(row.get("itemId"))
        ]
        with _ITEM_DETAIL_CACHE_LOCK:
            for row in valid_rows:
                item_id = clean_text(row.get("itemId"))
                _ITEM_DETAIL_CACHE[item_id] = {
                    "payload": row,
                    "expires_at_ms": expires_at_ms,
                }
                rows_by_id[item_id] = dict(row)
        _save_item_detail_sqlite_cache(valid_rows, fetched_at_ms)
    return [rows_by_id[item_id] for item_id in unique_ids if item_id in rows_by_id]


def search_items_by_name(item_name: str, max_pages: int = 1, word_type: str = "full", limit: int = 30) -> list:
    max_pages = max(1, int(max_pages or 1))
    word_type = clean_text(word_type) or "full"
    limit = max(1, min(30, int(limit or 30)))
    cache_key = f"{clean_text(item_name)}::word={word_type}::limit={limit}::pages={max_pages}"
    with _ITEM_SEARCH_CACHE_LOCK:
        cached = _ITEM_SEARCH_CACHE.get(cache_key)
        if cached is not None:
            record_cache_event("item_search", "hit")
            return [dict(row) for row in cached]
    record_cache_event("item_search", "miss")
    rows = []
    for page in range(max_pages):
        offset = page * limit
        page_rows = search_items_by_name_from_api(item_name, word_type=word_type, limit=limit, offset=offset)
        rows.extend(page_rows)
        if len(page_rows) < limit:
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
