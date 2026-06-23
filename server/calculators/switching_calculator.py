import re

from ..effects import parse_percent_or_number


def clean_text(value) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def parse_buff_option_numbers(skill_info: dict) -> list[float]:
    values = (skill_info.get("option") or {}).get("values") or []
    parsed = []
    for value in values:
        text = clean_text(value)
        if not re.search(r"\d", text):
            continue
        parsed.append(float(parse_percent_or_number(text)))
    return parsed


def match_current_switching_coefficients(skill_info: dict, entry: dict) -> list[float]:
    numbers = parse_buff_option_numbers(skill_info)
    base_coefficients = [
        float(row.get("value") or 0)
        for row in entry.get("maxLevelDamageCoefficients") or []
        if float(row.get("value") or 0) > 0
    ]
    if not numbers or not base_coefficients:
        return []
    if len(base_coefficients) == 1:
        base = base_coefficients[0]
        return [min(numbers, key=lambda value: abs(value - base))]

    remaining = list(numbers)
    matched = []
    for base in base_coefficients:
        best_index = min(range(len(remaining)), key=lambda index: abs(remaining[index] - base))
        matched.append(remaining.pop(best_index))
        if not remaining:
            break
    return matched


def get_switching_damage_multiplier(coefficients: list[float]) -> float:
    multiplier = 1.0
    for coefficient in coefficients:
        multiplier *= 1 + float(coefficient or 0) / 100
    return multiplier


def get_applied_switching_multiplier(raw_multiplier: float, entry: dict) -> float:
    damage_application_ratio = float(entry.get("damageApplicationRatio") or 1)
    if not (0 < damage_application_ratio <= 1):
        damage_application_ratio = 1
    return 1 + (raw_multiplier - 1) * damage_application_ratio


def get_damage_application_note(entry: dict) -> str:
    return clean_text(entry.get("damageApplicationNote")).replace("중독 비율", "중독비율")


def normalize_switching_skill_name(value: str) -> str:
    return re.sub(r"\((남|여)\)", "", clean_text(value)).replace(" ", "")


def switching_skill_name_matches(text: str, buff_skill_name: str) -> bool:
    return normalize_switching_skill_name(buff_skill_name) in normalize_switching_skill_name(text)


def get_switching_fragment_coefficients(detail: dict, buff_skill_name: str, coefficient_count: int) -> list[float]:
    text = clean_text(detail.get("itemExplainDetail") or detail.get("itemExplain"))
    if buff_skill_name and not switching_skill_name_matches(text, buff_skill_name):
        return [0] * coefficient_count
    value = 0.0
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%\s*추가\s*증가", text)
    if match:
        value = float(match.group(1))
    result = [0.0] * coefficient_count
    if result:
        result[0] = value
    return result
