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


def _clamp_precision_percent(value) -> int:
    return max(0, min(100, int(round(_number(value)))))


def get_relic_precision_effects(precision: dict, precision_percent) -> dict:
    progression = (precision or {}).get("progression") or {}
    per_percent = progression.get("perPercent") or {}
    milestone_by_percent = {
        _clamp_precision_percent(row.get("percent")): row
        for row in progression.get("milestones") or []
        if isinstance(row, dict) and _number(row.get("percent")) > 0
    }
    result = {
        "finalDamage": 0.0,
        "buffPower": 0.0,
        "adventureFame": 0.0,
    }
    for percent in range(1, _clamp_precision_percent(precision_percent) + 1):
        increment = milestone_by_percent.get(percent) or per_percent
        for key in result:
            result[key] += _number(increment.get(key))
    return result


def resolve_relic_precision_percent(potency: dict | None) -> int | None:
    if not isinstance(potency, dict) or "value" not in potency:
        return None
    try:
        precision_value = float(potency.get("value"))
    except (TypeError, ValueError):
        return None
    if not math.isfinite(precision_value) or not precision_value.is_integer():
        return None
    precision_percent = int(precision_value)
    if precision_percent < 0 or precision_percent > 100:
        return None
    return precision_percent


def _get_precision_multiplier_count(
    precision: dict,
    multiplier_index: int,
    precision_percent,
    fallback,
) -> float:
    progression = (precision or {}).get("progression") or {}
    rule = next((
        row
        for row in progression.get("additionalMultiplierCounts") or []
        if isinstance(row, dict) and int(_number(row.get("index"))) == multiplier_index
    ), None)
    if not rule:
        return _number(fallback)
    milestone_percent = _number(rule.get("milestonePercent"))
    if milestone_percent <= 0:
        return _number(fallback)
    count = (
        _number(rule.get("baseCount"))
        + math.floor(_clamp_precision_percent(precision_percent) / milestone_percent)
        * _number(rule.get("countPerMilestone"))
    )
    max_count = _number(rule.get("maxCount"))
    return min(count, max_count) if max_count > 0 else count


def get_relic_craft_final_damage_percent(
    authoritative_effects: dict,
    precision: dict | None = None,
    precision_percent=100,
) -> float:
    config = (authoritative_effects or {}).get("finalDamage") or {}
    body_multiplier = 1 + _number(config.get("bodyPercent")) / 100
    precision_effects = get_relic_precision_effects(precision or {}, precision_percent)
    precision_final_damage = precision_effects["finalDamage"] or (
        _number(config.get("precisionPercent"))
        if _clamp_precision_percent(precision_percent) >= 100
        else 0.0
    )
    precision_multiplier = 1 + precision_final_damage / 100
    if body_multiplier <= 1 or precision_multiplier <= 0:
        return 0.0

    additional_multiplier = 1.0
    for multiplier_index, row in enumerate(config.get("additionalMultipliers") or []):
        multiplier_type = _clean_text(row.get("type"))
        count = _get_precision_multiplier_count(
            precision or {},
            multiplier_index,
            precision_percent,
            row.get("count") or 1,
        )
        if multiplier_type == "objectDamageConversion":
            object_damage_per_final_damage = _number(
                row.get("objectDamagePerFinalDamagePercent")
            )
            if object_damage_per_final_damage <= 0:
                return 0.0
            hit_count = _get_precision_multiplier_count(
                precision or {},
                multiplier_index,
                precision_percent,
                row.get("hitCount"),
            )
            if hit_count <= 0:
                continue
            converted_final_damage_percent = (
                _number(row.get("objectDamagePercentPerHit"))
                * hit_count
                / object_damage_per_final_damage
            )
            if converted_final_damage_percent <= 0:
                return 0.0
            additional_multiplier *= 1 + converted_final_damage_percent / 100
        elif multiplier_type == "fixedFinalDamageMultiplier":
            if count <= 0:
                continue
            equivalent_final_damage_percent = _number(
                row.get("equivalentFinalDamagePercent")
            )
            if equivalent_final_damage_percent <= 0:
                return 0.0
            additional_multiplier *= (
                1 + equivalent_final_damage_percent / 100
            ) ** count
        else:
            return 0.0

    return (
        body_multiplier
        * precision_multiplier
        * additional_multiplier
        - 1
    ) * 100


def normalize_relic_craft_target_equipment_body(
    *,
    target_config: dict,
    target_detail: dict,
    normalized_status: dict,
    precision: dict,
    authoritative_effects: dict,
    icon_url: str,
    item_explain: str,
    precision_percent=None,
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
    resolved_precision_percent = _clamp_precision_percent(
        precision.get("targetPercent") if precision_percent is None else precision_percent
    )

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

    final_damage = get_relic_craft_final_damage_percent(
        authoritative_effects,
        precision,
        resolved_precision_percent,
    )
    buff_power_config = authoritative_effects.get("buffPower") or {}
    precision_effects = get_relic_precision_effects(precision, resolved_precision_percent)
    precision_buff_power = precision_effects["buffPower"] or (
        _number(buff_power_config.get("precision")) if resolved_precision_percent >= 100 else 0.0
    )
    buff_power = _number(buff_power_config.get("body")) + precision_buff_power
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
        "precisionPercent": resolved_precision_percent,
        "precisionAdventureFame": precision_effects["adventureFame"],
        "conditionalEffects": dict(authoritative_effects.get("conditionalEffects") or {}),
        "tuneLevel": 0,
        "tuneSetPoint": target_set_point,
        "tuneUpgradeable": False,
        "tuneRemaining": 0,
        "itemReinforceSkill": target_detail.get("itemReinforceSkill") or [],
        "itemBuff": target_detail.get("itemBuff") or {},
        "itemExplain": item_explain,
    }, ""
