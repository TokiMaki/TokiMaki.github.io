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

ENCHANT_CARD_ARRAY_TYPES = {
    "cards": "",
    "bufferCards": "",
    "materialEnchantItems": "보주",
    "bufferMaterialEnchantItems": "보주",
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
    def item_match_key(value: Any) -> str:
        return clean_text(value).replace(" ", "").replace("%%", "%")

    def display_match_key(value: Any) -> str:
        return clean_text(value).replace("%%", "%")

    compact_name = item_match_key(item_name)
    exact_rows = [
        row for row in rows
        if (
            clean_text(row.get("itemName")) == item_name
            or item_match_key(row.get("itemName")) == compact_name
        )
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
    ]
    if not exact_rows:
        return {}, "not-found"
    if len(exact_rows) > 1:
        display_exact_rows = [
            row for row in exact_rows
            if display_match_key(row.get("itemName")) == display_match_key(item_name)
        ]
        if display_exact_rows:
            exact_rows = display_exact_rows
        exact_name_rows = [row for row in exact_rows if clean_text(row.get("itemName")) == clean_text(exact_rows[0].get("itemName"))]
        if len(exact_name_rows) != len(exact_rows):
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


def append_update(updates: list[dict[str, Any]], entry_path: str, item_name: str, item_type_detail: str, item: dict[str, Any]):
    updates.append({
        "path": entry_path,
        "itemName": item_name,
        "itemTypeDetail": item_type_detail,
        "itemId": clean_text(item.get("itemId")),
        "resolvedName": clean_text(item.get("itemName")),
    })


def append_skip(skipped: list[dict[str, Any]], entry_path: str, item_name: str, item_type_detail: str, reason: str):
    skipped.append({
        "path": entry_path,
        "itemName": item_name,
        "itemTypeDetail": item_type_detail,
        "reason": reason,
    })


def resolve_entry_item_id(
    entry: dict[str, Any],
    entry_path: str,
    api_key: str,
    item_type_detail: str,
    updates: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
) -> None:
    if clean_text(entry.get("itemId")):
        return
    item_name = candidate_name_for_entry(entry)
    if not item_name:
        return
    item, status = search_exact_item(api_key, item_name, item_type_detail)
    if status != "ok":
        append_skip(skipped, entry_path, item_name, item_type_detail, status)
        return
    item_id = clean_text(item.get("itemId"))
    if not item_id:
        append_skip(skipped, entry_path, item_name, item_type_detail, "missing-item-id")
        return
    entry["itemId"] = item_id
    append_update(updates, entry_path, item_name, item_type_detail, item)


def get_enchant_bead_search_names(entry: dict[str, Any]) -> list[str]:
    names = []
    for key in ("beadSearchName", "itemName", "searchName", "name"):
        value = clean_text(entry.get(key))
        if not value:
            continue
        if key == "beadSearchName":
            names.append(value)
        elif value.endswith("카드"):
            names.append(value[:-2].strip() + " 보주")
    return list(dict.fromkeys(names))


def resolve_card_bead_item_id(
    entry: dict[str, Any],
    entry_path: str,
    api_key: str,
    updates: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
) -> None:
    if clean_text(entry.get("beadItemId")):
        return
    for bead_name in get_enchant_bead_search_names(entry):
        item, status = search_exact_item(api_key, bead_name, "보주")
        if status != "ok":
            continue
        item_id = clean_text(item.get("itemId"))
        if not item_id:
            continue
        entry["beadItemId"] = item_id
        entry["beadItemName"] = clean_text(item.get("itemName"))
        append_update(updates, f"{entry_path}.bead", bead_name, "보주", item)
        return
    bead_names = get_enchant_bead_search_names(entry)
    if bead_names:
        append_skip(skipped, f"{entry_path}.bead", " / ".join(bead_names), "보주", "not-found")


def resolve_acquisition_material_id(
    acquisition: dict[str, Any],
    entry_path: str,
    api_key: str,
    updates: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
) -> None:
    if clean_text(acquisition.get("materialItemId")):
        return
    item_name = clean_text(acquisition.get("materialSearchName") or acquisition.get("materialItemName"))
    if not item_name:
        return
    item, status = search_exact_item(api_key, item_name, "재료")
    if status != "ok":
        append_skip(skipped, entry_path, item_name, "재료", status)
        return
    item_id = clean_text(item.get("itemId"))
    if not item_id:
        append_skip(skipped, entry_path, item_name, "재료", "missing-item-id")
        return
    acquisition["materialItemId"] = item_id
    append_update(updates, entry_path, item_name, "재료", item)


def fill_enchant_card_file(payload: dict[str, Any], api_key: str) -> dict[str, Any]:
    updates = []
    skipped = []
    for array_name, item_type_detail in ENCHANT_CARD_ARRAY_TYPES.items():
        for index, entry in enumerate(payload.get(array_name) or []):
            if not isinstance(entry, dict):
                continue
            entry_path = f"{array_name}[{index}]"
            resolve_entry_item_id(entry, entry_path, api_key, item_type_detail, updates, skipped)
            if array_name in ("cards", "bufferCards"):
                resolve_card_bead_item_id(entry, entry_path, api_key, updates, skipped)
            acquisition = entry.get("acquisition")
            if isinstance(acquisition, dict):
                resolve_acquisition_material_id(
                    acquisition,
                    f"{entry_path}.acquisition",
                    api_key,
                    updates,
                    skipped,
                )
    return {"updated": updates, "skipped": skipped}


def fill_file(path: Path, api_key: str, write: bool) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if path.name == "enchant_card_db.json":
        result = fill_enchant_card_file(payload, api_key)
        if write and result["updated"]:
            with path.open("w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
        return {
            "path": str(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path),
            **result,
        }

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
            append_skip(skipped, entry_path, item_name, item_type_detail, status)
            continue
        item_id = clean_text(item.get("itemId"))
        if not item_id:
            append_skip(skipped, entry_path, item_name, item_type_detail, "missing-item-id")
            continue
        entry["itemId"] = item_id
        append_update(updates, entry_path, item_name, item_type_detail, item)

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
