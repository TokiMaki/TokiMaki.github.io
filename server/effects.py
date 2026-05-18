from .neople_client import clean_text

EFFECT_ORDER = ["finalDamage", "attackIncrease", "attackAmplification", "attack", "elementAll", "allStat", "str", "int", "critical"]


def order_effects(effects: dict) -> dict:
    if not isinstance(effects, dict):
        return {}
    return {
        key: effects[key]
        for key in EFFECT_ORDER
        if key in effects
    }


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
