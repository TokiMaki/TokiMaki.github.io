import re


SKILL_ATTACK_PATTERNS = [
    re.compile(r"스킬\s*공격력[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"스킬\s*데미지[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"크리티컬\s*(?:공격력|데미지)\s*증가율[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"피해\s*증폭률[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"속성\s*공격력\s*증가율[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"(?:물리|마법|독립)\s*공격력\s*증가율[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
]
SKILL_ATTACK_OPTION_VALUE_PATTERNS = [
    re.compile(r"스킬\s*공격력[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"스킬\s*데미지[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"크리티컬\s*(?:공격력|데미지)\s*증가율[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"피해\s*증폭률[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"속성\s*공격력\s*증가율[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"(?:물리|마법|독립)\s*공격력\s*증가율[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
]


def clean_text(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def collect_strings(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        result = []
        for item in value:
            result.extend(collect_strings(item))
        return result
    if isinstance(value, dict):
        result = []
        for item in value.values():
            result.extend(collect_strings(item))
        return result
    return []


def parse_skill_attack_percent(text: str) -> float | None:
    clean = clean_text(text)
    for pattern in SKILL_ATTACK_PATTERNS:
        match = pattern.search(clean)
        if match:
            return float(match.group(1))
    return None


def find_skill_attack_option_value_key(option_desc: str) -> str:
    clean = clean_text(option_desc)
    for pattern in SKILL_ATTACK_OPTION_VALUE_PATTERNS:
        match = pattern.search(clean)
        if match:
            return match.group(1)
    return ""


def get_level_attack_percent(skill_detail: dict, level: int) -> float | None:
    level_info = skill_detail.get("levelInfo")
    if not isinstance(level_info, dict):
        return None
    option_value_key = find_skill_attack_option_value_key(level_info.get("optionDesc") or "")
    try:
        target_level = int(level)
    except (TypeError, ValueError):
        return None

    for key in ("rows", "option", "levels"):
        rows = level_info.get(key)
        if not isinstance(rows, list):
            continue
        row_levels = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            try:
                row_levels.append(int(row.get("level") or row.get("skillLevel") or 0))
            except (TypeError, ValueError):
                continue
        if row_levels and target_level > max(row_levels):
            target_level = max(row_levels)
        for row in rows:
            if not isinstance(row, dict):
                continue
            row_level = row.get("level") or row.get("skillLevel")
            try:
                if int(row_level) != target_level:
                    continue
            except (TypeError, ValueError):
                continue
            for text in collect_strings(row):
                parsed = parse_skill_attack_percent(text)
                if parsed is not None:
                    return parsed
            if option_value_key and isinstance(row.get("optionValue"), dict):
                parsed = parse_skill_attack_percent(row.get("optionDesc") or "")
                if parsed is not None:
                    return parsed
                value = row.get("optionValue", {}).get(option_value_key)
                try:
                    return float(value)
                except (TypeError, ValueError):
                    pass

    return None


def estimate_skill_plus_one(skill_detail: dict, current_level: int) -> dict:
    current_attack = get_level_attack_percent(skill_detail, current_level)
    next_attack = get_level_attack_percent(skill_detail, current_level + 1)
    if current_attack is None or next_attack is None:
        return {
            "calculable": False,
            "reason": "스킬 상세 levelInfo에서 스킬 공격력 증가율을 찾지 못했습니다.",
        }
    return {
        "calculable": True,
        "currentSkillAttackPercent": current_attack,
        "nextSkillAttackPercent": next_attack,
        "incrementalDamagePercent": ((1 + next_attack / 100) / (1 + current_attack / 100) - 1) * 100,
    }


def get_skill_attack_ratio(skill_detail: dict, current_level: int, added_level: int) -> dict:
    current_attack = get_level_attack_percent(skill_detail, current_level)
    target_attack = get_level_attack_percent(skill_detail, current_level + added_level)
    if current_attack is None or target_attack is None:
        return {
            "calculable": False,
            "reason": "스킬 상세 levelInfo에서 누적 스킬 공격력 증가율을 찾지 못했습니다.",
        }
    multiplier = (1 + target_attack / 100) / (1 + current_attack / 100)
    return {
        "calculable": True,
        "currentSkillAttackPercent": current_attack,
        "targetSkillAttackPercent": target_attack,
        "addedLevel": added_level,
        "multiplier": multiplier,
        "incrementalDamagePercent": (multiplier - 1) * 100,
    }
