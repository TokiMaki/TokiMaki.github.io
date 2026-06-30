import base64
import json
import sqlite3
import time
from contextlib import closing
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ..neople_client import clean_text
from .character_repository import CHARACTER_CACHE_DIR, CHARACTER_SQLITE_CACHE_PATH


OFFICIAL_EQUIPMENT_SCORE_CACHE_TTL_MS = 60 * 1000
OFFICIAL_EQUIPMENT_SCORE_STALE_TTL_MS = 24 * 60 * 60 * 1000
OFFICIAL_EQUIPMENT_SCORE_SOURCE = "df.nexon.com"
OFFICIAL_CHARACTER_SEARCH_ENDPOINT = "https://df.nexon.com/world/character/fetch"
OFFICIAL_CHARACTER_PROFILE_BASE_URL = "https://df.nexon.com/world/character"
OFFICIAL_SEARCH_TIMEOUT_SECONDS = 3

_OFFICIAL_SCORE_CACHE_INITIALIZED = False

_OFFICIAL_SERVER_NAMES = {
    "anton": "ANTON",
    "bakal": "BAKAL",
    "cain": "CAIN",
    "casillas": "CASILLAS",
    "diregie": "DIREGIE",
    "hilder": "HILDER",
    "prey": "PREY",
    "siroco": "SIROCO",
}

_OFFICIAL_SERVER_LABELS = {
    "anton": "안톤",
    "bakal": "바칼",
    "cain": "카인",
    "casillas": "카시야스",
    "diregie": "디레지에",
    "hilder": "힐더",
    "prey": "프레이",
    "siroco": "시로코",
}


def get_official_server_name(server_id: str) -> str | None:
    return _OFFICIAL_SERVER_NAMES.get(clean_text(server_id).lower())


def _connect_official_score_cache():
    CHARACTER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CHARACTER_SQLITE_CACHE_PATH), timeout=1.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=1000")
    return conn


def _ensure_official_score_cache():
    global _OFFICIAL_SCORE_CACHE_INITIALIZED
    if _OFFICIAL_SCORE_CACHE_INITIALIZED:
        return
    with closing(_connect_official_score_cache()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS official_equipment_score_cache (
                cache_key TEXT PRIMARY KEY,
                server_id TEXT NOT NULL,
                server_name TEXT NOT NULL,
                character_name TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                cached_at_ms INTEGER NOT NULL,
                expires_at_ms INTEGER NOT NULL,
                stale_expires_at_ms INTEGER NOT NULL,
                updated_at_ms INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_official_equipment_score_cache_expires_at "
            "ON official_equipment_score_cache(expires_at_ms)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_official_equipment_score_cache_stale_expires_at "
            "ON official_equipment_score_cache(stale_expires_at_ms)"
        )
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_official_equipment_score_cache_identity "
            "ON official_equipment_score_cache(server_id, character_name)"
        )
        conn.commit()
    _OFFICIAL_SCORE_CACHE_INITIALIZED = True


def _get_cache_key(server_id: str, character_name: str) -> str:
    return f"{clean_text(server_id).lower()}:{clean_text(character_name)}"


def _null_response(cached: bool = False, stale: bool = False) -> dict:
    return {
        "equipmentScore": None,
        "officialCharacterKey": None,
        "officialProfileUrl": None,
        "source": OFFICIAL_EQUIPMENT_SCORE_SOURCE,
        "cached": cached,
        "stale": stale,
    }


def _to_response(payload: dict, cached: bool, stale: bool) -> dict:
    return {
        "equipmentScore": payload.get("equipmentScore") if isinstance(payload, dict) else None,
        "officialCharacterKey": payload.get("officialCharacterKey") if isinstance(payload, dict) else None,
        "officialProfileUrl": payload.get("officialProfileUrl") if isinstance(payload, dict) else None,
        "source": OFFICIAL_EQUIPMENT_SCORE_SOURCE,
        "cached": cached,
        "stale": stale,
    }


def _load_cached_payload(cache_key: str, now_ms: int) -> tuple[dict | None, bool]:
    try:
        _ensure_official_score_cache()
        with closing(_connect_official_score_cache()) as conn:
            row = conn.execute(
                """
                SELECT payload_json, expires_at_ms, stale_expires_at_ms
                FROM official_equipment_score_cache
                WHERE cache_key = ? AND stale_expires_at_ms > ?
                """,
                (cache_key, now_ms),
            ).fetchone()
    except Exception:
        return None, False
    if not row:
        return None, False
    try:
        payload = json.loads(row[0])
    except Exception:
        return None, False
    if not isinstance(payload, dict):
        return None, False
    return payload, int(row[1] or 0) <= now_ms


def _save_cached_payload(
    cache_key: str,
    server_id: str,
    server_name: str,
    character_name: str,
    payload: dict,
    now_ms: int,
):
    if not isinstance(payload, dict) or not payload.get("equipmentScore"):
        return
    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    expires_at_ms = now_ms + OFFICIAL_EQUIPMENT_SCORE_CACHE_TTL_MS
    stale_expires_at_ms = now_ms + OFFICIAL_EQUIPMENT_SCORE_STALE_TTL_MS
    try:
        _ensure_official_score_cache()
        with closing(_connect_official_score_cache()) as conn:
            conn.execute(
                """
                INSERT INTO official_equipment_score_cache (
                    cache_key,
                    server_id,
                    server_name,
                    character_name,
                    payload_json,
                    cached_at_ms,
                    expires_at_ms,
                    stale_expires_at_ms,
                    updated_at_ms
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    server_id = excluded.server_id,
                    server_name = excluded.server_name,
                    character_name = excluded.character_name,
                    payload_json = excluded.payload_json,
                    cached_at_ms = excluded.cached_at_ms,
                    expires_at_ms = excluded.expires_at_ms,
                    stale_expires_at_ms = excluded.stale_expires_at_ms,
                    updated_at_ms = excluded.updated_at_ms
                """,
                (
                    cache_key,
                    server_id,
                    server_name,
                    character_name,
                    payload_json,
                    now_ms,
                    expires_at_ms,
                    stale_expires_at_ms,
                    now_ms,
                ),
            )
            conn.commit()
    except Exception:
        return


def decode_official_point(value: str, key: str, salt: str) -> int | None:
    try:
        key_bytes = base64.b64decode(clean_text(key))
        salt_bytes = base64.b64decode(clean_text(salt))
        raw = base64.b64decode(clean_text(value))
        xor_key = key_bytes + bytes([103, 50, 75, 38, 42, 97, 117, 99, 57, 88, 64, 56])
        trim_key = salt_bytes + bytes([84, 122, 51, 36, 76, 119, 56, 110, 66, 101, 33, 49])
        decoded = bytes(byte ^ xor_key[index % len(xor_key)] for index, byte in enumerate(raw))
        decoded_text = decoded.decode("utf-8")
        trim_text = trim_key.decode("utf-8")
        result_text = decoded_text[len(trim_text): len(decoded_text) - len(trim_text)]
        result_text = result_text.replace(",", "").strip()
        return int(result_text) if result_text.isdigit() else None
    except Exception:
        return None


def _fetch_official_character_rows(server_name: str, character_name: str) -> list:
    query = urlencode({"serverName": server_name, "characName": character_name})
    request = Request(
        f"{OFFICIAL_CHARACTER_SEARCH_ENDPOINT}?{query}",
        headers={
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://df.nexon.com/world/character",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(request, timeout=OFFICIAL_SEARCH_TIMEOUT_SECONDS) as response:
        payload = json.loads(response.read().decode("utf-8"))
    rows = payload.get("body") if isinstance(payload, dict) else None
    return rows if isinstance(rows, list) else []


def _select_exact_character_row(rows: list, server_id: str, server_name: str, character_name: str) -> dict | None:
    target_name = clean_text(character_name)
    target_server = clean_text(server_name).lower()
    target_server_id = clean_text(server_id).lower()
    accepted_servers = {
        target_server,
        target_server_id,
        clean_text(_OFFICIAL_SERVER_LABELS.get(target_server_id)).lower(),
    }
    for row in rows:
        if not isinstance(row, dict):
            continue
        row_name = clean_text(row.get("characterName") or row.get("characName"))
        row_server = clean_text(row.get("serverName") or row.get("serverId")).lower()
        if row_name != target_name:
            continue
        if row_server and row_server not in accepted_servers:
            continue
        return row
    return None


def _build_payload(server_id: str, server_name: str, character_name: str, row: dict, now_ms: int) -> dict | None:
    official_key = clean_text(row.get("characterId"))
    equipment_point = clean_text(row.get("equipmentPoint"))
    obfuscate_key = row.get("obfuscateKey") if isinstance(row.get("obfuscateKey"), dict) else {}
    score = decode_official_point(
        equipment_point,
        clean_text(obfuscate_key.get("key")),
        clean_text(obfuscate_key.get("salt")),
    )
    if not official_key or score is None:
        return None
    return {
        "serverId": clean_text(server_id).lower(),
        "serverName": server_name,
        "characterName": clean_text(row.get("characterName") or character_name),
        "officialCharacterKey": official_key,
        "officialProfileUrl": f"{OFFICIAL_CHARACTER_PROFILE_BASE_URL}/{clean_text(server_id).lower()}/{official_key}",
        "equipmentScore": score,
        "fetchedAt": now_ms,
    }


def load_official_equipment_score(server_id: str, character_name: str) -> dict:
    server_id = clean_text(server_id).lower()
    character_name = clean_text(character_name)
    server_name = get_official_server_name(server_id)
    if not server_id or not character_name or not server_name:
        raise ValueError("지원하지 않는 서버이거나 캐릭터명이 비어 있습니다.")

    now_ms = int(time.time() * 1000)
    cache_key = _get_cache_key(server_id, character_name)
    cached_payload, is_stale = _load_cached_payload(cache_key, now_ms)
    if cached_payload and not is_stale:
        return _to_response(cached_payload, cached=True, stale=False)

    try:
        rows = _fetch_official_character_rows(server_name, character_name)
        row = _select_exact_character_row(rows, server_id, server_name, character_name)
        payload = _build_payload(server_id, server_name, character_name, row or {}, now_ms) if row else None
        if not payload:
            return _null_response(cached=False, stale=False)
        _save_cached_payload(cache_key, server_id, server_name, character_name, payload, now_ms)
        return _to_response(payload, cached=False, stale=False)
    except Exception:
        if cached_payload:
            return _to_response(cached_payload, cached=True, stale=True)
        return _null_response(cached=False, stale=False)
