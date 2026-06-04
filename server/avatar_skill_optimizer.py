import re
from urllib.parse import quote

from .data_store import load_avatar_option_db
from .neople_client import API_KEY, clean_text, request_json, search_character


SKILL_ATTACK_PATTERNS = [
    re.compile(r"스킬\s*공격력[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
    re.compile(r"스킬\s*데미지[^0-9+\-]*(\d+(?:\.\d+)?)\s*%"),
]
SKILL_ATTACK_OPTION_VALUE_PATTERNS = [
    re.compile(r"스킬\s*공격력[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
    re.compile(r"스킬\s*데미지[^{}]*\{(value\d+)\}\s*%", re.IGNORECASE),
]


def normalize_skill_key(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"\s*스킬\s*Lv\s*\+\s*1\s*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^플래티넘\s*엠블렘\s*\[|\].*$", "", text)
    return re.sub(r"[\s:!·ㆍ\[\]\(\)]", "", text).lower()


def flatten_skill_rows(payload: dict) -> list[dict]:
    rows = []
    containers = []
    if isinstance(payload, dict):
        containers.append(payload)
    skill = payload.get("skill") if isinstance(payload.get("skill"), dict) else None
    if isinstance(skill, dict):
        containers.append(skill)
        for nested in ("style", "buff"):
            nested_value = skill.get(nested)
            if isinstance(nested_value, dict):
                containers.append(nested_value)

    for container in containers:
        for key in ("active", "passive", "evolution", "enhancement"):
            value = container.get(key) if isinstance(container, dict) else None
            if isinstance(value, list):
                for row in value:
                    if isinstance(row, dict):
                        rows.append({**row, "_skillType": key})
    for key in ("rows", "skills"):
        value = payload.get(key)
        if isinstance(value, list):
            for row in value:
                if isinstance(row, dict):
                    rows.append(row)
    return rows


def find_avatar_option_entry(payload: dict) -> dict:
    db = load_avatar_option_db()
    job_grow_name = clean_text(payload.get("jobGrowName"))
    job_name = clean_text(payload.get("jobName"))
    for entry in db.get("entries") or []:
        if clean_text(entry.get("guideName")) in {job_grow_name, job_name}:
            return entry
    return {}


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

    for key in ("rows", "option", "levels"):
        rows = level_info.get(key)
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            row_level = row.get("level") or row.get("skillLevel")
            try:
                if int(row_level) != int(level):
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


def dedupe_skill_names(values: list[str]) -> list[str]:
    result = []
    seen = set()
    for value in values:
        name = clean_text(value)
        key = normalize_skill_key(name)
        if not name or not key or key in seen:
            continue
        seen.add(key)
        result.append(name)
    return result


def get_avatar_candidate_combos(option_db: dict, current_avatar: dict) -> list[dict]:
    combos = []
    for index, row in enumerate(option_db.get("candidateCombos") or []):
        if not isinstance(row, dict):
            continue
        top_skill = clean_text(row.get("topOption") or row.get("topSkill"))
        platinum_skills = dedupe_skill_names(row.get("platinumEmblems") or row.get("platinumSkills") or [])
        if top_skill and len(platinum_skills) == 1:
            platinum_skills = [platinum_skills[0], platinum_skills[0]]
        if not top_skill or len(platinum_skills) < 2:
            continue
        combos.append({
            "topSkill": top_skill,
            "platinumSkills": platinum_skills[:2],
            "adoptionRate": row.get("adoptionRate"),
            "sourceRank": row.get("rank") or index + 1,
        })

    seen = set()
    result = []
    for combo in combos:
        key = (
            normalize_skill_key(combo.get("topSkill")),
            tuple(normalize_skill_key(skill) for skill in combo.get("platinumSkills") or []),
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(combo)
    return result


def build_current_avatar_combo(current_avatar: dict) -> dict:
    current_top = current_avatar.get("topSkill")
    current_plats = current_avatar.get("platinumSlotSkills") or current_avatar.get("platinumSkills") or []
    current_plats = [skill for skill in current_plats if clean_text(skill)]
    if len(current_plats) == 1:
        current_plats = [current_plats[0], current_plats[0]]
    if not current_top or len(current_plats) < 2:
        return {}
    return {
        "topSkill": current_top,
        "platinumSkills": current_plats[:2],
        "sourceRank": "current",
        "isCurrentCombo": True,
    }


def parse_top_skill_name(value: str) -> str:
    return re.sub(r"\s*스킬\s*Lv\s*\+\s*1\s*$", "", clean_text(value), flags=re.IGNORECASE)


def extract_current_avatar_skills(avatar_payload: dict) -> dict:
    avatar_rows = avatar_payload.get("avatar") or []
    jacket = next((row for row in avatar_rows if clean_text(row.get("slotId")) == "JACKET"), {}) or {}
    pants = next((row for row in avatar_rows if clean_text(row.get("slotId")) == "PANTS"), {}) or {}
    platinum_skills = []
    for row in (jacket, pants):
        for emblem in row.get("emblems") or []:
            item_name = clean_text(emblem.get("itemName"))
            if "플래티넘" not in clean_text(emblem.get("slotColor")) and "플래티넘" not in item_name:
                continue
            match = re.search(r"\[([^\]]+)\]", item_name)
            if match:
                platinum_skills.append(match.group(1).strip())
    return {
        "topSkill": parse_top_skill_name(jacket.get("optionAbility")),
        "platinumSkills": dedupe_skill_names(platinum_skills),
        "platinumSlotSkills": platinum_skills,
    }


def find_platinum_item_price(skill_name: str) -> int | None:
    # 가격은 동률 정렬용이다. 못 찾으면 비싼 것으로 취급한다.
    from .character_equipment_service import choose_avatar_platinum_price_item

    try:
        item = choose_avatar_platinum_price_item(skill_name)
    except Exception:
        return None
    auction = item.get("auction") or {}
    price = auction.get("minUnitPrice")
    return price if isinstance(price, (int, float)) and price > 0 else None


def count_changes(combo: dict, current: dict) -> int:
    changes = 0
    if normalize_skill_key(combo.get("topSkill")) != normalize_skill_key(current.get("topSkill")):
        changes += 1
    current_plats = [
        normalize_skill_key(name)
        for name in (current.get("platinumSlotSkills") or current.get("platinumSkills") or [])
    ]
    target_plats = [normalize_skill_key(name) for name in combo.get("platinumSkills") or []]
    used = [False] * len(current_plats)
    for target in target_plats:
        matched = False
        for index, current_key in enumerate(current_plats):
            if not used[index] and current_key == target:
                used[index] = True
                matched = True
                break
        if not matched:
            changes += 1
    return changes


def evaluate_avatar_combo(combo: dict, current: dict, skill_infos: dict) -> dict:
    added_by_skill = {}
    for skill_name in [combo.get("topSkill"), *(combo.get("platinumSkills") or [])]:
        key = normalize_skill_key(skill_name)
        if key:
            added_by_skill[key] = added_by_skill.get(key, 0) + 1

    multiplier = 1
    skill_results = []
    for key, added_level in added_by_skill.items():
        info = skill_infos.get(key) or {}
        ratio = get_skill_attack_ratio(info.get("detail") or {}, info.get("currentLevel") or 0, added_level)
        skill_results.append({
            "skillName": info.get("skillName") or key,
            **ratio,
        })
        if not ratio.get("calculable"):
            return {
                **combo,
                "calculable": False,
                "reason": ratio.get("reason"),
                "skillResults": skill_results,
            }
        multiplier *= ratio["multiplier"]

    platinum_price_sum = sum((find_platinum_item_price(name) or 10**18) for name in combo.get("platinumSkills") or [])
    return {
        **combo,
        "calculable": True,
        "multiplier": multiplier,
        "incrementalDamagePercent": (multiplier - 1) * 100,
        "changeCount": count_changes(combo, current),
        "platinumPriceSum": platinum_price_sum,
        "skillResults": skill_results,
    }


def select_strongest_combos(combo_results: list[dict], tolerance: float = 0.0001) -> list[dict]:
    calculable = [row for row in combo_results if row.get("calculable")]
    if not calculable:
        return []
    best_percent = max(row.get("incrementalDamagePercent") or 0 for row in calculable)
    return [
        row for row in calculable
        if abs((row.get("incrementalDamagePercent") or 0) - best_percent) <= tolerance
    ]


def compare_recommended_to_current(recommended: dict, current: dict) -> dict:
    if not recommended or not current:
        return {
            "calculable": False,
            "reason": "추천 조합 또는 현재 조합을 계산하지 못했습니다.",
        }
    if not recommended.get("calculable") or not current.get("calculable"):
        return {
            "calculable": False,
            "reason": "추천 조합 또는 현재 조합의 스킬 효율을 계산하지 못했습니다.",
        }
    current_multiplier = current.get("multiplier") or 0
    recommended_multiplier = recommended.get("multiplier") or 0
    if current_multiplier <= 0 or recommended_multiplier <= 0:
        return {
            "calculable": False,
            "reason": "조합 배율이 올바르지 않습니다.",
        }
    percent = (recommended_multiplier / current_multiplier - 1) * 100
    return {
        "calculable": True,
        "recommendedVsCurrentPercent": percent,
        "isUpgrade": percent > 0.0001,
    }


def normalize_skill_level_overrides(skill_level_overrides: dict | None) -> dict:
    result = {}
    for name, level in (skill_level_overrides or {}).items():
        key = normalize_skill_key(name)
        try:
            parsed_level = int(level)
        except (TypeError, ValueError):
            continue
        if key and parsed_level > 0:
            result[key] = parsed_level
    return result


def load_character_avatar_skill_efficiency(
    server_id: str,
    character_id: str = "",
    character_name: str = "",
    skill_level_overrides: dict | None = None,
) -> dict:
    normalized_level_overrides = normalize_skill_level_overrides(skill_level_overrides)
    resolved = {}
    if not character_id:
        resolved = search_character(server_id, character_name)
        character_id = resolved["character_id"]

    detail_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}?apikey={API_KEY}"
    detail = request_json(detail_url)
    job_id = clean_text(detail.get("jobId"))
    job_grow_id = clean_text(detail.get("jobGrowId"))

    style_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/skill/style?apikey={API_KEY}"
    style = request_json(style_url)
    avatar_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
    avatar = request_json(avatar_url)
    style_rows = flatten_skill_rows(style)
    style_by_name = {
        normalize_skill_key(row.get("name")): row
        for row in style_rows
        if clean_text(row.get("name"))
    }

    skill_list_url = (
        f"https://api.neople.co.kr/df/skills/{job_id}"
        f"?jobGrowId={quote(job_grow_id)}&apikey={API_KEY}"
    )
    skill_list = request_json(skill_list_url)
    skill_rows = flatten_skill_rows(skill_list)
    skill_by_name = {
        normalize_skill_key(row.get("name")): row
        for row in skill_rows
        if clean_text(row.get("name"))
    }

    avatar_payload = {
        "jobName": detail.get("jobName"),
        "jobGrowName": detail.get("jobGrowName"),
    }
    option_entry = find_avatar_option_entry(avatar_payload)
    option_db = option_entry.get("avatar") or {}
    current_avatar = extract_current_avatar_skills(avatar)
    top_candidates = dedupe_skill_names([
        clean_text((option_db.get("topOptions") or [""])[0]),
        current_avatar.get("topSkill"),
    ])
    platinum_candidates = dedupe_skill_names([
        clean_text((option_db.get("platinumEmblems") or [""])[0]),
        *current_avatar.get("platinumSkills", []),
    ])
    candidates = (
        [{"kind": "topOption", "skillName": skill_name} for skill_name in top_candidates]
        + [{"kind": "platinumEmblem", "skillName": skill_name} for skill_name in platinum_candidates]
    )
    candidate_combos = get_avatar_candidate_combos(option_db, current_avatar)
    for combo in candidate_combos:
        for skill_name in [combo.get("topSkill"), *(combo.get("platinumSkills") or [])]:
            if skill_name and not any(normalize_skill_key(row["skillName"]) == normalize_skill_key(skill_name) for row in candidates):
                candidates.append({"kind": "comboCandidate", "skillName": skill_name})

    analyzed = []
    skill_infos = {}
    for candidate in candidates:
        skill_name = candidate["skillName"]
        key = normalize_skill_key(skill_name)
        skill_row = skill_by_name.get(key) or style_by_name.get(key) or {}
        style_row = style_by_name.get(key) or {}
        skill_id = clean_text(skill_row.get("skillId") or style_row.get("skillId"))
        api_current_level = int(style_row.get("level") or style_row.get("skillLevel") or 0)
        current_level = normalized_level_overrides.get(key) or api_current_level
        result = {
            **candidate,
            "skillId": skill_id,
            "apiBaseLevel": api_current_level,
            "currentBaseLevel": current_level,
            "levelOverridden": current_level != api_current_level,
            "note": "skill/style은 아이템 및 장비 스킬 강화 제외 기준입니다.",
        }
        if skill_id and current_level:
            skill_detail_url = f"https://api.neople.co.kr/df/skills/{job_id}/{skill_id}?apikey={API_KEY}"
            skill_detail = request_json(skill_detail_url)
            skill_infos[key] = {
                "skillName": skill_name,
                "skillId": skill_id,
                "currentLevel": current_level,
                "detail": skill_detail,
            }
            result.update(estimate_skill_plus_one(skill_detail, current_level))
        else:
            result.update({
                "calculable": False,
                "reason": "캐릭터 스킬 스타일 또는 직업 스킬 목록에서 스킬을 찾지 못했습니다.",
            })
        analyzed.append(result)

    combo_results = []
    if candidate_combos:
        for combo in candidate_combos:
            combo_results.append(evaluate_avatar_combo(combo, current_avatar, skill_infos))
    else:
        for top_skill in top_candidates:
            for platinum_a in platinum_candidates:
                for platinum_b in platinum_candidates:
                    combo_results.append(evaluate_avatar_combo(
                        {
                            "topSkill": top_skill,
                            "platinumSkills": [platinum_a, platinum_b],
                        },
                        current_avatar,
                        skill_infos,
                    ))
    current_combo = build_current_avatar_combo(current_avatar)
    current_combo_result = evaluate_avatar_combo(current_combo, current_avatar, skill_infos) if current_combo else None
    combo_results.sort(key=lambda row: (
        not row.get("calculable"),
        -(row.get("incrementalDamagePercent") or -10**18),
        row.get("changeCount", 10**9),
        row.get("platinumPriceSum", 10**18),
        clean_text(row.get("topSkill")),
        ",".join(row.get("platinumSkills") or []),
    ))
    strongest_recommended_combos = select_strongest_combos(combo_results)
    recommended_combo = strongest_recommended_combos[0] if strongest_recommended_combos else (combo_results[0] if combo_results else None)
    recommended_vs_current = compare_recommended_to_current(recommended_combo, current_combo_result)

    return {
        "serverId": server_id,
        "characterId": character_id,
        "characterName": clean_text(detail.get("characterName") or resolved.get("character_name")),
        "jobId": job_id,
        "jobGrowId": job_grow_id,
        "jobName": clean_text(detail.get("jobName")),
        "jobGrowName": clean_text(detail.get("jobGrowName")),
        "sourcePolicy": "1차 진단: DB의 avatar.candidateCombos 후보끼리 먼저 딜 효율을 비교해 가장 강한 추천 후보만 남깁니다. 동률이면 여러 후보를 유지하고, 이후 현재 착용 조합과 추천 조합을 비교합니다. 같은 스킬 중복은 현재 -> 현재+n 누적 배율로 계산합니다.",
        "skillLevelOverrides": skill_level_overrides or {},
        "currentAvatarSkills": current_avatar,
        "candidates": analyzed,
        "topCandidates": top_candidates,
        "platinumCandidates": platinum_candidates,
        "candidateCombos": candidate_combos,
        "currentCombo": current_combo_result,
        "recommendedCombos": strongest_recommended_combos,
        "recommendedCombo": recommended_combo,
        "recommendedVsCurrent": recommended_vs_current,
        "bestCombo": recommended_combo,
        "comboResults": combo_results[:20],
    }
