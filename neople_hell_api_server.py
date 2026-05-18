#!/usr/bin/env python3

import argparse
import errno
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock, Thread
from urllib.parse import parse_qs, quote, urlencode, urlparse

from character_summary import API_KEY, clean_text, request_json, search_character, summarize_character_by_identity

ROOT = Path(__file__).resolve().parent
DEFAULT_HTML = "dnf_hell_vs_craft_percentile_tool_fixed.html"
HOST = "127.0.0.1"
PORT = 8787
ENCHANT_DB_PATH = ROOT / "Docs" / "enchant_card_db.json"
CREATURE_DB_PATH = ROOT / "Docs" / "creature_upgrade_db.json"
TITLE_DB_PATH = ROOT / "Docs" / "title_upgrade_db.json"
AURA_DB_PATH = ROOT / "Docs" / "aura_upgrade_db.json"
AVATAR_OPTION_DB_PATH = ROOT / "Docs" / "avatar_option_db.json"
JOB_BASE_STAT_PATH = ROOT / "Docs" / "jobBaseStat.json"
AMPLIFICATION_EXPECTED_DB_PATH = ROOT / "Docs" / "amplification_expected_db.json"
REINFORCEMENT_EXPECTED_DB_PATH = ROOT / "Docs" / "reinforcement_expected_db.json"
PRICE_CACHE_DIR = ROOT / "Docs" / ".price_cache"
ENCHANT_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "enchant_prices.json"
CREATURE_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "creature_prices.json"
TITLE_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "title_prices.json"
AURA_PRICE_CACHE_PATH = PRICE_CACHE_DIR / "aura_prices.json"
ENCHANT_PRICE_CACHE_SECONDS = 600
CREATURE_PRICE_CACHE_SECONDS = 600
PRICE_REFRESH_INTERVAL_SECONDS = 1800
ENCHANT_PRICE_CACHE_SCHEMA_VERSION = 9
EFFECT_ORDER = ["finalDamage", "attackIncrease", "attackAmplification", "attack", "elementAll", "allStat", "str", "int", "critical"]
_CACHE_LOCK = Lock()
_ENCHANT_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_CREATURE_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_TITLE_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_AURA_PRICE_CACHE = {"expires_at": 0, "payload": None, "refreshing": False}
_JOB_BASE_STAT_CACHE = None
_UPGRADE_EXPECTED_DB_CACHE = None
_AVATAR_OPTION_DB_CACHE = None
AVATAR_TOP_OPTION_FINAL_DAMAGE_PERCENT = 1.62
AVATAR_PLATINUM_FINAL_DAMAGE_PERCENT = 1.62
AVATAR_BRILLIANT_RED_STAT = 25
AVATAR_BRILLIANT_YELLOW_STAT = 15
AVATAR_BRILLIANT_DUAL_STAT = 15
AVATAR_BASE_RARE_SLOT_IDS = ["HEADGEAR", "HAIR", "FACE", "JACKET", "PANTS", "SHOES", "BREAST", "WAIST"]
BLACK_FANG_ACCESSORY_SLOT_IDS = {"AMULET", "WRIST", "RING"}
AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "HEADGEAR", "slot": "모자 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "HAIR", "slot": "머리 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "WEAPON", "slot": "무기 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "AURORA", "slot": "오라 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "SKIN", "slot": "피부 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "JACKET", "slot": "상의 아바타", "color": "녹색빛", "kind": "dual", "targetStat": AVATAR_BRILLIANT_DUAL_STAT},
    {"slotId": "PANTS", "slot": "하의 아바타", "color": "녹색빛", "kind": "dual", "targetStat": AVATAR_BRILLIANT_DUAL_STAT},
]


def json_response(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def load_upgrade_expected_db() -> dict:
    global _UPGRADE_EXPECTED_DB_CACHE
    if _UPGRADE_EXPECTED_DB_CACHE is None:
        with AMPLIFICATION_EXPECTED_DB_PATH.open("r", encoding="utf-8") as handle:
            amplification = json.load(handle)
        with REINFORCEMENT_EXPECTED_DB_PATH.open("r", encoding="utf-8") as handle:
            reinforcement = json.load(handle)
        _UPGRADE_EXPECTED_DB_CACHE = {
            "amplification": amplification,
            "reinforcement": reinforcement,
        }
    return _UPGRADE_EXPECTED_DB_CACHE


def load_avatar_option_db() -> dict:
    global _AVATAR_OPTION_DB_CACHE
    if _AVATAR_OPTION_DB_CACHE is None:
        with AVATAR_OPTION_DB_PATH.open("r", encoding="utf-8") as handle:
            _AVATAR_OPTION_DB_CACHE = json.load(handle)
    return _AVATAR_OPTION_DB_CACHE


def get_lowest_auction_price(item_id: str, min_fame=None, max_fame=None) -> dict:
    params = {"itemId": item_id, "limit": 100, "apikey": API_KEY}
    if min_fame is not None:
        params["minFame"] = min_fame
    if max_fame is not None:
        params["maxFame"] = max_fame
    url = f"https://api.neople.co.kr/df/auction?{urlencode(params)}"
    payload = request_json(url)
    rows = payload.get("rows") or []
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


def order_effects(effects: dict) -> dict:
    if not isinstance(effects, dict):
        return {}
    return {
        key: effects[key]
        for key in EFFECT_ORDER
        if key in effects
    }


def get_item_icon_url(item_id: str) -> str:
    return f"https://img-api.neople.co.kr/df/items/{item_id}" if item_id else ""


def clean_item_display_name(value) -> str:
    return clean_text(value).replace("%%", "%")


def get_item_explain(detail: dict) -> str:
    return clean_text(detail.get("itemExplainDetail") or detail.get("itemExplain"))


def load_job_base_stats() -> dict:
    global _JOB_BASE_STAT_CACHE
    if _JOB_BASE_STAT_CACHE is None:
        try:
            with JOB_BASE_STAT_PATH.open("r", encoding="utf-8") as fp:
                _JOB_BASE_STAT_CACHE = json.load(fp)
        except FileNotFoundError:
            _JOB_BASE_STAT_CACHE = {}
    return _JOB_BASE_STAT_CACHE


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


def get_enchant_bead_search_names(card: dict) -> list:
    names = []
    source_names = [source.get("searchName") for source in card.get("sources") or []]
    for name in [card.get("itemName"), card.get("searchName"), *source_names]:
        clean_name = clean_text(name)
        if clean_name.endswith("카드"):
            names.append(clean_name[:-2].strip() + " 보주")
    return list(dict.fromkeys(names))


def find_enchant_bead_item(card: dict):
    for bead_name in get_enchant_bead_search_names(card):
        try:
            for row in search_items_by_name(bead_name):
                if clean_text(row.get("itemName")) == bead_name:
                    item_id = row.get("itemId")
                    return {
                        "itemId": item_id,
                        "itemName": clean_item_display_name(row.get("itemName")),
                        "iconUrl": get_item_icon_url(item_id),
                    }
        except Exception:
            continue
    return None


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


def add_cache_status(payload: dict, cache: dict, stale: bool = False) -> dict:
    result = dict(payload)
    result["cache"] = {
        "stale": stale,
        "refreshing": bool(cache.get("refreshing")),
        "expiresAt": cache.get("expires_at"),
    }
    return result


def load_price_cache_from_disk(cache: dict, path: Path) -> bool:
    if cache.get("payload") is not None or not path.exists():
        return False
    try:
        with path.open("r", encoding="utf-8") as fp:
            stored = json.load(fp)
        payload = stored.get("payload")
        if not isinstance(payload, dict):
            return False
        with _CACHE_LOCK:
            cache["payload"] = payload
            cache["expires_at"] = float(stored.get("expires_at") or 0)
        return True
    except Exception:
        return False


def save_price_cache_to_disk(path: Path, payload: dict, expires_at: float):
    try:
        PRICE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fp:
            json.dump(
                {"expires_at": expires_at, "payload": payload},
                fp,
                ensure_ascii=False,
                indent=2,
            )
    except Exception:
        pass


def start_cache_refresh(cache: dict, refresh_fn) -> bool:
    with _CACHE_LOCK:
        if cache.get("refreshing"):
            return False
        cache["refreshing"] = True

    def worker():
        try:
            refresh_fn()
        finally:
            with _CACHE_LOCK:
                cache["refreshing"] = False

    Thread(target=worker, daemon=True).start()
    return True


def start_periodic_price_refresh():
    def refresh_loop():
        while True:
            start_cache_refresh(
                _ENCHANT_PRICE_CACHE,
                lambda: load_enchant_cards_with_prices(force_refresh=True, allow_stale=False),
            )
            start_cache_refresh(
                _CREATURE_PRICE_CACHE,
                lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False),
            )
            start_cache_refresh(
                _TITLE_PRICE_CACHE,
                lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False),
            )
            time.sleep(PRICE_REFRESH_INTERVAL_SECONDS)

    Thread(target=refresh_loop, daemon=True).start()


def parse_percent_or_number(value) -> float:
    text = clean_text(value).replace(",", "")
    if not text:
        return 0
    if text.endswith("%"):
        text = text[:-1]
    try:
        return float(text)
    except ValueError:
        return 0


def normalize_enchant_status(status_rows: list) -> dict:
    effects = {}
    stat_values = {}
    for status in status_rows or []:
        name = clean_text(status.get("name"))
        value = parse_percent_or_number(status.get("value"))
        if not name or not value:
            continue

        if name == "최종 데미지 증가":
            effects["finalDamage"] = max(effects.get("finalDamage", 0), value)
        elif name == "공격력 증가":
            effects["attackIncrease"] = max(effects.get("attackIncrease", 0), value)
        elif name == "공격력 증폭":
            effects["attackAmplification"] = max(effects.get("attackAmplification", 0), value)
        elif name in {"모든 속성 강화", "모속성 강화"}:
            effects["elementAll"] = max(effects.get("elementAll", 0), value)
        elif name in {"화속성 강화", "수속성 강화", "명속성 강화", "암속성 강화", "화속성강화", "수속성강화", "명속성강화", "암속성강화"}:
            effects["elementAll"] = max(effects.get("elementAll", 0), value)
        elif name in {"물리 공격력", "마법 공격력", "독립 공격력"}:
            effects["attack"] = max(effects.get("attack", 0), value)
        elif name == "힘":
            stat_values["str"] = max(stat_values.get("str", 0), value)
        elif name == "지능":
            stat_values["int"] = max(stat_values.get("int", 0), value)
        elif name == "체력":
            stat_values["vit"] = max(stat_values.get("vit", 0), value)
        elif name == "정신력":
            stat_values["spr"] = max(stat_values.get("spr", 0), value)
        elif name in {"물리 크리티컬 히트", "마법 크리티컬 히트"}:
            effects["critical"] = max(effects.get("critical", 0), value)

    stat_keys = {"str", "int", "vit", "spr"}
    if stat_keys.issubset(stat_values.keys()) and len({stat_values[key] for key in stat_keys}) == 1:
        effects["allStat"] = stat_values["str"]
    else:
        if stat_values.get("str"):
            effects["str"] = stat_values["str"]
        if stat_values.get("int"):
            effects["int"] = stat_values["int"]
    return order_effects(effects)


def subtract_effects(next_effects: dict, current_effects: dict) -> dict:
    result = {}
    for key in set((next_effects or {}).keys()) | set((current_effects or {}).keys()):
        value = float((next_effects or {}).get(key) or 0) - float((current_effects or {}).get(key) or 0)
        if abs(value) > 0.000001:
            result[key] = value
    return order_effects(result)


def parse_title_level_tag(item_name: str):
    match = re.search(r"\[(\d+)Lv\]", clean_text(item_name))
    return int(match.group(1)) if match else None


def parse_skill_damage_percent(text: str) -> float:
    match = re.search(r"액티브\s*스킬\s*공격력\s*(\d+(?:\.\d+)?)%\s*증가", clean_text(text))
    return float(match.group(1)) if match else 0


def get_title_variant(item_name: str) -> str:
    return "플래티넘" if parse_title_level_tag(item_name) or "플래티넘" in clean_text(item_name) else "일반"


def build_title_payload(item_id: str, detail: dict, auction: dict = None, price_item: dict = None) -> dict:
    explain = get_item_explain(detail)
    return {
        "itemId": item_id,
        "itemName": clean_text(detail.get("itemName")),
        "itemRarity": clean_text(detail.get("itemRarity")),
        "fame": detail.get("fame"),
        "iconUrl": get_item_icon_url(item_id),
        "itemExplain": explain,
        "effects": normalize_enchant_status(detail.get("itemStatus") or []),
        "levelTag": parse_title_level_tag(detail.get("itemName")),
        "skillDamagePercent": parse_skill_damage_percent(explain),
        "auction": auction or {},
        "priceItem": price_item,
    }


def build_material_enchant_sources(item: dict, detail: dict) -> list:
    search_name = clean_text(item.get("searchName") or item.get("itemName") or detail.get("itemName"))
    fallback_sources = [
        {**source, "effects": order_effects(source.get("effects") or {})}
        for source in item.get("sources") or []
    ]
    card_info = detail.get("cardInfo") or {}
    slots = [
        clean_text(slot.get("slotName"))
        for slot in card_info.get("slots") or []
        if clean_text(slot.get("slotName"))
    ]
    enchant_rows = card_info.get("enchant") or []
    tier = clean_text(item.get("tier")) or clean_text(item.get("acquisition", {}).get("materialLabel")) or "재료"
    sources = []
    for enchant in enchant_rows:
        effects = order_effects(normalize_enchant_status(enchant.get("status") or []))
        if not effects:
            continue
        fallback_slot = clean_text(fallback_sources[0].get("slot")) if fallback_sources else ""
        for slot in slots or [fallback_slot]:
            if not slot:
                continue
            sources.append({
                "slot": slot,
                "tier": tier,
                "effects": effects,
                "searchName": search_name,
            })
    return sources or fallback_sources


def build_enchant_sources_from_detail(card: dict, detail: dict) -> list:
    fallback_sources = [
        {**source, "effects": order_effects(source.get("effects") or {})}
        for source in card.get("sources") or []
    ]
    card_info = detail.get("cardInfo") or {}
    slots = [
        clean_text(slot.get("slotName"))
        for slot in card_info.get("slots") or []
        if clean_text(slot.get("slotName"))
    ]
    enchant_rows = card_info.get("enchant") or []
    if not enchant_rows:
        return fallback_sources
    max_enchant = max(enchant_rows, key=lambda enchant: int(enchant.get("upgrade") or 0))
    effects = order_effects(normalize_enchant_status(max_enchant.get("status") or []))
    if not effects:
        return fallback_sources
    tier = clean_text(card.get("tier")) or clean_text((fallback_sources[0] or {}).get("tier")) or "일반"
    search_name = clean_text(card.get("searchName") or card.get("itemName") or detail.get("itemName"))
    sources = []
    for slot in slots:
        sources.append({
            "slot": slot,
            "tier": tier,
            "effects": effects,
            "searchName": search_name,
        })
    return sources or fallback_sources


def status_rows_to_map(status_rows: list) -> dict:
    return {
        clean_text(status.get("name")): parse_percent_or_number(status.get("value"))
        for status in status_rows or []
        if clean_text(status.get("name"))
    }


def load_character_damage_baseline(server_id: str, character_id: str) -> dict:
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/status?apikey={API_KEY}"
    payload = request_json(url)
    status = status_rows_to_map(payload.get("status") or [])
    job_grow_name = clean_text(payload.get("jobGrowName"))
    base_stats = load_job_base_stats().get(job_grow_name) or {}
    selected_stat_name = "힘" if status.get("힘", 0) >= status.get("지능", 0) else "지능"
    element_strength = max(
        status.get("화속성 강화", 0),
        status.get("수속성 강화", 0),
        status.get("명속성 강화", 0),
        status.get("암속성 강화", 0),
    )
    attack_value = max(
        status.get("물리 공격", 0),
        status.get("마법 공격", 0),
        status.get("독립 공격", 0),
    )
    return {
        "stat": status.get(selected_stat_name, 0),
        "statName": selected_stat_name,
        "baseStat": parse_percent_or_number(base_stats.get(selected_stat_name)),
        "jobGrowName": job_grow_name,
        "attack": attack_value,
        "element": element_strength,
        "attackIncrease": status.get("공격력 증가", 0),
        "attackAmplification": status.get("공격력 증폭", 0),
    }


def load_character_enchants(server_id: str, character_id: str) -> dict:
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/equipment?apikey={API_KEY}"
    payload = request_json(url)
    rows = []
    equipment_upgrades = []
    for equipment in payload.get("equipment") or []:
        slot_name = clean_text(equipment.get("slotName"))
        slot_id = clean_text(equipment.get("slotId"))
        reinforce = int(parse_percent_or_number(equipment.get("reinforce")))
        amplification_name = clean_text(equipment.get("amplificationName"))
        item_id = clean_text(equipment.get("itemId"))
        if slot_name:
            equipment_upgrades.append({
                "slot": slot_name,
                "slotId": slot_id,
                "itemId": item_id,
                "itemName": clean_text(equipment.get("itemName")),
                "iconUrl": get_item_icon_url(item_id) if item_id else "",
                "reinforce": reinforce,
                "amplificationName": amplification_name,
                "isAmplified": bool(amplification_name),
            })
        enchant = equipment.get("enchant") or {}
        status_rows = enchant.get("status") or []
        if not slot_name or not status_rows:
            continue
        rows.append({
            "slot": slot_name,
            "itemName": clean_text(equipment.get("itemName")),
            "effects": normalize_enchant_status(status_rows),
            "rawStatus": status_rows,
        })
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "damageBaseline": load_character_damage_baseline(server_id, character_id),
        "enchants": rows,
        "equipmentUpgrades": equipment_upgrades,
        "blackFangRecommendations": build_black_fang_recommendations(payload.get("equipment") or []),
        "upgradeExpectedDb": load_upgrade_expected_db(),
    }


def load_character_creature(server_id: str, character_id: str) -> dict:
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/creature?apikey={API_KEY}"
    payload = request_json(url)
    creature = payload.get("creature") or {}
    item_id = clean_text(creature.get("itemId"))
    detail = (fetch_item_details([item_id]) or [{}])[0] if item_id else {}
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "creature": {
            "itemId": item_id,
            "itemName": clean_text(creature.get("itemName")),
            "itemRarity": clean_text(creature.get("itemRarity")),
            "fame": detail.get("fame"),
            "iconUrl": get_item_icon_url(item_id),
            "itemExplain": get_item_explain(detail),
            "effects": normalize_enchant_status(detail.get("itemStatus") or []),
        } if item_id else None,
    }


def load_character_title(server_id: str, character_id: str) -> dict:
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/equipment?apikey={API_KEY}"
    payload = request_json(url)
    title = next((
        equipment for equipment in payload.get("equipment") or []
        if clean_text(equipment.get("slotId")) == "TITLE" or clean_text(equipment.get("slotName")) == "칭호"
    ), None)
    item_id = clean_text((title or {}).get("itemId"))
    detail = (fetch_item_details([item_id]) or [{}])[0] if item_id else {}
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "title": build_title_payload(item_id, detail) if item_id else None,
    }


def load_character_aura(server_id: str, character_id: str) -> dict:
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
    payload = request_json(url)
    aura = next((
        avatar for avatar in payload.get("avatar") or []
        if "오라" in clean_text(avatar.get("slotName"))
        or "오라" in clean_text(avatar.get("itemTypeDetail"))
        or "오라" in clean_text(avatar.get("itemName"))
    ), None)
    item_id = clean_text((aura or {}).get("itemId"))
    detail = (fetch_item_details([item_id]) or [{}])[0] if item_id else {}
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "aura": build_aura_payload(item_id, detail) if item_id else None,
    }


def normalize_job_name(value: str) -> str:
    text = clean_text(value)
    return re.sub(r"^(眞|진|真)\s*", "", text).strip()


def normalize_skill_name(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"\s*스킬\s*Lv\s*\+\s*1\s*$", "", text, flags=re.IGNORECASE)
    text = text.replace("：", ":")
    return re.sub(r"\s+", "", text)


def skill_name_matches(actual: str, expected: str) -> bool:
    actual_key = normalize_skill_name(actual)
    expected_key = normalize_skill_name(expected)
    if not actual_key or not expected_key:
        return False
    return actual_key == expected_key or actual_key.endswith(expected_key)


def get_avatar_slot(avatar_rows: list, slot_id: str) -> dict:
    slot_id = clean_text(slot_id)
    return next((
        row for row in avatar_rows or []
        if clean_text(row.get("slotId")) == slot_id
    ), {}) or {}


def get_character_primary_stat_name(payload: dict) -> str:
    job_grow_name = clean_text(payload.get("jobGrowName"))
    base_stats = load_job_base_stats().get(job_grow_name) or {}
    return "지능" if parse_percent_or_number(base_stats.get("지능")) > parse_percent_or_number(base_stats.get("힘")) else "힘"


def is_rare_clone_avatar(row: dict) -> bool:
    item_name = clean_text(row.get("itemName"))
    clone = row.get("clone") or {}
    return clean_text(row.get("itemRarity")) == "레어" and (
        "클론" in item_name
        or bool(clean_text(clone.get("itemName")))
    )


def get_platinum_emblems(row: dict) -> list:
    return [
        emblem for emblem in row.get("emblems") or []
        if "플래티넘" in clean_text(emblem.get("slotColor"))
        or "플래티넘" in clean_text(emblem.get("itemName"))
    ]


def extract_platinum_skill_name(item_name: str) -> str:
    match = re.search(r"\[([^\]]+)\]", clean_text(item_name))
    return match.group(1).strip() if match else ""


def extract_emblem_option_text(item_name: str) -> str:
    match = re.search(r"\[([^\]]+)\]", clean_text(item_name))
    return match.group(1).strip() if match else ""


def get_emblem_stat_value(item_name: str, stat_name: str, kind: str) -> float:
    item_name = clean_text(item_name)
    option_text = extract_emblem_option_text(item_name)
    if stat_name not in option_text:
        return 0
    if "찬란한" in item_name:
        if kind == "red":
            return AVATAR_BRILLIANT_RED_STAT
        if kind == "yellow":
            return AVATAR_BRILLIANT_YELLOW_STAT
        if kind == "dual":
            return AVATAR_BRILLIANT_DUAL_STAT
    if "화려한" in item_name:
        return 17 if kind == "red" else 10
    if "빛나는" in item_name:
        return 10 if kind == "red" else 6
    if "듀얼" in item_name:
        return 10
    return 0


def get_emblems_by_color(row: dict, color: str) -> list:
    color = clean_text(color)
    return [
        emblem for emblem in row.get("emblems") or []
        if color in clean_text(emblem.get("slotColor"))
    ]


def get_avatar_damage_emblems(row: dict, config: dict) -> list:
    if clean_text(config.get("slotId")) in {"WEAPON", "AURORA", "SKIN"}:
        return [
            emblem for emblem in row.get("emblems") or []
            if "플래티넘" not in clean_text(emblem.get("slotColor"))
            and "플래티넘" not in clean_text(emblem.get("itemName"))
        ]
    return get_emblems_by_color(row, config.get("color"))


def get_avatar_platinum_damage_percent(slot_label: str) -> float:
    return AVATAR_PLATINUM_FINAL_DAMAGE_PERCENT


def find_lowest_exact_item_by_name(item_name: str) -> dict:
    item_name = clean_text(item_name)
    rows = search_items_by_name(item_name)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
    ]
    candidates = []
    seen_ids = set()
    for row in exact_rows:
        item_id = clean_text(row.get("itemId"))
        if not item_id or item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        try:
            auction = get_lowest_auction_price(item_id)
        except Exception:
            auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
        candidates.append({
            "itemId": item_id,
            "itemName": clean_item_display_name(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": get_item_icon_url(item_id),
            "auction": auction,
        })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={"itemName": item_name, "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}},
    )


def find_exact_item_by_name(item_name: str, item_type_detail: str = "") -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    rows = search_items_by_name(item_name)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
    ]
    return matched[0] if matched else {}


def get_avatar_emblem_item_name(stat_name: str, kind: str) -> str:
    if kind == "red":
        return f"찬란한 붉은빛 엠블렘[{stat_name}]"
    if kind == "yellow":
        return f"찬란한 옐로우 엠블렘[{stat_name}]"
    critical_name = "마법크리티컬" if stat_name == "지능" else "물리크리티컬"
    return f"찬란한 듀얼 엠블렘[{stat_name} + {critical_name}]"


def build_avatar_emblem_recommendations(avatar_rows: list, primary_stat_name: str) -> list:
    recommendations = []
    item_cache = {}
    for config in AVATAR_EMBLEM_RECOMMENDATIONS:
        row = get_avatar_slot(avatar_rows, config.get("slotId"))
        if not row:
            continue
        if clean_text(row.get("itemRarity")) != "레어" and clean_text(config.get("slotId")) not in {"AURORA", "SKIN"}:
            continue
        emblems = get_avatar_damage_emblems(row, config)
        socket_count = max(len(emblems), 2)
        current_values = [
            get_emblem_stat_value(emblem.get("itemName"), primary_stat_name, config.get("kind"))
            for emblem in emblems
        ]
        current_values += [0] * max(0, socket_count - len(current_values))
        need_count = sum(1 for value in current_values if value < config.get("targetStat", 0))
        if need_count <= 0:
            continue
        item_name = get_avatar_emblem_item_name(primary_stat_name, config.get("kind"))
        if item_name not in item_cache:
            item_cache[item_name] = find_lowest_exact_item_by_name(item_name)
        item = item_cache[item_name]
        auction = dict(item.get("auction") or {})
        unit_price = auction.get("minUnitPrice")
        if isinstance(unit_price, (int, float)) and unit_price > 0:
            auction["minUnitPrice"] = unit_price * need_count
            auction["unitPrice"] = unit_price
        effects_key = "int" if primary_stat_name == "지능" else "str"
        stat_gain = sum(config.get("targetStat", 0) - value for value in current_values if value < config.get("targetStat", 0))
        recommendations.append({
            "kind": "brilliantEmblem",
            "slot": config.get("slot"),
            "tier": "엠블렘",
            "itemId": item.get("itemId"),
            "itemName": item.get("itemName") or item_name,
            "itemRarity": item.get("itemRarity"),
            "iconUrl": item.get("iconUrl"),
            "itemExplain": (
                f"{clean_text(row.get('slotName')) or config.get('slot')} "
                f"{config.get('color')} {primary_stat_name} 찬란한 엠블렘 교체"
            ),
            "effects": {effects_key: stat_gain},
            "auction": auction,
            "needCount": need_count,
            "unitPrice": unit_price,
            "targetStat": primary_stat_name,
            "recommendationPriority": 0,
        })
    return recommendations


def parse_black_fang_scroll_cost(detail: dict) -> dict:
    text = str(detail.get("itemExplainDetail") or detail.get("itemExplain") or "")
    materials = []
    fixed_gold = 0
    in_materials = False
    for raw_line in text.splitlines():
        line = clean_text(raw_line)
        if not line:
            continue
        if line == "<소모 재료>":
            in_materials = True
            continue
        if line.startswith("<") and line.endswith(">") and line != "<소모 재료>":
            in_materials = False
        if not in_materials:
            continue
        if "악세서리" in line and line.endswith("1개"):
            continue
        gold_match = re.search(r"골드\s*([\d,]+)", line)
        if gold_match:
            fixed_gold += int(gold_match.group(1).replace(",", ""))
            continue
        material_match = re.match(r"(.+?)\s*([\d,]+)개$", line)
        if material_match:
            materials.append({
                "label": clean_text(material_match.group(1)),
                "amount": int(material_match.group(2).replace(",", "")),
            })
        else:
            materials.append({"label": line, "amount": None})
    return {"fixedGold": fixed_gold, "materials": materials}


def format_materials_text(materials: list) -> str:
    parts = []
    for material in materials or []:
        label = clean_text(material.get("label"))
        amount = material.get("amount")
        if not label:
            continue
        if isinstance(amount, (int, float)) and amount > 0:
            parts.append(f"{label} {int(amount):,}개")
        else:
            parts.append(label)
    return " / ".join(parts)


def get_black_fang_scroll_name(set_item_name: str) -> str:
    set_name = re.sub(r"\s*세트$", "", clean_text(set_item_name)).strip()
    return f"흑아 태초 변환서 - {set_name}" if set_name else ""


def build_black_fang_recommendations(equipment_rows: list) -> list:
    targets = [
        equipment for equipment in equipment_rows or []
        if clean_text(equipment.get("slotId")) in BLACK_FANG_ACCESSORY_SLOT_IDS
        and clean_text(equipment.get("itemRarity")) == "태초"
        and not clean_text(equipment.get("itemName")).startswith("흑아 :")
    ]
    if not targets:
        return []

    item_ids = []
    target_pairs = []
    scroll_names = sorted({get_black_fang_scroll_name(equipment.get("setItemName")) for equipment in targets if get_black_fang_scroll_name(equipment.get("setItemName"))})
    scroll_items = {}
    for scroll_name in scroll_names:
        scroll = find_exact_item_by_name(scroll_name)
        if scroll.get("itemId"):
            scroll_items[scroll_name] = scroll
            item_ids.append(scroll.get("itemId"))
    for equipment in targets:
        black_name = f"흑아 : {clean_text(equipment.get('itemName'))}"
        black_item = find_exact_item_by_name(black_name, clean_text(equipment.get("itemTypeDetail")))
        if not black_item.get("itemId"):
            continue
        target_pairs.append((equipment, black_item))
        item_ids.extend([clean_text(equipment.get("itemId")), black_item.get("itemId")])

    details_by_id = {
        detail.get("itemId"): detail
        for detail in fetch_item_details([item_id for item_id in item_ids if item_id])
    }
    scroll_price_cache = {}
    recommendations = []
    for equipment, black_item in target_pairs:
        scroll_name = get_black_fang_scroll_name(equipment.get("setItemName"))
        scroll_item = scroll_items.get(scroll_name) or {}
        scroll_id = scroll_item.get("itemId")
        if scroll_id not in scroll_price_cache:
            try:
                auction = get_lowest_auction_price(scroll_id) if scroll_id else {}
            except Exception:
                auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
            scroll_price_cache[scroll_id] = auction
        auction = dict(scroll_price_cache.get(scroll_id) or {})
        scroll_detail = details_by_id.get(scroll_id) or {}
        scroll_cost = parse_black_fang_scroll_cost(scroll_detail)
        scroll_price = auction.get("minUnitPrice")
        fixed_gold = scroll_cost.get("fixedGold") or 0
        if isinstance(scroll_price, (int, float)) and scroll_price > 0:
            auction["minUnitPrice"] = scroll_price + fixed_gold
            auction["scrollUnitPrice"] = scroll_price
            auction["fixedGold"] = fixed_gold

        current_detail = details_by_id.get(clean_text(equipment.get("itemId"))) or {}
        black_detail = details_by_id.get(black_item.get("itemId")) or {}
        current_effects = normalize_enchant_status(current_detail.get("itemStatus") or [])
        black_effects = normalize_enchant_status(black_detail.get("itemStatus") or [])
        effects = subtract_effects(
            black_effects,
            current_effects,
        )
        if not effects:
            continue
        material_text = format_materials_text(scroll_cost.get("materials") or [])
        recommendations.append({
            "slot": clean_text(equipment.get("slotName")),
            "tier": "흑아",
            "itemId": scroll_id,
            "itemName": scroll_item.get("itemName") or scroll_name,
            "itemRarity": scroll_item.get("itemRarity"),
            "iconUrl": get_item_icon_url(scroll_id),
            "itemExplain": f"{clean_text(equipment.get('itemName'))} -> {clean_text(black_item.get('itemName'))}",
            "effects": effects,
            "currentEffects": current_effects,
            "targetEffects": black_effects,
            "auction": auction,
            "expectedGold": auction.get("minUnitPrice"),
            "materialText": material_text,
            "targetItemName": clean_text(black_item.get("itemName")),
        })
    return recommendations


def find_avatar_option_entry(payload: dict) -> dict:
    db = load_avatar_option_db()
    job_name = clean_text(payload.get("jobName"))
    job_grow_name = normalize_job_name(payload.get("jobGrowName"))
    entries = db.get("entries") or []
    matched = [
        entry for entry in entries
        if clean_text(entry.get("guideName")) == job_grow_name
    ]
    if len(matched) > 1 and job_name:
        matched_by_group = [
            entry for entry in matched
            if clean_text(entry.get("classGroup")) == job_name
        ]
        if matched_by_group:
            matched = matched_by_group
    return matched[0] if matched else {}


def find_avatar_platinum_item(skill_name: str) -> dict:
    item_name = f"플래티넘 엠블렘[{clean_text(skill_name)}]"
    rows = search_items_by_name(item_name)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
    ]
    if not exact_rows:
        return {
            "itemName": item_name,
            "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None},
        }
    candidates = []
    for row in exact_rows:
        item_id = clean_text(row.get("itemId"))
        if not item_id:
            continue
        try:
            auction = get_lowest_auction_price(item_id)
        except Exception:
            auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
        candidates.append({
            "itemId": item_id,
            "itemName": clean_item_display_name(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": get_item_icon_url(item_id),
            "auction": auction,
        })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={"itemName": item_name, "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}},
    )


def format_price_label(value) -> str:
    return f"{int(value):,}골드" if isinstance(value, (int, float)) and value > 0 else "매물 없음"


def find_avatar_platinum_selection_box() -> dict:
    selectable_names = {
        "기본 플래티넘 엠블렘 선택 상자",
        "프리미엄 플래티넘 엠블렘 선택 상자",
    }
    candidates = []
    seen_ids = set()
    for item_name in ["플래티넘 엠블렘 선택 상자", "플래티넘 선택 상자", "엠블렘 선택 상자"]:
        try:
            rows = search_items_by_name(item_name)
        except Exception:
            continue
        for row in rows:
            row_name = clean_text(row.get("itemName"))
            if row_name not in selectable_names:
                continue
            item_id = clean_text(row.get("itemId"))
            if not item_id or item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            try:
                auction = get_lowest_auction_price(item_id)
            except Exception:
                auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
            candidates.append({
                "itemId": item_id,
                "itemName": clean_item_display_name(row.get("itemName")),
                "itemRarity": clean_text(row.get("itemRarity")),
                "iconUrl": get_item_icon_url(item_id),
                "auction": auction,
            })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={},
    )


def find_clone_rare_avatar_full_set_box() -> dict:
    candidates = []
    seen_ids = set()
    for search_name in ["클론 레어 아바타 풀세트 상자", "클론 레어 아바타"]:
        try:
            rows = search_items_by_name(search_name)
        except Exception:
            continue
        for row in rows:
            row_name = clean_text(row.get("itemName"))
            if "클론 레어 아바타" not in row_name or "풀세트 상자" not in row_name:
                continue
            if "무기" in row_name:
                continue
            item_id = clean_text(row.get("itemId"))
            if not item_id or item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            try:
                auction = get_lowest_auction_price(item_id)
            except Exception:
                auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
            candidates.append({
                "itemId": item_id,
                "itemName": clean_item_display_name(row.get("itemName")),
                "itemRarity": clean_text(row.get("itemRarity")),
                "iconUrl": get_item_icon_url(item_id),
                "auction": auction,
            })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={},
    )


def choose_avatar_platinum_price_item(skill_name: str) -> dict:
    direct = find_avatar_platinum_item(skill_name)
    selection_box = find_avatar_platinum_selection_box()
    direct_price = direct.get("auction", {}).get("minUnitPrice")
    box_price = selection_box.get("auction", {}).get("minUnitPrice")
    use_box = (
        isinstance(box_price, (int, float)) and box_price > 0
        and (
            not isinstance(direct_price, (int, float))
            or direct_price <= 0
            or box_price < direct_price
        )
    )
    selected = selection_box if use_box else direct
    return {
        **selected,
        "priceSource": "selectionBox" if use_box else "direct",
        "directItem": direct,
        "selectionBoxItem": selection_box,
        "priceCompareText": (
            f"직접 플티 {format_price_label(direct_price)}"
            f" / 선택 상자 {format_price_label(box_price)}"
        ),
    }


def load_character_avatar(server_id: str, character_id: str) -> dict:
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
    payload = request_json(url)
    avatar_rows = payload.get("avatar") or []
    jacket = get_avatar_slot(avatar_rows, "JACKET")
    pants = get_avatar_slot(avatar_rows, "PANTS")
    entry = find_avatar_option_entry(payload)
    option_db = entry.get("avatar") or {}
    primary_stat_name = get_character_primary_stat_name(payload)
    top_option = clean_text((option_db.get("topOptions") or [""])[0])
    platinum_skill = clean_text((option_db.get("platinumEmblems") or [""])[0])
    top_option_matched = skill_name_matches(jacket.get("optionAbility"), top_option)

    platinum_slots = []
    missing_or_wrong_slots = []
    for slot_id, slot_label, row in [
        ("JACKET", "상의 아바타", jacket),
        ("PANTS", "하의 아바타", pants),
    ]:
        emblems = get_platinum_emblems(row)
        matched = any(
            skill_name_matches(extract_platinum_skill_name(emblem.get("itemName")), platinum_skill)
            for emblem in emblems
        ) if platinum_skill else False
        if matched:
            platinum_slots.append(slot_label)
        else:
            missing_or_wrong_slots.append(slot_label)

    rare_slots = [
        clean_text(row.get("slotName"))
        for row in avatar_rows
        if clean_text(row.get("itemRarity")) == "레어"
    ]
    missing_base_rare_slots = [
        clean_text(slot.get("slotName")) or slot_id
        for slot_id in AVATAR_BASE_RARE_SLOT_IDS
        for slot in [get_avatar_slot(avatar_rows, slot_id)]
        if clean_text(slot.get("itemRarity")) != "레어"
    ]
    needs_rare_avatar_set = bool(missing_base_rare_slots)
    clone_slots = [
        clean_text(row.get("slotName"))
        for row in avatar_rows
        if is_rare_clone_avatar(row)
    ]
    recommendations = []
    rare_avatar_box = {}
    rare_avatar_set_purchasable = False
    if needs_rare_avatar_set:
        rare_avatar_box = find_clone_rare_avatar_full_set_box()
        box_auction = rare_avatar_box.get("auction") or {}
        if not (isinstance(box_auction.get("minUnitPrice"), (int, float)) and box_auction.get("minUnitPrice") > 0):
            missing_or_wrong_slots = []
        else:
            rare_avatar_set_purchasable = True
            recommendations.append({
                "kind": "rareAvatarSet",
                "slot": "아바타",
                "tier": "클론 레어",
                "itemId": rare_avatar_box.get("itemId"),
                "itemName": rare_avatar_box.get("itemName") or "클론 레어 아바타 풀세트 상자",
                "itemRarity": rare_avatar_box.get("itemRarity"),
                "iconUrl": rare_avatar_box.get("iconUrl"),
                "itemExplain": f"기본 레어 아바타 부족: {', '.join(missing_base_rare_slots)} · 구매 후 상의 옵션 {top_option or '직업 옵션'} 선택",
                "effects": {"finalDamage": AVATAR_TOP_OPTION_FINAL_DAMAGE_PERCENT},
                "auction": box_auction,
                "recommendationPriority": -100,
                "missingSlots": missing_base_rare_slots,
            })
    can_recommend_avatar_details = (not needs_rare_avatar_set) or rare_avatar_set_purchasable
    if not needs_rare_avatar_set and top_option and not top_option_matched:
        recommendations.append({
            "kind": "topOption",
            "slot": "상의 아바타",
            "tier": "아바타",
            "itemName": f"상의 옵션: {top_option}",
            "itemExplain": f"현재: {clean_text(jacket.get('optionAbility')) or '없음'}",
            "effects": {"finalDamage": AVATAR_TOP_OPTION_FINAL_DAMAGE_PERCENT},
            "acquisition": {"label": "상의 옵션 변경 필요"},
        })
    if platinum_skill and missing_or_wrong_slots:
        item = choose_avatar_platinum_price_item(platinum_skill)
        for slot_label in missing_or_wrong_slots:
            recommendations.append({
                "kind": "platinumEmblem",
                "slot": "상의 아바타" if slot_label == "상의 아바타" else "하의 아바타",
                "tier": "플래티넘",
                "itemId": item.get("itemId"),
                "itemName": item.get("itemName") or f"플래티넘 엠블렘[{platinum_skill}]",
                "itemRarity": item.get("itemRarity"),
                "iconUrl": item.get("iconUrl"),
                "itemExplain": f"{slot_label} 플래티넘 교체 필요 · {item.get('priceCompareText')}",
                "effects": {"finalDamage": get_avatar_platinum_damage_percent(slot_label)},
                "auction": item.get("auction") or {},
                "needCount": 1,
                "targetSkill": platinum_skill,
                "missingSlots": [slot_label],
                "priceSource": item.get("priceSource"),
                "recommendationPriority": -90 if needs_rare_avatar_set else 0,
            })
    if can_recommend_avatar_details:
        recommendations.extend(build_avatar_emblem_recommendations(avatar_rows, primary_stat_name))
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "jobName": payload.get("jobName"),
        "jobGrowName": payload.get("jobGrowName"),
        "fame": payload.get("fame"),
        "avatar": {
            "dbMatched": bool(entry),
            "primaryStatName": primary_stat_name,
            "expectedTopOption": top_option,
            "expectedPlatinumEmblem": platinum_skill,
            "rareAvatarCount": len(rare_slots),
            "rareAvatarSlots": rare_slots,
            "rareCloneAvatarCount": len(clone_slots),
            "rareCloneAvatarSlots": clone_slots,
            "jacket": {
                "itemName": clean_text(jacket.get("itemName")),
                "itemRarity": clean_text(jacket.get("itemRarity")),
                "isRare": clean_text(jacket.get("itemRarity")) == "레어",
                "isRareClone": is_rare_clone_avatar(jacket),
                "optionAbility": clean_text(jacket.get("optionAbility")),
                "topOptionMatched": top_option_matched,
            },
            "pants": {
                "itemName": clean_text(pants.get("itemName")),
                "itemRarity": clean_text(pants.get("itemRarity")),
                "isRare": clean_text(pants.get("itemRarity")) == "레어",
                "isRareClone": is_rare_clone_avatar(pants),
            },
            "platinumCount": len(platinum_slots),
            "platinumSlots": platinum_slots,
            "missingOrWrongPlatinumSlots": missing_or_wrong_slots,
            "needsRareAvatarSet": needs_rare_avatar_set,
            "missingBaseRareAvatarSlots": missing_base_rare_slots,
            "rareAvatarSetPurchasable": rare_avatar_set_purchasable,
            "needsReview": bool(option_db.get("needsReview")),
        },
        "recommendations": recommendations,
    }


def creature_item_matches(row: dict, candidate: dict, target_fame) -> bool:
    item_name = clean_text(row.get("itemName"))
    fame = row.get("fame")
    exact_names = {clean_text(name) for name in candidate.get("includeItemNames") or []}
    prefixes = [clean_text(prefix) for prefix in candidate.get("includeNamePrefixes") or []]

    if exact_names and item_name in exact_names:
        name_matched = True
    elif prefixes and any(item_name.startswith(prefix) for prefix in prefixes):
        name_matched = True
    else:
        name_matched = False
    if not name_matched:
        return False

    if fame == target_fame:
        return True
    return bool(candidate.get("includeZeroFameBox")) and int(fame or 0) == 0


def load_creature_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_CREATURE_PRICE_CACHE, CREATURE_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _CREATURE_PRICE_CACHE["payload"]
        expires_at = _CREATURE_PRICE_CACHE["expires_at"]

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _CREATURE_PRICE_CACHE)
        start_cache_refresh(
            _CREATURE_PRICE_CACHE,
            lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status(payload, _CREATURE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _CREATURE_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _CREATURE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _CREATURE_PRICE_CACHE,
            lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _CREATURE_PRICE_CACHE, stale=True)

    with CREATURE_DB_PATH.open("r", encoding="utf-8") as fp:
        creature_db = json.load(fp)

    auction_cache = {}

    def get_cached_auction(item_id, min_fame=None):
        cache_key = (item_id, min_fame, min_fame)
        if cache_key not in auction_cache:
            auction_cache[cache_key] = get_lowest_auction_price(item_id, min_fame=min_fame, max_fame=min_fame)
        return auction_cache[cache_key]

    groups = []
    errors = []
    for group in creature_db.get("groups") or []:
        target_fame = group.get("targetFame")
        group_payload = {key: group.get(key) for key in ("groupName", "searchName", "itemType", "targetFame")}
        candidates = []
        for candidate in group.get("candidates") or []:
            matched = {}
            candidate_target_fame = candidate.get("targetFame", target_fame)
            for search_name in candidate.get("searchNames") or [candidate.get("name")]:
                try:
                    for row in search_items_by_name(clean_text(search_name)):
                        if creature_item_matches(row, candidate, candidate_target_fame):
                            matched[row["itemId"]] = row
                except Exception as exc:
                    errors.append({"name": candidate.get("name"), "searchName": search_name, "error": str(exc)})

            detail_by_id = {
                row.get("itemId"): row
                for row in fetch_item_details(list(matched.keys()))
            }
            item_inputs = []
            for item_id, row in matched.items():
                detail = detail_by_id.get(item_id) or row
                fame = detail.get("fame", row.get("fame"))
                min_fame = candidate_target_fame if fame == candidate_target_fame else None
                item_inputs.append((item_id, min_fame, {
                    "itemId": item_id,
                    "itemName": clean_text(detail.get("itemName", row.get("itemName"))),
                    "itemRarity": clean_text(detail.get("itemRarity", row.get("itemRarity"))),
                    "fame": fame,
                    "iconUrl": get_item_icon_url(item_id),
                    "itemExplain": get_item_explain(detail),
                    "effects": normalize_enchant_status(detail.get("itemStatus") or []),
                }))

            items = []
            with ThreadPoolExecutor(max_workers=8) as executor:
                future_by_item = {
                    executor.submit(get_cached_auction, item_id, min_fame): (item_id, item)
                    for item_id, min_fame, item in item_inputs
                }
                for future in as_completed(future_by_item):
                    item_id, item = future_by_item[future]
                    try:
                        item["auction"] = future.result()
                    except Exception as exc:
                        item["auction"] = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                        errors.append({"itemId": item_id, "itemName": item.get("itemName"), "error": str(exc)})
                    items.append(item)

            priced_items = [
                item for item in items
                if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                and item["auction"]["minUnitPrice"] > 0
            ]
            lowest_item = min(priced_items, key=lambda item: item["auction"]["minUnitPrice"], default=None)
            effect_source = next((item for item in items if item.get("effects")), None)
            candidates.append({
                "name": clean_text(candidate.get("name")),
                "variant": clean_text(candidate.get("variant")),
                "targetFame": candidate_target_fame,
                "items": sorted(items, key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30),
                "itemId": lowest_item.get("itemId") if lowest_item else None,
                "itemName": lowest_item.get("itemName") if lowest_item else None,
                "iconUrl": lowest_item.get("iconUrl") if lowest_item else (effect_source or {}).get("iconUrl", ""),
                "itemExplain": (effect_source or {}).get("itemExplain", ""),
                "effects": (effect_source or {}).get("effects", {}),
                "auction": lowest_item.get("auction") if lowest_item else {
                    "listingCount": 0,
                    "minUnitPrice": None,
                    "averagePrice": None,
                    "auctionNo": None,
                },
            })
        group_payload["candidates"] = candidates
        groups.append(group_payload)

    payload = {
        "updatedAt": creature_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": creature_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _CREATURE_PRICE_CACHE["payload"] = payload
        _CREATURE_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(CREATURE_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _CREATURE_PRICE_CACHE)


def title_item_matches(row: dict, keyword: str) -> bool:
    item_name = clean_text(row.get("itemName"))
    if not item_name or keyword not in item_name:
        return False
    return row.get("itemTypeDetail") == "칭호" or "칭호 선택 상자" in item_name


def aura_item_matches(row: dict, keyword: str) -> bool:
    item_name = clean_text(row.get("itemName"))
    if not item_name or keyword not in item_name:
        return False
    type_detail = clean_text(row.get("itemTypeDetail"))
    return "오라" in type_detail or "오라" in item_name or "상자" in item_name


def build_aura_payload(item_id: str, detail: dict, auction: dict = None, price_item: dict = None) -> dict:
    return {
        "itemId": item_id,
        "itemName": clean_text(detail.get("itemName")),
        "itemRarity": clean_text(detail.get("itemRarity")),
        "fame": detail.get("fame"),
        "iconUrl": get_item_icon_url(item_id),
        "itemExplain": get_item_explain(detail),
        "effects": normalize_enchant_status(detail.get("itemStatus") or []),
        "auction": auction or {},
        "priceItem": price_item,
    }


def load_aura_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _AURA_PRICE_CACHE["payload"]
        expires_at = _AURA_PRICE_CACHE["expires_at"]

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _AURA_PRICE_CACHE)
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: load_aura_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status(payload, _AURA_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _AURA_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: load_aura_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)

    with AURA_DB_PATH.open("r", encoding="utf-8") as fp:
        aura_db = json.load(fp)

    groups = []
    errors = []
    auction_cache = {}

    def get_cached_auction(item_id):
        if item_id not in auction_cache:
            auction_cache[item_id] = get_lowest_auction_price(item_id)
        return auction_cache[item_id]

    for keyword in aura_db.get("keywords") or []:
        keyword = clean_text(keyword)
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

        price_items = []
        for detail in [*aura_details, *box_details]:
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
            price_items.append(item)

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
                "variant": "일반",
            })

        candidates.sort(key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30)
        groups.append({
            "groupName": keyword,
            "searchName": keyword,
            "itemType": "오라",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })

    payload = {
        "updatedAt": aura_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": aura_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _AURA_PRICE_CACHE["payload"] = payload
        _AURA_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(AURA_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _AURA_PRICE_CACHE)


def load_title_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_TITLE_PRICE_CACHE, TITLE_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _TITLE_PRICE_CACHE["payload"]
        expires_at = _TITLE_PRICE_CACHE["expires_at"]

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _TITLE_PRICE_CACHE)
        start_cache_refresh(
            _TITLE_PRICE_CACHE,
            lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status(payload, _TITLE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _TITLE_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _TITLE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _TITLE_PRICE_CACHE,
            lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _TITLE_PRICE_CACHE, stale=True)

    with TITLE_DB_PATH.open("r", encoding="utf-8") as fp:
        title_db = json.load(fp)

    groups = []
    errors = []
    auction_cache = {}

    def get_cached_auction(item_id):
        if item_id not in auction_cache:
            auction_cache[item_id] = get_lowest_auction_price(item_id)
        return auction_cache[item_id]

    for keyword in title_db.get("keywords") or []:
        keyword = clean_text(keyword)
        matched = {}
        try:
            for row in search_items_by_name(keyword):
                if title_item_matches(row, keyword):
                    matched[row["itemId"]] = row
        except Exception as exc:
            errors.append({"keyword": keyword, "error": str(exc)})

        details = fetch_item_details(list(matched.keys()))
        title_details = [
            detail for detail in details
            if detail.get("itemTypeDetail") == "칭호" and keyword in clean_text(detail.get("itemName"))
        ]
        box_details = [
            detail for detail in details
            if "칭호 선택 상자" in clean_text(detail.get("itemName"))
        ]

        box_prices = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(get_cached_auction, box.get("itemId")): box
                for box in box_details
            }
            for future in as_completed(futures):
                box = futures[future]
                item = {
                    "itemId": box.get("itemId"),
                    "itemName": clean_text(box.get("itemName")),
                    "iconUrl": get_item_icon_url(box.get("itemId")),
                    "itemExplain": get_item_explain(box),
                }
                try:
                    item["auction"] = future.result()
                except Exception as exc:
                    item["auction"] = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                    errors.append({"itemId": item.get("itemId"), "itemName": item.get("itemName"), "error": str(exc)})
                box_prices.append(item)

        candidates = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(get_cached_auction, detail.get("itemId")): detail
                for detail in title_details
            }
            for future in as_completed(futures):
                detail = futures[future]
                item_id = detail.get("itemId")
                try:
                    auction = future.result()
                except Exception as exc:
                    auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                    errors.append({"itemId": item_id, "itemName": detail.get("itemName"), "error": str(exc)})

                variant = get_title_variant(detail.get("itemName"))
                applicable_boxes = [
                    box for box in box_prices
                    if variant == get_title_variant(box.get("itemName"))
                    or (variant == "플래티넘" and "플래티넘" in box.get("itemName", ""))
                    or (variant == "플래티넘" and "액티브 스킬 공격력" in box.get("itemExplain", ""))
                    or (
                        variant == "일반"
                        and "플래티넘" not in box.get("itemName", "")
                        and "액티브 스킬 공격력" not in box.get("itemExplain", "")
                    )
                ]
                price_options = [{
                    "auction": auction,
                    "itemId": item_id,
                    "itemName": clean_text(detail.get("itemName")),
                    "iconUrl": get_item_icon_url(item_id),
                }]
                price_options.extend(applicable_boxes)
                priced_options = [
                    item for item in price_options
                    if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                    and item["auction"]["minUnitPrice"] > 0
                ]
                price_item = min(priced_options, key=lambda item: item["auction"]["minUnitPrice"], default=None)
                candidates.append({
                    **build_title_payload(
                        item_id,
                        detail,
                        auction=(price_item or {}).get("auction", auction),
                        price_item={
                            "itemId": (price_item or {}).get("itemId"),
                            "itemName": (price_item or {}).get("itemName"),
                            "iconUrl": (price_item or {}).get("iconUrl"),
                        } if price_item and price_item.get("itemId") != item_id else None,
                    ),
                    "name": clean_text(detail.get("itemName")),
                    "variant": variant,
                })

        candidates.sort(key=lambda item: (
            item.get("levelTag") or 0,
            1 if item.get("variant") == "플래티넘" else 0,
            item.get("auction", {}).get("minUnitPrice") or 10**30,
        ))
        groups.append({
            "groupName": keyword,
            "searchName": keyword,
            "itemType": "칭호",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })

    payload = {
        "updatedAt": title_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": title_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _TITLE_PRICE_CACHE["payload"] = payload
        _TITLE_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(TITLE_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _TITLE_PRICE_CACHE)


def load_enchant_cards_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_ENCHANT_PRICE_CACHE, ENCHANT_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _ENCHANT_PRICE_CACHE["payload"]
        expires_at = _ENCHANT_PRICE_CACHE["expires_at"]
        if payload is not None and payload.get("schemaVersion") != ENCHANT_PRICE_CACHE_SCHEMA_VERSION:
            payload = None
            _ENCHANT_PRICE_CACHE["payload"] = None
            _ENCHANT_PRICE_CACHE["expires_at"] = 0

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _ENCHANT_PRICE_CACHE)
        start_cache_refresh(
            _ENCHANT_PRICE_CACHE,
            lambda: load_enchant_cards_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status(payload, _ENCHANT_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _ENCHANT_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "cards": [],
            "errors": [],
        }, _ENCHANT_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _ENCHANT_PRICE_CACHE,
            lambda: load_enchant_cards_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "cards": [],
            "errors": [],
        }, _ENCHANT_PRICE_CACHE, stale=True)

    with ENCHANT_DB_PATH.open("r", encoding="utf-8") as fp:
        card_db = json.load(fp)

    cards = []
    errors = []
    for card in card_db.get("cards") or []:
        card_with_price = dict(card)
        search_name = clean_text(card.get("searchName") or card.get("itemName") or (card.get("sources") or [{}])[0].get("searchName"))
        resolved_card = {"itemId": card.get("itemId")} if card.get("itemId") else resolve_exact_item_by_name(search_name, "")
        detail = {}
        if resolved_card.get("itemId"):
            detail_rows = fetch_item_details([resolved_card.get("itemId")])
            detail = detail_rows[0] if detail_rows else {}
        else:
            errors.append({"itemName": search_name, "error": "마법부여 카드 itemId를 찾지 못했습니다."})
        if detail:
            item_id = detail.get("itemId")
            card_with_price.update({
                "itemId": item_id,
                "itemName": clean_item_display_name(detail.get("itemName", card.get("itemName"))),
                "itemRarity": clean_text(detail.get("itemRarity", card.get("itemRarity"))),
                "itemType": clean_text(detail.get("itemType", card.get("itemType"))),
                "itemTypeDetail": clean_text(detail.get("itemTypeDetail", card.get("itemTypeDetail"))),
                "itemAvailableLevel": detail.get("itemAvailableLevel", card.get("itemAvailableLevel")),
                "fame": detail.get("fame", card.get("fame")),
                "iconUrl": get_item_icon_url(item_id),
            })
            if card.get("displayName"):
                card_with_price["displayName"] = clean_item_display_name(card.get("displayName"))
            card_with_price["sources"] = build_enchant_sources_from_detail(card, detail)
        else:
            card_with_price["iconUrl"] = get_item_icon_url(card.get("itemId"))
            card_with_price["sources"] = [
                {**source, "effects": order_effects(source.get("effects") or {})}
                for source in card.get("sources") or []
            ]
        cards.append(card_with_price)

    for item in card_db.get("materialEnchantItems") or []:
        item_with_source = dict(item)
        search_name = clean_text(item.get("searchName") or item.get("itemName"))
        resolved_item = {"itemId": item.get("itemId")} if item.get("itemId") else resolve_exact_item_by_name(search_name, "보주")
        detail = {}
        if resolved_item:
            item_with_source.update(resolved_item)
            detail_rows = fetch_item_details([resolved_item.get("itemId")])
            detail = detail_rows[0] if detail_rows else {}
            if detail:
                item_with_source.update({
                    "itemName": clean_item_display_name(detail.get("itemName", item_with_source.get("itemName"))),
                    "itemRarity": clean_text(detail.get("itemRarity", item_with_source.get("itemRarity"))),
                    "itemType": clean_text(detail.get("itemType", item_with_source.get("itemType"))),
                    "itemTypeDetail": clean_text(detail.get("itemTypeDetail", item_with_source.get("itemTypeDetail"))),
                    "itemAvailableLevel": detail.get("itemAvailableLevel", item_with_source.get("itemAvailableLevel")),
                    "fame": detail.get("fame", item_with_source.get("fame")),
                })
                if item.get("displayName"):
                    item_with_source["displayName"] = clean_item_display_name(item.get("displayName"))
        else:
            errors.append({"itemName": search_name, "error": "재료 구매 보주 itemId를 찾지 못했습니다."})
            item_with_source["itemName"] = search_name
            item_with_source["iconUrl"] = ""
        acquisition = dict(item.get("acquisition") or {})
        material_search_name = clean_text(acquisition.get("materialSearchName") or acquisition.get("materialItemName"))
        if material_search_name:
            resolved_material = resolve_exact_item_by_name(material_search_name, "재료")
            if resolved_material:
                acquisition["materialItemId"] = resolved_material.get("itemId")
                acquisition["materialItemName"] = resolved_material.get("itemName")
                acquisition["materialIconUrl"] = resolved_material.get("iconUrl")
            else:
                errors.append({"itemName": material_search_name, "error": "재료 itemId를 찾지 못했습니다."})
        elif acquisition.get("materialItemId") and not acquisition.get("materialIconUrl"):
            acquisition["materialIconUrl"] = get_item_icon_url(acquisition.get("materialItemId"))
        item_with_source["acquisition"] = acquisition
        item_with_source["sources"] = build_material_enchant_sources(item, detail)
        item_with_source["auction"] = {
            "listingCount": 0,
            "minUnitPrice": None,
            "averagePrice": None,
            "auctionNo": None,
        }
        item_with_source["priceOptions"] = []
        cards.append(item_with_source)

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_by_option = {}
        for card in cards:
            if card.get("acquisition"):
                continue
            price_options = [{
                "itemId": card.get("itemId"),
                "itemName": card.get("itemName"),
                "iconUrl": card.get("iconUrl"),
                "kind": "카드",
            }]
            bead_item = find_enchant_bead_item(card)
            if bead_item and bead_item.get("itemId") != card.get("itemId"):
                price_options.append({**bead_item, "kind": "보주"})
            card["priceOptions"] = price_options
            for option in price_options:
                future_by_option[executor.submit(get_lowest_auction_price, option["itemId"])] = (card, option)

        for future in as_completed(future_by_option):
            card, option = future_by_option[future]
            try:
                option["auction"] = future.result()
            except Exception as exc:
                option["auction"] = {
                    "listingCount": 0,
                    "minUnitPrice": None,
                    "averagePrice": None,
                    "auctionNo": None,
                }
                errors.append({"itemId": option.get("itemId"), "itemName": option.get("itemName"), "error": str(exc)})

    for card in cards:
        priced_options = [
            option for option in card.get("priceOptions") or []
            if isinstance(option.get("auction", {}).get("minUnitPrice"), (int, float))
            and option["auction"]["minUnitPrice"] > 0
        ]
        price_item = min(priced_options, key=lambda option: option["auction"]["minUnitPrice"], default=None)
        card["auction"] = (price_item or {}).get("auction") or {
            "listingCount": 0,
            "minUnitPrice": None,
            "averagePrice": None,
            "auctionNo": None,
        }
        card["priceItem"] = {
            "itemId": price_item.get("itemId"),
            "itemName": price_item.get("itemName"),
            "iconUrl": price_item.get("iconUrl"),
            "kind": price_item.get("kind"),
        } if price_item and price_item.get("itemId") != card.get("itemId") else None

    payload = {
        "schemaVersion": ENCHANT_PRICE_CACHE_SCHEMA_VERSION,
        "updatedAt": card_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": card_db.get("source"),
        "cards": cards,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _ENCHANT_PRICE_CACHE["payload"] = payload
        _ENCHANT_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(ENCHANT_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _ENCHANT_PRICE_CACHE)


class HellApiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path in {"/", "/index.html"}:
            self.path = f"/{DEFAULT_HTML}"
            return super().do_GET()

        if parsed.path == "/api/health":
            return self.send_json({"ok": True})

        if parsed.path == "/api/search":
            return self.handle_search(parsed)

        if parsed.path == "/api/summarize":
            return self.handle_summarize(parsed)

        if parsed.path == "/api/enchant-cards":
            return self.handle_enchant_cards(parsed)

        if parsed.path == "/api/character-enchants":
            return self.handle_character_enchants(parsed)

        if parsed.path == "/api/creature-upgrades":
            return self.handle_creature_upgrades(parsed)

        if parsed.path == "/api/character-creature":
            return self.handle_character_creature(parsed)

        if parsed.path == "/api/title-upgrades":
            return self.handle_title_upgrades(parsed)

        if parsed.path == "/api/character-title":
            return self.handle_character_title(parsed)

        if parsed.path == "/api/aura-upgrades":
            return self.handle_aura_upgrades(parsed)

        if parsed.path == "/api/character-aura":
            return self.handle_character_aura(parsed)

        if parsed.path == "/api/character-avatar":
            return self.handle_character_avatar(parsed)

        return super().do_GET()

    def send_json(self, payload: dict, status: int = HTTPStatus.OK):
        body = json_response(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_search(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_name = clean_text((query.get("characterName") or [""])[0])
        if not server_id or not character_name:
            return self.send_json(
                {"error": "serverId와 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            resolved = search_character(server_id, character_name)
            self.send_json(
                {
                    "serverId": server_id,
                    "characterName": character_name,
                    "matchCount": len(resolved["rows"]),
                    "resolved": {
                        "serverId": resolved["server_id"],
                        "characterId": resolved["character_id"],
                        "characterName": resolved["character_name"],
                        "fame": resolved.get("fame", 0),
                        "jobId": resolved.get("job_id", ""),
                        "jobName": resolved.get("job_name", ""),
                        "jobGrowId": resolved.get("job_grow_id", ""),
                        "jobGrowName": resolved.get("job_grow_name", ""),
                    },
                    "rows": resolved["rows"],
                }
            )
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_enchant_cards(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            self.send_json(load_enchant_cards_with_prices(force_refresh=force_refresh))
        except FileNotFoundError:
            self.send_json({"error": "마법부여 카드 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_enchants(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_enchants(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_creature_upgrades(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            self.send_json(load_creature_upgrades_with_prices(force_refresh=force_refresh))
        except FileNotFoundError:
            self.send_json({"error": "크리쳐 후보 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_creature(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_creature(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_title_upgrades(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            self.send_json(load_title_upgrades_with_prices(force_refresh=force_refresh))
        except FileNotFoundError:
            self.send_json({"error": "칭호 후보 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_title(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_title(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_aura_upgrades(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            self.send_json(load_aura_upgrades_with_prices(force_refresh=force_refresh))
        except FileNotFoundError:
            self.send_json({"error": "오라 후보 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_aura(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_aura(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_avatar(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_avatar(server_id, character_id))
        except FileNotFoundError:
            self.send_json({"error": "아바타 옵션 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_summarize(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_name = clean_text((query.get("characterName") or [""])[0])
        if not server_id or not character_name:
            return self.send_json(
                {"error": "serverId와 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            resolved = search_character(server_id, character_name)
            summary = summarize_character_by_identity(
                resolved["server_id"],
                resolved["character_id"],
                resolved["character_name"],
            )
            self.send_json(
                {
                    "serverId": resolved["server_id"],
                    "characterId": resolved["character_id"],
                    "requestedCharacterName": character_name,
                    "name": summary["name"],
                    "fame": resolved.get("fame", 0),
                    "jobId": resolved.get("job_id", ""),
                    "jobName": resolved.get("job_name", ""),
                    "jobGrowId": resolved.get("job_grow_id", ""),
                    "jobGrowName": resolved.get("job_grow_name", ""),
                    "sets": summary["sets"],
                }
            )
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)


def main():
    parser = argparse.ArgumentParser(description="던파 헬 계산기용 Neople API proxy")
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()

    try:
        server = ThreadingHTTPServer((args.host, args.port), HellApiHandler)
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE or getattr(exc, "winerror", None) == 10048:
            print(f"Port {args.port} is already in use.")
            print(f"이미 서버가 실행 중이면 http://{args.host}:{args.port}/ 를 그대로 사용하세요.")
            print(f"다른 포트로 열려면: python3 neople_hell_api_server.py --port {args.port + 1}")
            return 1
        raise
    print(f"Serving on http://{args.host}:{args.port}/")
    print(f"Open {DEFAULT_HTML} via the server root or file:// with the local API proxy.")
    load_price_cache_from_disk(_ENCHANT_PRICE_CACHE, ENCHANT_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_CREATURE_PRICE_CACHE, CREATURE_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_TITLE_PRICE_CACHE, TITLE_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    start_periodic_price_refresh()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
