import json
import sqlite3
import threading
import time
from contextlib import closing
from pathlib import Path

from ..api_fanout_trace import record_cache_event, record_character_response_cache_source
from ..neople_client import clean_text, fetch_character_payload_from_api


ROOT = Path(__file__).resolve().parents[2]
CHARACTER_CACHE_DIR = ROOT / "cache"
CHARACTER_RESPONSE_CACHE_TTL_SECONDS = 15
CHARACTER_SQLITE_CACHE_TTL_MS = 60 * 1000
CHARACTER_SQLITE_CACHE_PATH = CHARACTER_CACHE_DIR / "character-response-cache.sqlite"
_CHARACTER_RESPONSE_CACHE_LOCK = threading.Lock()
_CHARACTER_RESPONSE_CACHE = {}
_CHARACTER_SQLITE_CACHE_LOCK = threading.Lock()
_CHARACTER_SQLITE_CACHE_INITIALIZED = False


def normalize_character_search_name(character_name: str) -> str:
    return clean_text(character_name).strip().lower()


def normalize_adventure_search_name(adventure_name: str) -> str:
    return clean_text(adventure_name).strip().lower()


def _parse_candidate_fame(value) -> int:
    text = clean_text(value).replace(",", "")
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def _get_character_cache_key(server_id: str, character_id: str, resource: str) -> tuple:
    return (clean_text(server_id).lower(), clean_text(character_id), clean_text(resource))


def _get_character_cache_key_text(cache_key: tuple) -> str:
    return "\x1f".join(cache_key)


def _connect_character_sqlite_cache():
    CHARACTER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CHARACTER_SQLITE_CACHE_PATH), timeout=1.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=1000")
    return conn


def _ensure_character_sqlite_cache():
    global _CHARACTER_SQLITE_CACHE_INITIALIZED
    if _CHARACTER_SQLITE_CACHE_INITIALIZED:
        return
    with _CHARACTER_SQLITE_CACHE_LOCK:
        if _CHARACTER_SQLITE_CACHE_INITIALIZED:
            return
        with closing(_connect_character_sqlite_cache()) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS character_response_cache (
                    cache_key TEXT PRIMARY KEY,
                    server_id TEXT NOT NULL,
                    character_id TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    cached_at_ms INTEGER NOT NULL,
                    expires_at_ms INTEGER NOT NULL,
                    updated_at_ms INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_character_response_cache_expires_at "
                "ON character_response_cache(expires_at_ms)"
            )
            conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_character_response_cache_identity "
                "ON character_response_cache(server_id, character_id, resource)"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS character_search_candidate_cache (
                    server_id TEXT NOT NULL,
                    server_name TEXT,
                    character_id TEXT NOT NULL,
                    character_name TEXT NOT NULL,
                    normalized_character_name TEXT NOT NULL,
                    adventure_name TEXT,
                    normalized_adventure_name TEXT,
                    job_id TEXT,
                    job_name TEXT,
                    job_grow_id TEXT,
                    job_grow_name TEXT,
                    fame INTEGER,
                    updated_at_ms INTEGER NOT NULL,
                    PRIMARY KEY (server_id, character_id)
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_character_search_candidate_lookup "
                "ON character_search_candidate_cache(normalized_character_name, server_id)"
            )
            columns = {
                clean_text(row[1])
                for row in conn.execute("PRAGMA table_info(character_search_candidate_cache)").fetchall()
            }
            if "normalized_adventure_name" not in columns:
                conn.execute("ALTER TABLE character_search_candidate_cache ADD COLUMN normalized_adventure_name TEXT")
            conn.execute(
                """
                UPDATE character_search_candidate_cache
                SET normalized_adventure_name = lower(trim(adventure_name))
                WHERE (normalized_adventure_name IS NULL OR normalized_adventure_name = '')
                  AND adventure_name IS NOT NULL
                  AND trim(adventure_name) != ''
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_character_search_candidate_adventure_lookup "
                "ON character_search_candidate_cache(normalized_adventure_name)"
            )
            conn.commit()
        _CHARACTER_SQLITE_CACHE_INITIALIZED = True


def _get_character_sqlite_cached_payload(cache_key: tuple, now_ms: int) -> dict | None:
    try:
        _ensure_character_sqlite_cache()
        with closing(_connect_character_sqlite_cache()) as conn:
            row = conn.execute(
                """
                SELECT payload_json
                FROM character_response_cache
                WHERE cache_key = ? AND expires_at_ms > ?
                """,
                (_get_character_cache_key_text(cache_key), now_ms),
            ).fetchone()
    except Exception:
        return None
    if not row:
        return None
    try:
        payload = json.loads(row[0])
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def _save_character_sqlite_cached_payload(cache_key: tuple, payload: dict, now_ms: int):
    if not isinstance(payload, dict):
        return
    try:
        payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        expires_at_ms = now_ms + CHARACTER_SQLITE_CACHE_TTL_MS
        _ensure_character_sqlite_cache()
        with _CHARACTER_SQLITE_CACHE_LOCK:
            with closing(_connect_character_sqlite_cache()) as conn:
                conn.execute(
                    """
                    INSERT INTO character_response_cache (
                        cache_key,
                        server_id,
                        character_id,
                        resource,
                        payload_json,
                        cached_at_ms,
                        expires_at_ms,
                        updated_at_ms
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(cache_key) DO UPDATE SET
                        server_id = excluded.server_id,
                        character_id = excluded.character_id,
                        resource = excluded.resource,
                        payload_json = excluded.payload_json,
                        cached_at_ms = excluded.cached_at_ms,
                        expires_at_ms = excluded.expires_at_ms,
                        updated_at_ms = excluded.updated_at_ms
                    """,
                    (
                        _get_character_cache_key_text(cache_key),
                        cache_key[0],
                        cache_key[1],
                        cache_key[2],
                        payload_json,
                        now_ms,
                        expires_at_ms,
                        now_ms,
                    ),
                )
                conn.commit()
    except Exception:
        return


def _save_character_memory_cached_payload(cache_key: tuple, payload: dict, now: float):
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        _CHARACTER_RESPONSE_CACHE[cache_key] = {
            "payload": payload,
            "expires_at": now + CHARACTER_RESPONSE_CACHE_TTL_SECONDS,
        }


def get_character_cached_payload(server_id: str, character_id: str, resource: str, path: str) -> dict:
    cache_key = _get_character_cache_key(server_id, character_id, resource)
    now = time.time()
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        cached = _CHARACTER_RESPONSE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            record_cache_event("character_payload", "hit")
            record_character_response_cache_source("mem")
            return cached.get("payload") or {}

    sqlite_payload = _get_character_sqlite_cached_payload(cache_key, int(now * 1000))
    if sqlite_payload is not None:
        _save_character_memory_cached_payload(cache_key, sqlite_payload, now)
        record_cache_event("character_payload", "hit")
        record_character_response_cache_source("sqlite")
        return sqlite_payload

    record_cache_event("character_payload", "miss")
    record_character_response_cache_source("api")
    payload = fetch_character_payload_from_api(server_id, character_id, path)
    _save_character_memory_cached_payload(cache_key, payload, now)
    _save_character_sqlite_cached_payload(cache_key, payload, int(time.time() * 1000))
    return payload


def get_character_cached_computed_payload(server_id: str, character_id: str, resource: str) -> dict | None:
    cache_key = _get_character_cache_key(server_id, character_id, resource)
    now = time.time()
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        cached = _CHARACTER_RESPONSE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            record_cache_event("character_payload", "hit")
            record_character_response_cache_source("mem")
            payload = cached.get("payload")
            return payload if isinstance(payload, dict) else None

    sqlite_payload = _get_character_sqlite_cached_payload(cache_key, int(now * 1000))
    if sqlite_payload is not None:
        _save_character_memory_cached_payload(cache_key, sqlite_payload, now)
        record_cache_event("character_payload", "hit")
        record_character_response_cache_source("sqlite")
        return sqlite_payload

    record_cache_event("character_payload", "miss")
    return None


def save_character_cached_computed_payload(server_id: str, character_id: str, resource: str, payload: dict):
    if not isinstance(payload, dict):
        return
    cache_key = _get_character_cache_key(server_id, character_id, resource)
    now = time.time()
    _save_character_memory_cached_payload(cache_key, payload, now)
    _save_character_sqlite_cached_payload(cache_key, payload, int(now * 1000))


def _row_to_character_search_candidate(row: sqlite3.Row | tuple) -> dict:
    return {
        "serverId": clean_text(row[0]).lower(),
        "serverName": clean_text(row[1]),
        "characterId": clean_text(row[2]),
        "characterName": clean_text(row[3]),
        "adventureName": clean_text(row[5]),
        "jobId": clean_text(row[7]),
        "jobName": clean_text(row[8]),
        "jobGrowId": clean_text(row[9]),
        "jobGrowName": clean_text(row[10]),
        "fame": int(row[11] or 0),
    }


def get_cached_character_search_candidates(server_id: str, character_name: str) -> list[dict]:
    normalized_name = normalize_character_search_name(character_name)
    normalized_server_id = clean_text(server_id).lower()
    if not normalized_server_id or not normalized_name:
        return []
    try:
        _ensure_character_sqlite_cache()
        with closing(_connect_character_sqlite_cache()) as conn:
            rows = conn.execute(
                """
                SELECT
                    server_id,
                    server_name,
                    character_id,
                    character_name,
                    normalized_character_name,
                    adventure_name,
                    normalized_adventure_name,
                    job_id,
                    job_name,
                    job_grow_id,
                    job_grow_name,
                    fame
                FROM character_search_candidate_cache
                WHERE normalized_character_name = ? AND server_id = ?
                ORDER BY updated_at_ms DESC, character_name ASC
                """,
                (normalized_name, normalized_server_id),
            ).fetchall()
    except Exception:
        return []
    return [_row_to_character_search_candidate(row) for row in rows]


def get_cached_adventure_search_candidates(adventure_name: str) -> list[dict]:
    normalized_name = normalize_adventure_search_name(adventure_name)
    if not normalized_name:
        return []
    try:
        _ensure_character_sqlite_cache()
        with closing(_connect_character_sqlite_cache()) as conn:
            rows = conn.execute(
                """
                SELECT
                    server_id,
                    server_name,
                    character_id,
                    character_name,
                    normalized_character_name,
                    adventure_name,
                    normalized_adventure_name,
                    job_id,
                    job_name,
                    job_grow_id,
                    job_grow_name,
                    fame
                FROM character_search_candidate_cache
                WHERE normalized_adventure_name = ?
                ORDER BY server_id ASC, fame DESC, updated_at_ms DESC, character_name ASC
                """,
                (normalized_name,),
            ).fetchall()
    except Exception:
        return []
    return [_row_to_character_search_candidate(row) for row in rows]


def save_character_search_candidate(candidate: dict):
    if not isinstance(candidate, dict):
        return
    server_id = clean_text(candidate.get("serverId") or candidate.get("server_id")).lower()
    character_id = clean_text(candidate.get("characterId") or candidate.get("character_id"))
    character_name = clean_text(candidate.get("characterName") or candidate.get("character_name"))
    if not server_id or not character_id or not character_name:
        return
    normalized_name = normalize_character_search_name(character_name)
    if not normalized_name:
        return
    adventure_name = clean_text(candidate.get("adventureName") or candidate.get("adventure_name"))
    normalized_adventure_name = normalize_adventure_search_name(adventure_name)
    now_ms = int(time.time() * 1000)
    try:
        _ensure_character_sqlite_cache()
        with _CHARACTER_SQLITE_CACHE_LOCK:
            with closing(_connect_character_sqlite_cache()) as conn:
                conn.execute(
                    """
                    INSERT INTO character_search_candidate_cache (
                        server_id,
                        server_name,
                        character_id,
                        character_name,
                        normalized_character_name,
                        adventure_name,
                        normalized_adventure_name,
                        job_id,
                        job_name,
                        job_grow_id,
                        job_grow_name,
                        fame,
                        updated_at_ms
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(server_id, character_id) DO UPDATE SET
                        server_name = COALESCE(NULLIF(excluded.server_name, ''), character_search_candidate_cache.server_name),
                        character_name = excluded.character_name,
                        normalized_character_name = excluded.normalized_character_name,
                        adventure_name = COALESCE(NULLIF(excluded.adventure_name, ''), character_search_candidate_cache.adventure_name),
                        normalized_adventure_name = COALESCE(NULLIF(excluded.normalized_adventure_name, ''), character_search_candidate_cache.normalized_adventure_name),
                        job_id = COALESCE(NULLIF(excluded.job_id, ''), character_search_candidate_cache.job_id),
                        job_name = COALESCE(NULLIF(excluded.job_name, ''), character_search_candidate_cache.job_name),
                        job_grow_id = COALESCE(NULLIF(excluded.job_grow_id, ''), character_search_candidate_cache.job_grow_id),
                        job_grow_name = COALESCE(NULLIF(excluded.job_grow_name, ''), character_search_candidate_cache.job_grow_name),
                        fame = CASE
                            WHEN excluded.fame > 0 THEN excluded.fame
                            ELSE character_search_candidate_cache.fame
                        END,
                        updated_at_ms = excluded.updated_at_ms
                    """,
                    (
                        server_id,
                        clean_text(candidate.get("serverName") or candidate.get("server_name")),
                        character_id,
                        character_name,
                        normalized_name,
                        adventure_name,
                        normalized_adventure_name,
                        clean_text(candidate.get("jobId") or candidate.get("job_id")),
                        clean_text(candidate.get("jobName") or candidate.get("job_name")),
                        clean_text(candidate.get("jobGrowId") or candidate.get("job_grow_id")),
                        clean_text(candidate.get("jobGrowName") or candidate.get("job_grow_name")),
                        _parse_candidate_fame(candidate.get("fame")),
                        now_ms,
                    ),
                )
                conn.commit()
    except Exception:
        return


def save_character_search_candidates(candidates: list[dict]):
    for candidate in candidates or []:
        save_character_search_candidate(candidate)
