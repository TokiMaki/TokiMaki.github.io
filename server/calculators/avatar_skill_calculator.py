import re


SKILL_ATTACK_PATTERNS = [
    re.compile(r"스킬\s*공격력\s*증가율[^0-9+\-\r\n]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"스킬\s*데미지\s*증가율[^0-9+\-\r\n]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"크리티컬\s*(?:공격력|데미지)\s*증가율[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"피해\s*증폭률[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"속성\s*공격력\s*증가율[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"(?:물리|마법|독립)\s*공격력\s*증가율[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
]
SKILL_ATTACK_OPTION_VALUE_PATTERNS = [
    re.compile(r"스킬\s*공격력\s*증가율[^{}\r\n]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"스킬\s*데미지\s*증가율[^{}\r\n]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"크리티컬\s*(?:공격력|데미지)\s*증가율[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"피해\s*증폭률[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"속성\s*공격력\s*증가율[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"(?:물리|마법|독립)\s*공격력\s*증가율[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
]
SKILL_EFFECT_MODES = {
    "increase",
    "multiply",
    "ratio",
    "statAmplification",
    "recognizedCoefficient",
    "unsupported",
}
REGION_STAT_FLAT_A = 168350
REGION_STAT_FLAT_B = 297900
REGION_STAT_SCALE = 3.08
REGION_STAT_OFFSET = 2886


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


def normalize_skill_effect_spec(effect_spec: dict | None) -> dict:
    if not isinstance(effect_spec, dict):
        return {}
    mode = clean_text(effect_spec.get("mode"))
    if mode not in SKILL_EFFECT_MODES:
        return {}
    value_keys = [
        clean_text(value_key)
        for value_key in effect_spec.get("valueKeys") or []
        if re.fullmatch(r"value\d+", clean_text(value_key), flags=re.IGNORECASE)
    ]
    return {
        "mode": mode,
        "valueKeys": list(dict.fromkeys(value_keys)),
    }


def get_skill_effect_spec(
    skill_detail: dict,
    effect_spec: dict | None = None,
) -> tuple[str, tuple[str, ...]]:
    explicit_spec = normalize_skill_effect_spec(effect_spec)
    if explicit_spec:
        return explicit_spec["mode"], tuple(explicit_spec["valueKeys"])
    option_value_key = find_skill_attack_option_value_key(
        (skill_detail.get("levelInfo") or {}).get("optionDesc") or "",
    )
    return "increase", (option_value_key,) if option_value_key else ()


def get_level_effect_values(
    skill_detail: dict,
    level: int,
    value_keys: tuple[str, ...],
    allow_description_fallback: bool = False,
) -> list[float] | None:
    level_info = skill_detail.get("levelInfo")
    if not isinstance(level_info, dict):
        return None
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
            if allow_description_fallback:
                for text in collect_strings(row):
                    parsed = parse_skill_attack_percent(text)
                    if parsed is not None:
                        return [parsed]
            option_value = row.get("optionValue")
            if value_keys and isinstance(option_value, dict):
                values = []
                for value_key in value_keys:
                    value = option_value.get(value_key)
                    try:
                        values.append(float(value))
                    except (TypeError, ValueError):
                        values = []
                        break
                if values:
                    return values
    return None


def get_level_attack_percent(
    skill_detail: dict,
    level: int,
    effect_spec: dict | None = None,
) -> float | None:
    normalized_spec = normalize_skill_effect_spec(effect_spec)
    effect_mode, value_keys = get_skill_effect_spec(skill_detail, effect_spec)
    if effect_mode in {"recognizedCoefficient", "unsupported"}:
        return None
    values = get_level_effect_values(
        skill_detail,
        level,
        value_keys,
        allow_description_fallback=not normalized_spec,
    )
    if not values:
        return None
    if effect_mode == "multiply":
        multiplier = 1.0
        for value in values:
            multiplier *= 1 + value / 100
        return (multiplier - 1) * 100
    return values[0]


def get_post_amplified_effective_stat(
    stat: float,
    base_stat: float,
    post_multiplier: float,
) -> float:
    effective_stat = (
        stat
        + REGION_STAT_FLAT_A
        + REGION_STAT_FLAT_B
        + int(REGION_STAT_SCALE * (stat - base_stat) + REGION_STAT_OFFSET)
    )
    return effective_stat * post_multiplier


def resolve_recognized_coefficient(level: int | float) -> float:
    try:
        recognized_level = max(0, float(level))
    except (TypeError, ValueError):
        recognized_level = 0
    return 1.20 + recognized_level * 0.02


def resolve_skill_effect_multiplier(
    skill_detail: dict,
    current_level: int,
    target_level: int,
    effect_context: dict | None = None,
    effect_spec: dict | None = None,
) -> dict:
    effect_mode, value_keys = get_skill_effect_spec(skill_detail, effect_spec)
    if effect_mode == "unsupported":
        return {
            "calculable": False,
            "reason": "아바타 옵션 DB에 계산 가능한 스킬 효과가 등록되지 않았습니다.",
        }
    if effect_mode == "recognizedCoefficient":
        context = effect_context or {}
        current_recognized_level = float(
            context.get("currentRecognizedLevel")
            or context.get("recognizedBaseLevel")
            or 0
        )
        level_delta = int(target_level) - int(current_level)
        target_recognized_level = max(0, current_recognized_level + level_delta)
        multiplier = (
            resolve_recognized_coefficient(target_recognized_level)
            / resolve_recognized_coefficient(current_recognized_level)
        )
        return {
            "calculable": True,
            "currentRecognizedLevel": current_recognized_level,
            "targetRecognizedLevel": target_recognized_level,
            "effectMode": effect_mode,
            "multiplier": multiplier,
            "incrementalDamagePercent": (multiplier - 1) * 100,
        }

    normalized_spec = normalize_skill_effect_spec(effect_spec)
    current_values = get_level_effect_values(
        skill_detail,
        current_level,
        value_keys,
        allow_description_fallback=not normalized_spec,
    )
    target_values = get_level_effect_values(
        skill_detail,
        target_level,
        value_keys,
        allow_description_fallback=not normalized_spec,
    )
    if not current_values or not target_values:
        return {
            "calculable": False,
            "reason": "스킬 상세 levelInfo에서 공격 배율을 찾지 못했습니다.",
        }

    if effect_mode == "multiply":
        current_multiplier = 1.0
        target_multiplier = 1.0
        for value in current_values:
            current_multiplier *= 1 + value / 100
        for value in target_values:
            target_multiplier *= 1 + value / 100
        multiplier = target_multiplier / current_multiplier
        current_attack = (current_multiplier - 1) * 100
        target_attack = (target_multiplier - 1) * 100
    else:
        current_attack = current_values[0]
        target_attack = target_values[0]
        if effect_mode == "ratio":
            if current_attack <= 0 or target_attack <= 0:
                return {
                    "calculable": False,
                    "reason": "스킬 상세 levelInfo의 공격 비율이 올바르지 않습니다.",
                }
            multiplier = target_attack / current_attack
        elif effect_mode == "statAmplification":
            context = effect_context or {}
            current_final_stat = float(context.get("currentFinalStat") or 0)
            base_stat = float(context.get("baseStat") or 0)
            current_avatar_added_level = int(context.get("currentAvatarAddedLevel") or 0)
            equipped_current_level = int(
                context.get("equippedCurrentLevel")
                or current_level + current_avatar_added_level
            )
            equipped_attack = get_level_attack_percent(
                skill_detail,
                equipped_current_level,
                effect_spec,
            )
            if current_final_stat <= 0 or base_stat <= 0 or equipped_attack is None:
                return {
                    "calculable": False,
                    "reason": "힘/지능 증폭 계산에 필요한 현재 스탯 기준값이 없습니다.",
                }
            equipped_multiplier = 1 + equipped_attack / 100
            if equipped_multiplier <= 0:
                return {
                    "calculable": False,
                    "reason": "현재 힘/지능 증가율이 올바르지 않습니다.",
                }
            unamplified_stat = current_final_stat / equipped_multiplier
            current_stat = get_post_amplified_effective_stat(
                unamplified_stat,
                base_stat,
                1 + current_attack / 100,
            )
            target_stat = get_post_amplified_effective_stat(
                unamplified_stat,
                base_stat,
                1 + target_attack / 100,
            )
            if current_stat + 250 <= 0 or target_stat + 250 <= 0:
                return {
                    "calculable": False,
                    "reason": "힘/지능 증폭 결과가 올바르지 않습니다.",
                }
            multiplier = (target_stat + 250) / (current_stat + 250)
        else:
            multiplier = (1 + target_attack / 100) / (1 + current_attack / 100)
    result = {
        "calculable": True,
        "currentSkillAttackPercent": current_attack,
        "targetSkillAttackPercent": target_attack,
        "effectMode": effect_mode,
        "effectValueKeys": list(value_keys),
        "multiplier": multiplier,
        "incrementalDamagePercent": (multiplier - 1) * 100,
    }
    if effect_mode == "statAmplification":
        result.update({
            "equippedSkillAttackPercent": equipped_attack,
            "equippedStatPostMultiplier": equipped_multiplier,
        })
    return result


def estimate_skill_plus_one(
    skill_detail: dict,
    current_level: int,
    effect_context: dict | None = None,
    effect_spec: dict | None = None,
) -> dict:
    result = resolve_skill_effect_multiplier(
        skill_detail,
        current_level,
        current_level + 1,
        effect_context,
        effect_spec,
    )
    if not result.get("calculable"):
        return result
    return {
        **result,
        "nextSkillAttackPercent": result.get("targetSkillAttackPercent"),
    }


def get_skill_attack_ratio(
    skill_detail: dict,
    current_level: int,
    added_level: int,
    effect_context: dict | None = None,
    effect_spec: dict | None = None,
) -> dict:
    result = resolve_skill_effect_multiplier(
        skill_detail,
        current_level,
        current_level + added_level,
        effect_context,
        effect_spec,
    )
    if not result.get("calculable"):
        return result
    return {
        **result,
        "addedLevel": added_level,
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
    recognized_base_level = 0
    current_recognized_level = 0
    target_recognized_level = 0
    for skill_key, skill_info in skill_infos.items():
        if clean_text((skill_info.get("effectSpec") or {}).get("mode")) != "recognizedCoefficient":
            continue
        recognized_base_level = max(
            recognized_base_level,
            float((skill_info.get("effectContext") or {}).get("recognizedBaseLevel") or 0),
        )
        current_recognized_level += count_avatar_skill(skill_key, current_platinum_skills)
        target_recognized_level += count_avatar_skill(skill_key, target_platinum_skills)
    if current_recognized_level != target_recognized_level:
        multiplier *= (
            resolve_recognized_coefficient(recognized_base_level + target_recognized_level)
            / resolve_recognized_coefficient(recognized_base_level + current_recognized_level)
        )

    for skill_key in changed_keys:
        if not skill_key:
            continue
        current_count = count_avatar_skill(skill_key, current_platinum_skills)
        target_count = count_avatar_skill(skill_key, target_platinum_skills)
        level_delta = target_count - current_count
        if level_delta == 0:
            continue
        skill_info = skill_infos.get(skill_key) or {}
        if clean_text((skill_info.get("effectSpec") or {}).get("mode")) == "recognizedCoefficient":
            continue
        current_level = int(skill_info.get("currentLevel") or 0) + current_count
        if current_level <= 0:
            if skill_key == target_key and level_delta > 0:
                return 0
            continue
        if level_delta > 0:
            ratio = get_skill_attack_ratio(
                skill_info.get("detail") or {},
                current_level,
                level_delta,
                skill_info.get("effectContext"),
                skill_info.get("effectSpec"),
            )
            if not ratio.get("calculable"):
                return 0
            multiplier *= float(ratio.get("multiplier") or 1)
        else:
            target_level = current_level + level_delta
            ratio = get_skill_attack_ratio(
                skill_info.get("detail") or {},
                target_level,
                -level_delta,
                skill_info.get("effectContext"),
                skill_info.get("effectSpec"),
            )
            if ratio.get("calculable"):
                multiplier /= float(ratio.get("multiplier") or 1)
            # 계산 불가 플티는 딜 상승률 0%로 보고 제거 손실도 0으로 처리한다.
    return multiplier if multiplier > 0 else 0
