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


def normalize_skill_key(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"\s*스킬\s*Lv\s*\+\s*1\s*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^플래티넘\s*엠블렘\s*\[|\].*$", "", text)
    return re.sub(r"[\s:!·ㆍ\[\]\(\)]", "", text).lower()


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


def get_skill_level_stat_value(skill_detail: dict, level: int, stat_name: str) -> float:
    level_info = skill_detail.get("levelInfo") or {}
    option_desc = str(level_info.get("optionDesc") or "")
    value_keys = {
        key
        for line in option_desc.splitlines()
        if stat_name in line
        for key in re.findall(r"\{(value\d+)\}", line)
    }
    if not value_keys:
        return 0
    row = next((
        row for row in level_info.get("rows") or []
        if int(row.get("level") or 0) == int(level)
    ), {})
    option_value = row.get("optionValue") or {}
    return sum(parse_percent_or_number(option_value.get(key)) for key in value_keys)


def get_skill_level_labeled_value(skill_detail: dict, level: int, predicate) -> float:
    level_info = skill_detail.get("levelInfo") or {}
    option_desc = str(level_info.get("optionDesc") or "")
    value_keys = {
        key
        for line in option_desc.splitlines()
        if predicate(clean_text(line))
        for key in re.findall(r"\{(value\d+)\}", line)
    }
    if not value_keys:
        return 0
    row = next((
        row for row in level_info.get("rows") or []
        if int(row.get("level") or 0) == int(level)
    ), {})
    option_value = row.get("optionValue") or {}
    return sum(parse_percent_or_number(option_value.get(key)) for key in value_keys)


def get_avatar_platinum_skill_damage_multiplier(
    avatar_combo_analysis: dict,
    slot_label: str,
    target_platinum_skill: str,
) -> float:
    current_avatar = avatar_combo_analysis.get("currentAvatarSkills") or {}
    skill_infos = avatar_combo_analysis.get("skillInfos") or {}
    target_skill = clean_text(target_platinum_skill)
    target_key = normalize_skill_key(target_skill)
    if not current_avatar or not target_key or not skill_infos:
        return 0

    current_platinum_skills = [
        *(current_avatar.get("platinumSlotSkills") or current_avatar.get("platinumSkills") or []),
    ][:2]
    while len(current_platinum_skills) < 2:
        current_platinum_skills.append("")
    target_index = 0 if slot_label == "상의 아바타" else 1
    target_platinum_skills = [*current_platinum_skills]
    target_platinum_skills[target_index] = target_skill
    top_key = normalize_skill_key(current_avatar.get("topSkill"))

    def count_avatar_skill(skill_key: str, platinum_skills: list[str]) -> int:
        return (
            (1 if top_key == skill_key else 0)
            + sum(1 for skill in platinum_skills if normalize_skill_key(skill) == skill_key)
        )

    multiplier = 1.0
    changed_keys = {
        normalize_skill_key(current_platinum_skills[target_index]),
        target_key,
    }
    for skill_key in changed_keys:
        if not skill_key:
            continue
        current_count = count_avatar_skill(skill_key, current_platinum_skills)
        target_count = count_avatar_skill(skill_key, target_platinum_skills)
        level_delta = target_count - current_count
        if level_delta == 0:
            continue
        skill_info = skill_infos.get(skill_key) or {}
        current_level = int(skill_info.get("currentLevel") or 0) + current_count
        if current_level <= 0:
            if skill_key == target_key and level_delta > 0:
                return 0
            continue
        if level_delta > 0:
            ratio = get_skill_attack_ratio(skill_info.get("detail") or {}, current_level, level_delta)
            if not ratio.get("calculable"):
                return 0
            multiplier *= float(ratio.get("multiplier") or 1)
        else:
            target_level = current_level + level_delta
            ratio = get_skill_attack_ratio(skill_info.get("detail") or {}, target_level, -level_delta)
            if ratio.get("calculable"):
                multiplier /= float(ratio.get("multiplier") or 1)
            # 계산 불가 플티는 딜 상승률 0%로 보고 제거 손실도 0으로 처리한다.
    return multiplier if multiplier > 0 else 0
