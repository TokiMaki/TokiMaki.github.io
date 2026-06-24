import json
import os
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from .ops_log import sanitize_url, write_ops_log

API_KEY = os.environ.get("NEOPLE_API_KEY", "").strip()
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3


def require_api_key() -> str:
    if not API_KEY:
        raise RuntimeError("NEOPLE_API_KEY 환경변수를 설정해 주세요.")
    return API_KEY


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


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


def get_auction_rows_from_api(item_id: str, min_fame=None, max_fame=None, limit: int = 100) -> list:
    params = {"itemId": item_id, "limit": 100, "sort": "unitPrice:asc", "apikey": API_KEY}
    if limit:
        params["limit"] = limit
    if min_fame is not None:
        params["minFame"] = min_fame
    if max_fame is not None:
        params["maxFame"] = max_fame
    url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
    return request_json(url).get("rows") or []


def get_auction_rows_by_name_from_api(item_name: str, word_type: str = "full", limit: int = 100, offset: int = 0) -> list:
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


def get_auction_rows_by_item_ids_from_api(item_ids: list[str], limit: int = 100) -> list:
    params = {
        "itemIds": ",".join(item_ids),
        "limit": limit,
        "sort": "unitPrice:asc",
        "apikey": API_KEY,
    }
    url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
    return request_json(url).get("rows") or []


def get_item_icon_url(item_id: str) -> str:
    return f"https://img-api.neople.co.kr/df/items/{item_id}" if item_id else ""


def clean_item_display_name(value) -> str:
    return clean_text(value).replace("%%", "%")


def get_item_explain(detail: dict) -> str:
    return clean_text(detail.get("itemExplainDetail") or detail.get("itemExplain"))


def search_items_by_name_from_api(item_name: str, word_type: str = "full", limit: int = 100, offset: int = 0) -> list:
    url = (
        "https://api.neople.co.kr/df/items"
        f"?itemName={quote(item_name)}&wordType={quote(word_type)}&limit={limit}&offset={offset}&apikey={API_KEY}"
    )
    return request_json(url).get("rows") or []


def fetch_item_details_from_api(item_ids: list) -> list:
    if not item_ids:
        return []
    url = f"https://api.neople.co.kr/df/multi/items?itemIds={','.join(item_ids)}&apikey={API_KEY}"
    return request_json(url).get("rows") or []


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


def search_characters_from_api(
    server_id: str,
    character_name: str,
    limit: int = 10,
    word_type: str = "match",
) -> list[dict[str, Any]]:
    payload = request_json(build_character_search_url(server_id, character_name, limit, word_type))
    return extract_row_list(payload, "rows", "characters", "characterRows")


def fetch_character_detail_from_api(server_id: str, character_id: str) -> dict[str, Any]:
    return request_json(build_character_detail_url(server_id, character_id))


def fetch_character_payload_from_api(server_id: str, character_id: str, path: str) -> dict[str, Any]:
    resource_path = clean_text(path).strip("/")
    url = (
        f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/{resource_path}?apikey={API_KEY}"
        if resource_path
        else f"{build_character_detail_url(server_id, character_id)}?apikey={API_KEY}"
    )
    return request_json(url)
