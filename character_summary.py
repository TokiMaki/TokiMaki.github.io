import json
import os
import re
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen

# 기존 dfgear URL은 캐릭터 식별용으로만 남겨두고, 실제 데이터는 Neople API에서 가져온다.
URLS = [
    "https://dfgear.xyz/character?sId=cain&cId=e71f5681f80b9ba49bed82e659cd92aa&cName=%EB%A7%88%ED%82%A4%EB%A1%9C%EA%B7%B8",
    "https://dfgear.xyz/character?sId=cain&cId=42295fee9e5b9018a4f4de84cb2e84f2&cName=%EB%A7%88%ED%82%A4%EC%97%98%EB%B8%90",
    "https://dfgear.xyz/character?sId=cain&cId=d4913759db0fc8ae10bbdc992f643559&cName=%EB%A7%88%ED%82%A4%EB%82%A8%EB%A9%AC",
    "https://dfgear.xyz/character?sId=cain&cId=53ca2fc404425fb566c5597bcd229930&cName=%EB%A7%88%ED%82%A4%ED%97%8C%ED%84%B0",
    "https://dfgear.xyz/character?sId=cain&cId=80629f50876b3d92feb40a561542f626&cName=%EB%A7%88%ED%82%A4%ED%82%A4%EB%A9%9C",
    "https://dfgear.xyz/character?sId=cain&cId=661b2313a6d2db5ad09734c75916b250&cName=%EB%A7%88%ED%82%A4%EB%93%80%EC%96%BC",
    "https://dfgear.xyz/character?sId=cain&cId=a69a6cb43b77d543a709578fbd2c1272&cName=%EB%A7%88%ED%82%A4%ED%8A%B8%EB%B8%AC",
    "https://dfgear.xyz/character?sId=cain&cId=51f95ac1e3ac1e4f1b50e9503d17e055&cName=%EB%A7%88%ED%82%A4%ED%8A%B8%EC%8A%88",
    "https://dfgear.xyz/character?sId=cain&cId=fccf0fae279e6fc4f73fc14b38886e48&cName=%EB%A7%88%ED%82%A4%EC%97%AC%EB%A0%8C",
    "https://dfgear.xyz/character?sId=cain&cId=53222627100869e9c957c5c7844f4e6e&cName=%EB%A7%88%ED%82%A4%EB%B9%84%EC%A7%88",
    "https://dfgear.xyz/character?sId=cain&cId=9251d1d080618ac84005fb64a91fe60f&cName=%EB%A7%88%ED%82%A4%EC%97%AC%EA%B8%92",
    "https://dfgear.xyz/character?sId=cain&cId=39bbb2baec1127cdf601c04c50f3f18a&cName=%EB%A7%88%ED%82%A4%EC%97%AC%EC%8A%BC",
    "https://dfgear.xyz/character?sId=cain&cId=76e12fe9fc840006da46e5ebb4c8835d&cName=%EB%A7%88%ED%82%A4%EB%82%A8%EC%8A%BE",
]

SET_ORDER = [
    "페어리",
    "용투",
    "행운",
    "마력",
    "무리",
    "그림자",
    "발키리",
    "여우",
    "자연",
    "한계",
    "황금",
    "정화",
]

# timeline과 결정 아이템명에 들어있는 키워드를 그대로 세트명으로 쓴다.
FAMILY_TO_SET_NAME = {name: name for name in SET_ORDER}
RARITY_HINTS = [
    ("태초의", "태초"),
    ("완전한", "에픽"),
    ("선명한", "레전더리"),
    ("희미한", "유니크"),
]

API_KEY = os.environ.get("NEOPLE_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("NEOPLE_API_KEY 환경변수를 설정해 주세요.")
TIMELINE_CODES = "550,551,552,553,554,555,556,557"
TIMELINE_START_DATE = "2026-03-26 00:00"
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
OUTPUT_FILE = "dfgear_sets_for_hell_tool_ordered.json"

CHARACTER_PATH_RE = re.compile(r"/df/servers/(?P<server_id>[^/]+)/characters/(?P<character_id>[^/?#]+)")


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


def first_query_value(query: dict[str, list[str]], *keys: str) -> str:
    for key in keys:
        values = query.get(key)
        if values:
            return values[0]
    return ""


def parse_character_source(source: str) -> dict[str, str]:
    parsed = urlparse(source)
    query = parse_qs(parsed.query)

    server_id = first_query_value(query, "sId", "serverId")
    character_id = first_query_value(query, "cId", "characterId")
    fallback_name = first_query_value(query, "cName", "characterName")

    if not server_id or not character_id:
        match = CHARACTER_PATH_RE.search(parsed.path)
        if match:
            server_id = server_id or match.group("server_id")
            character_id = character_id or match.group("character_id")

    if not server_id or not character_id:
        raise ValueError(f"캐릭터 식별자를 읽지 못했습니다: {source}")

    return {
        "server_id": server_id,
        "character_id": character_id,
        "fallback_name": clean_text(fallback_name) or "알 수 없음",
    }


def build_timeline_url(
    server_id: str,
    character_id: str,
    end_date: str,
    next_token: str | None = None,
) -> str:
    parts = [
        f"limit=100",
        f"code={TIMELINE_CODES}",
        f"startDate={quote(TIMELINE_START_DATE)}",
        f"endDate={quote(end_date)}",
    ]
    if next_token:
        parts.append(f"next={quote(next_token)}")

    query = "&".join(parts)
    return f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/timeline?{query}"


def request_json(url: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "apikey": API_KEY,
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


def fetch_all_timeline_rows(server_id: str, character_id: str) -> tuple[str, list[dict[str, Any]]]:
    next_token: str | None = None
    rows: list[dict[str, Any]] = []
    character_name = "알 수 없음"
    query_end_date = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M")
    seen_next_tokens: set[str] = set()
    page_count = 0

    while True:
        page_count += 1
        payload = request_json(build_timeline_url(server_id, character_id, query_end_date, next_token))
        character_name = clean_text(payload.get("characterName")) or character_name

        timeline = payload.get("timeline") or {}
        page_rows = timeline.get("rows") or []
        if isinstance(page_rows, list):
            rows.extend(row for row in page_rows if isinstance(row, dict))

        next_token = timeline.get("next")
        if not next_token:
            break
        if next_token in seen_next_tokens:
            raise RuntimeError(f"timeline next 토큰이 반복되었습니다: {next_token}")
        seen_next_tokens.add(next_token)

    if os.environ.get("TIMELINE_DEBUG"):
        print(f"{character_name}: timeline pages={page_count}, rows={len(rows)}")

    return character_name, rows


def summarize_timeline_rows(
    character_name: str,
    rows: list[dict[str, Any]],
    fallback_name: str = "알 수 없음",
) -> dict[str, Any]:
    # 결정 타임라인은 누적 로그 기준으로 센다.
    # 이름에 '서약'이 붙은 건 제외하고,
    # 이름에 '결정'이 들어간 것만 결정으로 센다.
    counts_by_set: dict[str, Counter[str]] = defaultdict(Counter)
    unknown_families: Counter[str] = Counter()

    for row in rows:
        data = row.get("data") or {}
        if not isinstance(data, dict):
            continue

        item_name = clean_text(data.get("itemName"))
        if not item_name:
            continue
        if not is_decision_item_name(item_name):
            continue

        rarity = infer_oath_rarity(item_name, data.get("itemRarity"))

        if rarity not in {"태초", "에픽"}:
            continue

        family_key = extract_family_key(item_name)
        set_name = FAMILY_TO_SET_NAME.get(family_key)
        if not set_name:
            unknown_families[family_key or item_name] += 1
            continue

        counts_by_set[set_name][rarity] += 1

    sets = []
    for set_name in SET_ORDER:
        counts = counts_by_set.get(set_name, Counter())
        sets.append(
            {
                "name": set_name,
                "taecho": int(counts.get("태초", 0)),
                "epic": int(counts.get("에픽", 0)),
            }
        )

    if unknown_families:
        print(f"{character_name}: 미분류 결정 가족 -> {dict(unknown_families)}")

    return {"name": character_name or fallback_name, "sets": sets}


def is_decision_item_name(item_name: str) -> bool:
    text = clean_text(item_name)
    if not text:
        return False
    if "서약" in text:
        return False
    return "결정" in text


def extract_family_key(item_name: str) -> str:
    text = clean_text(item_name)
    if not text:
        return ""

    for keyword in SET_ORDER:
        if keyword in text:
            return keyword

    if ":" in text:
        return clean_text(text.split(":", 1)[0])

    if text.endswith("결정"):
        stem = clean_text(text[:-2])
        parts = stem.split(" ")
        if parts:
            return parts[-1]

    if text.endswith("서약"):
        stem = clean_text(text[:-2])
        parts = stem.split(" ")
        if parts:
            return parts[-1]

    parts = text.split(" ")
    return parts[0] if parts else text


def infer_oath_rarity(item_name: str, fallback_rarity: str) -> str:
    text = clean_text(item_name)
    for marker, rarity in RARITY_HINTS:
        if marker in text:
            return rarity
    return clean_text(fallback_rarity)


def build_empty_set_rows() -> list[dict[str, Any]]:
    return [{"name": name, "taecho": 0, "epic": 0} for name in SET_ORDER]


def summarize_character(source: str) -> dict[str, Any]:
    meta = parse_character_source(source)
    character_name, rows = fetch_all_timeline_rows(meta["server_id"], meta["character_id"])
    return summarize_timeline_rows(character_name, rows, meta["fallback_name"])


def summarize_character_by_identity(
    server_id: str,
    character_id: str,
    fallback_name: str = "알 수 없음",
) -> dict[str, Any]:
    character_name, rows = fetch_all_timeline_rows(server_id, character_id)
    return summarize_timeline_rows(character_name, rows, fallback_name)


def main() -> None:
    if not URLS:
        print("URLS에 캐릭터 주소를 넣으면 되지에.")
        return

    results = []
    for url in URLS:
        print(f"수집 중: {url}")
        try:
            result = summarize_character(url)
        except Exception as exc:
            meta = parse_character_source(url)
            print(f"수집 실패: {meta['fallback_name']} / {exc}")
            result = {"name": meta["fallback_name"], "sets": build_empty_set_rows()}
        results.append(result)
        print(f"완료: {result['name']}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(results, file, ensure_ascii=False, indent=2)

    print(f"완료지에. {OUTPUT_FILE} 확인하면 되지에.")


if __name__ == "__main__":
    main()
