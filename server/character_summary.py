import os
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any
from urllib.parse import quote

from .neople_client import clean_text, request_json

TIMELINE_CODES = "550,551,552,553,554,555,556,557"
TIMELINE_START_DATE = "2026-03-26 00:00"
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
FAMILY_TO_SET_NAME = {name: name for name in SET_ORDER}
RARITY_HINTS = [
    ("태초의", "태초"),
    ("완전한", "에픽"),
    ("선명한", "레전더리"),
    ("희미한", "유니크"),
]


def build_timeline_url(
    server_id: str,
    character_id: str,
    end_date: str,
    next_token: str | None = None,
) -> str:
    parts = [
        "limit=100",
        f"code={TIMELINE_CODES}",
        f"startDate={quote(TIMELINE_START_DATE)}",
        f"endDate={quote(end_date)}",
    ]
    if next_token:
        parts.append(f"next={quote(next_token)}")

    query = "&".join(parts)
    return f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/timeline?{query}"


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


def summarize_timeline_rows(
    character_name: str,
    rows: list[dict[str, Any]],
    fallback_name: str = "알 수 없음",
) -> dict[str, Any]:
    counts_by_set: dict[str, Counter[str]] = defaultdict(Counter)
    unknown_families: Counter[str] = Counter()

    for row in rows:
        data = row.get("data") or {}
        if not isinstance(data, dict):
            continue

        item_name = clean_text(data.get("itemName"))
        if not item_name or not is_decision_item_name(item_name):
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


def summarize_character_by_identity(
    server_id: str,
    character_id: str,
    fallback_name: str = "알 수 없음",
) -> dict[str, Any]:
    character_name, rows = fetch_all_timeline_rows(server_id, character_id)
    return summarize_timeline_rows(character_name, rows, fallback_name)
