from .neople_client import clean_text

EFFECT_ORDER = ["finalDamage", "attackIncrease", "attackAmplification", "buffPower", "buffAmplification", "attack", "elementAll", "allStat", "str", "int", "critical"]


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
        elif name == "버프력":
            effects["buffPower"] = max(effects.get("buffPower", 0), value)
        elif name == "버프력 증폭":
            effects["buffAmplification"] = max(effects.get("buffAmplification", 0), value)
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


def get_title_enchant_status_summary(status_rows: list) -> dict:
    effects = normalize_enchant_status(status_rows)
    element = ""
    element_names = {
        "화속성 강화": "fire",
        "화속성강화": "fire",
        "수속성 강화": "water",
        "수속성강화": "water",
        "명속성 강화": "light",
        "명속성강화": "light",
        "암속성 강화": "dark",
        "암속성강화": "dark",
    }
    for status in status_rows or []:
        name = clean_text(status.get("name"))
        value = parse_percent_or_number(status.get("value"))
        if not name or not value:
            continue
        if name in element_names:
            element = element_names[name]
        elif name in {"모든 속성 강화", "모속성 강화"}:
            element = "all"
    return {
        "effects": effects,
        "element": element,
    }


def get_creature_artifact_status_summary(status_rows: list) -> dict:
    effects = normalize_enchant_status(status_rows)
    all_element = 0
    single_element = 0
    element = ""
    element_names = {
        "화속성 강화": "fire",
        "화속성강화": "fire",
        "수속성 강화": "water",
        "수속성강화": "water",
        "명속성 강화": "light",
        "명속성강화": "light",
        "암속성 강화": "dark",
        "암속성강화": "dark",
    }
    attack_element_names = {
        "화": "fire",
        "수": "water",
        "명": "light",
        "암": "dark",
    }
    for status in status_rows or []:
        name = clean_text(status.get("name"))
        raw_value = clean_text(status.get("value"))
        if name == "공격속성" and raw_value in attack_element_names:
            element = attack_element_names[raw_value]
            continue
        value = parse_percent_or_number(status.get("value"))
        if not name or not value:
            continue
        if name in {"모든 속성 강화", "모속성 강화"}:
            all_element = max(all_element, value)
        elif name in element_names:
            single_element = max(single_element, value)
            element = element_names[name]
    if all_element or single_element:
        effects["elementAll"] = all_element + single_element
    return {
        "effects": order_effects(effects),
        "element": element or ("all" if all_element else ""),
        "artifactAllElement": all_element,
        "artifactSingleElement": single_element,
    }


def subtract_effects(next_effects: dict, current_effects: dict) -> dict:
    result = {}
    for key in set((next_effects or {}).keys()) | set((current_effects or {}).keys()):
        value = float((next_effects or {}).get(key) or 0) - float((current_effects or {}).get(key) or 0)
        if abs(value) > 0.000001:
            result[key] = value
    return order_effects(result)
