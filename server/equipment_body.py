import math


PERFUME_ITEM_ID = "df77236c51ea1274a3deb79c3e470695"
PERFUME_SLOT_ID = "MAGIC_STON"
PERFUME_SLOT_NAME = "마법석"
PERFUME_BODY_FINAL_DAMAGE_PERCENT = 48.9
PERFUME_PRECISION_FINAL_DAMAGE_PERCENT = 13.1
PERFUME_BODY_BUFF_POWER = 12930.0
PERFUME_PRECISION_BUFF_POWER = 4650.0
PERFUME_OBJECT_DAMAGE_PERCENT_PER_HIT = 90900
PERFUME_OBJECT_HIT_COUNT = 4
PERFUME_OBJECT_DAMAGE_PER_FINAL_DAMAGE_PERCENT = 270000

_SLOT_ID_BY_NAME = {
    "무기": "WEAPON",
    "상의": "JACKET",
    "하의": "PANTS",
    "머리어깨": "SHOULDER",
    "벨트": "WAIST",
    "신발": "SHOES",
    "팔찌": "WRIST",
    "목걸이": "AMULET",
    "반지": "RING",
    "보조장비": "SUPPORT",
    "마법석": "MAGIC_STON",
    "귀걸이": "EARRING",
}
_SLOT_NAME_BY_ID = {slot_id: slot_name for slot_name, slot_id in _SLOT_ID_BY_NAME.items()}


def _clean_text(value) -> str:
    return str(value or "").strip()


def _number(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


def resolve_canonical_equipment_slot_id(row: dict | None) -> str:
    row = row or {}
    slot_id = _clean_text(row.get("slotId"))
    if slot_id in _SLOT_NAME_BY_ID:
        return slot_id
    slot_name = _clean_text(row.get("slotName") or row.get("slot"))
    return _SLOT_ID_BY_NAME.get(slot_name, "")


def resolve_canonical_equipment_slot_name(row: dict | None) -> str:
    row = row or {}
    slot_id = resolve_canonical_equipment_slot_id(row)
    return _SLOT_NAME_BY_ID.get(slot_id, _clean_text(row.get("slotName") or row.get("slot")))


def get_equipment_tune_set_point(row: dict | None) -> float:
    return sum(
        _number(tune.get("setPoint"))
        for tune in (row or {}).get("tune") or []
        if isinstance(tune, dict)
    )


def get_perfume_final_damage_percent() -> float:
    body_multiplier = 1 + PERFUME_BODY_FINAL_DAMAGE_PERCENT / 100
    precision_multiplier = 1 + PERFUME_PRECISION_FINAL_DAMAGE_PERCENT / 100
    object_multiplier = 1 + (
        (PERFUME_OBJECT_DAMAGE_PERCENT_PER_HIT * PERFUME_OBJECT_HIT_COUNT)
        / PERFUME_OBJECT_DAMAGE_PER_FINAL_DAMAGE_PERCENT
    ) / 100
    return (body_multiplier * precision_multiplier * object_multiplier - 1) * 100


def _get_precision_effects(precision: dict) -> dict:
    target_percent = _number(precision.get("targetPercent"))
    config = precision.get("effectsByPrecision") or {}
    per_percent = config.get("perPercent") or {}
    effects = {
        key: _number(per_percent.get(key)) * target_percent
        for key in ("finalDamage", "buffPower")
    }
    for milestone in config.get("milestones") or []:
        if target_percent < _number(milestone.get("percent")):
            continue
        for key in effects:
            effects[key] += _number(milestone.get(key)) - _number(per_percent.get(key))
    return effects


def normalize_perfume_target_equipment_body(
    *,
    target_config: dict,
    target_detail: dict,
    normalized_status: dict,
    precision: dict,
    icon_url: str,
    item_explain: str,
) -> tuple[dict, str]:
    if _clean_text(target_config.get("itemId")) != PERFUME_ITEM_ID:
        return {}, "invalid_relic_craft_target_item_id"
    if _clean_text(target_detail.get("itemId")) != PERFUME_ITEM_ID:
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if _clean_text(target_detail.get("itemName")) != _clean_text(target_config.get("itemName")):
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if _clean_text(target_detail.get("itemRarity")) != _clean_text(target_config.get("itemRarity")):
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if _clean_text(target_detail.get("itemTypeDetail")) != _clean_text(target_config.get("itemTypeDetail")):
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if resolve_canonical_equipment_slot_id(target_config) != PERFUME_SLOT_ID:
        return {}, "invalid_relic_craft_target_slot"
    if _number(precision.get("targetPercent")) != 100 or _number(precision.get("operationCount")) != 25:
        return {}, "invalid_relic_craft_precision_contract"

    precision_effects = _get_precision_effects(precision)
    if abs(precision_effects.get("finalDamage", 0) - PERFUME_PRECISION_FINAL_DAMAGE_PERCENT) > 0.000001:
        return {}, "invalid_relic_craft_precision_final_damage"
    if abs(precision_effects.get("buffPower", 0) - PERFUME_PRECISION_BUFF_POWER) > 0.000001:
        return {}, "invalid_relic_craft_precision_buff_power"

    target_set_point = get_equipment_tune_set_point(target_detail)
    if target_set_point <= 0:
        return {}, "missing_relic_craft_target_set_point"

    effects = dict(normalized_status or {})
    effects.pop("finalDamage", None)
    effects.pop("buffPower", None)
    if _number(effects.get("attackIncrease")) <= 0:
        return {}, "missing_relic_craft_attack_increase"
    effects["finalDamage"] = get_perfume_final_damage_percent()
    effects["buffPower"] = PERFUME_BODY_BUFF_POWER + PERFUME_PRECISION_BUFF_POWER

    return {
        "slotId": PERFUME_SLOT_ID,
        "slot": PERFUME_SLOT_NAME,
        "slotName": PERFUME_SLOT_NAME,
        "itemId": PERFUME_ITEM_ID,
        "itemName": _clean_text(target_detail.get("itemName")),
        "itemRarity": _clean_text(target_detail.get("itemRarity")),
        "iconUrl": icon_url,
        "effects": effects,
        "tuneSetPoint": target_set_point,
        "itemReinforceSkill": target_detail.get("itemReinforceSkill") or [],
        "itemBuff": target_detail.get("itemBuff") or {},
        "itemExplain": item_explain,
    }, ""
