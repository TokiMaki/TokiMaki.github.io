import re
import threading
import time

from .data_store import load_avatar_option_db, load_job_base_stats, load_upgrade_expected_db
from .effects import get_creature_artifact_status_summary, get_title_enchant_status_summary, normalize_enchant_status, order_effects, parse_percent_or_number, subtract_effects
from .avatar_skill_optimizer import flatten_skill_rows
from .item_skill_option_service import get_character_skill_context, get_item_reinforce_skill_effect, get_item_reinforce_skill_matches
from .neople_client import (
    API_KEY,
    build_character_detail_url,
    clean_item_display_name,
    clean_text,
    fetch_item_details,
    get_item_explain,
    get_item_icon_url,
    get_lowest_auction_price,
    request_json,
    search_items_by_name,
)
from .upgrade_payloads import (
    build_aura_payload,
    build_title_payload,
    get_creature_platinum_skill_damage_percent,
    get_level_option_variant,
    parse_skill_damage_percent,
    parse_title_level_tag,
)


AVATAR_PLATINUM_FINAL_DAMAGE_PERCENT = 1.62
AVATAR_BRILLIANT_RED_STAT = 25
AVATAR_BRILLIANT_YELLOW_STAT = 15
AVATAR_BRILLIANT_GREEN_STAT = 15
AVATAR_BRILLIANT_DUAL_STAT = 15
AVATAR_BASE_RARE_SLOT_IDS = ["HEADGEAR", "HAIR", "FACE", "JACKET", "PANTS", "SHOES", "BREAST", "WAIST"]
BLACK_FANG_ACCESSORY_SLOT_IDS = {"AMULET", "WRIST", "RING"}
CHARACTER_RESPONSE_CACHE_TTL_SECONDS = 15
_CHARACTER_RESPONSE_CACHE_LOCK = threading.Lock()
_CHARACTER_RESPONSE_CACHE = {}
AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "HEADGEAR", "slot": "모자 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "HAIR", "slot": "머리 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "WEAPON", "slot": "무기 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "AURORA", "slot": "오라 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "SKIN", "slot": "피부 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "JACKET", "slot": "상의 아바타", "color": "녹색빛", "kind": "dual", "targetStat": AVATAR_BRILLIANT_DUAL_STAT},
    {"slotId": "PANTS", "slot": "하의 아바타", "color": "녹색빛", "kind": "dual", "targetStat": AVATAR_BRILLIANT_DUAL_STAT},
]
BUFFER_AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "HEADGEAR", "slot": "모자 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "HAIR", "slot": "머리 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "FACE", "slot": "얼굴 아바타", "color": "노란빛", "kind": "yellow", "targetStat": AVATAR_BRILLIANT_YELLOW_STAT, "bufferStatScope": "common"},
    {"slotId": "BREAST", "slot": "목가슴 아바타", "color": "노란빛", "kind": "yellow", "targetStat": AVATAR_BRILLIANT_YELLOW_STAT, "bufferStatScope": "common"},
    {"slotId": "WEAPON", "slot": "무기 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "AURORA", "slot": "오라 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "SKIN", "slot": "피부 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "JACKET", "slot": "상의 아바타", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "current"},
    {"slotId": "PANTS", "slot": "하의 아바타", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "current"},
]
BUFFER_SWITCHING_AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "JACKET", "slot": "벞강 상의", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "switching"},
    {"slotId": "PANTS", "slot": "벞강 하의", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "switching"},
]
BUFFER_SWITCHING_SELF_STAT_SKILLS = {
    "영광의 축복": {"수호의 은총", "보호의 징표", "신념의 오라", "신의 대행자", "디바인 플래쉬"},
    "용맹의 축복": {"계시 : 아리아", "신실한 열정", "라파엘의 축복", "루클렌티스 엔젤"},
    "금단의 저주": {"퍼페티어", "소악마", "어둠에 피는 장미", "불길한 눈웃음"},
    "러블리 템포": {"센세이션", "유명세", "오늘의 주인공", "브랜드 뉴", "에피소드 오브 하모니"},
    "squad::무기강화();": {"apius::전장정보();", "apius::대응체계();", "apius::제한해제();", "apius::하드코딩();", "squad::장갑강화();"},
}


def combine_effects(*effect_rows: dict) -> dict:
    result = {}
    for effects in effect_rows:
        for key, value in (effects or {}).items():
            result[key] = result.get(key, 0) + value
    return order_effects(result)


def _get_character_cached_payload(server_id: str, character_id: str, resource: str, path: str) -> dict:
    cache_key = (clean_text(server_id).lower(), clean_text(character_id), resource)
    now = time.time()
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        cached = _CHARACTER_RESPONSE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            return cached.get("payload") or {}
    url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/{path}?apikey={API_KEY}"
    payload = request_json(url)
    with _CHARACTER_RESPONSE_CACHE_LOCK:
        _CHARACTER_RESPONSE_CACHE[cache_key] = {
            "payload": payload,
            "expires_at": now + CHARACTER_RESPONSE_CACHE_TTL_SECONDS,
        }
    return payload


def _measure_step(steps: list, name: str, fn):
    started_at = time.perf_counter()
    result = fn()
    steps.append({
        "name": name,
        "ms": round((time.perf_counter() - started_at) * 1000, 1),
    })
    return result


def status_rows_to_map(status_rows: list) -> dict:
    return {
        clean_text(status.get("name")): parse_percent_or_number(status.get("value"))
        for status in status_rows or []
        if clean_text(status.get("name"))
    }


def parse_element_bonus_from_text(text: str) -> float:
    values = [
        parse_percent_or_number(match.group(1))
        for match in re.finditer(r"(?:모든\s*)?속성\s*강화\s*\+?\s*([0-9.]+)", clean_text(text))
    ]
    return max(values or [0])


def _get_equipment_base_element_bonus_debug(equipment_rows: list) -> dict:
    steps = []
    item_ids = {
        clean_text(row.get("itemId")): clean_text(row.get("slotId"))
        for row in equipment_rows or []
        if clean_text(row.get("itemId")) and clean_text(row.get("slotId")) != "TITLE"
    }
    details = _measure_step(
        steps,
        "fetch_item_details",
        lambda: fetch_item_details(list(item_ids.keys())),
    )
    total = 0
    parse_started_at = time.perf_counter()
    for detail in details:
        effects = normalize_enchant_status(detail.get("itemStatus") or [])
        explain_element = parse_element_bonus_from_text(
            detail.get("itemExplainDetail") or detail.get("itemExplain") or ""
        )
        total += max(effects.get("elementAll", 0), explain_element)
    steps.append({
        "name": "parse_item_details",
        "ms": round((time.perf_counter() - parse_started_at) * 1000, 1),
        "itemCount": len(details),
    })
    return {"value": total, "steps": steps}


def get_equipment_base_element_bonus(equipment_rows: list) -> float:
    return _get_equipment_base_element_bonus_debug(equipment_rows).get("value") or 0


def load_character_damage_baseline(server_id: str, character_id: str, equipment_base_element: float = 0) -> dict:
    payload = _get_character_cached_payload(server_id, character_id, "status", "status")
    status = status_rows_to_map(payload.get("status") or [])
    job_grow_name = clean_text(payload.get("jobGrowName"))
    base_stats = load_job_base_stats().get(job_grow_name) or {}
    selected_stat_name = "힘" if status.get("힘", 0) >= status.get("지능", 0) else "지능"
    element_values = {
        "fire": status.get("화속성 강화", 0),
        "water": status.get("수속성 강화", 0),
        "light": status.get("명속성 강화", 0),
        "dark": status.get("암속성 강화", 0),
    }
    max_element = max(element_values.values() or [0])
    top_elements = [key for key, value in element_values.items() if value == max_element and value > 0]
    element_strength = max_element + equipment_base_element
    status_element_damage = max(
        value
        for key, value in status.items()
        if "속성 피해" in key
    ) if any("속성 피해" in key for key in status) else 0
    element_damage = status_element_damage + equipment_base_element * 0.45 if status_element_damage else 0
    attack_value = max(
        status.get("물리 공격", 0),
        status.get("마법 공격", 0),
        status.get("독립 공격", 0),
    )
    return {
        "stat": status.get(selected_stat_name, 0),
        "statName": selected_stat_name,
        "baseStat": parse_percent_or_number(base_stats.get(selected_stat_name)),
        "jobGrowName": job_grow_name,
        "attack": attack_value,
        "element": element_strength,
        "elementName": top_elements[0] if top_elements else "",
        "elementNames": top_elements,
        "elementDamage": element_damage,
        "equipmentBaseElement": equipment_base_element,
        "attackIncrease": status.get("공격력 증가", 0),
        "attackAmplification": status.get("공격력 증폭", 0),
    }


def load_character_buffer_baseline(server_id: str, character_id: str) -> dict | None:
    payload = _get_character_cached_payload(server_id, character_id, "status", "status")
    status = status_rows_to_map(payload.get("status") or [])
    job_name = clean_text(payload.get("jobName"))
    job_grow_name = clean_text(payload.get("jobGrowName"))
    buffer_key = {
        ("프리스트(남)", "眞 크루세이더"): "maleCrusader",
        ("프리스트(여)", "眞 크루세이더"): "femaleCrusader",
        ("마법사(여)", "眞 인챈트리스"): "enchantress",
        ("아처", "眞 뮤즈"): "muse",
        ("거너(여)", "眞 패러메딕"): "paramedic",
    }.get((job_name, job_grow_name))
    if not buffer_key:
        return None

    stat_name = {
        "maleCrusader": "체력" if status.get("체력", 0) >= status.get("정신력", 0) else "정신력",
        "femaleCrusader": "지능",
        "enchantress": "지능",
        "muse": "정신력",
        "paramedic": "정신력",
    }[buffer_key]
    skill_levels = load_character_buffer_skill_levels(server_id, character_id, job_name)
    switching_stat = get_buffer_switching_stat_delta(
        server_id,
        character_id,
        job_name,
        stat_name,
        skill_levels.get("buffSkillName") or "",
        skill_levels.get("awakeningSkillName") or "",
    )
    return {
        "isBuffer": True,
        "bufferKey": buffer_key,
        "jobName": job_name,
        "jobGrowName": job_grow_name,
        "statName": stat_name,
        "stat": status.get(stat_name, 0),
        "buffPower": status.get("버프력", 0),
        "buffAmplification": status.get("버프력 증폭", 0),
        **switching_stat,
        **skill_levels,
    }


def get_named_skill_level_bonus(reinforce_skill: list, job_name: str, skill_name: str) -> int:
    return sum(
        int(skill.get("value") or 0)
        for job in reinforce_skill or []
        if not clean_text(job.get("jobName")) or clean_text(job.get("jobName")) in {"공통", job_name}
        for skill in job.get("skills") or []
        if clean_text(skill.get("name")) == skill_name
    )


def get_item_awakening_level_bonus(detail: dict, job_name: str, skill_name: str) -> int:
    item_buff = detail.get("itemBuff") or {}
    explain = clean_text(item_buff.get("explain"))
    explicit_bonus = sum(
        int(match.group(1))
        for match in re.finditer(r"50\s*(?:레벨|Lv)\s*액티브\s*스킬\s*Lv\s*\+\s*(\d+)", explain, re.IGNORECASE)
    )
    range_bonus = sum(
        int(level_range.get("value") or 0)
        for job in item_buff.get("reinforceSkill") or []
        if not clean_text(job.get("jobName")) or clean_text(job.get("jobName")) in {"공통", job_name}
        for level_range in job.get("levelRange") or []
        if int(level_range.get("minLevel") or 0) <= 50 <= int(level_range.get("maxLevel") or 0)
    )
    direct_bonus = get_named_skill_level_bonus(detail.get("itemReinforceSkill") or [], job_name, skill_name)
    return explicit_bonus + range_bonus + direct_bonus


def get_avatar_awakening_level_bonus(avatar_rows: list, skill_name: str) -> int:
    pattern = re.compile(rf"{re.escape(skill_name)}\s*스킬\s*Lv\s*\+\s*(\d+)", re.IGNORECASE)
    total = 0
    for avatar in avatar_rows or []:
        option_match = pattern.search(clean_text(avatar.get("optionAbility")))
        if option_match:
            total += int(option_match.group(1))
        for emblem in avatar.get("emblems") or []:
            emblem_match = pattern.search(clean_text(emblem.get("itemName")))
            if emblem_match:
                total += int(emblem_match.group(1))
    return total


def load_character_buffer_skill_levels(server_id: str, character_id: str, job_name: str) -> dict:
    buff_payload = _get_character_cached_payload(
        server_id,
        character_id,
        "buff_equipment",
        "skill/buff/equip/equipment",
    )
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    buff_skill_level = int(((skill_info.get("option") or {}).get("level")) or 0)

    style_payload = _get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    awakening_row = next(
        (
            row for row in flatten_skill_rows(style_payload)
            if row.get("_skillType") == "active" and int(row.get("requiredLevel") or 0) == 50
        ),
        {},
    )
    awakening_skill_name = clean_text(awakening_row.get("name"))
    awakening_base_level = max(15, int(awakening_row.get("level") or 0)) if awakening_skill_name else 0

    equipment_payload = _get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
    avatar_payload = _get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
    creature_payload = _get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    equipment_rows = equipment_payload.get("equipment") or []
    avatar_rows = avatar_payload.get("avatar") or []
    creature = creature_payload.get("creature") or {}
    item_ids = [
        clean_text(row.get("itemId"))
        for row in [*equipment_rows, *avatar_rows, creature]
        if clean_text(row.get("itemId"))
    ]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(item_ids)
        if clean_text(detail.get("itemId"))
    }
    item_bonus = sum(
        get_item_awakening_level_bonus(detail_by_id.get(item_id) or {}, job_name, awakening_skill_name)
        for item_id in item_ids
    )
    enchant_bonus = sum(
        get_named_skill_level_bonus((row.get("enchant") or {}).get("reinforceSkill") or [], job_name, awakening_skill_name)
        for row in equipment_rows
    )
    avatar_option_bonus = get_avatar_awakening_level_bonus(avatar_rows, awakening_skill_name)
    return {
        "buffSkillName": clean_text(skill_info.get("name")),
        "buffSkillLevel": buff_skill_level,
        "awakeningSkillName": awakening_skill_name,
        "awakeningBaseLevel": awakening_base_level,
        "awakeningItemLevelBonus": item_bonus,
        "awakeningEnchantLevelBonus": enchant_bonus,
        "awakeningAvatarLevelBonus": avatar_option_bonus,
        "awakeningSkillLevel": awakening_base_level + item_bonus + enchant_bonus + avatar_option_bonus,
    }


def load_character_enchants(server_id: str, character_id: str) -> dict:
    steps = []
    payload = _get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
    rows = []
    equipment_upgrades = []
    for equipment in payload.get("equipment") or []:
        slot_name = clean_text(equipment.get("slotName"))
        slot_id = clean_text(equipment.get("slotId"))
        reinforce = int(parse_percent_or_number(equipment.get("reinforce")))
        amplification_name = clean_text(equipment.get("amplificationName"))
        item_id = clean_text(equipment.get("itemId"))
        if slot_name:
            equipment_upgrades.append({
                "slot": slot_name,
                "slotId": slot_id,
                "itemId": item_id,
                "itemName": clean_text(equipment.get("itemName")),
                "iconUrl": get_item_icon_url(item_id) if item_id else "",
                "reinforce": reinforce,
                "amplificationName": amplification_name,
                "isAmplified": bool(amplification_name),
            })
        enchant = equipment.get("enchant") or {}
        status_rows = enchant.get("status") or []
        if not slot_name or not status_rows:
            continue
        rows.append({
            "slot": slot_name,
            "itemName": clean_text(equipment.get("itemName")),
            "effects": normalize_enchant_status(status_rows),
            "reinforceSkill": enchant.get("reinforceSkill") or [],
            "rawStatus": status_rows,
        })
    equipment_base_element_debug = _measure_step(
        steps,
        "get_equipment_base_element_bonus",
        lambda: _get_equipment_base_element_bonus_debug(payload.get("equipment") or []),
    )
    equipment_base_element = equipment_base_element_debug.get("value") or 0
    damage_baseline = _measure_step(
        steps,
        "load_character_damage_baseline",
        lambda: load_character_damage_baseline(server_id, character_id, equipment_base_element),
    )
    black_fang_debug = _measure_step(
        steps,
        "build_black_fang_recommendations",
        lambda: _build_black_fang_recommendations_debug(payload.get("equipment") or []),
    )
    black_fang_recommendations = black_fang_debug.get("recommendations") or []
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "damageBaseline": damage_baseline,
        "bufferBaseline": load_character_buffer_baseline(server_id, character_id),
        "enchants": rows,
        "equipmentUpgrades": equipment_upgrades,
        "blackFangRecommendations": black_fang_recommendations,
        "upgradeExpectedDb": load_upgrade_expected_db(),
        "debugTimings": {
            "steps": steps,
            "details": {
                "get_equipment_base_element_bonus": equipment_base_element_debug.get("steps") or [],
                "build_black_fang_recommendations": black_fang_debug.get("steps") or [],
            },
        },
    }


def load_character_creature(server_id: str, character_id: str) -> dict:
    steps = []
    payload = _get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    creature = payload.get("creature") or {}
    item_id = clean_text(creature.get("itemId"))
    artifact_rows = creature.get("artifact") or []
    artifact_ids = [clean_text(artifact.get("itemId")) for artifact in artifact_rows if clean_text(artifact.get("itemId"))]
    details = _measure_step(
        steps,
        "fetch_item_details",
        lambda: {
            detail.get("itemId"): detail
            for detail in fetch_item_details([item_id, *artifact_ids])
        } if item_id or artifact_ids else {},
    )
    detail = details.get(item_id) or {}
    reinforce_skills = _measure_step(
        steps,
        "get_item_reinforce_skill_matches",
        lambda: get_item_reinforce_skill_matches(detail, get_character_skill_context(server_id, character_id)) if item_id else [],
    )
    explain = get_item_explain(detail)
    level_tag = parse_title_level_tag(detail.get("itemName"))
    skill_damage_percent = parse_skill_damage_percent(explain)
    if get_level_option_variant(detail.get("itemName")) == "플래티넘" and skill_damage_percent <= 0:
        skill_damage_percent = get_creature_platinum_skill_damage_percent(level_tag)
        if level_tag and skill_damage_percent > 0:
            explain = f"{level_tag} 레벨 액티브 스킬 공격력 {int(skill_damage_percent)}% 증가"
    artifacts = []
    for artifact in artifact_rows:
        artifact_id = clean_text(artifact.get("itemId"))
        artifact_detail = details.get(artifact_id) or {}
        artifact_summary = get_creature_artifact_status_summary(artifact_detail.get("itemStatus") or [])
        artifacts.append({
            "slotColor": clean_text(artifact.get("slotColor")),
            "itemId": artifact_id,
            "itemName": clean_text(artifact.get("itemName")),
            "itemRarity": clean_text(artifact.get("itemRarity")),
            "fame": artifact_detail.get("fame", artifact.get("fame")),
            "iconUrl": get_item_icon_url(artifact_id),
            "itemExplain": get_item_explain(artifact_detail),
            **artifact_summary,
        })
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "creature": {
            "itemId": item_id,
            "itemName": clean_text(creature.get("itemName")),
            "itemRarity": clean_text(creature.get("itemRarity")),
            "fame": detail.get("fame"),
            "iconUrl": get_item_icon_url(item_id),
            "itemExplain": explain,
            "effects": normalize_enchant_status(detail.get("itemStatus") or []),
            "itemReinforceSkill": detail.get("itemReinforceSkill") or [],
            "reinforceSkills": reinforce_skills,
            "itemBuff": detail.get("itemBuff") or {},
            "variant": get_level_option_variant(detail.get("itemName")),
            "levelTag": level_tag,
            "skillDamagePercent": skill_damage_percent,
            "artifacts": artifacts,
        } if item_id else None,
        "debugTimings": {
            "steps": steps,
        },
    }


def load_character_title(server_id: str, character_id: str) -> dict:
    steps = []
    payload = _get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
    title = next((
        equipment for equipment in payload.get("equipment") or []
        if clean_text(equipment.get("slotId")) == "TITLE" or clean_text(equipment.get("slotName")) == "칭호"
    ), None)
    item_id = clean_text((title or {}).get("itemId"))
    detail = _measure_step(
        steps,
        "fetch_item_details",
        lambda: (fetch_item_details([item_id]) or [{}])[0] if item_id else {},
    )
    enchant_summary = get_title_enchant_status_summary(((title or {}).get("enchant") or {}).get("status") or [])
    enchant_effects = enchant_summary.get("effects") or {}
    title_payload = build_title_payload(item_id, detail) if item_id else None
    if title_payload:
        title_payload["enchantEffects"] = enchant_effects
        title_payload["titleEnchantElement"] = enchant_summary.get("element") or ""
        title_payload["effects"] = combine_effects(title_payload.get("effects") or {}, enchant_effects)
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "title": title_payload,
        "debugTimings": {
            "steps": steps,
        },
    }

def load_character_aura(server_id: str, character_id: str) -> dict:
    steps = []
    payload = _get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
    aura = next((
        avatar for avatar in payload.get("avatar") or []
        if "오라" in clean_text(avatar.get("slotName"))
        or "오라" in clean_text(avatar.get("itemTypeDetail"))
        or "오라" in clean_text(avatar.get("itemName"))
    ), None)
    item_id = clean_text((aura or {}).get("itemId"))
    detail = _measure_step(
        steps,
        "fetch_item_details",
        lambda: (fetch_item_details([item_id]) or [{}])[0] if item_id else {},
    )
    skill_effect = _measure_step(
        steps,
        "get_item_reinforce_skill_effect",
        lambda: get_item_reinforce_skill_effect(detail, get_character_skill_context(server_id, character_id)) if item_id else {},
    )
    reinforce_skills = _measure_step(
        steps,
        "get_item_reinforce_skill_matches",
        lambda: get_item_reinforce_skill_matches(detail, get_character_skill_context(server_id, character_id)) if item_id else [],
    )
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "fame": payload.get("fame"),
        "aura": ({
            **build_aura_payload(item_id, detail),
            **skill_effect,
            "reinforceSkills": reinforce_skills,
        } if item_id else None),
        "debugTimings": {
            "steps": steps,
        },
    }


def load_character_preview(server_id: str, character_id: str) -> dict:
    equipment_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/equipment?apikey={API_KEY}"
    creature_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/creature?apikey={API_KEY}"
    avatar_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/equip/avatar?apikey={API_KEY}"
    equipment_payload = request_json(equipment_url)
    creature_payload = request_json(creature_url)
    avatar_payload = request_json(avatar_url)
    detail_payload = request_json(build_character_detail_url(server_id, character_id))
    detail_source = detail_payload.get("character") if isinstance(detail_payload.get("character"), dict) else detail_payload
    adventure_name = clean_text((detail_source or {}).get("adventureName"))

    enchants = []
    equipment_upgrades = []
    title = None
    title_item_id = ""
    for equipment in equipment_payload.get("equipment") or []:
        slot_name = clean_text(equipment.get("slotName"))
        slot_id = clean_text(equipment.get("slotId"))
        item_id = clean_text(equipment.get("itemId"))
        if slot_name:
            equipment_upgrades.append({
                "slot": slot_name,
                "slotId": slot_id,
                "itemId": item_id,
                "itemName": clean_text(equipment.get("itemName")),
                "iconUrl": get_item_icon_url(item_id) if item_id else "",
                "reinforce": int(parse_percent_or_number(equipment.get("reinforce"))),
                "amplificationName": clean_text(equipment.get("amplificationName")),
                "isAmplified": bool(clean_text(equipment.get("amplificationName"))),
            })
        enchant = equipment.get("enchant") or {}
        status_rows = enchant.get("status") or []
        if slot_name and status_rows:
            enchants.append({
                "slot": slot_name,
                "itemName": clean_text(equipment.get("itemName")),
                "effects": normalize_enchant_status(status_rows),
                "reinforceSkill": enchant.get("reinforceSkill") or [],
                "rawStatus": status_rows,
            })
        if slot_id == "TITLE" or slot_name == "칭호":
            title_enchant_summary = get_title_enchant_status_summary(status_rows)
            title_item_id = item_id
            title = {
                "itemId": item_id,
                "itemName": clean_text(equipment.get("itemName")),
                "itemRarity": clean_text(equipment.get("itemRarity")),
                "iconUrl": get_item_icon_url(item_id),
                "effects": {},
                "enchantEffects": title_enchant_summary.get("effects") or {},
                "titleEnchantElement": title_enchant_summary.get("element") or "",
            }

    creature_row = creature_payload.get("creature") or {}
    creature_item_id = clean_text(creature_row.get("itemId"))
    artifact_ids = [
        clean_text(artifact.get("itemId"))
        for artifact in creature_row.get("artifact") or []
        if clean_text(artifact.get("itemId"))
    ]

    aura_row = next((
        avatar for avatar in avatar_payload.get("avatar") or []
        if "오라" in clean_text(avatar.get("slotName"))
        or "오라" in clean_text(avatar.get("itemTypeDetail"))
        or "오라" in clean_text(avatar.get("itemName"))
    ), None)
    aura_item_id = clean_text((aura_row or {}).get("itemId"))

    detail_map = {
        detail.get("itemId"): detail
        for detail in fetch_item_details([title_item_id, creature_item_id, aura_item_id, *artifact_ids])
    }

    if title and title_item_id:
        title_detail = detail_map.get(title_item_id) or {}
        title_payload = build_title_payload(title_item_id, title_detail) or {}
        enchant_effects = title.get("enchantEffects") or {}
        title = {
            **title,
            **title_payload,
            "itemName": title_payload.get("itemName") or title.get("itemName"),
            "itemRarity": title_payload.get("itemRarity") or title.get("itemRarity"),
            "iconUrl": title_payload.get("iconUrl") or title.get("iconUrl"),
            "enchantEffects": enchant_effects,
            "titleEnchantElement": title.get("titleEnchantElement") or "",
            "effects": combine_effects(title_payload.get("effects") or {}, enchant_effects),
        }

    creature_detail = detail_map.get(creature_item_id) or {}
    creature = {
        "itemId": creature_item_id,
        "itemName": clean_text(creature_row.get("itemName")),
        "itemRarity": clean_text(creature_row.get("itemRarity")),
        "iconUrl": get_item_icon_url(creature_item_id),
        "effects": normalize_enchant_status(creature_detail.get("itemStatus") or []),
        "itemReinforceSkill": creature_detail.get("itemReinforceSkill") or [],
        "itemBuff": creature_detail.get("itemBuff") or {},
        "artifacts": [
            {
                "slotColor": clean_text(artifact.get("slotColor")),
                "itemId": clean_text(artifact.get("itemId")),
                "itemName": clean_text(artifact.get("itemName")),
                "iconUrl": get_item_icon_url(clean_text(artifact.get("itemId"))),
                **get_creature_artifact_status_summary((detail_map.get(clean_text(artifact.get("itemId"))) or {}).get("itemStatus") or []),
            }
            for artifact in creature_row.get("artifact") or []
            if clean_text(artifact.get("itemId"))
        ],
    } if creature_item_id else None

    aura = build_aura_payload(aura_item_id, detail_map.get(aura_item_id) or {}) if aura_item_id else None

    return {
        "serverId": equipment_payload.get("serverId"),
        "characterId": equipment_payload.get("characterId"),
        "characterName": equipment_payload.get("characterName"),
        "adventureName": adventure_name,
        "fame": equipment_payload.get("fame"),
        "enchants": enchants,
        "equipmentUpgrades": equipment_upgrades,
        "title": title,
        "creature": creature,
        "aura": aura,
    }


def load_character_loadout(server_id: str, character_id: str) -> dict:
    started_at = time.perf_counter()
    steps = []
    enchant_payload = _measure_step(steps, "load_character_enchants", lambda: load_character_enchants(server_id, character_id))
    creature_payload = _measure_step(steps, "load_character_creature", lambda: load_character_creature(server_id, character_id))
    title_payload = _measure_step(steps, "load_character_title", lambda: load_character_title(server_id, character_id))
    aura_payload = _measure_step(steps, "load_character_aura", lambda: load_character_aura(server_id, character_id))
    avatar_payload = _measure_step(
        steps,
        "load_character_avatar",
        lambda: load_character_avatar(server_id, character_id, enchant_payload.get("bufferBaseline")),
    )
    return {
        "serverId": enchant_payload.get("serverId"),
        "characterId": enchant_payload.get("characterId"),
        "characterName": enchant_payload.get("characterName"),
        "fame": enchant_payload.get("fame"),
        "damageBaseline": enchant_payload.get("damageBaseline"),
        "bufferBaseline": enchant_payload.get("bufferBaseline"),
        "enchants": enchant_payload.get("enchants") or [],
        "equipmentUpgrades": enchant_payload.get("equipmentUpgrades") or [],
        "blackFangRecommendations": enchant_payload.get("blackFangRecommendations") or [],
        "upgradeExpectedDb": enchant_payload.get("upgradeExpectedDb"),
        "creature": creature_payload.get("creature"),
        "title": title_payload.get("title"),
        "aura": aura_payload.get("aura"),
        "avatar": avatar_payload,
        "debugTimings": {
            "totalMs": round((time.perf_counter() - started_at) * 1000, 1),
            "steps": steps,
            "details": {
                "load_character_enchants": enchant_payload.get("debugTimings") or {},
                "load_character_creature": creature_payload.get("debugTimings") or {},
                "load_character_title": title_payload.get("debugTimings") or {},
                "load_character_aura": aura_payload.get("debugTimings") or {},
                "load_character_avatar": avatar_payload.get("debugTimings") or {},
            },
        },
    }


def normalize_job_name(value: str) -> str:
    text = clean_text(value)
    return re.sub(r"^(眞|진|真)\s*", "", text).strip()


def normalize_skill_name(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"\s*스킬\s*Lv\s*\+\s*1\s*$", "", text, flags=re.IGNORECASE)
    text = text.replace("：", ":")
    return re.sub(r"\s+", "", text)


def skill_name_matches(actual: str, expected: str) -> bool:
    actual_key = normalize_skill_name(actual)
    expected_key = normalize_skill_name(expected)
    if not actual_key or not expected_key:
        return False
    return actual_key == expected_key or actual_key.endswith(expected_key)


def get_avatar_slot(avatar_rows: list, slot_id: str) -> dict:
    slot_id = clean_text(slot_id)
    return next((
        row for row in avatar_rows or []
        if clean_text(row.get("slotId")) == slot_id
    ), {}) or {}


def get_character_primary_stat_name(payload: dict) -> str:
    job_grow_name = clean_text(payload.get("jobGrowName"))
    base_stats = load_job_base_stats().get(job_grow_name) or {}
    return "지능" if parse_percent_or_number(base_stats.get("지능")) > parse_percent_or_number(base_stats.get("힘")) else "힘"


def get_character_buffer_stat_name(payload: dict, server_id: str, character_id: str) -> str:
    job_key = (clean_text(payload.get("jobName")), clean_text(payload.get("jobGrowName")))
    stat_name = {
        ("프리스트(여)", "眞 크루세이더"): "지능",
        ("마법사(여)", "眞 인챈트리스"): "지능",
        ("아처", "眞 뮤즈"): "정신력",
        ("거너(여)", "眞 패러메딕"): "정신력",
    }.get(job_key)
    if stat_name or job_key != ("프리스트(남)", "眞 크루세이더"):
        return stat_name or ""
    status_payload = _get_character_cached_payload(server_id, character_id, "status", "status")
    status = status_rows_to_map(status_payload.get("status") or [])
    return "체력" if status.get("체력", 0) >= status.get("정신력", 0) else "정신력"


def is_rare_clone_avatar(row: dict) -> bool:
    item_name = clean_text(row.get("itemName"))
    clone = row.get("clone") or {}
    return clean_text(row.get("itemRarity")) == "레어" and (
        "클론" in item_name
        or bool(clean_text(clone.get("itemName")))
    )


def get_platinum_emblems(row: dict) -> list:
    return [
        emblem for emblem in row.get("emblems") or []
        if "플래티넘" in clean_text(emblem.get("slotColor"))
        or "플래티넘" in clean_text(emblem.get("itemName"))
    ]


def extract_platinum_skill_name(item_name: str) -> str:
    match = re.search(r"\[([^\]]+)\]", clean_text(item_name))
    return match.group(1).strip() if match else ""


def extract_emblem_option_text(item_name: str) -> str:
    match = re.search(r"\[([^\]]+)\]", clean_text(item_name))
    return match.group(1).strip() if match else ""


def get_emblem_stat_value(item_name: str, stat_name: str, kind: str) -> float:
    item_name = clean_text(item_name)
    option_text = extract_emblem_option_text(item_name)
    if stat_name not in option_text:
        return 0
    if "찬란한" in item_name:
        if kind == "red":
            return AVATAR_BRILLIANT_RED_STAT
        if kind == "yellow":
            return AVATAR_BRILLIANT_YELLOW_STAT
        if kind == "green":
            return AVATAR_BRILLIANT_GREEN_STAT
        if kind == "dual":
            return AVATAR_BRILLIANT_DUAL_STAT
    if "화려한" in item_name:
        return 17 if kind == "red" else 10
    if "빛나는" in item_name:
        return 10 if kind == "red" else 6
    if "듀얼" in item_name:
        return 10
    return 0


def get_emblems_by_color(row: dict, color: str) -> list:
    color = clean_text(color)
    return [
        emblem for emblem in row.get("emblems") or []
        if color in clean_text(emblem.get("slotColor"))
    ]


def get_avatar_damage_emblems(row: dict, config: dict) -> list:
    if clean_text(config.get("slotId")) in {"WEAPON", "AURORA", "SKIN"}:
        return [
            emblem for emblem in row.get("emblems") or []
            if "플래티넘" not in clean_text(emblem.get("slotColor"))
            and "플래티넘" not in clean_text(emblem.get("itemName"))
        ]
    return get_emblems_by_color(row, config.get("color"))


def get_avatar_green_stat_total(row: dict, stat_name: str) -> float:
    return sum(
        get_emblem_stat_value(emblem.get("itemName"), stat_name, "green")
        for emblem in get_emblems_by_color(row, "녹색빛")
    )


def get_status_stat_value(status_rows: list, stat_name: str) -> float:
    return sum(
        parse_percent_or_number(row.get("value"))
        for row in status_rows or []
        if clean_text(row.get("name")) == stat_name
    )


def get_emblem_primary_stat_value(item_name: str, stat_name: str) -> float:
    item_name = clean_text(item_name)
    if stat_name not in extract_emblem_option_text(item_name):
        return 0
    if "찬란한" in item_name:
        return AVATAR_BRILLIANT_RED_STAT if "붉은빛" in item_name else AVATAR_BRILLIANT_GREEN_STAT
    if "화려한" in item_name:
        return 17 if "붉은빛" in item_name else 10
    if "빛나는" in item_name:
        return 10 if "붉은빛" in item_name else 6
    if "듀얼" in item_name:
        return 10
    return 0


def get_row_direct_stat(row: dict, detail: dict, stat_name: str) -> float:
    total = get_status_stat_value(detail.get("itemStatus") or [], stat_name)
    total += get_status_stat_value((row.get("enchant") or {}).get("status") or [], stat_name)
    option_match = re.search(rf"{re.escape(stat_name)}\s*(\d+(?:\.\d+)?)\s*증가", clean_text(row.get("optionAbility")))
    if option_match:
        total += float(option_match.group(1))
    total += sum(
        get_emblem_primary_stat_value(emblem.get("itemName"), stat_name)
        for emblem in row.get("emblems") or []
    )
    return total


def add_named_skill_bonuses(result: dict, reinforce_skill: list, job_name: str) -> None:
    for job in reinforce_skill or []:
        if clean_text(job.get("jobName")) not in {"", "공통", job_name}:
            continue
        for skill in job.get("skills") or []:
            name = clean_text(skill.get("name"))
            if name:
                result[name] = result.get(name, 0) + int(skill.get("value") or 0)


def get_setup_skill_bonuses(rows: list, detail_by_id: dict, style_rows: list, job_name: str) -> dict:
    result = {}
    for row in rows or []:
        detail = detail_by_id.get(clean_text(row.get("itemId"))) or {}
        add_named_skill_bonuses(result, detail.get("itemReinforceSkill") or [], job_name)
        add_named_skill_bonuses(result, (row.get("enchant") or {}).get("reinforceSkill") or [], job_name)
        for job in (detail.get("itemBuff") or {}).get("reinforceSkill") or []:
            if clean_text(job.get("jobName")) not in {"", "공통", job_name}:
                continue
            for level_range in job.get("levelRange") or []:
                minimum = int(level_range.get("minLevel") or 0)
                maximum = int(level_range.get("maxLevel") or 0)
                value = int(level_range.get("value") or 0)
                for skill in style_rows:
                    if minimum <= int(skill.get("requiredLevel") or 0) <= maximum:
                        name = clean_text(skill.get("name"))
                        if name:
                            result[name] = result.get(name, 0) + value
        for text in [
            clean_text(row.get("optionAbility")),
            *(clean_text(emblem.get("itemName")) for emblem in row.get("emblems") or []),
        ]:
            match = re.search(r"\[?(.+?)\]?\s*스킬\s*Lv\s*\+\s*(\d+)", text, re.IGNORECASE)
            if match:
                name = clean_text(match.group(1)).strip("[]")
                result[name] = result.get(name, 0) + int(match.group(2))
                continue
            platinum_match = re.search(r"플래티넘\s*엠블렘\s*\[([^\]]+)\]", text)
            if platinum_match:
                name = clean_text(platinum_match.group(1))
                result[name] = result.get(name, 0) + 1
    return result


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


def get_buffer_platinum_stat_deltas(
    buffer_baseline: dict,
    avatar_rows: list,
    target_skill: str,
    slot_ids: list,
) -> dict:
    self_stat_skills = buffer_baseline.get("currentSelfStatSkills") or {}
    result = {}
    for slot_id in slot_ids:
        row = get_avatar_slot(avatar_rows, slot_id)
        current_skill = next((
            extract_platinum_skill_name(emblem.get("itemName"))
            for emblem in get_platinum_emblems(row)
            if extract_platinum_skill_name(emblem.get("itemName"))
        ), "")
        skill_deltas = {}
        skill_levels = {}
        current_info = self_stat_skills.get(current_skill) or {}
        if current_info:
            skill_levels[current_skill] = {
                "current": current_info.get("level", 0),
                "candidate": current_info.get("level", 0) - 1,
            }
            delta = float(current_info.get("previousStat") or 0) - float(current_info.get("currentStat") or 0)
            if delta:
                skill_deltas[current_skill] = delta
        target_info = self_stat_skills.get(target_skill) or {}
        if target_info:
            skill_levels[target_skill] = {
                "current": target_info.get("level", 0),
                "candidate": target_info.get("level", 0) + 1,
            }
            delta = float(target_info.get("nextStat") or 0) - float(target_info.get("currentStat") or 0)
            if delta:
                skill_deltas[target_skill] = skill_deltas.get(target_skill, 0) + delta
        result[slot_id] = {
            "statDelta": sum(skill_deltas.values()),
            "skillDeltas": skill_deltas,
            "skillLevels": skill_levels,
            "currentSkill": current_skill,
            "targetSkill": target_skill,
        }
    return result


def get_buffer_switching_stat_delta(
    server_id: str,
    character_id: str,
    job_name: str,
    stat_name: str,
    buff_skill_name: str,
    awakening_skill_name: str,
) -> dict:
    current_equipment = _get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment").get("equipment") or []
    current_avatar = _get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar").get("avatar") or []
    current_creature_payload = _get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    current_creature = current_creature_payload.get("creature") or {}
    buff_equipment_payload = _get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
    buff_avatar_payload = _get_character_cached_payload(server_id, character_id, "buff_avatar", "skill/buff/equip/avatar")
    buff_creature_payload = _get_character_cached_payload(server_id, character_id, "buff_creature", "skill/buff/equip/creature")
    switching_equipment = ((buff_equipment_payload.get("skill") or {}).get("buff") or {}).get("equipment") or []
    switching_avatar = ((buff_avatar_payload.get("skill") or {}).get("buff") or {}).get("avatar") or []
    switching_creature_rows = ((buff_creature_payload.get("skill") or {}).get("buff") or {}).get("creature") or []
    switching_creature = switching_creature_rows[0] if isinstance(switching_creature_rows, list) and switching_creature_rows else switching_creature_rows

    switching_equipment_by_slot = {
        clean_text(row.get("slotId")): row
        for row in switching_equipment
        if clean_text(row.get("slotId"))
    }
    switching_avatar_by_slot = {
        clean_text(row.get("slotId")): row
        for row in switching_avatar
        if clean_text(row.get("slotId"))
    }
    current_rows = [*current_equipment, *current_avatar, current_creature]
    switching_rows = [
        switching_equipment_by_slot.get(clean_text(row.get("slotId")), row)
        for row in current_equipment
    ] + [
        switching_avatar_by_slot.get(clean_text(row.get("slotId")), row)
        for row in current_avatar
    ]
    switching_rows.append(switching_creature if isinstance(switching_creature, dict) and switching_creature else current_creature)

    item_ids = [
        clean_text(row.get("itemId"))
        for row in [*current_rows, *switching_rows]
        if clean_text(row.get("itemId"))
    ]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(item_ids)
        if clean_text(detail.get("itemId"))
    }
    direct_delta = (
        sum(get_row_direct_stat(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}, stat_name) for row in switching_rows)
        - sum(get_row_direct_stat(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}, stat_name) for row in current_rows)
    )

    style_payload = _get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    style_rows = flatten_skill_rows(style_payload)
    style_by_name = {clean_text(row.get("name")): row for row in style_rows if clean_text(row.get("name"))}
    current_bonuses = get_setup_skill_bonuses(current_rows, detail_by_id, style_rows, job_name)
    switching_bonuses = get_setup_skill_bonuses(switching_rows, detail_by_id, style_rows, job_name)
    relevant_skills = BUFFER_SWITCHING_SELF_STAT_SKILLS.get(clean_text(buff_skill_name), set())
    skill_delta = 0
    skill_deltas = {}
    skill_detail_by_name = {}
    for name in set(current_bonuses) | set(switching_bonuses):
        if name not in relevant_skills or current_bonuses.get(name, 0) == switching_bonuses.get(name, 0):
            continue
        style_row = style_by_name.get(name) or {}
        skill_id = clean_text(style_row.get("skillId"))
        base_level = int(style_row.get("level") or 0)
        if not skill_id or base_level <= 0:
            continue
        skill_detail = request_json(f"https://api.neople.co.kr/df/skills/{clean_text(style_payload.get('jobId'))}/{skill_id}?apikey={API_KEY}")
        skill_detail_by_name[name] = skill_detail
        current_value = get_skill_level_stat_value(skill_detail, base_level + current_bonuses.get(name, 0), stat_name)
        switching_value = get_skill_level_stat_value(skill_detail, base_level + switching_bonuses.get(name, 0), stat_name)
        delta = switching_value - current_value
        if delta:
            skill_delta += delta
            skill_deltas[name] = delta
    current_self_stat_skills = {}
    for name in relevant_skills:
        style_row = style_by_name.get(name) or {}
        skill_id = clean_text(style_row.get("skillId"))
        base_level = int(style_row.get("level") or 0)
        if not skill_id or base_level <= 0:
            continue
        skill_detail = skill_detail_by_name.get(name)
        if not skill_detail:
            skill_detail = request_json(
                f"https://api.neople.co.kr/df/skills/{clean_text(style_payload.get('jobId'))}/{skill_id}?apikey={API_KEY}"
            )
        current_level = base_level + current_bonuses.get(name, 0)
        current_self_stat_skills[name] = {
            "level": current_level,
            "requiredLevel": int(style_row.get("requiredLevel") or 0),
            "previousStat": get_skill_level_stat_value(skill_detail, current_level - 1, stat_name),
            "currentStat": get_skill_level_stat_value(skill_detail, current_level, stat_name),
            "nextStat": get_skill_level_stat_value(skill_detail, current_level + 1, stat_name),
        }
    return {
        "switchingStatDelta": direct_delta + skill_delta,
        "switchingDirectStatDelta": direct_delta,
        "switchingSkillStatDelta": skill_delta,
        "switchingSkillStatDeltas": skill_deltas,
        "currentSelfStatSkills": current_self_stat_skills,
    }


def get_avatar_platinum_damage_percent(slot_label: str) -> float:
    return AVATAR_PLATINUM_FINAL_DAMAGE_PERCENT


def find_lowest_exact_item_by_name(item_name: str) -> dict:
    item_name = clean_text(item_name)
    rows = search_items_by_name(item_name)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
    ]
    candidates = []
    seen_ids = set()
    for row in exact_rows:
        item_id = clean_text(row.get("itemId"))
        if not item_id or item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        try:
            auction = get_lowest_auction_price(item_id)
        except Exception:
            auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
        candidates.append({
            "itemId": item_id,
            "itemName": clean_item_display_name(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": get_item_icon_url(item_id),
            "auction": auction,
        })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={"itemName": item_name, "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}},
    )


def find_exact_item_by_name(item_name: str, item_type_detail: str = "") -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    rows = search_items_by_name(item_name)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
    ]
    return matched[0] if matched else {}


def get_avatar_emblem_item_name(stat_name: str, kind: str) -> str:
    if kind == "red":
        return f"찬란한 붉은빛 엠블렘[{stat_name}]"
    if kind == "yellow":
        return f"찬란한 옐로우 엠블렘[{stat_name}]"
    if kind == "green":
        return f"찬란한 그린 엠블렘[{stat_name}]"
    critical_name = "마법크리티컬" if stat_name == "지능" else "물리크리티컬"
    return f"찬란한 듀얼 엠블렘[{stat_name} + {critical_name}]"


def find_lowest_buffer_emblem_item(stat_name: str, kind: str) -> dict:
    exact_name = get_avatar_emblem_item_name(stat_name, kind)
    candidates = [find_lowest_exact_item_by_name(exact_name)]
    if kind == "green" and stat_name == "지능":
        seen_names = {exact_name}
        for row in search_items_by_name("찬란한 듀얼 엠블렘[지능"):
            item_name = clean_text(row.get("itemName"))
            if item_name.startswith("찬란한 듀얼 엠블렘[지능 +") and item_name not in seen_names:
                seen_names.add(item_name)
                candidates.append(find_lowest_exact_item_by_name(item_name))
    priced = [
        item for item in candidates
        if isinstance((item.get("auction") or {}).get("minUnitPrice"), (int, float))
        and (item.get("auction") or {}).get("minUnitPrice") > 0
    ]
    return min(
        priced or candidates,
        key=lambda item: (item.get("auction") or {}).get("minUnitPrice") or 10**30,
        default={"itemName": exact_name, "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}},
    )


def build_avatar_emblem_recommendations(
    avatar_rows: list,
    primary_stat_name: str,
    configs: list | None = None,
    buffer_mode: bool = False,
) -> list:
    recommendations = []
    item_cache = {}
    for config in configs or AVATAR_EMBLEM_RECOMMENDATIONS:
        row = get_avatar_slot(avatar_rows, config.get("slotId"))
        if not row:
            continue
        if (
            not buffer_mode
            and clean_text(row.get("itemRarity")) != "레어"
            and clean_text(config.get("slotId")) not in {"AURORA", "SKIN"}
        ):
            continue
        emblems = get_avatar_damage_emblems(row, config)
        socket_count = max(len(emblems), 2)
        current_values = [
            get_emblem_stat_value(emblem.get("itemName"), primary_stat_name, config.get("kind"))
            for emblem in emblems
        ]
        current_values += [0] * max(0, socket_count - len(current_values))
        need_count = sum(1 for value in current_values if value < config.get("targetStat", 0))
        if need_count <= 0:
            continue
        item_name = get_avatar_emblem_item_name(primary_stat_name, config.get("kind"))
        item_cache_key = (primary_stat_name, config.get("kind"))
        if item_cache_key not in item_cache:
            item_cache[item_cache_key] = (
                find_lowest_buffer_emblem_item(primary_stat_name, config.get("kind"))
                if buffer_mode
                else find_lowest_exact_item_by_name(item_name)
            )
        item = item_cache[item_cache_key]
        auction = dict(item.get("auction") or {})
        unit_price = auction.get("minUnitPrice")
        if isinstance(unit_price, (int, float)) and unit_price > 0:
            auction["minUnitPrice"] = unit_price * need_count
            auction["unitPrice"] = unit_price
        stat_gain = sum(config.get("targetStat", 0) - value for value in current_values if value < config.get("targetStat", 0))
        recommendations.append({
            "kind": "brilliantEmblem",
            "slot": config.get("slot"),
            "tier": "엠블렘",
            "itemId": item.get("itemId"),
            "itemName": item.get("itemName") or item_name,
            "itemRarity": item.get("itemRarity"),
            "iconUrl": item.get("iconUrl"),
            "itemExplain": (
                f"{clean_text(row.get('slotName')) or config.get('slot')} "
                f"{config.get('color')} {primary_stat_name} 찬란한 엠블렘 교체"
            ),
            "effects": (
                {"bufferStat": stat_gain}
                if buffer_mode
                else {"int" if primary_stat_name == "지능" else "str": stat_gain}
            ),
            "auction": auction,
            "needCount": need_count,
            "unitPrice": unit_price,
            "targetStat": primary_stat_name,
            "bufferStatScope": clean_text(config.get("bufferStatScope")),
            "recommendationPriority": 0,
        })
    return recommendations


def get_buffer_avatar_emblem_configs(switching_rows: list) -> tuple[list, list]:
    switching_rare_slot_ids = {
        slot_id
        for slot_id in ("JACKET", "PANTS")
        if clean_text(get_avatar_slot(switching_rows, slot_id).get("itemRarity")) == "레어"
    }
    current_configs = [
        {
            **config,
            "bufferStatScope": (
                "common"
                if clean_text(config.get("slotId")) in {"JACKET", "PANTS"}
                and clean_text(config.get("slotId")) not in switching_rare_slot_ids
                else config.get("bufferStatScope")
            ),
        }
        for config in BUFFER_AVATAR_EMBLEM_RECOMMENDATIONS
    ]
    switching_configs = [
        config
        for config in BUFFER_SWITCHING_AVATAR_EMBLEM_RECOMMENDATIONS
        if clean_text(config.get("slotId")) in switching_rare_slot_ids
    ]
    return current_configs, switching_configs


def parse_black_fang_scroll_cost(detail: dict) -> dict:
    text = str(detail.get("itemExplainDetail") or detail.get("itemExplain") or "")
    materials = []
    fixed_gold = 0
    in_materials = False
    for raw_line in text.splitlines():
        line = clean_text(raw_line)
        if not line:
            continue
        if line == "<소모 재료>":
            in_materials = True
            continue
        if line.startswith("<") and line.endswith(">") and line != "<소모 재료>":
            in_materials = False
        if not in_materials:
            continue
        if "악세서리" in line and line.endswith("1개"):
            continue
        gold_match = re.search(r"골드\s*([\d,]+)", line)
        if gold_match:
            fixed_gold += int(gold_match.group(1).replace(",", ""))
            continue
        material_match = re.match(r"(.+?)\s*([\d,]+)개$", line)
        if material_match:
            materials.append({
                "label": clean_text(material_match.group(1)),
                "amount": int(material_match.group(2).replace(",", "")),
            })
        else:
            materials.append({"label": line, "amount": None})
    return {"fixedGold": fixed_gold, "materials": materials}


def format_materials_text(materials: list) -> str:
    parts = []
    for material in materials or []:
        label = clean_text(material.get("label"))
        amount = material.get("amount")
        if not label:
            continue
        if isinstance(amount, (int, float)) and amount > 0:
            parts.append(f"{label} {int(amount):,}개")
        else:
            parts.append(label)
    return " / ".join(parts)


def enrich_black_fang_materials(materials: list) -> list:
    enriched = []
    for material in materials or []:
        label = clean_text(material.get("label"))
        if not label:
            continue
        item = find_exact_item_by_name(label)
        item_id = clean_text(item.get("itemId"))
        enriched.append({
            "label": label,
            "amount": material.get("amount"),
            "itemId": item_id,
            "itemName": clean_text(item.get("itemName")) or label,
            "iconUrl": get_item_icon_url(item_id),
        })
    return enriched


def get_black_fang_scroll_name(set_item_name: str) -> str:
    set_name = re.sub(r"\s*세트$", "", clean_text(set_item_name)).strip()
    return f"흑아 태초 변환서 - {set_name}" if set_name else ""


def _build_black_fang_recommendations_debug(equipment_rows: list) -> dict:
    steps = []
    targets = [
        equipment for equipment in equipment_rows or []
        if clean_text(equipment.get("slotId")) in BLACK_FANG_ACCESSORY_SLOT_IDS
        and clean_text(equipment.get("itemRarity")) == "태초"
        and not clean_text(equipment.get("itemName")).startswith("흑아 :")
    ]
    if not targets:
        return {"recommendations": [], "steps": steps}

    item_ids = []
    target_pairs = []
    scroll_names = sorted({get_black_fang_scroll_name(equipment.get("setItemName")) for equipment in targets if get_black_fang_scroll_name(equipment.get("setItemName"))})
    scroll_items = {}
    scroll_lookup_started_at = time.perf_counter()
    for scroll_name in scroll_names:
        scroll = find_exact_item_by_name(scroll_name)
        if scroll.get("itemId"):
            scroll_items[scroll_name] = scroll
            item_ids.append(scroll.get("itemId"))
    steps.append({
        "name": "find_scroll_items",
        "ms": round((time.perf_counter() - scroll_lookup_started_at) * 1000, 1),
        "count": len(scroll_names),
    })
    black_item_lookup_started_at = time.perf_counter()
    for equipment in targets:
        black_name = f"흑아 : {clean_text(equipment.get('itemName'))}"
        black_item = find_exact_item_by_name(black_name, clean_text(equipment.get("itemTypeDetail")))
        if not black_item.get("itemId"):
            continue
        target_pairs.append((equipment, black_item))
        item_ids.extend([clean_text(equipment.get("itemId")), black_item.get("itemId")])
    steps.append({
        "name": "find_black_items",
        "ms": round((time.perf_counter() - black_item_lookup_started_at) * 1000, 1),
        "count": len(targets),
    })

    details_by_id = _measure_step(
        steps,
        "fetch_related_item_details",
        lambda: {
            detail.get("itemId"): detail
            for detail in fetch_item_details([item_id for item_id in item_ids if item_id])
        },
    )
    scroll_price_cache = {}
    recommendations = []
    auction_lookup_ms = 0.0
    material_enrich_ms = 0.0
    for equipment, black_item in target_pairs:
        scroll_name = get_black_fang_scroll_name(equipment.get("setItemName"))
        scroll_item = scroll_items.get(scroll_name) or {}
        scroll_id = scroll_item.get("itemId")
        if scroll_id not in scroll_price_cache:
            auction_started_at = time.perf_counter()
            try:
                auction = get_lowest_auction_price(scroll_id) if scroll_id else {}
            except Exception:
                auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
            scroll_price_cache[scroll_id] = auction
            auction_lookup_ms += (time.perf_counter() - auction_started_at) * 1000
        auction = dict(scroll_price_cache.get(scroll_id) or {})
        scroll_detail = details_by_id.get(scroll_id) or {}
        scroll_cost = parse_black_fang_scroll_cost(scroll_detail)
        scroll_price = auction.get("minUnitPrice")
        fixed_gold = scroll_cost.get("fixedGold") or 0
        if isinstance(scroll_price, (int, float)) and scroll_price > 0:
            auction["minUnitPrice"] = scroll_price + fixed_gold
            auction["scrollUnitPrice"] = scroll_price
            auction["fixedGold"] = fixed_gold

        current_detail = details_by_id.get(clean_text(equipment.get("itemId"))) or {}
        black_detail = details_by_id.get(black_item.get("itemId")) or {}
        current_effects = normalize_enchant_status(current_detail.get("itemStatus") or [])
        black_effects = normalize_enchant_status(black_detail.get("itemStatus") or [])
        effects = subtract_effects(
            black_effects,
            current_effects,
        )
        if not effects:
            continue
        material_started_at = time.perf_counter()
        materials = enrich_black_fang_materials(scroll_cost.get("materials") or [])
        material_enrich_ms += (time.perf_counter() - material_started_at) * 1000
        material_text = format_materials_text(materials)
        recommendations.append({
            "slot": clean_text(equipment.get("slotName")),
            "tier": "흑아",
            "itemId": scroll_id,
            "itemName": scroll_item.get("itemName") or scroll_name,
            "itemRarity": scroll_item.get("itemRarity"),
            "iconUrl": get_item_icon_url(scroll_id),
            "itemExplain": f"{clean_text(equipment.get('itemName'))} -> {clean_text(black_item.get('itemName'))}",
            "effects": effects,
            "currentEffects": current_effects,
            "targetEffects": black_effects,
            "auction": auction,
            "expectedGold": auction.get("minUnitPrice"),
            "materials": materials,
            "materialText": material_text,
            "targetItemName": clean_text(black_item.get("itemName")),
        })
    steps.extend([
        {
            "name": "get_scroll_auction_prices",
            "ms": round(auction_lookup_ms, 1),
            "uniqueCount": len(scroll_price_cache),
        },
        {
            "name": "enrich_material_items",
            "ms": round(material_enrich_ms, 1),
            "count": len(recommendations),
        },
    ])
    return {"recommendations": recommendations, "steps": steps}


def build_black_fang_recommendations(equipment_rows: list) -> list:
    return _build_black_fang_recommendations_debug(equipment_rows).get("recommendations") or []


def find_avatar_option_entry(payload: dict) -> dict:
    db = load_avatar_option_db()
    job_name = clean_text(payload.get("jobName"))
    job_grow_name = normalize_job_name(payload.get("jobGrowName"))
    entries = db.get("entries") or []
    matched = [
        entry for entry in entries
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


def find_avatar_platinum_item(skill_name: str) -> dict:
    item_name = f"플래티넘 엠블렘[{clean_text(skill_name)}]"
    rows = search_items_by_name(item_name)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
    ]
    if not exact_rows:
        return {
            "itemName": item_name,
            "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None},
        }
    candidates = []
    for row in exact_rows:
        item_id = clean_text(row.get("itemId"))
        if not item_id:
            continue
        try:
            auction = get_lowest_auction_price(item_id)
        except Exception:
            auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
        candidates.append({
            "itemId": item_id,
            "itemName": clean_item_display_name(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": get_item_icon_url(item_id),
            "auction": auction,
        })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={"itemName": item_name, "auction": {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}},
    )


def format_price_label(value) -> str:
    return f"{int(value):,}골드" if isinstance(value, (int, float)) and value > 0 else "매물 없음"


def find_avatar_platinum_selection_box() -> dict:
    selectable_names = {
        "기본 플래티넘 엠블렘 선택 상자",
        "프리미엄 플래티넘 엠블렘 선택 상자",
    }
    candidates = []
    seen_ids = set()
    for item_name in ["플래티넘 엠블렘 선택 상자", "플래티넘 선택 상자", "엠블렘 선택 상자"]:
        try:
            rows = search_items_by_name(item_name)
        except Exception:
            continue
        for row in rows:
            row_name = clean_text(row.get("itemName"))
            if row_name not in selectable_names:
                continue
            item_id = clean_text(row.get("itemId"))
            if not item_id or item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            try:
                auction = get_lowest_auction_price(item_id)
            except Exception:
                auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
            candidates.append({
                "itemId": item_id,
                "itemName": clean_item_display_name(row.get("itemName")),
                "itemRarity": clean_text(row.get("itemRarity")),
                "iconUrl": get_item_icon_url(item_id),
                "auction": auction,
            })
    return min(
        candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={},
    )


def choose_avatar_platinum_price_item(skill_name: str) -> dict:
    direct = find_avatar_platinum_item(skill_name)
    selection_box = find_avatar_platinum_selection_box()
    direct_price = direct.get("auction", {}).get("minUnitPrice")
    box_price = selection_box.get("auction", {}).get("minUnitPrice")
    use_box = (
        isinstance(box_price, (int, float)) and box_price > 0
        and (
            not isinstance(direct_price, (int, float))
            or direct_price <= 0
            or box_price < direct_price
        )
    )
    selected = selection_box if use_box else direct
    return {
        **selected,
        "priceSource": "selectionBox" if use_box else "direct",
        "directItem": direct,
        "selectionBoxItem": selection_box,
        "priceCompareText": (
            f"직접 플티 {format_price_label(direct_price)}"
            f" / 선택 상자 {format_price_label(box_price)}"
        ),
    }


def load_character_avatar(server_id: str, character_id: str, buffer_baseline: dict | None = None) -> dict:
    steps = []
    payload = _get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
    avatar_rows = payload.get("avatar") or []
    jacket = get_avatar_slot(avatar_rows, "JACKET")
    pants = get_avatar_slot(avatar_rows, "PANTS")
    entry = _measure_step(steps, "find_avatar_option_entry", lambda: find_avatar_option_entry(payload))
    option_db = entry.get("avatar") or {}
    buffer_stat_name = get_character_buffer_stat_name(payload, server_id, character_id)
    primary_stat_name = buffer_stat_name or get_character_primary_stat_name(payload)
    top_option = clean_text((option_db.get("topOptions") or [""])[0])
    platinum_skill = clean_text((option_db.get("platinumEmblems") or [""])[0])
    top_option_matched = skill_name_matches(jacket.get("optionAbility"), top_option)
    switching_rows = []
    if buffer_stat_name:
        switching_payload = _get_character_cached_payload(
            server_id,
            character_id,
            "buff_avatar",
            "skill/buff/equip/avatar",
        )
        switching_rows = ((switching_payload.get("skill") or {}).get("buff") or {}).get("avatar") or []
    switching_rare_slot_ids = {
        slot_id
        for slot_id in ("JACKET", "PANTS")
        if clean_text(get_avatar_slot(switching_rows, slot_id).get("itemRarity")) == "레어"
    }

    platinum_slots = []
    missing_or_wrong_slots = []
    for slot_id, slot_label, row in [
        ("JACKET", "상의 아바타", jacket),
        ("PANTS", "하의 아바타", pants),
    ]:
        if clean_text(row.get("itemRarity")) != "레어":
            continue
        emblems = get_platinum_emblems(row)
        matched = any(
            skill_name_matches(extract_platinum_skill_name(emblem.get("itemName")), platinum_skill)
            for emblem in emblems
        ) if platinum_skill else False
        if matched:
            platinum_slots.append(slot_label)
        else:
            missing_or_wrong_slots.append(slot_label)

    rare_slots = [
        clean_text(row.get("slotName"))
        for row in avatar_rows
        if clean_text(row.get("itemRarity")) == "레어"
    ]
    missing_base_rare_slots = [
        clean_text(slot.get("slotName")) or slot_id
        for slot_id in AVATAR_BASE_RARE_SLOT_IDS
        for slot in [get_avatar_slot(avatar_rows, slot_id)]
        if clean_text(slot.get("itemRarity")) != "레어"
    ]
    needs_rare_avatar_set = bool(missing_base_rare_slots)
    clone_slots = [
        clean_text(row.get("slotName"))
        for row in avatar_rows
        if is_rare_clone_avatar(row)
    ]
    recommendations = []
    buffer_platinum_deltas = {}
    buffer_skill_levels = {}
    if buffer_stat_name and platinum_skill and missing_or_wrong_slots:
        if not buffer_baseline:
            buffer_baseline = load_character_buffer_baseline(server_id, character_id) or {}
        buffer_skill_levels = buffer_baseline
        buffer_platinum_deltas = _measure_step(
            steps,
            "get_buffer_platinum_stat_deltas",
            lambda: get_buffer_platinum_stat_deltas(
                buffer_baseline,
                avatar_rows,
                platinum_skill,
                ["JACKET" if slot == "상의 아바타" else "PANTS" for slot in missing_or_wrong_slots],
            ),
        )
    if platinum_skill and missing_or_wrong_slots:
        item = _measure_step(steps, "choose_avatar_platinum_price_item", lambda: choose_avatar_platinum_price_item(platinum_skill))
        for slot_label in missing_or_wrong_slots:
            slot_id = "JACKET" if slot_label == "상의 아바타" else "PANTS"
            platinum_delta = buffer_platinum_deltas.get(slot_id) or {}
            buffer_stat_scope = (
                "current"
                if buffer_stat_name and slot_id in switching_rare_slot_ids
                else "common" if buffer_stat_name else ""
            )
            current_platinum_skill = clean_text(platinum_delta.get("currentSkill"))
            buff_skill_name = clean_text(buffer_skill_levels.get("buffSkillName"))
            awakening_skill_name = clean_text(buffer_skill_levels.get("awakeningSkillName"))
            recommendations.append({
                "kind": "platinumEmblem",
                "slot": slot_label,
                "tier": "플래티넘",
                "itemId": item.get("itemId"),
                "itemName": item.get("itemName") or f"플래티넘 엠블렘[{platinum_skill}]",
                "itemRarity": item.get("itemRarity"),
                "iconUrl": item.get("iconUrl"),
                "itemExplain": f"{slot_label} 플래티넘 교체 필요 · {item.get('priceCompareText')}",
                "effects": (
                    {"bufferStat": platinum_delta.get("statDelta", 0)}
                    if buffer_stat_name
                    else {"finalDamage": get_avatar_platinum_damage_percent(slot_label)}
                ),
                "auction": item.get("auction") or {},
                "needCount": 1,
                "targetSkill": platinum_skill,
                "bufferSkillStatDeltas": platinum_delta.get("skillDeltas") or {},
                "bufferSkillLevels": platinum_delta.get("skillLevels") or {},
                "currentPlatinumSkill": current_platinum_skill,
                "bufferBuffSkillLevelDelta": (
                    (1 if platinum_skill == buff_skill_name else 0)
                    - (1 if current_platinum_skill == buff_skill_name else 0)
                    if buffer_stat_scope == "common"
                    else 0
                ),
                "bufferAwakeningSkillLevelDelta": (
                    (1 if platinum_skill == awakening_skill_name else 0)
                    - (1 if current_platinum_skill == awakening_skill_name else 0)
                    if buffer_stat_name
                    else 0
                ),
                "missingSlots": [slot_label],
                "priceSource": item.get("priceSource"),
                "bufferStatScope": buffer_stat_scope,
                "recommendationPriority": 0,
            })
    if buffer_stat_name:
        current_buffer_configs, switching_buffer_configs = get_buffer_avatar_emblem_configs(switching_rows)
        recommendations.extend(_measure_step(
            steps,
            "build_buffer_avatar_emblem_recommendations",
            lambda: build_avatar_emblem_recommendations(
                avatar_rows,
                primary_stat_name,
                current_buffer_configs,
                True,
            ),
        ))
        recommendations.extend(_measure_step(
            steps,
            "build_buffer_switching_avatar_emblem_recommendations",
            lambda: build_avatar_emblem_recommendations(
                switching_rows,
                primary_stat_name,
                switching_buffer_configs,
                True,
            ),
        ))
    else:
        recommendations.extend(_measure_step(
            steps,
            "build_avatar_emblem_recommendations",
            lambda: build_avatar_emblem_recommendations(avatar_rows, primary_stat_name),
        ))
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "jobName": payload.get("jobName"),
        "jobGrowName": payload.get("jobGrowName"),
        "fame": payload.get("fame"),
        "avatar": {
            "dbMatched": bool(entry),
            "primaryStatName": primary_stat_name,
            "expectedTopOption": top_option,
            "expectedPlatinumEmblem": platinum_skill,
            "rareAvatarCount": len(rare_slots),
            "rareAvatarSlots": rare_slots,
            "rareCloneAvatarCount": len(clone_slots),
            "rareCloneAvatarSlots": clone_slots,
            "jacket": {
                "itemName": clean_text(jacket.get("itemName")),
                "itemRarity": clean_text(jacket.get("itemRarity")),
                "isRare": clean_text(jacket.get("itemRarity")) == "레어",
                "isRareClone": is_rare_clone_avatar(jacket),
                "optionAbility": clean_text(jacket.get("optionAbility")),
                "topOptionMatched": top_option_matched,
            },
            "pants": {
                "itemName": clean_text(pants.get("itemName")),
                "itemRarity": clean_text(pants.get("itemRarity")),
                "isRare": clean_text(pants.get("itemRarity")) == "레어",
                "isRareClone": is_rare_clone_avatar(pants),
            },
            "platinumCount": len(platinum_slots),
            "platinumSlots": platinum_slots,
            "missingOrWrongPlatinumSlots": missing_or_wrong_slots,
            "needsRareAvatarSet": needs_rare_avatar_set,
            "missingBaseRareAvatarSlots": missing_base_rare_slots,
            "rareAvatarSetPurchasable": False,
            "needsReview": bool(option_db.get("needsReview")),
        },
        "recommendations": recommendations,
        "debugTimings": {
            "steps": steps,
        },
    }
