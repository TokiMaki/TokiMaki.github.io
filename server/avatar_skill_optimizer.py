import re
from urllib.parse import quote

from .data_store import load_avatar_option_db
from .neople_client import API_KEY, clean_text, request_json, search_character
from .calculators.avatar_skill_calculator import (
    estimate_skill_plus_one,
    find_skill_attack_option_value_key,
    get_level_attack_percent,
    get_skill_attack_ratio,
    normalize_skill_key,
    parse_skill_attack_percent,
)
from .repositories.item_repository import fetch_item_details


def normalize_job_name(value: str) -> str:
    text = clean_text(value)
    return re.sub(r"^(眞|진|真)\s*", "", text).strip()


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


def add_current_setup_skill_bonuses(result: dict, reinforce_skill: list, job_name: str, style_rows: list[dict]) -> None:
    for job in reinforce_skill or []:
        if clean_text(job.get("jobName")) not in {"", "공통", job_name}:
            continue
        for skill in job.get("skills") or []:
            name = clean_text(skill.get("name"))
            if name:
                result[name] = result.get(name, 0) + int(skill.get("value") or 0)
        for level_range in job.get("levelRange") or []:
            minimum = int(level_range.get("minLevel") or 0)
            maximum = int(level_range.get("maxLevel") or 0)
            value = int(level_range.get("value") or 0)
            if not minimum or not maximum or not value:
                continue
            for skill in style_rows:
                required_level = int(skill.get("requiredLevel") or 0)
                if minimum <= required_level <= maximum:
                    name = clean_text(skill.get("name"))
                    if name:
                        result[name] = result.get(name, 0) + value


def add_current_setup_explain_skill_bonuses(result: dict, explain: str, style_rows: list[dict]) -> None:
    text = clean_text(explain)
    for match in re.finditer(r"(\d+)\s*~\s*(\d+)\s*(?:레벨|Lv)[^+\d]*스킬\s*Lv\s*\+\s*(\d+)", text, re.IGNORECASE):
        minimum = int(match.group(1))
        maximum = int(match.group(2))
        value = int(match.group(3))
        for skill in style_rows:
            required_level = int(skill.get("requiredLevel") or 0)
            if minimum <= required_level <= maximum:
                name = clean_text(skill.get("name"))
                if name:
                    result[name] = result.get(name, 0) + value
    for match in re.finditer(r"(\d+)\s*(?:레벨|Lv)[^+\d]*스킬\s*Lv\s*\+\s*(\d+)", text, re.IGNORECASE):
        required = int(match.group(1))
        value = int(match.group(2))
        for skill in style_rows:
            if int(skill.get("requiredLevel") or 0) == required:
                name = clean_text(skill.get("name"))
                if name:
                    result[name] = result.get(name, 0) + value


def get_current_non_avatar_skill_bonuses(server_id: str, character_id: str, style_rows: list[dict], job_name: str) -> dict:
    equipment_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/equipment?apikey={API_KEY}"
    avatar_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
    creature_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/creature?apikey={API_KEY}"
    equipment_rows = request_json(equipment_url).get("equipment") or []
    avatar_rows = request_json(avatar_url).get("avatar") or []
    creature = request_json(creature_url).get("creature") or {}
    aura = next((
        row for row in avatar_rows
        if "오라" in clean_text(row.get("slotName"))
        or "오라" in clean_text(row.get("itemTypeDetail"))
        or "오라" in clean_text(row.get("itemName"))
    ), {})
    artifact_rows = creature.get("artifact") or []
    setup_rows = [
        *equipment_rows,
        creature,
        aura,
        *artifact_rows,
    ]
    detail_by_id = {
        detail.get("itemId"): detail
        for detail in fetch_item_details([clean_text(row.get("itemId")) for row in setup_rows])
    }
    result = {}
    for row in setup_rows:
        detail = detail_by_id.get(clean_text(row.get("itemId"))) or {}
        add_current_setup_skill_bonuses(result, detail.get("itemReinforceSkill") or [], job_name, style_rows)
        add_current_setup_skill_bonuses(result, (row.get("enchant") or {}).get("reinforceSkill") or [], job_name, style_rows)
        add_current_setup_skill_bonuses(result, (detail.get("itemBuff") or {}).get("reinforceSkill") or [], job_name, style_rows)
    return result


def find_avatar_option_entry(payload: dict) -> dict:
    db = load_avatar_option_db()
    job_grow_name = normalize_job_name(payload.get("jobGrowName"))
    job_name = clean_text(payload.get("jobName"))
    matched = [
        entry for entry in db.get("entries") or []
        if clean_text(entry.get("guideName")) == job_grow_name
    ]
    if len(matched) > 1 and job_name:
        matched_by_group = [
            entry for entry in matched
            if clean_text(entry.get("classGroup")) == job_name
        ]
        if matched_by_group:
            matched = matched_by_group
    return matched[0] if matched else {}


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


def get_avatar_top_candidates(option_db: dict, current_avatar: dict) -> list[str]:
    return dedupe_skill_names([
        *(option_db.get("topOptions") or []),
        current_avatar.get("topSkill"),
        *[
            combo.get("topSkill")
            for combo in get_avatar_candidate_combos(option_db, current_avatar)
            if combo.get("topSkill")
        ],
    ])


def get_avatar_platinum_candidates(option_db: dict, current_avatar: dict) -> list[str]:
    return dedupe_skill_names([
        *(option_db.get("platinumCandidates") or []),
        *(option_db.get("platinumEmblems") or []),
        *(current_avatar.get("platinumSkills") or []),
        *[
            skill
            for combo in get_avatar_candidate_combos(option_db, current_avatar)
            for skill in combo.get("platinumSkills") or []
        ],
    ])


def build_avatar_combo_candidates(option_db: dict, current_avatar: dict) -> list[dict]:
    top_candidates = get_avatar_top_candidates(option_db, current_avatar)
    platinum_candidates = get_avatar_platinum_candidates(option_db, current_avatar)
    combos = []
    for top_skill in top_candidates:
        for platinum_a in platinum_candidates:
            for platinum_b in platinum_candidates:
                combos.append({
                    "topSkill": top_skill,
                    "platinumSkills": [platinum_a, platinum_b],
                })

    seen = set()
    result = []
    for combo in combos:
        key = (
            normalize_skill_key(combo.get("topSkill")),
            tuple(normalize_skill_key(skill) for skill in combo.get("platinumSkills") or []),
        )
        if not key[0] or len(key[1]) < 2 or key in seen:
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


def count_slot_changes(combo: dict, current: dict) -> int:
    current_plats = [
        normalize_skill_key(name)
        for name in (current.get("platinumSlotSkills") or current.get("platinumSkills") or [])
    ]
    target_plats = [normalize_skill_key(name) for name in combo.get("platinumSkills") or []]
    return sum(
        1
        for index, target in enumerate(target_plats)
        if index >= len(current_plats) or current_plats[index] != target
    )


def evaluate_avatar_combo(combo: dict, current: dict, skill_infos: dict, include_price: bool = True) -> dict:
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

    platinum_price_sum = (
        sum((find_platinum_item_price(name) or 10**18) for name in combo.get("platinumSkills") or [])
        if include_price
        else None
    )
    return {
        **combo,
        "calculable": True,
        "multiplier": multiplier,
        "incrementalDamagePercent": (multiplier - 1) * 100,
        "changeCount": count_changes(combo, current),
        "slotChangeCount": count_slot_changes(combo, current),
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


def get_character_avatar_skill_infos(
    server_id: str,
    character_id: str,
    detail: dict,
    skill_names: list[str],
    skill_level_overrides: dict | None = None,
) -> tuple[list[dict], dict]:
    normalized_level_overrides = normalize_skill_level_overrides(skill_level_overrides)
    job_id = clean_text(detail.get("jobId"))
    job_grow_id = clean_text(detail.get("jobGrowId"))
    if not job_id or not job_grow_id:
        detail_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}?apikey={API_KEY}"
        detail = request_json(detail_url)
        job_id = clean_text(detail.get("jobId"))
        job_grow_id = clean_text(detail.get("jobGrowId"))

    style_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/skill/style?apikey={API_KEY}"
    style = request_json(style_url)
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
    current_setup_bonuses = get_current_non_avatar_skill_bonuses(
        server_id,
        character_id,
        style_rows,
        clean_text(detail.get("jobName")),
    )
    current_setup_bonuses_by_key = {
        normalize_skill_key(name): value
        for name, value in current_setup_bonuses.items()
    }

    analyzed = []
    skill_infos = {}
    for skill_name in dedupe_skill_names(skill_names):
        key = normalize_skill_key(skill_name)
        skill_row = skill_by_name.get(key) or style_by_name.get(key) or {}
        style_row = style_by_name.get(key) or {}
        skill_id = clean_text(skill_row.get("skillId") or style_row.get("skillId"))
        api_current_level = int(style_row.get("level") or style_row.get("skillLevel") or 0)
        setup_bonus_level = int(current_setup_bonuses_by_key.get(key) or 0)
        current_level = normalized_level_overrides.get(key) or api_current_level + setup_bonus_level
        result = {
            "skillName": skill_name,
            "skillId": skill_id,
            "apiBaseLevel": api_current_level,
            "currentSetupBonusLevel": setup_bonus_level,
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

    return analyzed, skill_infos


def select_best_avatar_combo_for_character(
    server_id: str,
    character_id: str,
    detail: dict,
    avatar_payload: dict,
    option_db: dict,
    skill_level_overrides: dict | None = None,
    prefer_current_top: bool = False,
) -> dict:
    current_avatar = extract_current_avatar_skills(avatar_payload)
    combo_candidates = build_avatar_combo_candidates(option_db, current_avatar)
    if not combo_candidates:
        return {}

    skill_names = [
        skill_name
        for combo in combo_candidates
        for skill_name in [combo.get("topSkill"), *(combo.get("platinumSkills") or [])]
        if skill_name
    ]
    analyzed, skill_infos = get_character_avatar_skill_infos(
        server_id,
        character_id,
        detail,
        skill_names,
        skill_level_overrides,
    )
    combo_results = [
        evaluate_avatar_combo(combo, current_avatar, skill_infos, include_price=False)
        for combo in combo_candidates
    ]
    combo_results.sort(key=lambda row: (
        not row.get("calculable"),
        -(row.get("incrementalDamagePercent") or -10**18),
        row.get("changeCount", 10**9),
        row.get("slotChangeCount", 10**9),
        clean_text(row.get("topSkill")),
        ",".join(row.get("platinumSkills") or []),
    ))
    selection_scope = "allCandidates"
    selection_pool = combo_results
    current_top_key = normalize_skill_key(current_avatar.get("topSkill"))
    if prefer_current_top and current_top_key:
        current_top_results = [
            row for row in combo_results
            if row.get("calculable") and normalize_skill_key(row.get("topSkill")) == current_top_key
        ]
        if current_top_results:
            selection_scope = "currentTopOption"
            selection_pool = current_top_results
    strongest_recommended_combos = select_strongest_combos(selection_pool)
    recommended_combo = strongest_recommended_combos[0] if strongest_recommended_combos else (combo_results[0] if combo_results else None)
    return {
        "currentAvatarSkills": current_avatar,
        "selectionScope": selection_scope,
        "skillInfos": skill_infos,
        "candidates": analyzed,
        "comboCandidates": combo_candidates,
        "comboResults": combo_results[:20],
        "recommendedCombos": strongest_recommended_combos,
        "recommendedCombo": recommended_combo,
    }


def load_character_avatar_skill_efficiency(
    server_id: str,
    character_id: str = "",
    character_name: str = "",
    skill_level_overrides: dict | None = None,
) -> dict:
    resolved = {}
    if not character_id:
        resolved = search_character(server_id, character_name)
        character_id = resolved["character_id"]

    detail_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}?apikey={API_KEY}"
    detail = request_json(detail_url)
    job_id = clean_text(detail.get("jobId"))
    job_grow_id = clean_text(detail.get("jobGrowId"))

    avatar_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
    avatar = request_json(avatar_url)

    avatar_payload = {
        "jobName": detail.get("jobName"),
        "jobGrowName": detail.get("jobGrowName"),
    }
    option_entry = find_avatar_option_entry(avatar_payload)
    option_db = option_entry.get("avatar") or {}
    current_avatar = extract_current_avatar_skills(avatar)
    top_candidates = get_avatar_top_candidates(option_db, current_avatar)
    platinum_candidates = get_avatar_platinum_candidates(option_db, current_avatar)
    candidates = (
        [{"kind": "topOption", "skillName": skill_name} for skill_name in top_candidates]
        + [{"kind": "platinumEmblem", "skillName": skill_name} for skill_name in platinum_candidates]
    )
    candidate_combos = get_avatar_candidate_combos(option_db, current_avatar)
    for combo in candidate_combos:
        for skill_name in [combo.get("topSkill"), *(combo.get("platinumSkills") or [])]:
            if skill_name and not any(normalize_skill_key(row["skillName"]) == normalize_skill_key(skill_name) for row in candidates):
                candidates.append({"kind": "comboCandidate", "skillName": skill_name})

    analyzed, skill_infos = get_character_avatar_skill_infos(
        server_id,
        character_id,
        detail,
        [candidate["skillName"] for candidate in candidates],
        skill_level_overrides,
    )

    combo_results = [
        evaluate_avatar_combo(combo, current_avatar, skill_infos)
        for combo in build_avatar_combo_candidates(option_db, current_avatar)
    ]
    current_combo = build_current_avatar_combo(current_avatar)
    current_combo_result = evaluate_avatar_combo(current_combo, current_avatar, skill_infos) if current_combo else None
    combo_results.sort(key=lambda row: (
        not row.get("calculable"),
        -(row.get("incrementalDamagePercent") or -10**18),
        row.get("changeCount", 10**9),
        row.get("slotChangeCount", 10**9),
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
        "sourcePolicy": "DB의 avatar.candidateCombos에 등장한 상의/플래티넘 스킬 후보로 상의 후보 x 플래티넘 후보 x 플래티넘 후보 전체 조합을 만들고, 네오플 스킬 상세 API의 현재 레벨 -> 현재+n 누적 배율로 가장 강한 조합을 고릅니다.",
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
