import json
import os
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from .ops_log import sanitize_url, write_ops_log

API_KEY = os.environ.get("NEOPLE_API_KEY", "").strip()
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
_ITEM_SEARCH_CACHE_LOCK = threading.Lock()
_ITEM_SEARCH_CACHE: dict[str, list] = {}
_ITEM_DETAIL_CACHE_LOCK = threading.Lock()
_ITEM_DETAIL_CACHE: dict[str, dict] = {}


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
        except HTTPError as exc:
            last_error = exc
            error_text = ""
            try:
                error_text = exc.read().decode("utf-8")
            except Exception:
                error_text = ""
            if exc.code == 503 or "DNF980" in error_text:
                write_ops_log("neople_api_maintenance", status=exc.code, url=sanitize_url(url), body=error_text[:500])
                raise RuntimeError("던파 점검중...") from exc
            if attempt < MAX_RETRIES:
                time.sleep(1)
            else:
                write_ops_log("neople_api_http_error", status=exc.code, url=sanitize_url(url), error=str(exc), body=error_text[:500])
                raise RuntimeError(f"API 요청 실패: {url}\n{exc}") from exc
        except (URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(1)
            else:
                write_ops_log("neople_api_error", url=sanitize_url(url), error=repr(exc))
                raise RuntimeError(f"API 요청 실패: {url}\n{exc}") from exc

    write_ops_log("neople_api_error", url=sanitize_url(url), error=repr(last_error))
    raise RuntimeError(f"API 요청 실패: {url}\n{last_error}")


def get_auction_rows(item_id: str, min_fame=None, max_fame=None, limit: int = 100) -> list:
    params = {"itemId": item_id, "limit": 100, "sort": "unitPrice:asc", "apikey": API_KEY}
    if limit:
        params["limit"] = limit
    if min_fame is not None:
        params["minFame"] = min_fame
    if max_fame is not None:
        params["maxFame"] = max_fame
    url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
    return request_json(url).get("rows") or []


def get_auction_rows_by_name(item_name: str, word_type: str = "full", limit: int = 100, offset: int = 0) -> list:
    params = {
        "itemName": clean_text(item_name),
        "wordType": clean_text(word_type) or "full",
        "limit": limit,
        "offset": offset,
        "sort": "unitPrice:asc",
        "apikey": API_KEY,
    }
    url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
    return request_json(url).get("rows") or []


def _lowest_auction_price_from_rows(rows: list) -> dict:
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


def get_lowest_auction_price(item_id: str, min_fame=None, max_fame=None) -> dict:
    return _lowest_auction_price_from_rows(get_auction_rows(item_id, min_fame=min_fame, max_fame=max_fame))


def get_lowest_auction_prices(item_ids: list[str], fame_by_item_id: dict[str, int] | None = None, limit: int = 100) -> dict[str, dict]:
    unique_ids = []
    seen = set()
    for item_id in item_ids:
        item_id = clean_text(item_id)
        if item_id and item_id not in seen:
            unique_ids.append(item_id)
            seen.add(item_id)
    if not unique_ids:
        return {}

    rows_by_id = {item_id: [] for item_id in unique_ids}
    for index in range(0, len(unique_ids), 10):
        chunk = unique_ids[index:index + 10]
        params = {
            "itemIds": ",".join(chunk),
            "limit": limit,
            "sort": "unitPrice:asc",
            "apikey": API_KEY,
        }
        url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
        for row in request_json(url).get("rows") or []:
            item_id = clean_text(row.get("itemId"))
            if item_id in rows_by_id:
                rows_by_id[item_id].append(row)

    prices = {}
    for item_id, rows in rows_by_id.items():
        target_fame = (fame_by_item_id or {}).get(item_id)
        if target_fame is not None:
            rows = [
                row for row in rows
                if int(row.get("fame") or 0) == int(target_fame)
            ]
        prices[item_id] = _lowest_auction_price_from_rows(rows)
    return prices


def get_item_icon_url(item_id: str) -> str:
    return f"https://img-api.neople.co.kr/df/items/{item_id}" if item_id else ""


def clean_item_display_name(value) -> str:
    return clean_text(value).replace("%%", "%")


def get_item_explain(detail: dict) -> str:
    return clean_text(detail.get("itemExplainDetail") or detail.get("itemExplain"))


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
        url = (
            "https://api.neople.co.kr/df/items"
            f"?itemName={quote(item_name)}&wordType={quote(word_type)}&limit={limit}&offset={offset}&apikey={API_KEY}"
        )
        page_rows = request_json(url).get("rows") or []
        rows.extend(page_rows)
        if len(page_rows) < 100:
            break
    with _ITEM_SEARCH_CACHE_LOCK:
        _ITEM_SEARCH_CACHE[cache_key] = [dict(row) for row in rows]
    return rows


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
        url = f"https://api.neople.co.kr/df/multi/items?itemIds={','.join(chunk)}&apikey={API_KEY}"
        fetched_rows = request_json(url).get("rows") or []
        with _ITEM_DETAIL_CACHE_LOCK:
            for row in fetched_rows:
                item_id = row.get("itemId")
                if item_id:
                    _ITEM_DETAIL_CACHE[item_id] = dict(row)
                    rows_by_id[item_id] = dict(row)
    return [rows_by_id[item_id] for item_id in unique_ids if item_id in rows_by_id]


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
        "adventure_name": clean_text(chosen.get("adventureName")),
        "job_id": resolved_job_id,
        "job_name": resolved_job_name,
        "job_grow_id": resolved_job_grow_id,
        "job_grow_name": resolved_job_grow_name,
        "fame": resolved_fame,
        "rows": rows,
    }
