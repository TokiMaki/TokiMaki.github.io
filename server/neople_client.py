import json
import os
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

API_KEY = os.environ.get("NEOPLE_API_KEY", "").strip()
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3


def require_api_key() -> str:
    if not API_KEY:
        raise RuntimeError("NEOPLE_API_KEY 환경변수를 설정해 주세요.")
    return API_KEY


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def parse_int(value: Any) -> int:
    text = clean_text(value).replace(",", "")
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def request_json(url: str) -> dict[str, Any]:
    api_key = require_api_key()
    request = Request(
        url,
        headers={
            "apikey": api_key,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("응답 형식이 올바르지 않습니다.")
            return payload
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(1)
            else:
                raise RuntimeError(f"API 요청 실패: {url}\n{exc}") from exc

    raise RuntimeError(f"API 요청 실패: {url}\n{last_error}")


def get_auction_rows(item_id: str, min_fame=None, max_fame=None, limit: int = 100) -> list:
    params = {"itemId": item_id, "limit": 100, "apikey": API_KEY}
    if limit:
        params["limit"] = limit
    if min_fame is not None:
        params["minFame"] = min_fame
    if max_fame is not None:
        params["maxFame"] = max_fame
    url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
    return request_json(url).get("rows") or []


def get_lowest_auction_price(item_id: str, min_fame=None, max_fame=None) -> dict:
    rows = get_auction_rows(item_id, min_fame=min_fame, max_fame=max_fame)
    priced_rows = [
        row for row in rows
        if isinstance(row.get("unitPrice"), (int, float)) and row.get("unitPrice") > 0
    ]
    completed_rows = [
        row for row in priced_rows
        if int(row.get("upgrade") or 0) == int(row.get("upgradeMax") or 0)
    ]
    if completed_rows:
        candidate_rows = completed_rows
    else:
        max_upgrade = max((int(row.get("upgrade") or 0) for row in priced_rows), default=0)
        candidate_rows = [
            row for row in priced_rows
            if int(row.get("upgrade") or 0) == max_upgrade
        ]

    lowest = min(candidate_rows, key=lambda row: row.get("unitPrice"), default=None)
    return {
        "listingCount": sum(int(row.get("regCount") or 0) for row in candidate_rows),
        "minUnitPrice": lowest.get("unitPrice") if lowest else None,
        "averagePrice": lowest.get("averagePrice") if lowest and lowest.get("averagePrice", 0) > 0 else None,
        "auctionNo": lowest.get("auctionNo") if lowest else None,
        "upgrade": lowest.get("upgrade") if lowest else None,
        "upgradeMax": lowest.get("upgradeMax") if lowest else None,
        "isMaxUpgrade": bool(lowest) and int(lowest.get("upgrade") or 0) == int(lowest.get("upgradeMax") or 0),
    }


def get_item_icon_url(item_id: str) -> str:
    return f"https://img-api.neople.co.kr/df/items/{item_id}" if item_id else ""


def clean_item_display_name(value) -> str:
    return clean_text(value).replace("%%", "%")


def get_item_explain(detail: dict) -> str:
    return clean_text(detail.get("itemExplainDetail") or detail.get("itemExplain"))


def search_items_by_name(item_name: str) -> list:
    url = (
        "https://api.neople.co.kr/df/items"
        f"?itemName={quote(item_name)}&wordType=full&limit=100&apikey={API_KEY}"
    )
    return request_json(url).get("rows") or []


def fetch_item_details(item_ids: list) -> list:
    unique_ids = []
    seen = set()
    for item_id in item_ids:
        if item_id and item_id not in seen:
            unique_ids.append(item_id)
            seen.add(item_id)
    if not unique_ids:
        return []

    rows = []
    for index in range(0, len(unique_ids), 20):
        chunk = unique_ids[index:index + 20]
        url = f"https://api.neople.co.kr/df/multi/items?itemIds={','.join(chunk)}&apikey={API_KEY}"
        rows.extend(request_json(url).get("rows") or [])
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


def extract_row_list(payload: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    for key in keys:
        rows = payload.get(key)
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def build_character_search_url(
    server_id: str,
    character_name: str,
    limit: int = 10,
    word_type: str = "match",
) -> str:
    query = [
        f"characterName={quote(character_name)}",
        f"limit={limit}",
        f"wordType={quote(word_type)}",
    ]
    return f"https://api.neople.co.kr/df/servers/{server_id}/characters?{'&'.join(query)}"


def build_character_detail_url(server_id: str, character_id: str) -> str:
    return f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}"


def extract_character_job_meta(payload: dict[str, Any]) -> dict[str, str]:
    source = payload.get("character") if isinstance(payload.get("character"), dict) else payload
    if not isinstance(source, dict):
        source = payload

    return {
        "job_id": clean_text(source.get("jobId")),
        "job_name": clean_text(source.get("jobName")),
        "job_grow_id": clean_text(source.get("jobGrowId")),
        "job_grow_name": clean_text(source.get("jobGrowName")),
    }


def search_character(
    server_id: str,
    character_name: str,
    limit: int = 10,
    word_type: str = "match",
) -> dict[str, Any]:
    payload = request_json(build_character_search_url(server_id, character_name, limit, word_type))
    rows = extract_row_list(payload, "rows", "characters", "characterRows")
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
        detail_payload = request_json(build_character_detail_url(server_id, resolved_character_id))
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
        "job_id": resolved_job_id,
        "job_name": resolved_job_name,
        "job_grow_id": resolved_job_grow_id,
        "job_grow_name": resolved_job_grow_name,
        "fame": resolved_fame,
        "rows": rows,
    }
