#!/usr/bin/env python3

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
REQUEST_TIMEOUT = 30
REQUEST_DELAY_SECONDS = 0.08


DEFAULT_PATHS = [
    ROOT / "Docs" / "dealer_switching_creature_db.json",
]

FILE_TYPE_DEFAULTS = {
    "dealer_switching_creature_db.json": "크리쳐",
}


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def load_env_file(path: Path) -> dict[str, str]:
    env = {}
    if not path.exists():
        return env
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def get_api_key() -> str:
    api_key = clean_text(os.environ.get("NEOPLE_API_KEY"))
    if api_key:
        return api_key
    return clean_text(load_env_file(ROOT / ".env.local").get("NEOPLE_API_KEY"))


def request_json(url: str, api_key: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "apikey": api_key,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("응답 형식이 올바르지 않습니다.")
    time.sleep(REQUEST_DELAY_SECONDS)
    return payload


def search_exact_item(api_key: str, item_name: str, item_type_detail: str = "") -> tuple[dict[str, Any], str]:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    if not item_name:
        return {}, "empty-name"
    url = (
        "https://api.neople.co.kr/df/items"
        f"?itemName={quote(item_name)}&wordType=full&limit=100&apikey={quote(api_key)}"
    )
    rows = request_json(url, api_key).get("rows") or []
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
    ]
    if not exact_rows:
        return {}, "not-found"
    if len(exact_rows) > 1:
        return {}, "ambiguous"
    return exact_rows[0], "ok"


def candidate_name_for_entry(entry: dict[str, Any]) -> str:
    for key in ("itemName", "searchName", "name"):
        value = clean_text(entry.get(key))
        if value:
            return value
    return ""


def entry_type_detail(entry: dict[str, Any], default_type_detail: str) -> str:
    return clean_text(entry.get("itemTypeDetail")) or default_type_detail


def iter_entries(value: Any, path: str = ""):
    if isinstance(value, dict):
        yield path, value
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            yield from iter_entries(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            child_path = f"{path}[{index}]" if path else f"[{index}]"
            yield from iter_entries(child, child_path)


def fill_file(path: Path, api_key: str, write: bool) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    default_type_detail = FILE_TYPE_DEFAULTS.get(path.name, "")
    updates = []
    skipped = []

    for entry_path, entry in iter_entries(payload):
        if not isinstance(entry, dict):
            continue
        if clean_text(entry.get("itemId")):
            continue
        item_name = candidate_name_for_entry(entry)
        if not item_name:
            continue
        item_type_detail = entry_type_detail(entry, default_type_detail)
        item, status = search_exact_item(api_key, item_name, item_type_detail)
        if status != "ok":
            skipped.append({
                "path": entry_path,
                "itemName": item_name,
                "itemTypeDetail": item_type_detail,
                "reason": status,
            })
            continue
        item_id = clean_text(item.get("itemId"))
        if not item_id:
            skipped.append({
                "path": entry_path,
                "itemName": item_name,
                "itemTypeDetail": item_type_detail,
                "reason": "missing-item-id",
            })
            continue
        entry["itemId"] = item_id
        updates.append({
            "path": entry_path,
            "itemName": item_name,
            "itemTypeDetail": item_type_detail,
            "itemId": item_id,
            "resolvedName": clean_text(item.get("itemName")),
        })

    if write and updates:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

    return {
        "path": str(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path),
        "updated": updates,
        "skipped": skipped,
    }


def main():
    parser = argparse.ArgumentParser(description="스펙업 후보 DB의 itemName/searchName을 네오플 itemId로 채웁니다.")
    parser.add_argument("paths", nargs="*", type=Path, help="갱신할 JSON DB 경로. 생략 시 기본 대상만 검사합니다.")
    parser.add_argument("--write", action="store_true", help="실제로 JSON 파일에 itemId를 기록합니다. 생략하면 dry-run입니다.")
    args = parser.parse_args()

    api_key = get_api_key()
    if not api_key:
        raise RuntimeError("NEOPLE_API_KEY 환경변수를 설정하거나 .env.local에 값을 넣어 주세요.")

    paths = args.paths or DEFAULT_PATHS
    results = []
    for path in paths:
        path = path if path.is_absolute() else ROOT / path
        results.append(fill_file(path, api_key, args.write))
    print(json.dumps({"write": args.write, "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
