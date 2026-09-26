import json
import secrets
import sqlite3
import threading
import time
from contextlib import closing

from .character_search_service import attach_cached_score_summaries
from .neople_client import clean_text, fetch_character_detail_from_api, fetch_character_payload_from_api
from .repositories.character_repository import (
    _connect_character_sqlite_cache,
    get_cached_adventure_search_candidates,
    normalize_adventure_search_name,
)


CHALLENGE_TTL_SECONDS = 10 * 60
START_RATE_WINDOW_SECONDS = 60
EDIT_TTL_SECONDS = 20 * 60
_LOCK = threading.Lock()
_CHALLENGES = {}
_EDIT_GRANTS = {}
_START_TIMES = {}
_PREFERRED_SLOTS = ("SHOULDER", "JACKET", "PANTS", "WAIST", "SHOES", "RING", "NECK", "WRIST")


class AdventureManagementError(ValueError):
    pass


class AdventureManagementRateLimitError(AdventureManagementError):
    pass


def candidate_key(candidate):
    return f"{clean_text(candidate.get('serverId')).lower()}:{clean_text(candidate.get('characterId'))}"


def _ensure_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS adventure_search_settings (
            adventure_name TEXT PRIMARY KEY,
            order_json TEXT NOT NULL,
            hidden_json TEXT NOT NULL,
            updated_at_ms INTEGER NOT NULL
        )
    """)


def get_adventure_search_settings(adventure_name):
    normalized = normalize_adventure_search_name(adventure_name)
    if not normalized:
        return {"order": [], "hidden": []}
    with closing(_connect_character_sqlite_cache()) as conn:
        _ensure_table(conn)
        row = conn.execute(
            "SELECT order_json, hidden_json FROM adventure_search_settings WHERE adventure_name = ?",
            (normalized,),
        ).fetchone()
    if not row:
        return {"order": [], "hidden": []}
    return {"order": json.loads(row[0]), "hidden": json.loads(row[1])}


def _remember_adventure_search_order(adventure_name, candidates, settings):
    keys = list(dict.fromkeys(candidate_key(row) for row in candidates))
    stored_keys = set(settings["order"])
    if not keys or all(key in stored_keys for key in keys):
        return settings
    normalized = normalize_adventure_search_name(adventure_name)
    with closing(_connect_character_sqlite_cache()) as conn:
        _ensure_table(conn)
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT order_json, hidden_json FROM adventure_search_settings WHERE adventure_name = ?",
            (normalized,),
        ).fetchone()
        current = {"order": json.loads(row[0]), "hidden": json.loads(row[1])} if row else {"order": [], "hidden": []}
        known = set(current["order"])
        order = current["order"] + [key for key in keys if key not in known]
        if order != current["order"]:
            conn.execute("""
                INSERT INTO adventure_search_settings (adventure_name, order_json, hidden_json, updated_at_ms)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(adventure_name) DO UPDATE SET
                    order_json = excluded.order_json,
                    updated_at_ms = excluded.updated_at_ms
            """, (normalized, json.dumps(order), json.dumps(current["hidden"]), int(time.time() * 1000)))
            current["order"] = order
        conn.commit()
    return current


def apply_adventure_search_settings(candidates, adventure_name, *, remember_order=False):
    settings = get_adventure_search_settings(adventure_name)
    if remember_order:
        settings = _remember_adventure_search_order(adventure_name, candidates, settings)
    order = {key: index for index, key in enumerate(settings["order"])}
    hidden = set(settings["hidden"])
    visible = [row for row in candidates if candidate_key(row) not in hidden]
    visible.sort(key=lambda row: order.get(candidate_key(row), len(order)))
    return visible, len(candidates) - len(visible)


def _live_character_adventure(server_id, character_id):
    payload = fetch_character_detail_from_api(server_id, character_id)
    detail = payload.get("character") if isinstance(payload.get("character"), dict) else payload
    return clean_text(detail.get("adventureName"))


def _live_equipment(server_id, character_id):
    payload = fetch_character_payload_from_api(server_id, character_id, "equip/equipment")
    equipment = payload.get("equipment")
    if not isinstance(equipment, list):
        raise AdventureManagementError("장비 정보를 확인하지 못했습니다. 다시 시도해 주세요.")
    return [row for row in equipment if isinstance(row, dict)]


def _prune_locked(now):
    for store in (_CHALLENGES, _EDIT_GRANTS):
        for token, row in list(store.items()):
            if row["expires"] <= now:
                del store[token]
    for key, times in list(_START_TIMES.items()):
        recent = [value for value in times if value > now - START_RATE_WINDOW_SECONDS]
        if recent:
            _START_TIMES[key] = recent
        else:
            del _START_TIMES[key]


def start_adventure_challenge(adventure_name):
    normalized = normalize_adventure_search_name(adventure_name)
    candidates = get_cached_adventure_search_candidates(adventure_name)
    visible, _ = apply_adventure_search_settings(candidates, adventure_name)
    if not visible:
        raise AdventureManagementError("인증에 사용할 모험단 캐릭터가 없습니다.")
    now = time.time()
    with _LOCK:
        _prune_locked(now)
        if len(_START_TIMES.get(normalized, [])) >= 5:
            raise AdventureManagementRateLimitError("인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
        _START_TIMES.setdefault(normalized, []).append(now)
    selected = secrets.choice(visible)
    server_id = clean_text(selected.get("serverId")).lower()
    character_id = clean_text(selected.get("characterId"))
    if normalize_adventure_search_name(_live_character_adventure(server_id, character_id)) != normalized:
        raise AdventureManagementError("현재 캐릭터의 모험단 정보가 검색 결과와 다릅니다.")
    equipment = _live_equipment(server_id, character_id)
    eligible = [row for row in equipment if clean_text(row.get("slotId")) in _PREFERRED_SLOTS and clean_text(row.get("itemId"))]
    if not eligible or len(equipment) < 2:
        raise AdventureManagementError("인증에 사용할 장착 장비가 없습니다. 다시 시도해 주세요.")
    selected_item = secrets.choice(eligible)
    witness = next((
        row for row in equipment
        if clean_text(row.get("slotId")) != clean_text(selected_item.get("slotId"))
        and clean_text(row.get("slotId")) and clean_text(row.get("itemId"))
    ), None)
    if not witness:
        raise AdventureManagementError("인증에 사용할 장착 장비가 없습니다. 다시 시도해 주세요.")
    token = secrets.token_urlsafe(32)
    with _LOCK:
        _CHALLENGES[token] = {
            "adventure": normalized,
            "serverId": server_id,
            "characterId": character_id,
            "slotId": clean_text(selected_item.get("slotId")),
            "itemId": clean_text(selected_item.get("itemId")),
            "witnessSlotId": clean_text(witness.get("slotId")),
            "witnessItemId": clean_text(witness.get("itemId")),
            "expires": time.time() + CHALLENGE_TTL_SECONDS,
            "attempts": 0,
        }
    return {
        "challengeToken": token,
        "serverId": server_id,
        "characterId": character_id,
        "serverName": clean_text(selected.get("serverName")),
        "characterName": clean_text(selected.get("characterName")),
        "slotName": clean_text(selected_item.get("slotName")),
        "itemName": clean_text(selected_item.get("itemName")),
        "itemIconUrl": f"https://img-api.neople.co.kr/df/items/{clean_text(selected_item.get('itemId'))}",
    }


def verify_adventure_challenge(token):
    with _LOCK:
        now = time.time()
        _prune_locked(now)
        challenge = _CHALLENGES.get(clean_text(token))
        if not challenge:
            raise AdventureManagementError("인증 시간이 만료되었습니다. 다시 시작해 주세요.")
        challenge["attempts"] += 1
        if challenge["attempts"] > 10:
            del _CHALLENGES[token]
            raise AdventureManagementError("확인 횟수를 초과했습니다. 다시 시작해 주세요.")
        challenge = dict(challenge)
    server_id = challenge["serverId"]
    character_id = challenge["characterId"]
    if normalize_adventure_search_name(_live_character_adventure(server_id, character_id)) != challenge["adventure"]:
        raise AdventureManagementError("캐릭터의 모험단 정보가 변경되었습니다.")
    equipment = _live_equipment(server_id, character_id)
    if any(clean_text(row.get("slotId")) == challenge["slotId"] for row in equipment):
        raise AdventureManagementError("아직 지정 장비가 장착된 것으로 조회됩니다. 채널 이동 또는 캐릭터 재접속 후 다시 확인해 주세요.")
    if not any(
        clean_text(row.get("slotId")) == challenge["witnessSlotId"]
        and clean_text(row.get("itemId")) == challenge["witnessItemId"]
        for row in equipment
    ):
        raise AdventureManagementError("다른 장비 상태도 변경되어 인증할 수 없습니다. 다시 시작해 주세요.")
    with _LOCK:
        active = _CHALLENGES.get(token)
        if not active or active["expires"] <= time.time():
            raise AdventureManagementError("인증 시간이 만료되었습니다. 다시 시작해 주세요.")
        del _CHALLENGES[token]
        edit_token = secrets.token_urlsafe(32)
        _EDIT_GRANTS[edit_token] = {"adventure": challenge["adventure"], "expires": time.time() + EDIT_TTL_SECONDS}
    candidates = get_cached_adventure_search_candidates(challenge["adventure"])
    attach_cached_score_summaries(candidates)
    return {"editToken": edit_token, "candidates": candidates, "settings": get_adventure_search_settings(challenge["adventure"])}


def save_adventure_search_settings(adventure_name, edit_token, order, hidden):
    normalized = normalize_adventure_search_name(adventure_name)
    with _LOCK:
        _prune_locked(time.time())
        grant = _EDIT_GRANTS.get(clean_text(edit_token))
        if not grant or grant["adventure"] != normalized:
            raise AdventureManagementError("수정 권한이 만료되었습니다. 다시 인증해 주세요.")
    candidates = get_cached_adventure_search_candidates(adventure_name)
    known = {candidate_key(row) for row in candidates}
    if not known or not isinstance(order, list) or not isinstance(hidden, list):
        raise AdventureManagementError("저장할 캐릭터 목록이 올바르지 않습니다.")
    if any(not isinstance(key, str) for key in order + hidden):
        raise AdventureManagementError("캐릭터 목록 형식이 올바르지 않습니다.")
    if len(order) > len(known) or len(set(order)) != len(order) or any(key not in known for key in order):
        raise AdventureManagementError("정렬 목록에 잘못된 캐릭터가 있습니다.")
    if len(hidden) > len(known) or len(set(hidden)) != len(hidden) or any(key not in known for key in hidden):
        raise AdventureManagementError("숨김 목록에 잘못된 캐릭터가 있습니다.")
    if len(set(hidden)) >= len(known):
        raise AdventureManagementError("인증을 위해 캐릭터 한 명은 목록에 남겨 주세요.")
    with closing(_connect_character_sqlite_cache()) as conn:
        _ensure_table(conn)
        conn.execute("""
            INSERT INTO adventure_search_settings (adventure_name, order_json, hidden_json, updated_at_ms)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(adventure_name) DO UPDATE SET
                order_json = excluded.order_json,
                hidden_json = excluded.hidden_json,
                updated_at_ms = excluded.updated_at_ms
        """, (normalized, json.dumps(order), json.dumps(hidden), int(time.time() * 1000)))
        conn.commit()
    return {"order": order, "hidden": hidden}


def revoke_adventure_edit_grant(edit_token):
    with _LOCK:
        _EDIT_GRANTS.pop(clean_text(edit_token), None)
    return {"ok": True}


def cancel_adventure_challenge(challenge_token):
    with _LOCK:
        _CHALLENGES.pop(clean_text(challenge_token), None)
    return {"ok": True}
