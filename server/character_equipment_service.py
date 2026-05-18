import re

from .data_store import load_avatar_option_db, load_job_base_stats, load_upgrade_expected_db
from .effects import normalize_enchant_status, parse_percent_or_number, subtract_effects
from .neople_client import (
    API_KEY,
    clean_item_display_name,
    clean_text,
    fetch_item_details,
    get_item_explain,
    get_item_icon_url,
    get_lowest_auction_price,
    request_json,
    search_items_by_name,
)
from .upgrade_payloads import build_aura_payload, build_title_payload


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


def status_rows_to_map(status_rows: list) -> dict:
    return {
        clean_text(status.get("name")): parse_percent_or_number(status.get("value"))
        for status in status_rows or []
        if clean_text(status.get("name"))
    }


def parse_element_bonus_from_text(text: str) -> float:
    values = [
        parse_percent_or_number(match.group(1))
        for match in re.finditer(r"(?:모든\s*)?속성\s*강화\s*\+?\s*([0-9.]+)", clean_text(text))
    ]
    return max(values or [0])


def get_equipment_base_element_bonus(equipment_rows: list) -> float:
    item_ids = {
        clean_text(row.get("itemId")): clean_text(row.get("slotId"))
        for row in equipment_rows or []
        if clean_text(row.get("itemId")) and clean_text(row.get("slotId")) != "TITLE"
    }
    total = 0
    for detail in fetch_item_details(list(item_ids.keys())):
        effects = normalize_enchant_status(detail.get("itemStatus") or [])
        explain_element = parse_element_bonus_from_text(
            detail.get("itemExplainDetail") or detail.get("itemExplain") or ""
        )
        total += max(effects.get("elementAll", 0), explain_element)
    return total


def load_character_damage_baseline(server_id: str, character_id: str, equipment_base_element: float = 0) -> dict:
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
    ) + equipment_base_element
    status_element_damage = max(
        value
        for key, value in status.items()
        if "속성 피해" in key
    ) if any("속성 피해" in key for key in status) else 0
    element_damage = status_element_damage + equipment_base_element * 0.45 if status_element_damage else 0
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
        "elementDamage": element_damage,
        "equipmentBaseElement": equipment_base_element,
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
        "damageBaseline": load_character_damage_baseline(
            server_id,
            character_id,
            get_equipment_base_element_bonus(payload.get("equipment") or []),
        ),
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


