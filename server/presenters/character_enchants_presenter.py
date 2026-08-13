import re

from ..data_store import load_relic_craft_db
from ..effects import normalize_enchant_status, parse_percent_or_number
from ..equipment_body import get_equipment_tune_set_point, resolve_relic_precision_percent
from ..enchant_service import load_enchant_tier_cards
from ..neople_client import clean_text, get_item_icon_url
from ..setting_value_service import annotate_current_enchant_tiers


EQUIPMENT_TUNE_SLOT_NAMES = {
    "머리어깨",
    "상의",
    "하의",
    "벨트",
    "신발",
    "무기",
    "팔찌",
    "목걸이",
    "보조장비",
    "반지",
    "귀걸이",
    "마법석",
}


def _get_relic_equipment_item_ids() -> set[str]:
    return {
        clean_text((recipe.get("target") or {}).get("itemId"))
        for recipe in load_relic_craft_db().get("crafts") or []
        if recipe.get("enabled")
        and recipe.get("sourceType") == "relicCraft"
        and clean_text((recipe.get("target") or {}).get("itemId"))
    }


def build_equipment_upgrade_payload(equipment: dict) -> dict:
    slot_name = clean_text(equipment.get("slotName"))
    slot_id = clean_text(equipment.get("slotId"))
    reinforce = int(parse_percent_or_number(equipment.get("reinforce")))
    refine = int(parse_percent_or_number(equipment.get("refine")))
    amplification_name = clean_text(equipment.get("amplificationName"))
    item_id = clean_text(equipment.get("itemId"))
    item_name = clean_text(equipment.get("itemName"))
    item_rarity = clean_text(equipment.get("itemRarity"))
    tune_rows = [tune for tune in equipment.get("tune") or [] if isinstance(tune, dict)]
    tune_level = max([int(parse_percent_or_number(tune.get("level"))) for tune in tune_rows] or [0])
    tune_set_point = get_equipment_tune_set_point(equipment)
    tune_upgradeable = any(tune.get("upgrade") is not False for tune in tune_rows)
    is_relic_equipment = item_id in _get_relic_equipment_item_ids()
    is_named_unique_equipment = re.match(r"^고유\s*[:\-]", item_name) is not None
    precision_percent = (
        resolve_relic_precision_percent(equipment.get("potency"))
        if is_relic_equipment
        else None
    )
    is_tune_target = (
        slot_name in EQUIPMENT_TUNE_SLOT_NAMES
        and item_rarity in {"에픽", "레전더리"}
        and not is_relic_equipment
        and not is_named_unique_equipment
    )
    tune_remaining = max(0, 3 - tune_level) if is_tune_target and tune_upgradeable else 0
    return {
        "slot": slot_name,
        "slotId": slot_id,
        "itemId": item_id,
        "itemName": item_name,
        "itemRarity": item_rarity,
        "iconUrl": get_item_icon_url(item_id) if item_id else "",
        "reinforce": reinforce,
        "refine": refine,
        "amplificationName": amplification_name,
        "isAmplified": bool(amplification_name),
        "isRelic": is_relic_equipment,
        "precisionPercent": precision_percent,
        "tuneLevel": tune_level,
        "tuneSetPoint": tune_set_point,
        "tuneUpgradeable": bool(is_tune_target and tune_upgradeable),
        "tuneRemaining": tune_remaining,
    }


def build_equipment_enchant_rows_and_upgrades(equipment_rows: list) -> tuple[list, list]:
    rows = []
    equipment_upgrades = []
    for equipment in equipment_rows or []:
        slot_name = clean_text(equipment.get("slotName"))
        if slot_name:
            equipment_upgrades.append(build_equipment_upgrade_payload(equipment))
        enchant = equipment.get("enchant") or {}
        status_rows = enchant.get("status") or []
        reinforce_skill = enchant.get("reinforceSkill") or []
        if not slot_name or (not status_rows and not reinforce_skill):
            continue
        rows.append({
            "slot": slot_name,
            "itemName": clean_text(equipment.get("itemName")),
            "effects": normalize_enchant_status(status_rows),
            "reinforceSkill": reinforce_skill,
            "rawStatus": status_rows,
        })
    try:
        rows = annotate_current_enchant_tiers(rows, load_enchant_tier_cards())
    except Exception:
        rows = annotate_current_enchant_tiers(rows, [])
    return rows, equipment_upgrades


def build_character_enchants_payload(
    payload: dict,
    damage_baseline: dict,
    buffer_baseline: dict | None,
    enchants: list,
    equipment_upgrades: list,
    oath_upgrades: dict,
    oath_transcend_recommendations: list,
    oath_craft_recommendations: list,
    oath_tune_stage_db: dict,
    black_fang_recommendations: list,
    relic_craft_recommendations: list,
    raid_armor_upgrade_recommendations: list,
    weapon_tune_recommendations: list,
    upgrade_expected_db,
    upgrade_material_prices: dict,
    steps: list,
    timing_details: dict,
) -> dict:
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "damageBaseline": damage_baseline,
        "bufferBaseline": buffer_baseline,
        "enchants": enchants,
        "equipmentUpgrades": equipment_upgrades,
        "oathUpgrades": oath_upgrades,
        "oathTranscendRecommendations": oath_transcend_recommendations,
        "oathCraftRecommendations": oath_craft_recommendations,
        "oathTuneStageDb": oath_tune_stage_db,
        "blackFangRecommendations": black_fang_recommendations,
        "relicCraftRecommendations": relic_craft_recommendations,
        "raidArmorUpgradeRecommendations": raid_armor_upgrade_recommendations,
        "weaponTuneRecommendations": weapon_tune_recommendations,
        "upgradeExpectedDb": upgrade_expected_db,
        "upgradeMaterialPrices": upgrade_material_prices,
        "debugTimings": {
            "steps": steps,
            "details": timing_details,
        },
    }
