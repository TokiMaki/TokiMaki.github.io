import math


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


def get_relic_craft_final_damage_percent(authoritative_effects: dict) -> float:
    config = (authoritative_effects or {}).get("finalDamage") or {}
    body_multiplier = 1 + _number(config.get("bodyPercent")) / 100
    precision_multiplier = 1 + _number(config.get("precisionPercent")) / 100
    object_damage_per_final_damage = _number(config.get("objectDamagePerFinalDamagePercent"))
    if object_damage_per_final_damage <= 0:
        return 0.0
    object_multiplier = 1 + (
        _number(config.get("objectDamagePercentPerHit"))
        * _number(config.get("objectHitCount"))
        / object_damage_per_final_damage
    ) / 100
    return (body_multiplier * precision_multiplier * object_multiplier - 1) * 100


def normalize_relic_craft_target_equipment_body(
    *,
    target_config: dict,
    target_detail: dict,
    normalized_status: dict,
    precision: dict,
    authoritative_effects: dict,
    icon_url: str,
    item_explain: str,
) -> tuple[dict, str]:
    target_item_id = _clean_text(target_config.get("itemId"))
    if not target_item_id:
        return {}, "missing_relic_craft_target_item"
    if _clean_text(target_detail.get("itemId")) != target_item_id:
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if _clean_text(target_detail.get("itemName")) != _clean_text(target_config.get("itemName")):
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if _clean_text(target_detail.get("itemRarity")) != _clean_text(target_config.get("itemRarity")):
        return {}, "missing_or_invalid_relic_craft_item_detail"
    if _clean_text(target_detail.get("itemTypeDetail")) != _clean_text(target_config.get("itemTypeDetail")):
        return {}, "missing_or_invalid_relic_craft_item_detail"

    target_slot_id = resolve_canonical_equipment_slot_id(target_config)
    target_slot_name = resolve_canonical_equipment_slot_name(target_config)
    if not target_slot_id or not target_slot_name:
        return {}, "invalid_relic_craft_target_slot"
    if _number(precision.get("targetPercent")) <= 0 or _number(precision.get("operationCount")) <= 0:
        return {}, "invalid_relic_craft_precision_contract"

    target_set_point = get_equipment_tune_set_point(target_detail)
    if target_set_point <= 0:
        return {}, "missing_relic_craft_target_set_point"

    effects = dict(normalized_status or {})
    effects.pop("finalDamage", None)
    effects.pop("buffPower", None)
    required_effect_reason_by_key = {
        "attackIncrease": "missing_relic_craft_attack_increase",
    }
    for effect_key in authoritative_effects.get("requiredBaseEffectKeys") or []:
        if _number(effects.get(effect_key)) <= 0:
            return {}, required_effect_reason_by_key.get(
                effect_key,
                f"missing_relic_craft_{effect_key}",
            )

    final_damage = get_relic_craft_final_damage_percent(authoritative_effects)
    buff_power_config = authoritative_effects.get("buffPower") or {}
    buff_power = _number(buff_power_config.get("body")) + _number(buff_power_config.get("precision"))
    if final_damage <= 0:
        return {}, "invalid_relic_craft_final_damage"
    if buff_power <= 0:
        return {}, "invalid_relic_craft_buff_power"
    effects["finalDamage"] = final_damage
    effects["buffPower"] = buff_power

    return {
        "slotId": target_slot_id,
        "slot": target_slot_name,
        "slotName": target_slot_name,
        "itemId": target_item_id,
        "itemName": _clean_text(target_detail.get("itemName")),
        "itemRarity": _clean_text(target_detail.get("itemRarity")),
        "iconUrl": icon_url,
        "effects": effects,
        "tuneSetPoint": target_set_point,
        "itemReinforceSkill": target_detail.get("itemReinforceSkill") or [],
        "itemBuff": target_detail.get("itemBuff") or {},
        "itemExplain": item_explain,
    }, ""
