import re

from .effects import normalize_enchant_status
from .neople_client import clean_text, get_item_explain, get_item_icon_url


def parse_title_level_tag(item_name: str):
    match = re.search(r"\[(\d+)Lv\]", clean_text(item_name))
    return int(match.group(1)) if match else None


def normalize_level_option_base_name(item_name: str) -> str:
    return clean_text(re.sub(r"\[\d+\s*Lv\]", "", clean_text(item_name), flags=re.IGNORECASE))


def parse_skill_damage_percent(text: str) -> float:
    match = re.search(r"\d+(?:\s*~\s*\d+)?\s*(?:Lv|레벨)[^%]*?액티브\s*스킬[^%]*?(\d+(?:\.\d+)?)%\s*증가", clean_text(text))
    return float(match.group(1)) if match else 0


def get_creature_platinum_skill_damage_percent(level_tag: int | None) -> float:
    level = int(level_tag or 0)
    if level <= 0:
        return 0
    return 15 if level == 30 else 10


def get_level_option_variant(item_name: str) -> str:
    return "플래티넘" if parse_title_level_tag(item_name) or "플래티넘" in clean_text(item_name) else "일반"


def get_title_variant(item_name: str) -> str:
    return get_level_option_variant(item_name)


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
        "itemReinforceSkill": detail.get("itemReinforceSkill") or [],
        "itemBuff": detail.get("itemBuff") or {},
        "variant": get_title_variant(detail.get("itemName")),
        "levelTag": parse_title_level_tag(detail.get("itemName")),
        "skillDamagePercent": parse_skill_damage_percent(explain),
        "auction": auction or {},
        "priceItem": price_item,
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
        "itemReinforceSkill": detail.get("itemReinforceSkill") or [],
        "itemBuff": detail.get("itemBuff") or {},
        "auction": auction or {},
        "priceItem": price_item,
    }
