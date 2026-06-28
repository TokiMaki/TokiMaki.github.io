from ..effects import parse_percent_or_number
from ..neople_client import clean_text


def get_oath_tune_db_rows(db: dict, key: str) -> list:
    rows = (db or {}).get(key)
    return rows if isinstance(rows, list) else []


def get_oath_point_row(rows: list, point: float, point_key: str = "requiredPoint") -> dict | None:
    value = parse_percent_or_number(point)
    eligible_rows = [
        row for row in rows or []
        if parse_percent_or_number((row or {}).get(point_key)) <= value
    ]
    eligible_rows.sort(key=lambda row: parse_percent_or_number((row or {}).get(point_key)), reverse=True)
    return eligible_rows[0] if eligible_rows else None


def get_oath_tune_state(db: dict, point: float) -> dict | None:
    stage = get_oath_point_row(get_oath_tune_db_rows(db, "stageRows"), point, "requiredPoint")
    blessing = get_oath_point_row(get_oath_tune_db_rows(db, "blessingRows"), point, "startPoint")
    if not stage or not blessing:
        return None
    step_point = parse_percent_or_number(blessing.get("stepPoint")) or 25
    steps = int(max(0, parse_percent_or_number(point) - parse_percent_or_number(blessing.get("startPoint"))) // step_point) if step_point > 0 else 0
    blessing_final_damage = parse_percent_or_number(blessing.get("finalDamagePercent")) + steps * parse_percent_or_number(blessing.get("finalDamagePerStep"))
    blessing_buff_power = parse_percent_or_number(blessing.get("buffPower")) + steps * parse_percent_or_number(blessing.get("buffPowerPerStep"))
    cooldown_multiplier = parse_percent_or_number((db or {}).get("cooldownEquivalentMultiplier")) or 1
    if not blessing.get("cooldownEquivalent"):
        cooldown_multiplier = 1
    damage_multiplier = (
        (1 + parse_percent_or_number(stage.get("finalDamagePercent")) / 100)
        * (1 + blessing_final_damage / 100)
        * (cooldown_multiplier if cooldown_multiplier > 0 else 1)
    )
    return {
        "point": parse_percent_or_number(point),
        "stageName": clean_text(stage.get("name")),
        "stageRarity": clean_text(stage.get("rarity")),
        "stageRequiredPoint": parse_percent_or_number(stage.get("requiredPoint")),
        "setFinalDamage": parse_percent_or_number(stage.get("finalDamagePercent")),
        "stageBuffPower": parse_percent_or_number(stage.get("buffPower")),
        "blessingFinalDamage": blessing_final_damage,
        "blessingBuffPower": blessing_buff_power,
        "damageMultiplier": damage_multiplier,
    }


def get_oath_total_set_point(oath: dict) -> float:
    set_info = (oath or {}).get("setInfo") or {}
    active = set_info.get("active") or {}
    set_point = set_info.get("setPoint") or active.get("setPoint") or {}
    total = parse_percent_or_number(set_point.get("current")) if isinstance(set_point, dict) else 0
    if total > 0:
        return total
    info = (oath or {}).get("info") or {}
    total = parse_percent_or_number(info.get("setPoint"))
    for crystal in (oath or {}).get("crystal") or []:
        total += get_oath_crystal_set_point(crystal)
    return total


def get_oath_crystal_set_point(crystal: dict) -> float:
    tune = (crystal or {}).get("tune") or {}
    return parse_percent_or_number(tune.get("setPoint")) or parse_percent_or_number((crystal or {}).get("setPoint"))


def get_oath_detail_set_point(detail: dict) -> float:
    tune_rows = (detail or {}).get("tune") or []
    if isinstance(tune_rows, list):
        for row in tune_rows:
            value = parse_percent_or_number((row or {}).get("setPoint"))
            if value > 0:
                return value
    return parse_percent_or_number((detail or {}).get("setPoint"))


def build_oath_set_point_context(current_total_set_point: float, current_slot_set_point: float, target_slot_set_point: float, db: dict) -> dict:
    current_total = parse_percent_or_number(current_total_set_point)
    current_slot = parse_percent_or_number(current_slot_set_point)
    target_slot = parse_percent_or_number(target_slot_set_point)
    if current_total <= 0 or current_slot <= 0 or target_slot <= 0:
        return {}
    target_total = current_total - current_slot + target_slot
    current_state = get_oath_tune_state(db, current_total)
    target_state = get_oath_tune_state(db, target_total)
    if not current_state or not target_state:
        return {}
    current_buff_power = current_state["blessingBuffPower"] + current_state["stageBuffPower"]
    target_buff_power = target_state["blessingBuffPower"] + target_state["stageBuffPower"]
    current_multiplier = current_state["damageMultiplier"]
    target_multiplier = target_state["damageMultiplier"]
    return {
        "currentSetPoint": current_total,
        "targetSetPoint": target_total,
        "currentSlotSetPoint": current_slot,
        "targetSlotSetPoint": target_slot,
        "currentOathStageName": current_state["stageName"],
        "targetOathStageName": target_state["stageName"],
        "currentOathStageRequiredPoint": current_state["stageRequiredPoint"],
        "targetOathStageRequiredPoint": target_state["stageRequiredPoint"],
        "currentTuneFinalDamage": current_state["blessingFinalDamage"],
        "targetTuneFinalDamage": target_state["blessingFinalDamage"],
        "currentOathSetFinalDamage": current_state["setFinalDamage"],
        "targetOathSetFinalDamage": target_state["setFinalDamage"],
        "currentTuneBuffPower": current_buff_power,
        "targetTuneBuffPower": target_buff_power,
        "skillDamageMultiplier": target_multiplier / current_multiplier if current_multiplier > 0 else 1,
        "oathSetBuffPowerDelta": target_buff_power - current_buff_power,
    }
