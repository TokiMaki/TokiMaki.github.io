import json
import sqlite3
import threading
import time
from contextlib import closing

from ..neople_client import clean_text
from .character_repository import CHARACTER_CACHE_DIR, CHARACTER_SQLITE_CACHE_PATH


_SETTING_VALUE_SNAPSHOT_LOCK = threading.Lock()
_SETTING_VALUE_SNAPSHOT_INITIALIZED = False


def _connect_setting_value_db():
    CHARACTER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CHARACTER_SQLITE_CACHE_PATH), timeout=1.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=1000")
    return conn


def _ensure_setting_value_snapshot_table():
    global _SETTING_VALUE_SNAPSHOT_INITIALIZED
    if _SETTING_VALUE_SNAPSHOT_INITIALIZED:
        return
    with _SETTING_VALUE_SNAPSHOT_LOCK:
        if _SETTING_VALUE_SNAPSHOT_INITIALIZED:
            return
        with closing(_connect_setting_value_db()) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS setting_value_snapshot (
                    server_id TEXT NOT NULL,
                    character_id TEXT NOT NULL,
                    character_name TEXT NOT NULL,
                    job_name TEXT,
                    job_grow_name TEXT,
                    role TEXT NOT NULL,
                    fame INTEGER NOT NULL,
                    equipment_score INTEGER,
                    buff_score INTEGER,
                    total_gold INTEGER NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at_ms INTEGER NOT NULL,
                    PRIMARY KEY (server_id, character_id)
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_setting_value_snapshot_role_value "
                "ON setting_value_snapshot(role, total_gold DESC, updated_at_ms DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_setting_value_snapshot_role_score "
                "ON setting_value_snapshot(role, equipment_score DESC, buff_score DESC, updated_at_ms DESC)"
            )
            conn.commit()
        _SETTING_VALUE_SNAPSHOT_INITIALIZED = True


def _positive_int_or_none(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def save_setting_value_snapshot(snapshot: dict) -> bool:
    if not isinstance(snapshot, dict):
        return False
    server_id = clean_text(snapshot.get("serverId")).lower()
    character_id = clean_text(snapshot.get("characterId"))
    character_name = clean_text(snapshot.get("characterName"))
    role = clean_text(snapshot.get("role")).lower()
    setting_value = snapshot.get("settingValue") or {}
    total_gold = _positive_int_or_none(setting_value.get("totalGold"))
    if not server_id or not character_id or not character_name or role not in {"dealer", "buffer"} or total_gold is None:
        return False

    payload_json = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
    updated_at_ms = int(snapshot.get("updatedAtMs") or time.time() * 1000)
    try:
        _ensure_setting_value_snapshot_table()
        with _SETTING_VALUE_SNAPSHOT_LOCK:
            with closing(_connect_setting_value_db()) as conn:
                conn.execute(
                    """
                    INSERT INTO setting_value_snapshot (
                        server_id,
                        character_id,
                        character_name,
                        job_name,
                        job_grow_name,
                        role,
                        fame,
                        equipment_score,
                        buff_score,
                        total_gold,
                        payload_json,
                        updated_at_ms
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(server_id, character_id) DO UPDATE SET
                        character_name = excluded.character_name,
                        job_name = excluded.job_name,
                        job_grow_name = excluded.job_grow_name,
                        role = excluded.role,
                        fame = excluded.fame,
                        equipment_score = excluded.equipment_score,
                        buff_score = excluded.buff_score,
                        total_gold = excluded.total_gold,
                        payload_json = excluded.payload_json,
                        updated_at_ms = excluded.updated_at_ms
                    """,
                    (
                        server_id,
                        character_id,
                        character_name,
                        clean_text(snapshot.get("jobName")),
                        clean_text(snapshot.get("jobGrowName")),
                        role,
                        int(snapshot.get("fame") or 0),
                        _positive_int_or_none(snapshot.get("equipmentScore")),
                        _positive_int_or_none(snapshot.get("buffScore")),
                        total_gold,
                        payload_json,
                        updated_at_ms,
                    ),
                )
                conn.commit()
        return True
    except Exception:
        return False


def load_setting_value_ranking(role: str = "dealer", sort: str = "value", limit: int = 100) -> list[dict]:
    role = clean_text(role).lower()
    if role not in {"dealer", "buffer"}:
        role = "dealer"
    sort = clean_text(sort).lower()
    order_sql = {
        "score": "COALESCE(buff_score, equipment_score, 0) DESC, total_gold DESC, updated_at_ms DESC",
        "fame": "fame DESC, total_gold DESC, updated_at_ms DESC",
        "value": "total_gold DESC, updated_at_ms DESC",
    }.get(sort, "total_gold DESC, updated_at_ms DESC")
    try:
        limit = max(1, min(200, int(limit)))
    except (TypeError, ValueError):
        limit = 100

    try:
        _ensure_setting_value_snapshot_table()
        with closing(_connect_setting_value_db()) as conn:
            rows = conn.execute(
                f"""
                SELECT payload_json
                FROM setting_value_snapshot
                WHERE role = ?
                ORDER BY {order_sql}
                LIMIT ?
                """,
                (role, limit),
            ).fetchall()
    except Exception:
        return []

    results = []
    for row in rows:
        try:
            payload = json.loads(row[0])
        except Exception:
            continue
        if isinstance(payload, dict):
            results.append(payload)
    return [
        {**payload, "rank": index}
        for index, payload in enumerate(results, start=1)
    ]
