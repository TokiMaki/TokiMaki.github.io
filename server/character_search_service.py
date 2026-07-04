from concurrent.futures import ThreadPoolExecutor, as_completed

from .neople_client import (
    clean_text,
    fetch_character_detail_from_api,
    search_characters_from_api,
)

SERVER_SEARCH_ORDER = (
    ("cain", "카인"),
    ("diregie", "디레지에"),
    ("siroco", "시로코"),
    ("prey", "프레이"),
    ("casillas", "카시야스"),
    ("hilder", "힐더"),
    ("anton", "안톤"),
    ("bakal", "바칼"),
)


def parse_int(value) -> int:
    text = clean_text(value).replace(",", "")
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def extract_character_job_meta(payload: dict) -> dict[str, str]:
    source = payload.get("character") if isinstance(payload.get("character"), dict) else payload
    if not isinstance(source, dict):
        source = payload

    return {
        "job_id": clean_text(source.get("jobId")),
        "job_name": clean_text(source.get("jobName")),
        "job_grow_id": clean_text(source.get("jobGrowId")),
        "job_grow_name": clean_text(source.get("jobGrowName")),
    }


def build_search_candidate(server_id: str, server_name: str, row: dict, order: int, target_name: str) -> dict:
    character_name = clean_text(row.get("characterName"))
    return {
        "serverId": server_id,
        "serverName": server_name,
        "characterId": clean_text(row.get("characterId")),
        "characterName": character_name,
        "adventureName": clean_text(row.get("adventureName")),
        "jobId": clean_text(row.get("jobId")),
        "jobName": clean_text(row.get("jobName")),
        "jobGrowId": clean_text(row.get("jobGrowId")),
        "jobGrowName": clean_text(row.get("jobGrowName")),
        "fame": parse_int(row.get("fame")),
        "_serverOrder": order,
        "_exactOrder": 0 if character_name == target_name else 1,
    }


def search_server_candidates(order: int, server_id: str, server_name: str, target_name: str, limit: int) -> tuple[list[dict], dict | None]:
    try:
        rows = search_characters_from_api(server_id, target_name, limit, "match")
    except Exception as exc:
        return [], {
            "serverId": server_id,
            "serverName": server_name,
            "error": str(exc),
        }
    candidates = []
    for row in rows:
        candidate = build_search_candidate(server_id, server_name, row, order, target_name)
        if candidate["characterId"] and candidate["characterName"]:
            candidates.append(candidate)
    return candidates, None


def search_character(
    server_id: str,
    character_name: str,
    limit: int = 10,
    word_type: str = "match",
) -> dict:
    rows = search_characters_from_api(server_id, character_name, limit, word_type)
    target_name = clean_text(character_name)
    if not rows:
        raise RuntimeError(f"캐릭터를 찾지 못했습니다: {server_id} / {target_name}")

    chosen = next(
        (row for row in rows if clean_text(row.get("characterName")) == target_name),
        rows[0],
    )
    resolved_character_id = clean_text(chosen.get("characterId"))
    resolved_character_name = clean_text(chosen.get("characterName")) or target_name or "알 수 없음"
    resolved_job_id = clean_text(chosen.get("jobId"))
    resolved_job_name = clean_text(chosen.get("jobName"))
    resolved_job_grow_id = clean_text(chosen.get("jobGrowId"))
    resolved_job_grow_name = clean_text(chosen.get("jobGrowName"))
    resolved_fame = parse_int(chosen.get("fame"))

    if not (resolved_job_id and resolved_job_name and resolved_job_grow_id and resolved_job_grow_name):
        detail_payload = fetch_character_detail_from_api(server_id, resolved_character_id)
        detail_meta = extract_character_job_meta(detail_payload)
        resolved_job_id = resolved_job_id or detail_meta["job_id"]
        resolved_job_name = resolved_job_name or detail_meta["job_name"]
        resolved_job_grow_id = resolved_job_grow_id or detail_meta["job_grow_id"]
        resolved_job_grow_name = resolved_job_grow_name or detail_meta["job_grow_name"]
        resolved_fame = resolved_fame or parse_int(detail_payload.get("fame"))

    if not resolved_character_id:
        raise RuntimeError(f"캐릭터 ID를 읽지 못했습니다: {server_id} / {resolved_character_name}")

    return {
        "server_id": server_id,
        "character_id": resolved_character_id,
        "character_name": resolved_character_name,
        "adventure_name": clean_text(chosen.get("adventureName")),
        "job_id": resolved_job_id,
        "job_name": resolved_job_name,
        "job_grow_id": resolved_job_grow_id,
        "job_grow_name": resolved_job_grow_name,
        "fame": resolved_fame,
        "rows": rows,
    }


def search_character_response(server_id: str, character_name: str) -> dict:
    try:
        resolved = search_character(server_id, character_name)
    except Exception as exc:
        if "캐릭터를 찾지 못했습니다" not in str(exc):
            raise
        return {
            "serverId": server_id,
            "characterName": character_name,
            "matchCount": 0,
            "resolved": {},
            "rows": [],
        }

    return {
        "serverId": server_id,
        "characterName": character_name,
        "matchCount": len(resolved["rows"]),
        "resolved": {
            "serverId": resolved["server_id"],
            "characterId": resolved["character_id"],
            "characterName": resolved["character_name"],
            "adventureName": resolved.get("adventure_name", ""),
            "fame": resolved.get("fame", 0),
            "jobId": resolved.get("job_id", ""),
            "jobName": resolved.get("job_name", ""),
            "jobGrowId": resolved.get("job_grow_id", ""),
            "jobGrowName": resolved.get("job_grow_name", ""),
        },
        "rows": resolved["rows"],
    }


def search_all_characters_response(character_name: str, limit: int = 10) -> dict:
    target_name = clean_text(character_name)
    if not target_name:
        return {"characterName": target_name, "candidates": [], "failures": []}

    candidates = []
    failures = []
    with ThreadPoolExecutor(max_workers=min(4, len(SERVER_SEARCH_ORDER))) as executor:
        futures = [
            executor.submit(search_server_candidates, order, server_id, server_name, target_name, limit)
            for order, (server_id, server_name) in enumerate(SERVER_SEARCH_ORDER)
        ]
        for future in as_completed(futures):
            server_candidates, failure = future.result()
            candidates.extend(server_candidates)
            if failure:
                failures.append(failure)

    if failures and len(failures) == len(SERVER_SEARCH_ORDER):
        raise RuntimeError("전체 서버 캐릭터 검색에 실패했습니다.")

    candidates.sort(key=lambda row: (row["_serverOrder"], row["_exactOrder"]))
    for row in candidates:
        row.pop("_serverOrder", None)
        row.pop("_exactOrder", None)

    return {
        "characterName": target_name,
        "candidates": candidates,
        "failures": failures,
    }
