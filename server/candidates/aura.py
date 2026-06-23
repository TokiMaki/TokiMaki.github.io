import re
import time
from threading import Lock

from ..neople_client import (
    API_KEY,
    clean_text,
    fetch_item_details,
    get_item_explain,
    get_item_icon_url,
    request_json,
    search_items_by_name,
)
from ..upgrade_payloads import aura_item_matches, build_aura_payload


_AURA_DISCOVERY_SERVER_IDS = ("cain", "diregie", "siroco", "prey", "casillas", "hilder", "anton", "bakal")
_AURA_DISCOVERY_MIN_FAME = 90000
_AURA_DISCOVERY_LIMIT = 30
_AURA_DISCOVERY_CACHE_TTL_SECONDS = 21600
_AURA_DISCOVERY_CACHE_LOCK = Lock()
_AURA_DISCOVERY_CACHE = {}


def extract_aura_names_from_box_explain(text: str) -> list[str]:
    matches = re.findall(r"사용 시\s+(.+?)\s+를 획득할 수 있습니다", clean_text(text))
    names = []
    for name in matches:
        clean_name = clean_text(name)
        if not clean_name:
            continue
        names.append(clean_name)
        for suffix in (" 오라 아바타", " 아바타", " 오라"):
            if clean_name.endswith(suffix):
                names.append(clean_text(clean_name[:-len(suffix)]))
    return list(dict.fromkeys(name for name in names if name))


def build_aura_avatar_search_names(keyword: str, box_details: list[dict]) -> list[str]:
    names = [clean_text(keyword)]
    for detail in box_details or []:
        names.extend(extract_aura_names_from_box_explain(get_item_explain(detail)))
    return list(dict.fromkeys(name for name in names if name))


def find_aura_item_id_from_equipped_avatars(search_names: list[str]) -> str:
    normalized_names = tuple(sorted({clean_text(name) for name in search_names if clean_text(name)}))
    if not normalized_names:
        return ""

    now = time.time()
    with _AURA_DISCOVERY_CACHE_LOCK:
        cached = _AURA_DISCOVERY_CACHE.get(normalized_names)
        if cached and float(cached.get("expires_at") or 0) > now:
            return clean_text(cached.get("item_id"))

    found_item_id = ""
    target_names = set(normalized_names)
    for server_id in _AURA_DISCOVERY_SERVER_IDS:
        fame_url = (
            f"https://api.neople.co.kr/df/servers/{server_id}/characters-fame"
            f"?minFame={_AURA_DISCOVERY_MIN_FAME}&limit={_AURA_DISCOVERY_LIMIT}&apikey={API_KEY}"
        )
        rows = (request_json(fame_url).get("rows") or [])[:_AURA_DISCOVERY_LIMIT]
        for row in rows:
            character_id = clean_text(row.get("characterId"))
            if not character_id:
                continue
            avatar_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
            avatar_rows = request_json(avatar_url).get("avatar") or []
            for avatar in avatar_rows:
                slot_name = clean_text(avatar.get("slotName"))
                item_type_detail = clean_text(avatar.get("itemTypeDetail"))
                item_name = clean_text(avatar.get("itemName"))
                if "오라" not in slot_name and "오라" not in item_type_detail and "오라" not in item_name:
                    continue
                if item_name in target_names:
                    found_item_id = clean_text(avatar.get("itemId"))
                    break
            if found_item_id:
                break
        if found_item_id:
            break

    with _AURA_DISCOVERY_CACHE_LOCK:
        _AURA_DISCOVERY_CACHE[normalized_names] = {
            "item_id": found_item_id,
            "expires_at": now + _AURA_DISCOVERY_CACHE_TTL_SECONDS,
        }
    return found_item_id


def build_aura_price_item(detail: dict, get_cached_auction, errors: list) -> dict:
    item_id = detail.get("itemId")
    item = {
        "itemId": item_id,
        "itemName": clean_text(detail.get("itemName")),
        "iconUrl": get_item_icon_url(item_id),
        "itemExplain": get_item_explain(detail),
    }
    try:
        item["auction"] = get_cached_auction(item_id)
    except Exception as exc:
        item["auction"] = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
        errors.append({"itemId": item_id, "itemName": item.get("itemName"), "error": str(exc)})
    return item


def build_aura_candidates(aura_details: list[dict], price_items: list[dict], variant: str = "일반") -> list[dict]:
    candidates = []
    for detail in aura_details:
        item_id = detail.get("itemId")
        direct_price = next((item for item in price_items if item.get("itemId") == item_id), None)
        price_options = [
            item for item in price_items
            if item.get("itemId") == item_id or "상자" in clean_text(item.get("itemName"))
        ]
        priced_options = [
            item for item in price_options
            if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
            and item["auction"]["minUnitPrice"] > 0
        ]
        price_item = min(priced_options, key=lambda item: item["auction"]["minUnitPrice"], default=None)
        candidates.append({
            **build_aura_payload(
                item_id,
                detail,
                auction=(price_item or direct_price or {}).get("auction", {}),
                price_item={
                    "itemId": (price_item or {}).get("itemId"),
                    "itemName": (price_item or {}).get("itemName"),
                    "iconUrl": (price_item or {}).get("iconUrl"),
                } if price_item and price_item.get("itemId") != item_id else None,
            ),
            "name": clean_text(detail.get("itemName")),
            "variant": clean_text(variant) or "일반",
        })
    candidates.sort(key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30)
    return candidates


def build_aura_upgrade_groups(aura_db: dict, get_cached_auction) -> tuple[list, list]:
    groups = []
    errors = []
    direct_group_names = set()
    for item_config in aura_db.get("items") or []:
        item_id = clean_text(item_config.get("itemId"))
        if not item_id:
            continue
        group_name = clean_text(item_config.get("groupName") or item_config.get("itemName") or item_id)
        direct_group_names.add(group_name)
        aura_details = fetch_item_details([item_id])

        price_item_ids = [
            clean_text(price_item_id)
            for price_item_id in item_config.get("priceItemIds") or []
            if clean_text(price_item_id)
        ]
        for price_search_name in item_config.get("priceSearchNames") or []:
            price_search_name = clean_text(price_search_name)
            if not price_search_name:
                continue
            try:
                for row in search_items_by_name(price_search_name):
                    if clean_text(row.get("itemName")) == price_search_name:
                        price_item_ids.append(row.get("itemId"))
            except Exception as exc:
                errors.append({"keyword": price_search_name, "error": str(exc)})

        price_details = fetch_item_details(price_item_ids)
        box_details = [
            detail for detail in price_details
            if "상자" in clean_text(detail.get("itemName"))
        ]
        price_items = [
            build_aura_price_item(detail, get_cached_auction, errors)
            for detail in [*aura_details, *box_details]
        ]
        candidates = build_aura_candidates(
            aura_details,
            price_items,
            clean_text(item_config.get("variant")) or "일반",
        )
        groups.append({
            "groupName": group_name,
            "searchName": group_name,
            "itemType": "오라",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })

    for keyword in aura_db.get("keywords") or []:
        keyword = clean_text(keyword)
        if keyword in direct_group_names:
            continue
        matched = {}
        try:
            for row in search_items_by_name(keyword):
                if aura_item_matches(row, keyword):
                    matched[row["itemId"]] = row
        except Exception as exc:
            errors.append({"keyword": keyword, "error": str(exc)})

        details = fetch_item_details(list(matched.keys()))
        aura_details = [
            detail for detail in details
            if keyword in clean_text(detail.get("itemName"))
            and "상자" not in clean_text(detail.get("itemName"))
        ]
        box_details = [
            detail for detail in details
            if "상자" in clean_text(detail.get("itemName"))
        ]
        if not aura_details and box_details:
            fallback_item_id = find_aura_item_id_from_equipped_avatars(build_aura_avatar_search_names(keyword, box_details))
            if fallback_item_id:
                details = [*details, *fetch_item_details([fallback_item_id])]
                aura_details = [
                    detail for detail in details
                    if keyword in clean_text(detail.get("itemName"))
                    and "상자" not in clean_text(detail.get("itemName"))
                ]

        price_items = [
            build_aura_price_item(detail, get_cached_auction, errors)
            for detail in [*aura_details, *box_details]
        ]
        candidates = build_aura_candidates(aura_details, price_items, "일반")
        groups.append({
            "groupName": keyword,
            "searchName": keyword,
            "itemType": "오라",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })
    return groups, errors
