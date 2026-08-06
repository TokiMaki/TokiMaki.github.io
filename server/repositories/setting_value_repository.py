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


def _get_ranking_order_sql(sort: str) -> str:
    return {
        "score": "COALESCE(buff_score, equipment_score, 0) DESC, total_gold DESC, updated_at_ms DESC",
        "fame": "fame DESC, total_gold DESC, updated_at_ms DESC",
        "value": "total_gold DESC, updated_at_ms DESC",
    }.get(sort, "total_gold DESC, updated_at_ms DESC")


def load_setting_value_ranking_page(
    role: str = "dealer",
    sort: str = "value",
    page: int = 1,
    page_size: int = 10,
    job: str = "",
) -> dict:
    role = clean_text(role).lower()
    if role not in {"dealer", "buffer"}:
        role = "dealer"
    sort = clean_text(sort).lower()
    order_sql = _get_ranking_order_sql(sort)
    job = clean_text(job)
    try:
        page = max(1, int(page))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = max(1, min(100, int(page_size)))
    except (TypeError, ValueError):
        page_size = 10

    where_sql = "role = ?"
    where_params = [role]
    if job:
        where_sql += " AND COALESCE(NULLIF(job_grow_name, ''), NULLIF(job_name, ''), '') = ?"
        where_params.append(job)

    try:
        _ensure_setting_value_snapshot_table()
        with closing(_connect_setting_value_db()) as conn:
            total_count = int(conn.execute(
                f"SELECT COUNT(*) FROM setting_value_snapshot WHERE {where_sql}",
                where_params,
            ).fetchone()[0])
            total_pages = (total_count + page_size - 1) // page_size
            if total_pages:
                page = min(page, total_pages)
            offset = (page - 1) * page_size
            rows = conn.execute(
                f"""
                SELECT payload_json
                FROM setting_value_snapshot
                WHERE {where_sql}
                ORDER BY {order_sql}
                LIMIT ?
                OFFSET ?
                """,
                (*where_params, page_size, offset),
            ).fetchall()
            job_rows = conn.execute(
                """
                SELECT DISTINCT COALESCE(NULLIF(job_grow_name, ''), NULLIF(job_name, ''), '') AS job
                FROM setting_value_snapshot
                WHERE role = ?
                  AND COALESCE(NULLIF(job_grow_name, ''), NULLIF(job_name, ''), '') != ''
                ORDER BY job COLLATE NOCASE
                """,
                (role,),
            ).fetchall()
    except Exception:
        return {
            "rows": [],
            "jobs": [],
            "page": 1,
            "pageSize": page_size,
            "totalCount": 0,
            "totalPages": 0,
        }

    results = []
    for row in rows:
        try:
            payload = json.loads(row[0])
        except Exception:
            continue
        if isinstance(payload, dict):
            results.append(payload)
    offset = (page - 1) * page_size
    return {
        "rows": [
            {**payload, "rank": offset + index}
            for index, payload in enumerate(results, start=1)
        ],
        "jobs": [clean_text(row[0]) for row in job_rows if clean_text(row[0])],
        "page": page,
        "pageSize": page_size,
        "totalCount": total_count,
        "totalPages": total_pages,
    }


def load_setting_value_character_rank(
    server_id: str,
    character_id: str = "",
    character_name: str = "",
    sort: str = "value",
    job: str = "",
) -> dict | None:
    server_id = clean_text(server_id).lower()
    character_id = clean_text(character_id)
    character_name = clean_text(character_name)
    job = clean_text(job)
    if not server_id or (not character_id and not character_name):
        return None
    order_sql = _get_ranking_order_sql(clean_text(sort).lower())

    identity_sql = "character_id = ?" if character_id else "character_name = ?"
    identity_value = character_id or character_name
    try:
        _ensure_setting_value_snapshot_table()
        with closing(_connect_setting_value_db()) as conn:
            selected = conn.execute(
                f"""
                SELECT role, character_id
                FROM setting_value_snapshot
                WHERE server_id = ? AND {identity_sql}
                LIMIT 1
                """,
                (server_id, identity_value),
            ).fetchone()
            if not selected:
                return None
            selected_role, selected_character_id = selected
            ranking_where_sql = "role = ?"
            ranking_params = [selected_role]
            if job:
                ranking_where_sql += " AND COALESCE(NULLIF(job_grow_name, ''), NULLIF(job_name, ''), '') = ?"
                ranking_params.append(job)
            row = conn.execute(
                f"""
                WITH ranked AS (
                    SELECT
                        server_id,
                        character_id,
                        payload_json,
                        ROW_NUMBER() OVER (ORDER BY {order_sql}) AS rank,
                        COUNT(*) OVER () AS ranking_total_count
                    FROM setting_value_snapshot
                    WHERE {ranking_where_sql}
                )
                SELECT payload_json, rank, ranking_total_count
                FROM ranked
                WHERE server_id = ? AND character_id = ?
                LIMIT 1
                """,
                (*ranking_params, server_id, selected_character_id),
            ).fetchone()
    except Exception:
        return None
    if not row:
        return None
    try:
        payload = json.loads(row[0])
    except Exception:
        return None
    return {
        **payload,
        "rank": int(row[1]),
        "rankingTotalCount": int(row[2]),
    } if isinstance(payload, dict) else None


def load_setting_value_ranking(role: str = "dealer", sort: str = "value", limit: int = 100) -> list[dict]:
    return load_setting_value_ranking_page(
        role=role,
        sort=sort,
        page=1,
        page_size=limit,
    )["rows"]
