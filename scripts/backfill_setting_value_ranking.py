#!/usr/bin/env python3

import argparse
import json
import sqlite3
import time
from collections import Counter
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "cache" / "character-response-cache.sqlite"
DEFAULT_API_BASE = "http://127.0.0.1:8799"


class BackfillRequestError(RuntimeError):
    pass


def load_backfill_candidates(
    db_path: Path,
    limit: int | None = None,
    refresh_existing: bool = False,
) -> list[dict]:
    if not db_path.exists():
        raise FileNotFoundError(f"캐시 DB를 찾을 수 없습니다: {db_path}")

    database_uri = f"{db_path.resolve().as_uri()}?mode=ro"
    with sqlite3.connect(database_uri, timeout=3.0, uri=True) as conn:
        tables = {
            str(row[0])
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        if "character_search_candidate_cache" not in tables:
            raise RuntimeError("캐시 DB에 character_search_candidate_cache 테이블이 없습니다.")

        has_snapshot_table = "setting_value_snapshot" in tables
        query = """
            SELECT
                candidate.server_id,
                candidate.character_id,
                candidate.character_name,
                candidate.fame
            FROM character_search_candidate_cache AS candidate
        """
        if has_snapshot_table and not refresh_existing:
            query += """
                LEFT JOIN setting_value_snapshot AS snapshot
                  ON snapshot.server_id = candidate.server_id
                 AND snapshot.character_id = candidate.character_id
                WHERE snapshot.character_id IS NULL
            """
        query += " ORDER BY candidate.updated_at_ms DESC"

        parameters = []
        if limit is not None:
            query += " LIMIT ?"
            parameters.append(max(0, int(limit)))
        rows = conn.execute(query, parameters).fetchall()

    return [
        {
            "serverId": str(row[0] or "").strip().lower(),
            "characterId": str(row[1] or "").strip(),
            "characterName": str(row[2] or "").strip(),
            "fame": int(row[3] or 0),
        }
        for row in rows
        if str(row[0] or "").strip() and str(row[1] or "").strip()
    ]


def request_json(
    api_base: str,
    path: str,
    params: dict | None = None,
    method: str = "GET",
    timeout: float = 300.0,
) -> dict:
    query = urlencode({key: value for key, value in (params or {}).items() if value is not None})
    url = f"{api_base.rstrip('/')}{path}"
    if query:
        url = f"{url}?{query}"
    request = Request(
        url,
        data=b"" if method == "POST" else None,
        method=method,
        headers={"Accept": "application/json"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            error_payload = json.loads(exc.read().decode("utf-8"))
            message = str(error_payload.get("error") or exc.reason)
        except Exception:
            message = str(exc.reason)
        raise BackfillRequestError(f"HTTP {exc.code}: {message}") from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise BackfillRequestError(str(exc)) from exc

    if not isinstance(payload, dict):
        raise BackfillRequestError("API 응답이 JSON 객체가 아닙니다.")
    if payload.get("error"):
        raise BackfillRequestError(str(payload["error"]))
    return payload


def ensure_shared_catalogs(api_base: str, timeout: float) -> None:
    catalogs = (
        ("/api/enchant-cards", "cards"),
        ("/api/title-upgrades", "groups"),
        ("/api/aura-upgrades", "groups"),
        ("/api/creature-upgrades", "groups"),
    )
    for path, rows_key in catalogs:
        payload = request_json(api_base, path, timeout=timeout)
        if payload.get(rows_key):
            continue
        payload = request_json(api_base, path, {"refresh": "1"}, timeout=timeout)
        if not payload.get(rows_key):
            raise BackfillRequestError(f"{path} 가격 데이터가 비어 있습니다.")


def backfill_character(api_base: str, candidate: dict, timeout: float) -> str:
    server_id = candidate["serverId"]
    character_id = candidate["characterId"]

    loadout = request_json(
        api_base,
        "/api/character-loadout",
        {"serverId": server_id, "characterId": character_id},
        timeout=timeout,
    )
    character_name = str(loadout.get("characterName") or candidate.get("characterName") or "").strip()
    if not character_name:
        raise BackfillRequestError("캐릭터명이 없습니다.")

    is_buffer = bool((loadout.get("bufferBaseline") or {}).get("isBuffer"))
    request_json(
        api_base,
        "/api/equipment-score",
        {"serverId": server_id, "characterName": character_name},
        timeout=timeout,
    )
    if is_buffer:
        request_json(
            api_base,
            "/api/enchant-cards",
            {
                "role": "buffer",
                "serverId": server_id,
                "characterId": character_id,
            },
            timeout=timeout,
        )
    request_json(
        api_base,
        "/api/aura-upgrades",
        {"serverId": server_id, "characterId": character_id},
        timeout=timeout,
    )
    request_json(
        api_base,
        "/api/creature-upgrades",
        {"serverId": server_id, "characterId": character_id},
        timeout=timeout,
    )
    result = request_json(
        api_base,
        "/api/setting-value/finalize",
        {"serverId": server_id, "characterId": character_id},
        method="POST",
        timeout=timeout,
    )
    snapshot = result.get("snapshot") or {}
    role = str(snapshot.get("role") or ("buffer" if is_buffer else "dealer")).strip().lower()
    if role not in {"dealer", "buffer"}:
        raise BackfillRequestError("저장된 랭킹 역할을 확인할 수 없습니다.")
    return role


def main() -> int:
    parser = argparse.ArgumentParser(
        description="기존 캐릭터 검색 캐시를 현재 세팅 가치 랭킹에 일괄 저장합니다.",
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="캐릭터 캐시 SQLite 경로")
    parser.add_argument("--api-base", default=DEFAULT_API_BASE, help="실행 중인 DunPilot API 주소")
    parser.add_argument("--limit", type=int, default=None, help="이번 실행에서 처리할 최대 캐릭터 수")
    parser.add_argument(
        "--refresh-existing",
        action="store_true",
        help="이미 랭킹에 저장된 캐릭터도 다시 갱신",
    )
    parser.add_argument("--delay", type=float, default=0.0, help="캐릭터 처리 사이 대기 시간(초)")
    parser.add_argument("--timeout", type=float, default=300.0, help="개별 API 요청 제한 시간(초)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="후보 수만 확인하고 API를 호출하지 않음",
    )
    args = parser.parse_args()

    candidates = load_backfill_candidates(
        args.db,
        limit=args.limit,
        refresh_existing=args.refresh_existing,
    )
    print(f"backfill candidates={len(candidates)}")
    if args.dry_run or not candidates:
        return 0

    request_json(args.api_base, "/api/health", timeout=min(args.timeout, 10.0))
    ensure_shared_catalogs(args.api_base, args.timeout)

    completed_by_role = Counter()
    failed_by_stage = Counter()
    started_at = time.monotonic()
    try:
        for index, candidate in enumerate(candidates, start=1):
            try:
                role = backfill_character(args.api_base, candidate, args.timeout)
                completed_by_role[role] += 1
                print(f"backfill [{index}/{len(candidates)}]: completed ({role})")
            except Exception as exc:
                failed_by_stage[type(exc).__name__] += 1
                print(f"backfill [{index}/{len(candidates)}]: failed ({exc})")
            if args.delay > 0 and index < len(candidates):
                time.sleep(args.delay)
    except KeyboardInterrupt:
        print("backfill interrupted; rerun to continue from unsaved candidates")

    elapsed_seconds = max(0.0, time.monotonic() - started_at)
    failed = sum(failed_by_stage.values())
    print(
        "backfill summary "
        f"(dealer={completed_by_role['dealer']}, buffer={completed_by_role['buffer']}, "
        f"failed={failed}, elapsed={elapsed_seconds:.1f}s)"
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
