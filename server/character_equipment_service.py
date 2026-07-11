import re
import threading
import time

from .data_store import (
    load_avatar_option_db,
    load_dealer_switching_buff_db,
    load_dealer_switching_creature_db,
    load_dealer_switching_title_db,
    load_job_base_stats,
    load_oath_tune_stage_db,
    load_switching_avatar_db,
    load_upgrade_expected_db,
)
from .api_fanout_trace import finish_api_fanout_trace, start_api_fanout_trace
from .effects import get_creature_artifact_status_summary, get_title_enchant_status_summary, normalize_enchant_status, order_effects, parse_percent_or_number
from .avatar_skill_optimizer import (
    flatten_skill_rows,
    get_avatar_candidate_combos,
    normalize_skill_key,
    select_best_avatar_combo_for_character,
)
from .calculators.avatar_skill_calculator import (
    get_avatar_platinum_skill_damage_multiplier,
    get_skill_level_labeled_value,
    get_skill_level_stat_value,
)
from .calculators.switching_calculator import (
    get_applied_switching_multiplier,
    get_damage_application_note,
    get_switching_damage_multiplier,
    get_switching_fragment_coefficients,
    match_current_switching_coefficients,
)
from .item_skill_option_service import get_character_skill_context, get_item_reinforce_skill_effect, get_item_reinforce_skill_matches
from .candidates.avatar_emblem import (
    BUFFER_AVATAR_EMBLEM_RECOMMENDATIONS,
    BUFFER_SWITCHING_AVATAR_EMBLEM_RECOMMENDATIONS,
    build_avatar_emblem_recommendations_debug,
    find_lowest_avatar_emblem_by_prefix,
    get_avatar_emblem_item_name,
    get_emblem_stat_value,
)
from .candidates.black_fang import build_black_fang_recommendations_debug
from .candidates.oath_transcend import build_oath_craft_recommendations_debug, build_oath_transcend_recommendations_debug
from .candidates.switching_fragment import (
    SWITCHING_FRAGMENT_TARGET_SLOTS,
    get_switching_fragment_auction_candidate_groups,
    get_switching_fragment_candidate_items,
    get_switching_fragment_slot,
    item_detail_matches_job,
)
from .neople_client import (
    clean_item_display_name,
    clean_text,
    fetch_skill_detail_from_api,
    get_item_explain,
    get_item_icon_url,
)
from .ops_log import write_ops_log
from .repositories.auction_repository import get_auction_rows, get_auction_rows_by_item_ids, get_auction_rows_by_name, get_lowest_auction_price, get_lowest_auction_prices
from .repositories.character_repository import (
    get_character_cached_computed_payload,
    get_character_cached_payload,
    save_character_cached_computed_payload,
)
from .repositories.item_repository import fetch_item_details, search_items_by_name
from .repositories.material_price_repository import load_upgrade_material_prices
from .repositories.resolved_price_repository import get_cached_resolved_price
from .presenters.switching_fragment_presenter import build_switching_fragment_recommendation_row
from .presenters.switching_title_presenter import build_switching_title_recommendation_row
from .presenters.switching_creature_presenter import build_switching_creature_recommendation_row
from .presenters.switching_platinum_presenter import build_switching_platinum_recommendation_row
from .presenters.platinum_emblem_presenter import build_platinum_emblem_recommendation_row
from .presenters.buffer_switching_title_presenter import build_buffer_switching_title_recommendation_row
from .presenters.character_preview_presenter import build_character_preview_payload
from .presenters.character_avatar_presenter import build_character_avatar_payload
from .presenters.character_enchants_presenter import build_character_enchants_payload
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
SWITCHING_CREATURE_CANDIDATE_CACHE_TTL_SECONDS = 600
SWITCHING_LEVEL_CAP = 7
EQUIPMENT_PRIMEVAL_SET_POINT_CUTOFF = 2550
AVATAR_EMBLEM_AUCTION_PAGE_LIMIT = 100
AVATAR_EMBLEM_AUCTION_MAX_PAGES = 5
AVATAR_PLATINUM_RESOLVED_PRICE_CACHE_VERSION = 1
SWITCHING_AVATAR_AUCTION_PAGE_LIMIT = 400
SWITCHING_AVATAR_AUCTION_MAX_PAGES = 20
SWITCHING_AVATAR_RESOLVED_PRICE_CACHE_VERSION = 2
_SWITCHING_CREATURE_CANDIDATE_CACHE_LOCK = threading.Lock()
_SWITCHING_CREATURE_CANDIDATE_CACHE = {}
BUFFER_SWITCHING_SELF_STAT_SKILLS = {
    "영광의 축복": {"수호의 은총", "보호의 징표", "신념의 오라", "신의 대행자", "디바인 플래쉬"},
    "용맹의 축복": {"계시 : 아리아", "신실한 열정", "라파엘의 축복", "루클렌티스 엔젤"},
    "금단의 저주": {"퍼페티어", "소악마", "어둠에 피는 장미", "불길한 눈웃음"},
    "러블리 템포": {"센세이션", "유명세", "오늘의 주인공", "브랜드 뉴", "에피소드 오브 하모니"},
    "squad::무기강화();": {"apius::전장정보();", "apius::대응체계();", "apius::제한해제();", "apius::하드코딩();", "squad::장갑강화();"},
}
BUFFER_SCORE_SKILLS = {
    "영광의 축복": {
        "activeSelfStat": {"신념의 오라", "보호의 징표"},
        "auraStat": {"신념의 오라"},
        "auraAttack": {"신념의 오라"},
    },
    "용맹의 축복": {
        "activeSelfStat": {"신실한 열정"},
        "auraStat": {"신실한 열정", "대천사의 축복"},
    },
    "금단의 저주": {
        "activeSelfStat": {"소악마"},
        "auraStat": {"소악마"},
    },
    "러블리 템포": {
        "activeSelfStat": {"유명세", "오늘의 주인공"},
        "auraStat": {"유명세"},
    },
    "squad::무기강화();": {
        "activeSelfStat": {"apius::대응체계();", "squad::장갑강화();"},
        "auraStat": {"apius::대응체계();"},
    },
}


def combine_effects(*effect_rows: dict) -> dict:
    result = {}
    for effects in effect_rows:
        for key, value in (effects or {}).items():
            result[key] = result.get(key, 0) + value
    return order_effects(result)


def _measure_step(steps: list, name: str, fn):
    started_at = time.perf_counter()
    result = fn()
    steps.append({
        "name": name,
        "ms": round((time.perf_counter() - started_at) * 1000, 1),
    })
    return result


def _append_prefetch_item_id(item_ids: list, seen: set, item_id: str):
    item_id = clean_text(item_id)
    if item_id and item_id not in seen:
        seen.add(item_id)
        item_ids.append(item_id)


def _append_equipped_item_ids(item_ids: list, seen: set, rows: list):
    for row in rows or []:
        if isinstance(row, dict):
            _append_prefetch_item_id(item_ids, seen, row.get("itemId"))


def _append_creature_item_ids(item_ids: list, seen: set, creature: dict):
    if not isinstance(creature, dict):
        return
    _append_prefetch_item_id(item_ids, seen, creature.get("itemId"))
    _append_equipped_item_ids(item_ids, seen, creature.get("artifact") or [])


def collect_loadout_prefetch_item_ids(payloads: dict) -> list[str]:
    item_ids = []
    seen = set()

    equipment_payload = payloads.get("equipment") or {}
    _append_equipped_item_ids(item_ids, seen, equipment_payload.get("equipment") or [])

    avatar_payload = payloads.get("avatar") or {}
    aura = next((
        row for row in avatar_payload.get("avatar") or []
        if (
            "오라" in clean_text(row.get("slotName"))
            or "오라" in clean_text(row.get("itemTypeDetail"))
            or "오라" in clean_text(row.get("itemName"))
        )
    ), {})
    _append_prefetch_item_id(item_ids, seen, aura.get("itemId"))

    creature_payload = payloads.get("creature") or {}
    _append_creature_item_ids(item_ids, seen, creature_payload.get("creature") or {})

    buff_equipment_payload = payloads.get("buff_equipment") or {}
    buff_equipment = ((buff_equipment_payload.get("skill") or {}).get("buff") or {}).get("equipment") or []
    _append_equipped_item_ids(item_ids, seen, buff_equipment)

    buff_creature_payload = payloads.get("buff_creature") or {}
    buff_creature = ((buff_creature_payload.get("skill") or {}).get("buff") or {}).get("creature") or {}
    _append_creature_item_ids(item_ids, seen, buff_creature)

    return item_ids


def prefetch_loadout_item_details(server_id: str, character_id: str) -> dict:
    resource_specs = {
        "equipment": ("equipment", "equip/equipment"),
        "avatar": ("avatar", "equip/avatar"),
        "creature": ("creature", "equip/creature"),
        "buff_equipment": ("buff_equipment", "skill/buff/equip/equipment"),
        "buff_creature": ("buff_creature", "skill/buff/equip/creature"),
    }
    payloads = {}
    errors = []
    for name, (resource, path) in resource_specs.items():
        try:
            payloads[name] = get_character_cached_payload(server_id, character_id, resource, path)
        except Exception as error:
            errors.append({"resource": resource, "error": str(error)})

    item_ids = collect_loadout_prefetch_item_ids(payloads)
    if item_ids:
        try:
            fetch_item_details(item_ids)
        except Exception as error:
            errors.append({"resource": "item_details", "error": str(error)})
    if errors:
        write_ops_log(
            "loadout_item_prefetch_error",
            route="/api/character-loadout",
            serverId=server_id,
            characterId=character_id,
            itemCount=len(item_ids),
            errors=errors,
        )
    return {"itemCount": len(item_ids), "errors": errors}


def build_buff_loadout_item_payload(row: dict, buff_contribution: dict | None = None) -> dict:
    if not isinstance(row, dict):
        return {}
    item_id = clean_text(row.get("itemId"))
    if not item_id and not clean_item_display_name(row.get("itemName")):
        return {}
    payload = {
        "slotId": clean_text(row.get("slotId")),
        "slotName": clean_text(row.get("slotName")),
        "itemId": item_id,
        "itemName": clean_item_display_name(row.get("itemName")),
        "itemRarity": clean_text(row.get("itemRarity")),
        "iconUrl": get_item_icon_url(item_id),
        "optionAbility": clean_text(row.get("optionAbility")),
    }
    if buff_contribution is not None:
        payload["buffContribution"] = buff_contribution
    return payload


def build_buff_loadout_payload(server_id: str, character_id: str) -> dict:
    equipment_payload = get_character_cached_payload(
        server_id,
        character_id,
        "buff_equipment",
        "skill/buff/equip/equipment",
    )
    avatar_payload = get_character_cached_payload(
        server_id,
        character_id,
        "buff_avatar",
        "skill/buff/equip/avatar",
    )
    creature_payload = get_character_cached_payload(
        server_id,
        character_id,
        "buff_creature",
        "skill/buff/equip/creature",
    )
    equipment_buff = ((equipment_payload.get("skill") or {}).get("buff") or {})
    avatar_buff = ((avatar_payload.get("skill") or {}).get("buff") or {})
    creature_buff = ((creature_payload.get("skill") or {}).get("buff") or {})
    skill_info = equipment_buff.get("skillInfo") or avatar_buff.get("skillInfo") or creature_buff.get("skillInfo") or {}
    buff_skill_name = clean_text(skill_info.get("name"))
    job_name = clean_text(equipment_payload.get("jobName"))
    job_grow_name = clean_text(equipment_payload.get("jobGrowName"))
    if not job_name or not job_grow_name:
        status_payload = get_character_cached_payload(server_id, character_id, "status", "status")
        job_name = job_name or clean_text(status_payload.get("jobName"))
        job_grow_name = job_grow_name or clean_text(status_payload.get("jobGrowName"))
    switching_context = {
        "jobName": job_name,
        "jobGrowName": job_grow_name,
    }
    switching_entry = find_dealer_switching_buff_entry(
        switching_context,
        is_dealer_crusader=job_name == "프리스트(남)" and buff_skill_name == "성령의 메이스",
    )
    max_skill_level = int((load_dealer_switching_buff_db().get("metadata") or {}).get("baseLevel") or 0) if (
        switching_entry and clean_text(switching_entry.get("buffSkillName")) == buff_skill_name
    ) else 0
    equivalent_skill_names = [
        clean_text(skill_name)
        for skill_name in switching_entry.get("equivalentSwitchingPlatinumSkills") or []
        if clean_text(skill_name)
    ]
    target_skill_names = get_switching_creature_target_skill_names(buff_skill_name, equivalent_skill_names)
    required_level = get_buff_skill_required_level(server_id, character_id, skill_info) if buff_skill_name else 0
    target_required_levels = get_switching_skill_required_levels(
        server_id,
        character_id,
        skill_info,
        target_skill_names,
    ) if required_level > 0 else []
    equipment_rows = [row for row in equipment_buff.get("equipment") or [] if isinstance(row, dict)]
    avatar_rows = [row for row in avatar_buff.get("avatar") or [] if isinstance(row, dict)]
    creature_rows = creature_buff.get("creature") or []
    if isinstance(creature_rows, dict):
        creature_rows = [creature_rows]
    creature_rows = [row for row in creature_rows if isinstance(row, dict)]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details([
            clean_text(row.get("itemId"))
            for row in [*equipment_rows, *creature_rows]
            if clean_text(row.get("itemId"))
        ])
        if clean_text(detail.get("itemId"))
    }

    def build_equipment_contribution(row: dict) -> dict:
        item_id = clean_text(row.get("itemId"))
        detail = detail_by_id.get(item_id) or {}
        if clean_text(row.get("slotId")) == "TITLE":
            skill_level = None if not required_level or not detail else get_switching_title_contribution(
                row,
                detail,
                job_name,
                buff_skill_name,
                required_level,
                equivalent_skill_names,
                target_required_levels,
            )
            return {"skillLevel": skill_level}
        additional_rate = None if not detail else get_switching_fragment_coefficients(
            detail,
            buff_skill_name,
            1,
        )[0]
        return {
            "additionalRatePercent": additional_rate,
            "additionalRateText": clean_text(get_item_explain(detail)) if additional_rate else "",
        }

    def build_avatar_contribution(row: dict) -> dict:
        platinum_skill_level = sum(
            1
            for emblem in get_platinum_emblems(row)
            if is_matching_switching_platinum_emblem(emblem, target_skill_names)
        )
        if clean_text(row.get("slotId")) == "JACKET":
            return {
                "topOptionSkillLevel": 1 if has_matching_switching_avatar_top_option(row, target_skill_names) else 0,
                "platinumSkillLevel": platinum_skill_level,
            }
        return {"platinumSkillLevel": platinum_skill_level}

    def build_creature_contribution(row: dict) -> dict:
        item_id = clean_text(row.get("itemId"))
        detail = detail_by_id.get(item_id) or {}
        skill_level = None if not required_level or not detail else get_switching_creature_contribution(
            row,
            detail,
            job_name,
            buff_skill_name,
            required_level,
            equivalent_skill_names,
            target_required_levels,
        )
        return {"skillLevel": skill_level}

    return {
        "skillInfo": {
            "skillId": clean_text(skill_info.get("skillId")),
            "name": clean_text(skill_info.get("name")),
            "level": int(((skill_info.get("option") or {}).get("level")) or 0),
            "maxLevel": max_skill_level,
            "iconUrl": "",
        },
        "equipment": [
            item
            for row in equipment_rows
            if (item := build_buff_loadout_item_payload(row, build_equipment_contribution(row)))
        ],
        "avatar": [
            item
            for row in avatar_rows
            if (item := build_buff_loadout_item_payload(row, build_avatar_contribution(row)))
        ],
        "creature": [
            item
            for row in creature_rows
            if (item := build_buff_loadout_item_payload(row, build_creature_contribution(row)))
        ],
    }


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


def get_equipment_detail_base_element_bonus(detail: dict) -> float:
    effects = normalize_enchant_status(detail.get("itemStatus") or [])
    explain_element = parse_element_bonus_from_text(
        detail.get("itemExplainDetail") or detail.get("itemExplain") or ""
    )
    return max(effects.get("elementAll", 0), explain_element)


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
        total += get_equipment_detail_base_element_bonus(detail)
    steps.append({
        "name": "parse_item_details",
        "ms": round((time.perf_counter() - parse_started_at) * 1000, 1),
        "itemCount": len(details),
    })
    return {"value": total, "steps": steps}


def get_equipment_base_element_bonus(equipment_rows: list) -> float:
    return _get_equipment_base_element_bonus_debug(equipment_rows).get("value") or 0


def build_damage_baseline_from_status_payload(payload: dict, equipment_base_element: float = 0) -> dict:
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
    adjusted_element_values = {
        key: value + equipment_base_element
        for key, value in element_values.items()
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
    attack_source = "physical"
    if attack_value == status.get("마법 공격", 0):
        attack_source = "magical"
    if attack_value == status.get("독립 공격", 0):
        attack_source = "independent"
    return {
        "stat": status.get(selected_stat_name, 0),
        "statName": selected_stat_name,
        "baseStat": parse_percent_or_number(base_stats.get(selected_stat_name)),
        "jobGrowName": job_grow_name,
        "attack": attack_value,
        "attackSource": attack_source,
        "element": element_strength,
        "elementName": top_elements[0] if top_elements else "",
        "elementNames": top_elements,
        "elementValues": adjusted_element_values,
        "elementDamage": element_damage,
        "equipmentBaseElement": equipment_base_element,
        "attackIncrease": status.get("공격력 증가", 0),
        "attackAmplification": status.get("공격력 증폭", 0),
    }


def load_character_damage_baseline(server_id: str, character_id: str, equipment_base_element: float = 0) -> dict:
    payload = get_character_cached_payload(server_id, character_id, "status", "status")
    return build_damage_baseline_from_status_payload(payload, equipment_base_element)


def load_character_buffer_baseline(server_id: str, character_id: str) -> dict | None:
    payload = get_character_cached_payload(server_id, character_id, "status", "status")
    status = status_rows_to_map(payload.get("status") or [])
    job_name = clean_text(payload.get("jobName"))
    job_grow_name = clean_text(payload.get("jobGrowName"))
    if (job_name, job_grow_name) == ("프리스트(남)", "眞 크루세이더") and is_male_crusader_dealer_style(server_id, character_id):
        return None
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


def is_male_crusader_dealer_style(server_id: str, character_id: str) -> bool:
    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    return any(
        clean_text(row.get("name")) == "성령의 메이스"
        and int(row.get("level") or row.get("skillLevel") or 0) > 0
        for row in flatten_skill_rows(style_payload)
    )


def get_named_skill_level_bonus(reinforce_skill: list, job_name: str, skill_name: str) -> int:
    return sum(
        int(skill.get("value") or 0)
        for job in reinforce_skill or []
        if not clean_text(job.get("jobName")) or clean_text(job.get("jobName")) in {"공통", job_name}
        for skill in job.get("skills") or []
        if clean_text(skill.get("name")) == skill_name
    )


def get_named_skill_level_bonus_any(reinforce_skill: list, job_name: str, skill_names: list[str]) -> int:
    target_skill_names = [
        clean_text(skill_name)
        for skill_name in skill_names or []
        if clean_text(skill_name)
    ]
    if not target_skill_names:
        return 0
    return sum(
        get_named_skill_level_bonus(reinforce_skill, job_name, skill_name)
        for skill_name in target_skill_names
    )


def normalize_job_grow_name(value: str) -> str:
    return re.sub(r"^(眞|진|真)\s*", "", clean_text(value)).strip()


def get_item_level_range_skill_bonus(detail: dict, job_name: str, required_level: int) -> int:
    if required_level <= 0:
        return 0
    total = 0
    item_buff = detail.get("itemBuff") or {}
    reinforce_skill_groups = [
        *(detail.get("itemReinforceSkill") or []),
        *(item_buff.get("reinforceSkill") or []),
    ]
    for job in reinforce_skill_groups:
        if clean_text(job.get("jobName")) not in {"", "공통", job_name}:
            continue
        for level_range in job.get("levelRange") or []:
            minimum = int(level_range.get("minLevel") or 0)
            maximum = int(level_range.get("maxLevel") or 0)
            value = int(level_range.get("value") or 0)
            if minimum <= required_level <= maximum:
                total += value
    explain = clean_text(item_buff.get("explain"))
    for match in re.finditer(r"(\d+)\s*~\s*(\d+)\s*(?:레벨|Lv)[^+\d]*스킬\s*Lv\s*\+\s*(\d+)", explain, re.IGNORECASE):
        minimum = int(match.group(1))
        maximum = int(match.group(2))
        value = int(match.group(3))
        if minimum <= required_level <= maximum:
            total += value
    return total


def get_item_level_range_skill_bonus_by_required_levels(detail: dict, job_name: str, required_levels: list[int]) -> int:
    return sum(
        get_item_level_range_skill_bonus(detail, job_name, int(required_level or 0))
        for required_level in required_levels or []
        if int(required_level or 0) > 0
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
    buff_payload = get_character_cached_payload(
        server_id,
        character_id,
        "buff_equipment",
        "skill/buff/equip/equipment",
    )
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    buff_skill_level = int(((skill_info.get("option") or {}).get("level")) or 0)

    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    awakening_row = next(
        (
            row for row in flatten_skill_rows(style_payload)
            if row.get("_skillType") == "active" and int(row.get("requiredLevel") or 0) == 50
        ),
        {},
    )
    awakening_skill_name = clean_text(awakening_row.get("name"))
    awakening_base_level = max(15, int(awakening_row.get("level") or 0)) if awakening_skill_name else 0

    equipment_payload = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
    avatar_payload = get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
    creature_payload = get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
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


def build_equipment_upgrade_payload(equipment: dict) -> dict:
    slot_name = clean_text(equipment.get("slotName"))
    slot_id = clean_text(equipment.get("slotId"))
    reinforce = int(parse_percent_or_number(equipment.get("reinforce")))
    refine = int(parse_percent_or_number(equipment.get("refine")))
    amplification_name = clean_text(equipment.get("amplificationName"))
    item_id = clean_text(equipment.get("itemId"))
    item_name = clean_text(equipment.get("itemName"))
    item_rarity = clean_text(equipment.get("itemRarity"))
    tune_rows = [tune for tune in equipment.get("tune") or [] if isinstance(tune, dict)]
    tune_level = max([int(parse_percent_or_number(tune.get("level"))) for tune in tune_rows] or [0])
    tune_set_point = sum(parse_percent_or_number(tune.get("setPoint")) for tune in tune_rows)
    tune_upgradeable = any(tune.get("upgrade") is not False for tune in tune_rows)
    is_unique_equipment = re.match(r"^고유\s*[:\-]", item_name) is not None
    is_tune_target = item_rarity in {"에픽", "레전더리"} and not is_unique_equipment
    tune_remaining = max(0, 3 - tune_level) if is_tune_target and tune_upgradeable else 0
    return {
        "slot": slot_name,
        "slotId": slot_id,
        "itemId": item_id,
        "itemName": item_name,
        "itemRarity": item_rarity,
        "iconUrl": get_item_icon_url(item_id) if item_id else "",
        "reinforce": reinforce,
        "refine": refine,
        "amplificationName": amplification_name,
        "isAmplified": bool(amplification_name),
        "tuneLevel": tune_level,
        "tuneSetPoint": tune_set_point,
        "tuneUpgradeable": bool(is_tune_target and tune_upgradeable),
        "tuneRemaining": tune_remaining,
    }


def get_equipment_total_set_point(equipment_rows: list) -> float:
    return sum(
        parse_percent_or_number(tune.get("setPoint"))
        for equipment in equipment_rows or []
        if isinstance(equipment, dict)
        for tune in equipment.get("tune") or []
        if isinstance(tune, dict)
    )


def build_equipment_enchant_rows_and_upgrades(equipment_rows: list) -> tuple[list, list]:
    rows = []
    equipment_upgrades = []
    for equipment in equipment_rows or []:
        slot_name = clean_text(equipment.get("slotName"))
        if slot_name:
            equipment_upgrades.append(build_equipment_upgrade_payload(equipment))
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
    return rows, equipment_upgrades


def build_oath_upgrade_payload(oath_payload: dict, mist_assimilation_payload: dict | None = None) -> dict:
    oath = oath_payload.get("oath") or {}
    info = oath.get("info") or {}
    set_info = oath.get("setInfo") or {}
    active = set_info.get("active") or {}
    set_point = set_info.get("setPoint") or active.get("setPoint") or {}
    stage_point = parse_percent_or_number(set_point.get("current")) if isinstance(set_point, dict) else 0
    if not stage_point:
        stage_point = parse_percent_or_number(info.get("setPoint"))
        stage_point += sum(parse_percent_or_number(row.get("setPoint")) for row in oath.get("crystal") or [])
    unique_keyword = clean_text(load_oath_tune_stage_db().get("uniqueCrystalNameKeyword")) or "안개 결정"
    max_tune_level = int(load_oath_tune_stage_db().get("maxTuneLevel") or 3)
    oath_item_id = clean_text(info.get("itemId"))
    crystal_item_ids = [
        clean_text(crystal.get("itemId"))
        for crystal in oath.get("crystal") or []
        if isinstance(crystal, dict) and clean_text(crystal.get("itemId"))
    ]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details([oath_item_id, *crystal_item_ids])
        if clean_text(detail.get("itemId"))
    }
    crystals = []
    for index, crystal in enumerate(oath.get("crystal") or []):
        if not isinstance(crystal, dict):
            continue
        item_id = clean_text(crystal.get("itemId"))
        item_name = clean_text(crystal.get("itemName"))
        rarity = clean_text(crystal.get("itemRarity"))
        tune = crystal.get("tune") or {}
        tune_level = int(parse_percent_or_number(tune.get("level")))
        is_unique_crystal = unique_keyword in item_name if unique_keyword else False
        is_tune_target = rarity in {"레어", "유니크", "레전더리", "에픽"} and not is_unique_crystal
        crystals.append({
            "index": index,
            "itemId": item_id,
            "itemName": item_name,
            "itemRarity": rarity,
            "iconUrl": get_item_icon_url(item_id) if item_id else "",
            "effects": normalize_enchant_status((detail_by_id.get(item_id) or {}).get("itemStatus") or []),
            "tuneLevel": tune_level,
            "tuneUpgradeable": is_tune_target,
            "tuneRemaining": max(0, max_tune_level - tune_level) if is_tune_target else 0,
        })
    oath_effects = normalize_enchant_status((detail_by_id.get(oath_item_id) or {}).get("itemStatus") or [])
    if "안개" in clean_text(info.get("itemName")):
        mist_assimilation = (mist_assimilation_payload or {}).get("mistAssimilation") or {}
        mist_effects = normalize_enchant_status(mist_assimilation.get("status") or [])
        if mist_effects:
            oath_effects = mist_effects
    return {
        "itemId": oath_item_id,
        "itemName": clean_text(info.get("itemName")),
        "itemRarity": clean_text(info.get("itemRarity")),
        "iconUrl": get_item_icon_url(oath_item_id) if oath_item_id else "",
        "effects": oath_effects,
        "setName": clean_text(set_info.get("setName")),
        "setOptionName": clean_text(set_info.get("setOptionName")),
        "setRarityName": clean_text(set_info.get("setRarityName")),
        "setPoint": stage_point,
        "crystals": crystals,
    }


def load_character_oath_upgrades(server_id: str, character_id: str) -> dict:
    cached_payload = get_character_cached_computed_payload(server_id, character_id, "oathUpgrades")
    if cached_payload is not None:
        return cached_payload
    try:
        payload = get_character_cached_payload(server_id, character_id, "oath", "equip/oath")
    except Exception:
        return {}
    info = ((payload.get("oath") or {}).get("info") or {})
    mist_assimilation_payload = None
    if "안개" in clean_text(info.get("itemName")):
        try:
            mist_assimilation_payload = get_character_cached_payload(
                server_id,
                character_id,
                "mist_assimilation",
                "equip/mist-assimilation",
            )
        except Exception:
            mist_assimilation_payload = None
    oath_upgrades = build_oath_upgrade_payload(payload, mist_assimilation_payload)
    save_character_cached_computed_payload(server_id, character_id, "oathUpgrades", oath_upgrades)
    return oath_upgrades


def load_character_enchants(server_id: str, character_id: str) -> dict:
    steps = []
    payload = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
    rows, equipment_upgrades = build_equipment_enchant_rows_and_upgrades(payload.get("equipment") or [])
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
    upgrade_material_prices = _measure_step(
        steps,
        "load_upgrade_material_prices",
        load_upgrade_material_prices,
    )
    black_fang_debug = _measure_step(
        steps,
        "build_black_fang_recommendations",
        lambda: build_black_fang_recommendations_debug(payload.get("equipment") or [], upgrade_material_prices),
    )
    black_fang_recommendations = black_fang_debug.get("recommendations") or []
    oath_upgrades = _measure_step(
        steps,
        "load_character_oath_upgrades",
        lambda: load_character_oath_upgrades(server_id, character_id),
    )
    buffer_baseline = load_character_buffer_baseline(server_id, character_id)
    try:
        oath_payload = get_character_cached_payload(server_id, character_id, "oath", "equip/oath") if oath_upgrades else {}
    except Exception:
        oath_payload = {}
    equipment_set_point = get_equipment_total_set_point(payload.get("equipment") or [])
    allow_oath_decision_recommendations = equipment_set_point >= EQUIPMENT_PRIMEVAL_SET_POINT_CUTOFF
    if allow_oath_decision_recommendations:
        oath_transcend_debug = _measure_step(
            steps,
            "build_oath_transcend_recommendations",
            lambda: build_oath_transcend_recommendations_debug(oath_payload, buffer_baseline, load_oath_tune_stage_db(), payload.get("equipment") or []),
        )
        oath_craft_debug = _measure_step(
            steps,
            "build_oath_craft_recommendations",
            lambda: build_oath_craft_recommendations_debug(oath_payload, buffer_baseline, load_oath_tune_stage_db(), payload.get("equipment") or []),
        )
    else:
        skip_step = {
            "reason": "equipment_set_point_below_primeval_cutoff",
            "equipmentSetPoint": equipment_set_point,
            "requiredSetPoint": EQUIPMENT_PRIMEVAL_SET_POINT_CUTOFF,
        }
        oath_transcend_debug = {"recommendations": [], "steps": [skip_step]}
        oath_craft_debug = {"recommendations": [], "steps": [skip_step]}
    return build_character_enchants_payload(
        payload,
        damage_baseline,
        buffer_baseline,
        rows,
        equipment_upgrades,
        oath_upgrades,
        oath_transcend_debug.get("recommendations") or [],
        oath_craft_debug.get("recommendations") or [],
        load_oath_tune_stage_db(),
        black_fang_recommendations,
        load_upgrade_expected_db(),
        upgrade_material_prices,
        steps,
        {
            "get_equipment_base_element_bonus": equipment_base_element_debug.get("steps") or [],
            "build_black_fang_recommendations": black_fang_debug.get("steps") or [],
            "build_oath_transcend_recommendations": oath_transcend_debug.get("steps") or [],
            "build_oath_craft_recommendations": oath_craft_debug.get("steps") or [],
        },
    )


def load_character_creature(server_id: str, character_id: str) -> dict:
    steps = []
    payload = get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
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
    skill_effect = _measure_step(
        steps,
        "get_item_reinforce_skill_effect",
        lambda: get_item_reinforce_skill_effect(detail, get_character_skill_context(server_id, character_id)) if item_id else {},
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
            **skill_effect,
            "artifacts": artifacts,
        } if item_id else None,
        "debugTimings": {
            "steps": steps,
        },
    }


def load_character_title(server_id: str, character_id: str) -> dict:
    steps = []
    payload = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
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
    payload = get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
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
    equipment_payload = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
    creature_payload = get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    avatar_payload = get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
    detail_payload = get_character_cached_payload(server_id, character_id, "detail", "")
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
            equipment_upgrades.append(build_equipment_upgrade_payload(equipment))
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

    return build_character_preview_payload(
        equipment_payload,
        adventure_name,
        enchants,
        equipment_upgrades,
        title,
        creature,
        aura,
    )


def find_dealer_switching_buff_entry(payload: dict, is_dealer_crusader: bool = False) -> dict:
    job_name = clean_text(payload.get("jobName"))
    job_grow_name = normalize_job_grow_name(payload.get("jobGrowName"))
    target_job_name = "크루세이더(딜러)" if is_dealer_crusader and job_name == "프리스트(남)" else job_grow_name
    entries = load_dealer_switching_buff_db().get("jobs") or []
    class_entries = [
        entry for entry in entries
        if clean_text(entry.get("className")) == job_name
    ]
    for entry in class_entries:
        if clean_text(entry.get("jobName")) == target_job_name:
            return entry
    for entry in class_entries:
        normalized_entry_job = re.sub(r"\s*\((남|여)\)\s*$", "", clean_text(entry.get("jobName"))).strip()
        if normalized_entry_job == target_job_name:
            return entry
    return {}


def get_buff_skill_required_level(server_id: str, character_id: str, skill_info: dict) -> int:
    direct_level = int(skill_info.get("requiredLevel") or skill_info.get("requiredlevel") or 0)
    if direct_level:
        return direct_level
    skill_id = clean_text(skill_info.get("skillId"))
    skill_name = clean_text(skill_info.get("name"))
    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    for row in flatten_skill_rows(style_payload):
        if skill_id and clean_text(row.get("skillId")) == skill_id:
            return int(row.get("requiredLevel") or 0)
        if skill_name and clean_text(row.get("name")) == skill_name:
            return int(row.get("requiredLevel") or 0)
    return 0


def get_switching_skill_required_levels(
    server_id: str,
    character_id: str,
    skill_info: dict,
    target_skill_names: list[str],
) -> list[int]:
    target_skill_names = [clean_text(skill_name) for skill_name in target_skill_names or [] if clean_text(skill_name)]
    if not target_skill_names:
        return []
    buff_skill_name = clean_text(skill_info.get("name"))
    buff_required_level = get_buff_skill_required_level(server_id, character_id, skill_info)
    skill_context = None
    required_levels = []
    for skill_name in target_skill_names:
        required_level = 0
        if skill_name == buff_skill_name:
            required_level = buff_required_level
        else:
            if skill_context is None:
                skill_context = get_character_skill_context(server_id, character_id)
            skill_key = normalize_skill_key(skill_name)
            row = (skill_context.get("styleByName") or {}).get(skill_key) or (skill_context.get("skillByName") or {}).get(skill_key) or {}
            required_level = int(row.get("requiredLevel") or row.get("requiredlevel") or 0)
        if required_level > 0:
            required_levels.append(required_level)
    return required_levels


def get_switching_title_contribution(
    row: dict,
    detail: dict,
    job_name: str,
    buff_skill_name: str,
    required_level: int,
    equivalent_skill_names: list[str] | None = None,
    target_required_levels: list[int] | None = None,
) -> int:
    if not row:
        return 0
    item_buff = detail.get("itemBuff") or {}
    target_skill_names = get_switching_creature_target_skill_names(buff_skill_name, equivalent_skill_names)
    required_levels = target_required_levels if target_required_levels is not None else [required_level]
    return (
        get_item_level_range_skill_bonus_by_required_levels(detail, job_name, required_levels)
        + get_named_skill_level_bonus_any(detail.get("itemReinforceSkill") or [], job_name, target_skill_names)
        + get_named_skill_level_bonus_any(item_buff.get("reinforceSkill") or [], job_name, target_skill_names)
        + get_named_skill_level_bonus_any((row.get("enchant") or {}).get("reinforceSkill") or [], job_name, target_skill_names)
    )


def append_damage_application_note(text: str, note: str) -> str:
    note = clean_text(note)
    if not note:
        return clean_text(text)
    if not clean_text(text):
        return f"({note})"
    return f"{clean_text(text)} ({note})"


def auction_row_to_switching_title_price(row: dict) -> dict:
    return {
        "listingCount": int(row.get("regCount") or 1),
        "minUnitPrice": row.get("unitPrice") or row.get("currentPrice"),
        "averagePrice": row.get("averagePrice") if row.get("averagePrice", 0) > 0 else None,
        "auctionNo": row.get("auctionNo"),
        "expireDate": row.get("expireDate"),
    }


def auction_row_to_item_price(row: dict) -> dict:
    item_id = clean_text(row.get("itemId"))
    return {
        "itemId": item_id,
        "itemName": clean_item_display_name(row.get("itemName")),
        "itemRarity": clean_text(row.get("itemRarity")),
        "iconUrl": get_item_icon_url(item_id),
        "auction": auction_row_to_switching_title_price(row),
    }


def find_lowest_exact_auction_item_by_name(item_name: str, item_type_detail: str = "", word_type: str = "full") -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    if not item_name:
        return {}
    rows = get_auction_rows_by_name(item_name, word_type=word_type, limit=100)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
        and isinstance(row.get("unitPrice") or row.get("currentPrice"), (int, float))
        and (row.get("unitPrice") or row.get("currentPrice")) > 0
    ]
    row = min(matched, key=lambda item: item.get("unitPrice") or item.get("currentPrice"), default=None)
    return auction_row_to_item_price(row) if row else {}


def find_lowest_auction_item_by_allowed_names(query: str, allowed_names: set[str]) -> dict:
    query = clean_text(query)
    allowed_names = {clean_text(name) for name in allowed_names or [] if clean_text(name)}
    if not query or not allowed_names:
        return {}
    rows = []
    for allowed_name in sorted(allowed_names):
        rows.extend(get_auction_rows_by_name(allowed_name, word_type="match", limit=100))
    if not rows:
        rows = get_auction_rows_by_name(query, word_type="full", limit=100)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) in allowed_names
        and isinstance(row.get("unitPrice") or row.get("currentPrice"), (int, float))
        and (row.get("unitPrice") or row.get("currentPrice")) > 0
    ]
    row = min(matched, key=lambda item: item.get("unitPrice") or item.get("currentPrice"), default=None)
    return auction_row_to_item_price(row) if row else {}


def get_lowest_switching_fragment_auction(item_id: str) -> dict:
    priced_rows = [
        row for row in get_auction_rows(item_id, limit=100)
        if isinstance(row.get("unitPrice") or row.get("currentPrice"), (int, float))
        and (row.get("unitPrice") or row.get("currentPrice")) > 0
    ]
    if not priced_rows:
        return {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None, "expireDate": None}
    return auction_row_to_switching_title_price(min(
        priced_rows,
        key=lambda row: row.get("unitPrice") or row.get("currentPrice") or 10**30,
    ))


def load_dealer_switching_fragment_recommendations(
    server_id: str,
    character_id: str,
    entry: dict,
    buff_payload: dict,
    skill_info: dict,
    current_coefficients: list[float],
) -> list:
    buff_skill_name = clean_text(skill_info.get("name"))
    job_name = clean_text(buff_payload.get("jobName"))
    if not buff_skill_name or not current_coefficients:
        return []

    buff_equipment_rows = ((buff_payload.get("skill") or {}).get("buff") or {}).get("equipment") or []
    current_by_slot = {
        get_switching_fragment_slot(row): row
        for row in buff_equipment_rows
        if get_switching_fragment_slot(row)
    }
    dense_slots = {
        slot for slot, row in current_by_slot.items()
        if "짙은" in clean_text(row.get("itemName")) and "심연" in clean_text(row.get("itemName"))
    }

    candidate_groups_by_slot = get_switching_fragment_auction_candidate_groups(buff_skill_name, job_name, dense_slots)
    missing_candidate_slots = SWITCHING_FRAGMENT_TARGET_SLOTS - set(dense_slots) - set(candidate_groups_by_slot)
    if missing_candidate_slots:
        candidate_items = get_switching_fragment_candidate_items(buff_skill_name, job_name)
        candidate_by_slot = {}
        for row in candidate_items:
            slot = get_switching_fragment_slot(row)
            if not slot or slot not in missing_candidate_slots:
                continue
            auction = get_lowest_switching_fragment_auction(clean_text(row.get("itemId")))
            unit_price = auction.get("minUnitPrice")
            if not isinstance(unit_price, (int, float)) or unit_price <= 0:
                continue
            row = {**row, "auction": auction}
            previous = candidate_by_slot.get(slot)
            previous_price = (previous.get("auction") or {}).get("minUnitPrice") if previous else None
            if not previous or unit_price < previous_price:
                candidate_by_slot[slot] = row
        for slot, row in candidate_by_slot.items():
            candidate_groups_by_slot.setdefault(slot, [row])

    candidate_rows = [
        row
        for rows in candidate_groups_by_slot.values()
        for row in rows
    ]
    item_ids = [
        *[clean_text(row.get("itemId")) for row in candidate_rows],
        *[clean_text(row.get("itemId")) for row in current_by_slot.values()],
    ]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(item_ids)
        if clean_text(detail.get("itemId"))
    }
    current_multiplier = get_switching_damage_multiplier(current_coefficients)
    recommendations = []
    for slot, rows in candidate_groups_by_slot.items():
        for row in rows:
            candidate_detail = detail_by_id.get(clean_text(row.get("itemId"))) or {}
            if not item_detail_matches_job(candidate_detail, job_name):
                continue
            candidate_delta = get_switching_fragment_coefficients(candidate_detail, buff_skill_name, len(current_coefficients))
            if not any(candidate_delta):
                continue
            current_row = current_by_slot.get(slot) or {}
            current_detail = detail_by_id.get(clean_text(current_row.get("itemId"))) or {}
            current_delta = get_switching_fragment_coefficients(current_detail, buff_skill_name, len(current_coefficients))
            candidate_coefficients = [
                current - old + new
                for current, old, new in zip(current_coefficients, current_delta, candidate_delta)
            ]
            candidate_multiplier = get_switching_damage_multiplier(candidate_coefficients)
            if current_multiplier <= 0 or candidate_multiplier <= current_multiplier:
                continue
            raw_multiplier = candidate_multiplier / current_multiplier
            skill_damage_multiplier = get_applied_switching_multiplier(raw_multiplier, entry)
            note = get_damage_application_note(entry)
            item_explain = append_damage_application_note("", note)
            item_id = clean_text(row.get("itemId"))
            recommendations.append(build_switching_fragment_recommendation_row(
                item_id=item_id,
                item_name=clean_item_display_name(row.get("itemName")),
                item_rarity=clean_text(row.get("itemRarity")) or "유니크",
                icon_url=get_item_icon_url(item_id),
                fame=row.get("fame"),
                auction=row.get("auction") or {},
                skill_damage_multiplier=skill_damage_multiplier,
                raw_skill_damage_multiplier=raw_multiplier,
                damage_application_note=note,
                item_explain=item_explain,
                buff_skill_name=buff_skill_name,
                switching_slot=slot,
            ))
            break
    return recommendations


def load_dealer_switching_fragment_recommendations_for_character(
    server_id: str,
    character_id: str,
    buffer_baseline: dict | None = None,
) -> list:
    if buffer_baseline:
        return []
    buff_payload = get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
    if not clean_text(buff_payload.get("jobName")) or not clean_text(buff_payload.get("jobGrowName")):
        status_payload = get_character_cached_payload(server_id, character_id, "status", "status")
        buff_payload = {
            **buff_payload,
            "jobName": clean_text(buff_payload.get("jobName")) or clean_text(status_payload.get("jobName")),
            "jobGrowName": clean_text(buff_payload.get("jobGrowName")) or clean_text(status_payload.get("jobGrowName")),
        }
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    buff_skill_name = clean_text(skill_info.get("name"))
    if not buff_skill_name:
        return []
    is_dealer_crusader = (
        clean_text(buff_payload.get("jobName")) == "프리스트(남)"
        and clean_text(buff_payload.get("jobGrowName")) == "眞 크루세이더"
        and is_male_crusader_dealer_style(server_id, character_id)
    )
    entry = find_dealer_switching_buff_entry(buff_payload, is_dealer_crusader=is_dealer_crusader)
    if not entry or clean_text(entry.get("buffSkillName")) != buff_skill_name:
        return []
    current_coefficients = match_current_switching_coefficients(skill_info, entry)
    if not current_coefficients:
        return []
    return load_dealer_switching_fragment_recommendations(
        server_id,
        character_id,
        entry,
        buff_payload,
        skill_info,
        current_coefficients,
    )


def get_switching_creature_rows(buff_payload: dict) -> list:
    rows = ((buff_payload.get("skill") or {}).get("buff") or {}).get("creature") or []
    if isinstance(rows, list):
        return [row for row in rows if isinstance(row, dict)]
    return [rows] if isinstance(rows, dict) else []


def get_switching_creature_target_skill_names(buff_skill_name: str, equivalent_skill_names: list[str] | None = None) -> list[str]:
    target_skill_names = []
    for skill_name in [buff_skill_name, *(equivalent_skill_names or [])]:
        skill_name = clean_text(skill_name)
        if skill_name and skill_name not in target_skill_names:
            target_skill_names.append(skill_name)
    return target_skill_names


def get_switching_creature_contribution(
    row: dict,
    detail: dict,
    job_name: str,
    buff_skill_name: str,
    required_level: int,
    equivalent_skill_names: list[str] | None = None,
    target_required_levels: list[int] | None = None,
) -> int:
    if not row and not detail:
        return 0
    item_buff = detail.get("itemBuff") or {}
    target_skill_names = get_switching_creature_target_skill_names(buff_skill_name, equivalent_skill_names)
    required_levels = target_required_levels if target_required_levels is not None else [required_level]
    return (
        get_item_level_range_skill_bonus_by_required_levels(detail, job_name, required_levels)
        + get_named_skill_level_bonus_any(detail.get("itemReinforceSkill") or [], job_name, target_skill_names)
        + get_named_skill_level_bonus_any(item_buff.get("reinforceSkill") or [], job_name, target_skill_names)
        + get_named_skill_level_bonus_any((row.get("enchant") or {}).get("reinforceSkill") or [], job_name, target_skill_names)
    )


def get_switching_creature_box_price_candidates(search_names: list[str]) -> list[dict]:
    candidates = []
    seen_ids = set()
    for search_name in search_names or []:
        search_name = clean_text(search_name)
        if not search_name:
            continue
        for row in search_items_by_name(search_name):
            item_id = clean_text(row.get("itemId"))
            item_name = clean_text(row.get("itemName"))
            if not item_id or item_id in seen_ids:
                continue
            if item_name != search_name and search_name not in item_name:
                continue
            if "상자" not in item_name:
                continue
            auction = get_lowest_auction_price(item_id)
            unit_price = auction.get("minUnitPrice")
            if not isinstance(unit_price, (int, float)) or unit_price <= 0:
                continue
            seen_ids.add(item_id)
            candidates.append({
                "itemId": item_id,
                "itemName": clean_item_display_name(item_name),
                "itemRarity": clean_text(row.get("itemRarity")) or "레어",
                "fame": row.get("fame"),
                "iconUrl": get_item_icon_url(item_id),
                "auction": auction,
                "purchaseRoute": "box",
            })
    return candidates


def get_switching_creature_item_candidates(
    config: dict,
    fame_min: int,
    fame_max: int,
    job_name: str = "",
    buff_skill_name: str = "",
    required_level: int = 0,
    equivalent_skill_names: list[str] | None = None,
    target_required_levels: list[int] | None = None,
) -> list[dict]:
    search_names = [
        clean_text(search_name)
        for search_name in config.get("searchNames") or []
        if clean_text(search_name)
    ]
    direct_item_ids = []
    seen_direct_item_ids = set()
    for item_id in [
        config.get("itemId"),
        *(config.get("itemIds") or []),
    ]:
        item_id = clean_text(item_id)
        if item_id and item_id not in seen_direct_item_ids:
            direct_item_ids.append(item_id)
            seen_direct_item_ids.add(item_id)
    max_pages = max(1, int(config.get("maxPages") or config.get("searchMaxPages") or 5))
    cache_key = (
        tuple(direct_item_ids),
        tuple(search_names),
        int(fame_min),
        int(fame_max),
        max_pages,
        clean_text(job_name),
        clean_text(buff_skill_name),
        tuple(get_switching_creature_target_skill_names("", equivalent_skill_names)),
        int(required_level or 0),
        tuple(int(level or 0) for level in target_required_levels or [] if int(level or 0) > 0),
    )
    now = time.time()
    with _SWITCHING_CREATURE_CANDIDATE_CACHE_LOCK:
        cached = _SWITCHING_CREATURE_CANDIDATE_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            return [
                {
                    **row,
                    "auction": dict(row.get("auction") or {}),
                    "detail": dict(row.get("detail") or {}),
                }
                for row in cached.get("rows") or []
            ]

    matched = {}
    for item_id in direct_item_ids:
        matched[item_id] = {
            "itemId": item_id,
            "itemName": clean_text(config.get("itemName") or config.get("name") or config.get("groupName")),
            "itemRarity": "레어",
            "rowFame": 0,
        }
    if not direct_item_ids:
        for search_name in search_names:
            for row in search_items_by_name(search_name, max_pages=max_pages):
                item_id = clean_text(row.get("itemId"))
                item_name = clean_text(row.get("itemName"))
                if not item_id or item_id in matched:
                    continue
                if clean_text(row.get("itemTypeDetail")) != "크리쳐":
                    continue
                if clean_text(search_name) not in item_name:
                    continue
                matched[item_id] = {
                    "itemId": item_id,
                    "itemName": item_name,
                    "itemRarity": clean_text(row.get("itemRarity") or "레어"),
                    "rowFame": int(row.get("fame") or 0),
                }

    details_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(list(matched.keys()))
        if clean_text(detail.get("itemId"))
    }
    priced_candidates = {}
    fame_by_item_id = {}
    for item_id, row in matched.items():
        detail = details_by_id.get(item_id) or {}
        fame = int(detail.get("fame") or row.get("rowFame") or 0)
        if not (fame_min <= fame <= fame_max):
            continue
        candidate_contribution = 0
        if job_name and buff_skill_name and required_level:
            candidate_contribution = get_switching_creature_contribution(
                {},
                detail,
                job_name,
                buff_skill_name,
                required_level,
                equivalent_skill_names,
                target_required_levels,
            )
            if candidate_contribution <= 0:
                continue
        fame_by_item_id[item_id] = fame
        priced_candidates[item_id] = {
            "itemId": item_id,
            "itemName": clean_item_display_name(detail.get("itemName") or row.get("itemName")),
            "itemRarity": clean_text(detail.get("itemRarity") or row.get("itemRarity") or "레어"),
            "fame": fame,
            "iconUrl": get_item_icon_url(item_id),
            "detail": detail,
            "purchaseRoute": "creature",
            "candidateCreatureContribution": candidate_contribution,
        }

    auctions_by_id = get_lowest_auction_prices(list(priced_candidates.keys()), fame_by_item_id=fame_by_item_id)
    candidates = []
    for item_id, candidate in priced_candidates.items():
        auction = auctions_by_id.get(item_id) or {}
        unit_price = auction.get("minUnitPrice")
        if not isinstance(unit_price, (int, float)) or unit_price <= 0:
            continue
        candidates.append({
            **candidate,
            "auction": auction,
        })

    with _SWITCHING_CREATURE_CANDIDATE_CACHE_LOCK:
        _SWITCHING_CREATURE_CANDIDATE_CACHE[cache_key] = {
            "expires_at": now + SWITCHING_CREATURE_CANDIDATE_CACHE_TTL_SECONDS,
            "rows": [
                {
                    **row,
                    "auction": dict(row.get("auction") or {}),
                    "detail": dict(row.get("detail") or {}),
                }
                for row in candidates
            ],
        }
    return candidates


def normalize_switching_creature_configs(creature_db: dict) -> list[dict]:
    configs = []

    def add_name_config(name):
        item_name = clean_text(name)
        if item_name:
            configs.append({
                "groupName": item_name,
                "searchNames": [item_name],
                "boxSearchNames": [],
            })

    for item in creature_db.get("items") or []:
        if isinstance(item, str):
            add_name_config(item)
            continue
        if not isinstance(item, dict):
            continue
        search_names = [
            clean_text(search_name)
            for search_name in item.get("searchNames") or []
            if clean_text(search_name)
        ]
        item_name = clean_text(item.get("itemName") or item.get("name"))
        if item_name and item_name not in search_names:
            search_names.insert(0, item_name)
        if not search_names:
            add_name_config(item.get("groupName"))
            continue
        configs.append({
            **item,
            "searchNames": search_names,
            "itemId": clean_text(item.get("itemId")),
            "itemIds": [
                clean_text(item_id)
                for item_id in item.get("itemIds") or []
                if clean_text(item_id)
            ],
            "boxSearchNames": [
                clean_text(box_name)
                for box_name in item.get("boxSearchNames") or []
                if clean_text(box_name)
            ],
        })
    return configs


def select_switching_creature_purchase_option(creature_option: dict, box_options: list[dict]) -> dict:
    options = [
        {
            key: value
            for key, value in creature_option.items()
            if key != "detail"
        },
        *box_options,
    ]
    return min(
        options,
        key=lambda option: (option.get("auction") or {}).get("minUnitPrice") or 10**30,
        default={},
    )


def reduce_switching_creature_recommendations(recommendations: list[dict]) -> list[dict]:
    best_by_effect = {}
    for row in recommendations:
        key = (
            clean_text(row.get("buffSkillName")),
            int(row.get("currentCreatureContribution") or 0),
            int(row.get("candidateCreatureContribution") or 0),
            round(float(row.get("skillDamageMultiplier") or 1), 8),
        )
        current_price = (row.get("auction") or {}).get("minUnitPrice")
        previous = best_by_effect.get(key)
        previous_price = (previous.get("auction") or {}).get("minUnitPrice") if previous else None
        if (
            not previous
            or not isinstance(previous_price, (int, float))
            or (
                isinstance(current_price, (int, float))
                and current_price > 0
                and current_price < previous_price
            )
        ):
            best_by_effect[key] = row
    return list(best_by_effect.values())


def get_candidate_auction_price(row: dict) -> float:
    price = (row.get("auction") or {}).get("minUnitPrice")
    return float(price) if isinstance(price, (int, float)) and price > 0 else float("inf")


def get_capped_switching_level_delta(
    current_total: int,
    current_slot_contribution: int,
    candidate_slot_contribution: int,
) -> int:
    current_total = int(current_total or 0)
    current_slot_contribution = int(current_slot_contribution or 0)
    candidate_slot_contribution = int(candidate_slot_contribution or 0)
    new_total = current_total - current_slot_contribution + candidate_slot_contribution
    return min(SWITCHING_LEVEL_CAP, new_total) - min(SWITCHING_LEVEL_CAP, current_total)


def get_switching_avatar_skill_level_contribution(avatar_rows: list, target_skill_names: list[str]) -> int:
    target_skill_names = [clean_text(skill_name) for skill_name in target_skill_names or [] if clean_text(skill_name)]
    if not target_skill_names:
        return 0
    total = 0
    for row in avatar_rows or []:
        option_ability = clean_text(row.get("optionAbility"))
        if any(skill_name_matches(option_ability, skill_name) for skill_name in target_skill_names):
            total += 1
        for emblem in get_platinum_emblems(row):
            platinum_skill = clean_text(extract_platinum_skill_name(emblem.get("itemName")))
            if any(skill_name_matches(platinum_skill, skill_name) for skill_name in target_skill_names):
                total += 1
    return total


def merge_switching_avatar_rows_with_current(switching_rows: list, current_avatar_rows: list) -> list:
    switching_by_slot = {
        clean_text(row.get("slotId")): row
        for row in switching_rows or []
        if clean_text(row.get("slotId"))
    }
    used_slots = set()
    merged = []
    for row in current_avatar_rows or []:
        slot_id = clean_text(row.get("slotId"))
        if not slot_id:
            continue
        used_slots.add(slot_id)
        merged.append(switching_by_slot.get(slot_id) or row)
    merged.extend(
        row for row in switching_rows or []
        if clean_text(row.get("slotId")) and clean_text(row.get("slotId")) not in used_slots
    )
    return merged


def get_current_dealer_switching_level_total(
    server_id: str,
    character_id: str,
    buff_payload: dict,
    job_name: str,
    buff_skill_name: str,
    required_level: int,
    equivalent_skill_names: list[str],
    target_required_levels: list[int],
    title_row: dict | None = None,
    title_detail: dict | None = None,
    creature_row: dict | None = None,
    creature_detail: dict | None = None,
    avatar_rows: list | None = None,
) -> int:
    target_skill_names = get_switching_creature_target_skill_names(buff_skill_name, equivalent_skill_names)
    if title_row is None:
        buff_equipment_rows = ((buff_payload.get("skill") or {}).get("buff") or {}).get("equipment") or []
        title_row = next((
            row for row in buff_equipment_rows
            if clean_text(row.get("slotId")) == "TITLE" or clean_text(row.get("slotName")) == "칭호"
        ), {})
    if title_detail is None:
        title_id = clean_text((title_row or {}).get("itemId"))
        title_detail = (fetch_item_details([title_id]) or [{}])[0] if title_id else {}
    if creature_row is None:
        creature_row = next(iter(get_switching_creature_rows(
            get_character_cached_payload(server_id, character_id, "buff_creature", "skill/buff/equip/creature")
        )), {})
    if creature_detail is None:
        creature_id = clean_text((creature_row or {}).get("itemId"))
        creature_detail = (fetch_item_details([creature_id]) or [{}])[0] if creature_id else {}
    if avatar_rows is None:
        avatar_payload = get_character_cached_payload(server_id, character_id, "buff_avatar", "skill/buff/equip/avatar")
        avatar_rows = ((avatar_payload.get("skill") or {}).get("buff") or {}).get("avatar") or []
    return (
        get_switching_title_contribution(
            title_row or {},
            title_detail or {},
            job_name,
            buff_skill_name,
            required_level,
            equivalent_skill_names,
            target_required_levels,
        )
        + get_switching_creature_contribution(
            creature_row or {},
            creature_detail or {},
            job_name,
            buff_skill_name,
            required_level,
            equivalent_skill_names,
            target_required_levels,
        )
        + get_switching_avatar_skill_level_contribution(avatar_rows, target_skill_names)
    )


def load_dealer_switching_creature_recommendations(server_id: str, character_id: str, buffer_baseline: dict | None = None) -> list:
    if buffer_baseline:
        return []
    buff_payload = get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
    if not clean_text(buff_payload.get("jobName")) or not clean_text(buff_payload.get("jobGrowName")):
        status_payload = get_character_cached_payload(server_id, character_id, "status", "status")
        buff_payload = {
            **buff_payload,
            "jobName": clean_text(buff_payload.get("jobName")) or clean_text(status_payload.get("jobName")),
            "jobGrowName": clean_text(buff_payload.get("jobGrowName")) or clean_text(status_payload.get("jobGrowName")),
        }
    job_name = clean_text(buff_payload.get("jobName"))
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    buff_skill_name = clean_text(skill_info.get("name"))
    if not buff_skill_name:
        return []

    is_dealer_crusader = (
        job_name == "프리스트(남)"
        and clean_text(buff_payload.get("jobGrowName")) == "眞 크루세이더"
        and is_male_crusader_dealer_style(server_id, character_id)
    )
    entry = find_dealer_switching_buff_entry(buff_payload, is_dealer_crusader=is_dealer_crusader)
    if not entry or clean_text(entry.get("buffSkillName")) != buff_skill_name:
        return []
    equivalent_switching_skill_names = [
        clean_text(skill_name)
        for skill_name in entry.get("equivalentSwitchingPlatinumSkills") or []
        if clean_text(skill_name)
    ]

    required_level = get_buff_skill_required_level(server_id, character_id, skill_info)
    target_skill_names = get_switching_creature_target_skill_names(buff_skill_name, equivalent_switching_skill_names)
    target_required_levels = get_switching_skill_required_levels(server_id, character_id, skill_info, target_skill_names)
    per_level_coefficients = [
        float(row.get("value") or 0)
        for row in entry.get("damageIncreasePerLevelCoefficients") or []
        if float(row.get("value") or 0) > 0
    ]
    current_coefficients = match_current_switching_coefficients(skill_info, entry)
    if not per_level_coefficients or not current_coefficients:
        return []
    if len(per_level_coefficients) == 1 and len(current_coefficients) > 1:
        per_level_coefficients = per_level_coefficients * len(current_coefficients)
    if len(per_level_coefficients) != len(current_coefficients):
        return []

    current_creature = next(iter(get_switching_creature_rows(
        get_character_cached_payload(server_id, character_id, "buff_creature", "skill/buff/equip/creature")
    )), {})
    current_creature_id = clean_text(current_creature.get("itemId"))
    current_detail = (fetch_item_details([current_creature_id]) or [{}])[0] if current_creature_id else {}
    current_contribution = get_switching_creature_contribution(
        current_creature,
        current_detail,
        job_name,
        buff_skill_name,
        required_level,
        equivalent_switching_skill_names,
        target_required_levels,
    )
    current_switching_level_total = get_current_dealer_switching_level_total(
        server_id,
        character_id,
        buff_payload,
        job_name,
        buff_skill_name,
        required_level,
        equivalent_switching_skill_names,
        target_required_levels,
        creature_row=current_creature,
        creature_detail=current_detail,
    )
    current_multiplier = get_switching_damage_multiplier(current_coefficients)
    creature_db = load_dealer_switching_creature_db()
    fame_range = (creature_db.get("metadata") or {}).get("fameRange") or {}
    fame_min = int(fame_range.get("min") or 491)
    fame_max = int(fame_range.get("max") or 601)
    configs = normalize_switching_creature_configs(creature_db)
    best_candidates = {}
    seen_item_ids = set()

    direct_candidate_by_id = {}
    for config in configs:
        for item_id in [
            config.get("itemId"),
            *(config.get("itemIds") or []),
        ]:
            item_id = clean_text(item_id)
            if not item_id or item_id == current_creature_id or item_id in direct_candidate_by_id:
                continue
            direct_candidate_by_id[item_id] = {
                "itemId": item_id,
                "itemName": clean_text(config.get("itemName") or config.get("name") or config.get("groupName")),
                "itemRarity": clean_text(config.get("itemRarity") or "레어"),
                "fame": int(config.get("fame") or 0),
                "iconUrl": get_item_icon_url(item_id),
                "purchaseRoute": "creature",
            }
    if direct_candidate_by_id:
        fame_by_item_id = {
            item_id: int(candidate.get("fame") or 0)
            for item_id, candidate in direct_candidate_by_id.items()
            if int(candidate.get("fame") or 0) > 0
        }
        auctions_by_id = get_lowest_auction_prices(list(direct_candidate_by_id.keys()), fame_by_item_id=fame_by_item_id)
        priced_direct_candidates = []
        for item_id, candidate in direct_candidate_by_id.items():
            auction = auctions_by_id.get(item_id) or {}
            unit_price = auction.get("minUnitPrice")
            if not isinstance(unit_price, (int, float)) or unit_price <= 0:
                continue
            priced_direct_candidates.append({
                **candidate,
                "auction": auction,
            })
        selected_direct = min(
            priced_direct_candidates,
            key=lambda row: (row.get("auction") or {}).get("minUnitPrice") or 10**30,
            default=None,
        )
        if selected_direct:
            selected_detail = (fetch_item_details([selected_direct.get("itemId")]) or [{}])[0]
            fame = int(selected_detail.get("fame") or selected_direct.get("fame") or 0)
            candidate_contribution = get_switching_creature_contribution(
                {},
                selected_detail,
                job_name,
                buff_skill_name,
                required_level,
                equivalent_switching_skill_names,
                target_required_levels,
            )
            effective_level_delta = get_capped_switching_level_delta(
                current_switching_level_total,
                current_contribution,
                candidate_contribution,
            )
            if fame_min <= fame <= fame_max and candidate_contribution > current_contribution and effective_level_delta > 0:
                selected_direct = {
                    **selected_direct,
                    "itemName": clean_item_display_name(selected_detail.get("itemName") or selected_direct.get("itemName")),
                    "itemRarity": clean_text(selected_detail.get("itemRarity") or selected_direct.get("itemRarity") or "레어"),
                    "fame": fame,
                    "iconUrl": get_item_icon_url(selected_direct.get("itemId")),
                    "detail": selected_detail,
                    "candidateCreatureContribution": candidate_contribution,
                }
                best_candidates[candidate_contribution] = {
                    "creatureOption": selected_direct,
                    "purchaseOption": selected_direct,
                }
                seen_item_ids.add(clean_text(selected_direct.get("itemId")))

    for config in configs:
        if clean_text(config.get("itemId")) or any(clean_text(item_id) for item_id in config.get("itemIds") or []):
            continue
        box_options = get_switching_creature_box_price_candidates(config.get("boxSearchNames") or [])
        for creature_option in get_switching_creature_item_candidates(
            config,
            fame_min,
            fame_max,
            job_name=job_name,
            buff_skill_name=buff_skill_name,
            required_level=required_level,
            equivalent_skill_names=equivalent_switching_skill_names,
            target_required_levels=target_required_levels,
        ):
            item_id = clean_text(creature_option.get("itemId"))
            if not item_id or item_id in seen_item_ids or item_id == current_creature_id:
                continue
            candidate_contribution = int(creature_option.get("candidateCreatureContribution") or 0)
            if candidate_contribution <= current_contribution:
                continue
            effective_level_delta = get_capped_switching_level_delta(
                current_switching_level_total,
                current_contribution,
                candidate_contribution,
            )
            if effective_level_delta <= 0:
                continue
            purchase_option = select_switching_creature_purchase_option(creature_option, box_options)
            if not purchase_option:
                continue
            seen_item_ids.add(item_id)
            best_key = candidate_contribution
            current_best = best_candidates.get(best_key)
            if not current_best or get_candidate_auction_price(purchase_option) < get_candidate_auction_price(current_best.get("purchaseOption") or {}):
                best_candidates[best_key] = {
                    "creatureOption": creature_option,
                    "purchaseOption": purchase_option,
                }

    recommendations = []
    for candidate_contribution, selected in best_candidates.items():
        creature_option = selected.get("creatureOption") or {}
        purchase_option = selected.get("purchaseOption") or {}
        effective_level_delta = get_capped_switching_level_delta(
            current_switching_level_total,
            current_contribution,
            candidate_contribution,
        )
        if effective_level_delta <= 0:
            continue
        candidate_coefficients = [
            current + effective_level_delta * per_level
            for current, per_level in zip(current_coefficients, per_level_coefficients)
        ]
        candidate_multiplier = get_switching_damage_multiplier(candidate_coefficients)
        if current_multiplier <= 0 or candidate_multiplier <= current_multiplier:
            continue
        raw_skill_damage_multiplier = candidate_multiplier / current_multiplier
        skill_damage_multiplier = get_applied_switching_multiplier(raw_skill_damage_multiplier, entry)
        item_id = clean_text(creature_option.get("itemId"))
        note = get_damage_application_note(entry)
        item_explain = f"{buff_skill_name} +{current_contribution}Lv -> +{candidate_contribution}Lv"
        item_explain = append_damage_application_note(item_explain, note)
        recommendations.append(build_switching_creature_recommendation_row(
            item_id=purchase_option.get("itemId") or item_id,
            item_name=purchase_option.get("itemName") or creature_option.get("itemName"),
            item_rarity=purchase_option.get("itemRarity") or creature_option.get("itemRarity") or "레어",
            icon_url=purchase_option.get("iconUrl") or creature_option.get("iconUrl"),
            fame=creature_option.get("fame"),
            auction=purchase_option.get("auction") or {},
            skill_damage_multiplier=skill_damage_multiplier,
            raw_skill_damage_multiplier=raw_skill_damage_multiplier,
            damage_application_note=note,
            item_explain=item_explain,
            buff_skill_name=buff_skill_name,
            required_level=required_level,
            current_creature_contribution=current_contribution,
            candidate_creature_contribution=candidate_contribution,
            current_switching_multiplier=current_multiplier,
            candidate_switching_multiplier=candidate_multiplier,
            source_creature_name=clean_text(current_creature.get("itemName")),
            target_creature_name=creature_option.get("itemName"),
            purchase_route=purchase_option.get("purchaseRoute") or "creature",
            purchase_route_label="상자" if purchase_option.get("purchaseRoute") == "box" else "",
        ))
    return reduce_switching_creature_recommendations(recommendations)


def load_switching_title_price_candidate(title_config: dict, job_name: str, buff_skill_name: str) -> dict:
    item_id = clean_text(title_config.get("itemId"))
    item = {}
    if not item_id:
        item = find_exact_item_by_name(clean_text(title_config.get("priceSearchName") or title_config.get("itemName")), "칭호")
        item_id = clean_text(item.get("itemId"))
    if not item_id:
        return {}
    rows = get_auction_rows(item_id, limit=100)
    matched_rows = [
        row for row in rows
        if isinstance(row.get("unitPrice"), (int, float))
        and row.get("unitPrice") > 0
        and get_named_skill_level_bonus((row.get("enchant") or {}).get("reinforceSkill") or [], job_name, buff_skill_name)
            >= int(title_config.get("enchantBuffSkillLevelDelta") or 0)
    ]
    lowest = min(matched_rows, key=lambda row: row.get("unitPrice"), default=None)
    if not lowest:
        return {}
    return {
        "itemId": item_id,
        "itemName": clean_item_display_name(lowest.get("itemName") or item.get("itemName") or title_config.get("itemName")),
        "itemRarity": clean_text(lowest.get("itemRarity") or item.get("itemRarity") or "레어"),
        "iconUrl": get_item_icon_url(item_id),
        "fame": lowest.get("fame") or item.get("fame"),
        "enchant": lowest.get("enchant") or {},
        "auction": auction_row_to_switching_title_price(lowest),
    }


def get_buffer_switching_rows(server_id: str, character_id: str) -> tuple[list, list, dict]:
    current_equipment = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment").get("equipment") or []
    current_avatar = get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar").get("avatar") or []
    current_creature_payload = get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    current_creature = current_creature_payload.get("creature") or {}
    buff_equipment_payload = get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
    buff_avatar_payload = get_character_cached_payload(server_id, character_id, "buff_avatar", "skill/buff/equip/avatar")
    buff_creature_payload = get_character_cached_payload(server_id, character_id, "buff_creature", "skill/buff/equip/creature")
    switching_equipment = ((buff_equipment_payload.get("skill") or {}).get("buff") or {}).get("equipment") or []
    switching_avatar = ((buff_avatar_payload.get("skill") or {}).get("buff") or {}).get("avatar") or []
    switching_creature_rows = ((buff_creature_payload.get("skill") or {}).get("buff") or {}).get("creature") or []
    switching_creature = (
        switching_creature_rows[0]
        if isinstance(switching_creature_rows, list) and switching_creature_rows
        else switching_creature_rows
    )
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
    return current_rows, switching_rows, buff_equipment_payload


def replace_title_row(rows: list, title_row: dict) -> list:
    replaced = False
    result = []
    for row in rows or []:
        if clean_text(row.get("slotId")) == "TITLE" or clean_text(row.get("slotName")) == "칭호":
            result.append(title_row)
            replaced = True
        else:
            result.append(row)
    if not replaced:
        result.append(title_row)
    return result


def replace_avatar_row(rows: list, slot_id: str, avatar_row: dict) -> list:
    slot_id = clean_text(slot_id)
    replaced = False
    result = []
    for row in rows or []:
        if clean_text(row.get("slotId")) == slot_id and "아바타" in clean_text(row.get("slotName")):
            result.append(avatar_row)
            replaced = True
        else:
            result.append(row)
    if not replaced:
        result.append(avatar_row)
    return result


def get_mixed_avatar_slot(rows: list, slot_id: str) -> dict:
    slot_id = clean_text(slot_id)
    return next((
        row for row in rows or []
        if clean_text(row.get("slotId")) == slot_id
        and "아바타" in clean_text(row.get("slotName"))
    ), {}) or {}


def get_title_row(rows: list) -> dict:
    return next((
        row for row in rows or []
        if clean_text(row.get("slotId")) == "TITLE" or clean_text(row.get("slotName")) == "칭호"
    ), {})


def get_buffer_switching_metrics(
    current_rows: list,
    switching_rows: list,
    detail_by_id: dict,
    style_payload: dict,
    job_name: str,
    stat_name: str,
    buff_skill_name: str,
) -> dict:
    style_rows = flatten_skill_rows(style_payload)
    style_by_name = {clean_text(row.get("name")): row for row in style_rows if clean_text(row.get("name"))}
    current_direct = sum(get_row_direct_stat(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}, stat_name) for row in current_rows)
    switching_direct = sum(get_row_direct_stat(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}, stat_name) for row in switching_rows)
    current_bonuses = get_setup_skill_bonuses(current_rows, detail_by_id, style_rows, job_name)
    switching_bonuses = get_setup_skill_bonuses(switching_rows, detail_by_id, style_rows, job_name)
    relevant_skills = BUFFER_SWITCHING_SELF_STAT_SKILLS.get(clean_text(buff_skill_name), set())
    skill_delta = 0
    for name in set(current_bonuses) | set(switching_bonuses):
        if name not in relevant_skills or current_bonuses.get(name, 0) == switching_bonuses.get(name, 0):
            continue
        style_row = style_by_name.get(name) or {}
        skill_id = clean_text(style_row.get("skillId"))
        base_level = int(style_row.get("level") or 0)
        if not skill_id or base_level <= 0:
            continue
        skill_detail = fetch_skill_detail_from_api(clean_text(style_payload.get("jobId")), skill_id)
        current_value = get_skill_level_stat_value(skill_detail, base_level + current_bonuses.get(name, 0), stat_name)
        switching_value = get_skill_level_stat_value(skill_detail, base_level + switching_bonuses.get(name, 0), stat_name)
        skill_delta += switching_value - current_value
    switching_buff_amplification_delta = (
        sum(get_row_buff_amplification(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}) for row in switching_rows)
        - sum(get_row_buff_amplification(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}) for row in current_rows)
    )
    direct_delta = switching_direct - current_direct
    return {
        "switchingStatDelta": direct_delta + skill_delta,
        "switchingDirectStatDelta": direct_delta,
        "switchingSkillStatDelta": skill_delta,
        "switchingBuffAmplificationDelta": switching_buff_amplification_delta,
    }


def load_dealer_switching_title_recommendations(server_id: str, character_id: str, buffer_baseline: dict | None = None) -> list:
    if buffer_baseline:
        return []
    buff_payload = get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
    if not clean_text(buff_payload.get("jobName")) or not clean_text(buff_payload.get("jobGrowName")):
        status_payload = get_character_cached_payload(server_id, character_id, "status", "status")
        buff_payload = {
            **buff_payload,
            "jobName": clean_text(buff_payload.get("jobName")) or clean_text(status_payload.get("jobName")),
            "jobGrowName": clean_text(buff_payload.get("jobGrowName")) or clean_text(status_payload.get("jobGrowName")),
        }
    job_name = clean_text(buff_payload.get("jobName"))
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    buff_skill_name = clean_text(skill_info.get("name"))
    if not buff_skill_name:
        return []

    is_dealer_crusader = (
        job_name == "프리스트(남)"
        and clean_text(buff_payload.get("jobGrowName")) == "眞 크루세이더"
        and is_male_crusader_dealer_style(server_id, character_id)
    )
    entry = find_dealer_switching_buff_entry(buff_payload, is_dealer_crusader=is_dealer_crusader)
    if not entry or clean_text(entry.get("buffSkillName")) != buff_skill_name:
        return []
    equivalent_switching_skill_names = [
        clean_text(skill_name)
        for skill_name in entry.get("equivalentSwitchingPlatinumSkills") or []
        if clean_text(skill_name)
    ]

    required_level = get_buff_skill_required_level(server_id, character_id, skill_info)
    target_skill_names = get_switching_creature_target_skill_names(buff_skill_name, equivalent_switching_skill_names)
    target_required_levels = get_switching_skill_required_levels(server_id, character_id, skill_info, target_skill_names)
    per_level_coefficients = [
        float(row.get("value") or 0)
        for row in entry.get("damageIncreasePerLevelCoefficients") or []
        if float(row.get("value") or 0) > 0
    ]
    current_coefficients = match_current_switching_coefficients(skill_info, entry)
    if not per_level_coefficients or not current_coefficients:
        return []
    if len(per_level_coefficients) == 1 and len(current_coefficients) > 1:
        per_level_coefficients = per_level_coefficients * len(current_coefficients)
    if len(per_level_coefficients) != len(current_coefficients):
        return []

    buff_equipment_rows = ((buff_payload.get("skill") or {}).get("buff") or {}).get("equipment") or []
    buff_title = next((
        row for row in buff_equipment_rows
        if clean_text(row.get("slotId")) == "TITLE" or clean_text(row.get("slotName")) == "칭호"
    ), {})
    source_title = buff_title
    source_title_kind = "buffTitle" if buff_title else ""
    if not source_title:
        equipment_payload = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment")
        source_title = next((
            row for row in equipment_payload.get("equipment") or []
            if clean_text(row.get("slotId")) == "TITLE" or clean_text(row.get("slotName")) == "칭호"
        ), {})
        source_title_kind = "equippedTitle" if source_title else ""

    source_title_id = clean_text(source_title.get("itemId"))
    source_detail = (fetch_item_details([source_title_id]) or [{}])[0] if source_title_id else {}
    current_contribution = get_switching_title_contribution(
        source_title,
        source_detail,
        job_name,
        buff_skill_name,
        required_level,
        equivalent_switching_skill_names,
        target_required_levels,
    )
    current_switching_level_total = get_current_dealer_switching_level_total(
        server_id,
        character_id,
        buff_payload,
        job_name,
        buff_skill_name,
        required_level,
        equivalent_switching_skill_names,
        target_required_levels,
        title_row=source_title,
        title_detail=source_detail,
    )
    current_multiplier = get_switching_damage_multiplier(current_coefficients)
    title_db = load_dealer_switching_title_db()
    recommendations = []
    for config in title_db.get("items") or []:
        skill_range = config.get("skillLevelRange") or {}
        minimum = int(skill_range.get("min") or 0)
        maximum = int(skill_range.get("max") or 0)
        if not (minimum <= required_level <= maximum):
            continue
        candidate_contribution = int(config.get("totalBuffSkillLevelDelta") or 0)
        if candidate_contribution <= current_contribution:
            continue
        effective_level_delta = get_capped_switching_level_delta(
            current_switching_level_total,
            current_contribution,
            candidate_contribution,
        )
        if effective_level_delta <= 0:
            continue
        candidate_price = load_switching_title_price_candidate(config, job_name, buff_skill_name)
        if not candidate_price:
            continue
        candidate_coefficients = [
            current + effective_level_delta * per_level
            for current, per_level in zip(current_coefficients, per_level_coefficients)
        ]
        candidate_multiplier = get_switching_damage_multiplier(candidate_coefficients)
        if current_multiplier <= 0 or candidate_multiplier <= current_multiplier:
            continue
        raw_skill_damage_multiplier = candidate_multiplier / current_multiplier
        damage_application_ratio = float(entry.get("damageApplicationRatio") or 1)
        if not (0 < damage_application_ratio <= 1):
            damage_application_ratio = 1
        skill_damage_multiplier = 1 + (raw_skill_damage_multiplier - 1) * damage_application_ratio
        damage_application_note = get_damage_application_note(entry)
        item_explain = f"{buff_skill_name} +{current_contribution}Lv -> +{candidate_contribution}Lv"
        item_explain = append_damage_application_note(item_explain, damage_application_note)
        recommendations.append(build_switching_title_recommendation_row(
            item_id=candidate_price.get("itemId"),
            item_name=candidate_price.get("itemName") or config.get("itemName"),
            item_rarity=candidate_price.get("itemRarity") or "레어",
            icon_url=candidate_price.get("iconUrl"),
            fame=candidate_price.get("fame"),
            auction=candidate_price.get("auction") or {},
            skill_damage_multiplier=skill_damage_multiplier,
            raw_skill_damage_multiplier=raw_skill_damage_multiplier,
            damage_application_ratio=damage_application_ratio,
            damage_application_note=damage_application_note,
            item_explain=item_explain,
            buff_skill_name=buff_skill_name,
            required_level=required_level,
            title_skill_level_delta=int(config.get("titleSkillLevelDelta") or 0),
            enchant_buff_skill_level_delta=int(config.get("enchantBuffSkillLevelDelta") or 0),
            current_title_contribution=current_contribution,
            candidate_title_contribution=candidate_contribution,
            current_switching_multiplier=current_multiplier,
            candidate_switching_multiplier=candidate_multiplier,
            source_title_kind=source_title_kind,
            source_title_name=clean_text(source_title.get("itemName")),
            purchase_route_label=f"[{buff_skill_name} +{int(config.get('enchantBuffSkillLevelDelta') or 0)}Lv]",
        ))
    return recommendations


def load_buffer_switching_title_recommendations(
    server_id: str,
    character_id: str,
    buffer_baseline: dict | None = None,
) -> list:
    if not buffer_baseline:
        return []
    current_rows, switching_rows, buff_payload = get_buffer_switching_rows(server_id, character_id)
    job_name = clean_text(buffer_baseline.get("jobName") or buff_payload.get("jobName"))
    stat_name = clean_text(buffer_baseline.get("statName"))
    buff_skill_name = clean_text(buffer_baseline.get("buffSkillName"))
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    required_level = get_buff_skill_required_level(server_id, character_id, skill_info)
    if not job_name or not stat_name or not buff_skill_name or required_level <= 0:
        return []

    source_title = get_title_row(switching_rows)
    source_title_id = clean_text(source_title.get("itemId"))
    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    title_db = load_dealer_switching_title_db()
    matching_configs = []
    for config in title_db.get("items") or []:
        skill_range = config.get("skillLevelRange") or {}
        minimum = int(skill_range.get("min") or 0)
        maximum = int(skill_range.get("max") or 0)
        if minimum <= required_level <= maximum:
            matching_configs.append(config)
    if not matching_configs:
        return []

    source_detail = {}
    item_ids = [
        clean_text(row.get("itemId"))
        for row in [*current_rows, *switching_rows]
        if clean_text(row.get("itemId"))
    ]
    for detail in fetch_item_details(item_ids):
        if clean_text(detail.get("itemId")) == source_title_id:
            source_detail = detail
            break
    current_contribution = get_switching_title_contribution(
        source_title,
        source_detail,
        job_name,
        buff_skill_name,
        required_level,
    )
    viable_configs = [
        config for config in matching_configs
        if int(config.get("totalBuffSkillLevelDelta") or 0) > current_contribution
    ]
    if not viable_configs:
        return []

    base_detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(item_ids)
        if clean_text(detail.get("itemId"))
    }
    current_metrics = get_buffer_switching_metrics(
        current_rows,
        switching_rows,
        base_detail_by_id,
        style_payload,
        job_name,
        stat_name,
        buff_skill_name,
    )
    recommendations = []
    for config in viable_configs:
        candidate_price = load_switching_title_price_candidate(config, job_name, buff_skill_name)
        if not candidate_price:
            continue
        candidate_row = {
            "slotId": "TITLE",
            "slotName": "칭호",
            "itemId": candidate_price.get("itemId"),
            "itemName": candidate_price.get("itemName") or config.get("itemName"),
            "itemType": "액세서리",
            "itemTypeDetail": "칭호",
            "itemRarity": candidate_price.get("itemRarity") or "레어",
            "enchant": candidate_price.get("enchant") or {},
        }
        candidate_switching_rows = replace_title_row(switching_rows, candidate_row)
        candidate_item_ids = [
            clean_text(row.get("itemId"))
            for row in [*current_rows, *candidate_switching_rows]
            if clean_text(row.get("itemId"))
        ]
        candidate_detail_by_id = {
            clean_text(detail.get("itemId")): detail
            for detail in fetch_item_details(candidate_item_ids)
            if clean_text(detail.get("itemId"))
        }
        candidate_detail = candidate_detail_by_id.get(clean_text(candidate_row.get("itemId"))) or {}
        candidate_contribution = get_switching_title_contribution(
            candidate_row,
            candidate_detail,
            job_name,
            buff_skill_name,
            required_level,
        )
        if candidate_contribution <= current_contribution:
            continue
        candidate_metrics = get_buffer_switching_metrics(
            current_rows,
            candidate_switching_rows,
            candidate_detail_by_id,
            style_payload,
            job_name,
            stat_name,
            buff_skill_name,
        )
        title_skill_level_delta = int(config.get("titleSkillLevelDelta") or 0)
        enchant_buff_skill_level_delta = int(config.get("enchantBuffSkillLevelDelta") or 0)
        recommendations.append(build_buffer_switching_title_recommendation_row(
            candidate_price.get("itemId"),
            candidate_price.get("itemName") or config.get("itemName"),
            candidate_price.get("itemRarity") or "레어",
            candidate_price.get("iconUrl"),
            candidate_price.get("fame"),
            candidate_price.get("auction") or {},
            candidate_detail.get("itemReinforceSkill") or [],
            candidate_detail.get("itemBuff") or {},
            normalize_enchant_status((candidate_row.get("enchant") or {}).get("status") or []),
            f"{buff_skill_name} +{current_contribution}Lv -> +{candidate_contribution}Lv",
            buff_skill_name,
            required_level,
            title_skill_level_delta,
            enchant_buff_skill_level_delta,
            current_contribution,
            candidate_contribution,
            candidate_metrics.get("switchingStatDelta", 0) - current_metrics.get("switchingStatDelta", 0),
            candidate_metrics.get("switchingBuffAmplificationDelta", 0) - current_metrics.get("switchingBuffAmplificationDelta", 0),
            candidate_contribution - current_contribution,
            clean_text(source_title.get("itemName")),
            f"[{buff_skill_name} +{enchant_buff_skill_level_delta}Lv]",
        ))
    return recommendations


def load_buffer_switching_creature_release_recommendations(
    server_id: str,
    character_id: str,
    buffer_baseline: dict | None = None,
) -> list:
    if not buffer_baseline:
        return []
    current_rows, switching_rows, buff_payload = get_buffer_switching_rows(server_id, character_id)
    current_creature_payload = get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    current_creature = current_creature_payload.get("creature") or {}
    buff_creature_payload = get_character_cached_payload(server_id, character_id, "buff_creature", "skill/buff/equip/creature")
    switching_creature_rows = ((buff_creature_payload.get("skill") or {}).get("buff") or {}).get("creature") or []
    switching_creature = (
        switching_creature_rows[0]
        if isinstance(switching_creature_rows, list) and switching_creature_rows
        else switching_creature_rows
    )
    if not isinstance(current_creature, dict) or not current_creature:
        return []
    if not isinstance(switching_creature, dict) or not switching_creature:
        return []

    job_name = clean_text(buffer_baseline.get("jobName") or buff_payload.get("jobName"))
    stat_name = clean_text(buffer_baseline.get("statName"))
    buff_skill_name = clean_text(buffer_baseline.get("buffSkillName"))
    skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
    required_level = get_buff_skill_required_level(server_id, character_id, skill_info)
    if not job_name or not stat_name or not buff_skill_name or required_level <= 0:
        return []

    release_switching_rows = [*switching_rows[:-1], current_creature] if switching_rows else [current_creature]
    item_ids = [
        clean_text(row.get("itemId"))
        for row in [*current_rows, *switching_rows, *release_switching_rows]
        if isinstance(row, dict) and clean_text(row.get("itemId"))
    ]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(item_ids)
        if clean_text(detail.get("itemId"))
    }
    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    current_metrics = get_buffer_switching_metrics(
        current_rows,
        switching_rows,
        detail_by_id,
        style_payload,
        job_name,
        stat_name,
        buff_skill_name,
    )
    release_metrics = get_buffer_switching_metrics(
        current_rows,
        release_switching_rows,
        detail_by_id,
        style_payload,
        job_name,
        stat_name,
        buff_skill_name,
    )
    switching_creature_id = clean_text(switching_creature.get("itemId"))
    current_creature_id = clean_text(current_creature.get("itemId"))
    switching_detail = detail_by_id.get(switching_creature_id) or {}
    current_detail = detail_by_id.get(current_creature_id) or {}
    switching_contribution = get_switching_creature_contribution(
        switching_creature,
        switching_detail,
        job_name,
        buff_skill_name,
        required_level,
    )
    current_contribution = get_switching_creature_contribution(
        current_creature,
        current_detail,
        job_name,
        buff_skill_name,
        required_level,
    )
    switching_stat_delta = release_metrics.get("switchingStatDelta", 0) - current_metrics.get("switchingStatDelta", 0)
    switching_amp_delta = (
        release_metrics.get("switchingBuffAmplificationDelta", 0)
        - current_metrics.get("switchingBuffAmplificationDelta", 0)
    )
    buff_skill_level_delta = current_contribution - switching_contribution
    if switching_stat_delta <= 0 and switching_amp_delta <= 0 and buff_skill_level_delta <= 0:
        return []

    switching_name = clean_text(switching_creature.get("itemName"))
    current_name = clean_text(current_creature.get("itemName"))
    transition_text = f"{switching_name} -> {current_name}" if switching_name and current_name else "현재 장착 크리쳐 적용"
    return [{
        "kind": "switchingCreatureRelease",
        "slot": "벞강 크리쳐",
        "tier": "버프강화",
        "itemId": current_creature_id,
        "itemName": "버프강화 크리쳐 해제",
        "itemRarity": clean_text(current_creature.get("itemRarity") or current_detail.get("itemRarity") or "레어"),
        "iconUrl": get_item_icon_url(current_creature_id),
        "fame": int(current_detail.get("fame") or current_creature.get("fame") or 0),
        "auction": {"minUnitPrice": 0},
        "effects": {},
        "itemExplain": f"현재 장착 크리쳐 적용: {transition_text}",
        "buffSkillName": buff_skill_name,
        "requiredLevel": required_level,
        "currentCreatureContribution": switching_contribution,
        "candidateCreatureContribution": current_contribution,
        "switchingStatDelta": switching_stat_delta,
        "switchingBuffAmplificationDelta": switching_amp_delta,
        "bufferBuffSkillLevelDelta": buff_skill_level_delta,
        "sourceCreatureName": switching_name,
        "targetCreatureName": current_name,
        "purchaseRoute": "releaseSwitchingCreature",
        "purchaseRouteLabel": "",
        "freeAction": True,
        "recommendationPriority": -1000,
    }]


def load_character_loadout(server_id: str, character_id: str) -> dict:
    trace_token = start_api_fanout_trace("/api/character-loadout", server_id, character_id)
    started_at = time.perf_counter()
    try:
        steps = []
        _measure_step(
            steps,
            "prefetch_loadout_item_details",
            lambda: prefetch_loadout_item_details(server_id, character_id),
        )
        enchant_payload = _measure_step(steps, "load_character_enchants", lambda: load_character_enchants(server_id, character_id))
        creature_payload = _measure_step(steps, "load_character_creature", lambda: load_character_creature(server_id, character_id))
        title_payload = _measure_step(steps, "load_character_title", lambda: load_character_title(server_id, character_id))
        aura_payload = _measure_step(steps, "load_character_aura", lambda: load_character_aura(server_id, character_id))
        avatar_payload = _measure_step(
            steps,
            "load_character_avatar",
            lambda: load_character_avatar(server_id, character_id, enchant_payload.get("bufferBaseline")),
        )
        switching_title_recommendations = _measure_step(
            steps,
            "load_switching_title_recommendations",
            lambda: (
                load_buffer_switching_title_recommendations(
                    server_id,
                    character_id,
                    enchant_payload.get("bufferBaseline"),
                )
                if enchant_payload.get("bufferBaseline")
                else load_dealer_switching_title_recommendations(server_id, character_id)
            ),
        )
        switching_fragment_recommendations = _measure_step(
            steps,
            "load_dealer_switching_fragment_recommendations",
            lambda: load_dealer_switching_fragment_recommendations_for_character(
                server_id,
                character_id,
                enchant_payload.get("bufferBaseline"),
            ),
        )
        switching_creature_recommendations = _measure_step(
            steps,
            "load_switching_creature_recommendations",
            lambda: (
                load_buffer_switching_creature_release_recommendations(
                    server_id,
                    character_id,
                    enchant_payload.get("bufferBaseline"),
                )
                if enchant_payload.get("bufferBaseline")
                else load_dealer_switching_creature_recommendations(server_id, character_id)
            ),
        )
        buff_loadout = _measure_step(
            steps,
            "build_buff_loadout",
            lambda: build_buff_loadout_payload(server_id, character_id),
        )
        damage_baseline = dict(enchant_payload.get("damageBaseline") or {})
        avatar_primary_stat_name = clean_text((avatar_payload.get("avatar") or {}).get("primaryStatName"))
        if damage_baseline and not enchant_payload.get("bufferBaseline") and avatar_primary_stat_name in {"힘", "지능"}:
            damage_baseline["statName"] = avatar_primary_stat_name
            damage_baseline["baseStat"] = parse_percent_or_number(
                (load_job_base_stats().get(clean_text(damage_baseline.get("jobGrowName"))) or {}).get(avatar_primary_stat_name)
            )
        return {
            "serverId": enchant_payload.get("serverId"),
            "characterId": enchant_payload.get("characterId"),
            "characterName": enchant_payload.get("characterName"),
            "fame": enchant_payload.get("fame"),
            "damageBaseline": damage_baseline,
            "bufferBaseline": enchant_payload.get("bufferBaseline"),
            "enchants": enchant_payload.get("enchants") or [],
            "equipmentUpgrades": enchant_payload.get("equipmentUpgrades") or [],
            "oathUpgrades": enchant_payload.get("oathUpgrades") or {},
            "oathTranscendRecommendations": enchant_payload.get("oathTranscendRecommendations") or [],
            "oathCraftRecommendations": enchant_payload.get("oathCraftRecommendations") or [],
            "oathTuneStageDb": enchant_payload.get("oathTuneStageDb") or {},
            "blackFangRecommendations": enchant_payload.get("blackFangRecommendations") or [],
            "upgradeExpectedDb": enchant_payload.get("upgradeExpectedDb"),
            "upgradeMaterialPrices": enchant_payload.get("upgradeMaterialPrices"),
            "creature": creature_payload.get("creature"),
            "title": title_payload.get("title"),
            "aura": aura_payload.get("aura"),
            "avatar": avatar_payload,
            "buffLoadout": buff_loadout,
            "switchingTitleRecommendations": switching_title_recommendations,
            "switchingFragmentRecommendations": switching_fragment_recommendations,
            "switchingCreatureRecommendations": switching_creature_recommendations,
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
    finally:
        write_ops_log("api_fanout_summary", **finish_api_fanout_trace(trace_token))


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


def get_avatar_emblem_stat_total(avatar_rows: list, stat_name: str) -> float:
    total = 0
    for row in avatar_rows or []:
        for emblem in row.get("emblems") or []:
            item_name = clean_text(emblem.get("itemName"))
            slot_color = clean_text(emblem.get("slotColor"))
            if "플래티넘" in item_name or "플래티넘" in slot_color:
                continue
            kind = (
                "red" if "붉은빛" in slot_color or "붉은빛" in item_name
                else "yellow" if "노란빛" in slot_color or "옐로우" in item_name
                else "green" if "녹색빛" in slot_color or "그린" in item_name
                else "dual" if "듀얼" in item_name
                else ""
            )
            if kind:
                total += get_emblem_stat_value(item_name, stat_name, kind)
    return total


def get_avatar_buffer_stat_signal_total(avatar_rows: list, stat_name: str) -> float:
    return sum(get_row_direct_stat(row, {}, stat_name) for row in avatar_rows or [])


def resolve_avatar_primary_stat_name(
    payload: dict,
    avatar_rows: list,
    server_id: str,
    character_id: str,
) -> str:
    status_payload = get_character_cached_payload(server_id, character_id, "status", "status")
    status = status_rows_to_map(status_payload.get("status") or [])
    strength = float(status.get("힘") or 0)
    intelligence = float(status.get("지능") or 0)
    if strength != intelligence:
        return "힘" if strength > intelligence else "지능"

    strength_emblems = get_avatar_emblem_stat_total(avatar_rows, "힘")
    intelligence_emblems = get_avatar_emblem_stat_total(avatar_rows, "지능")
    if strength_emblems != intelligence_emblems:
        return "힘" if strength_emblems > intelligence_emblems else "지능"

    shoes_option = clean_text(get_avatar_slot(avatar_rows, "SHOES").get("optionAbility"))
    head_options = " ".join([
        clean_text(get_avatar_slot(avatar_rows, "HEADGEAR").get("optionAbility")),
        clean_text(get_avatar_slot(avatar_rows, "HAIR").get("optionAbility")),
    ])
    has_strength_option = "힘" in shoes_option
    has_intelligence_option = "지능" in head_options
    if has_strength_option != has_intelligence_option:
        return "힘" if has_strength_option else "지능"

    strength_item = find_lowest_exact_item_by_name(get_avatar_emblem_item_name("힘", "red"))
    intelligence_item = find_lowest_exact_item_by_name(get_avatar_emblem_item_name("지능", "red"))
    strength_price = (strength_item.get("auction") or {}).get("minUnitPrice")
    intelligence_price = (intelligence_item.get("auction") or {}).get("minUnitPrice")
    if isinstance(strength_price, (int, float)) and isinstance(intelligence_price, (int, float)):
        return "힘" if strength_price <= intelligence_price else "지능"
    return get_character_primary_stat_name(payload)


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
    avatar_rows = payload.get("avatar") or []
    switching_payload = get_character_cached_payload(
        server_id,
        character_id,
        "buff_avatar",
        "skill/buff/equip/avatar",
    )
    switching_rows = ((switching_payload.get("skill") or {}).get("buff") or {}).get("avatar") or []
    vitality_signal = (
        get_avatar_buffer_stat_signal_total(avatar_rows, "체력")
        + get_avatar_buffer_stat_signal_total(switching_rows, "체력")
    )
    spirit_signal = (
        get_avatar_buffer_stat_signal_total(avatar_rows, "정신력")
        + get_avatar_buffer_stat_signal_total(switching_rows, "정신력")
    )
    if vitality_signal != spirit_signal:
        return "체력" if vitality_signal > spirit_signal else "정신력"
    status_payload = get_character_cached_payload(server_id, character_id, "status", "status")
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
    emblems = [
        *(row.get("emblems") or []),
        *((row.get("avatar") or {}).get("emblems") or []),
    ]
    return [
        emblem for emblem in emblems
        if "플래티넘" in clean_text(emblem.get("slotColor"))
        or "플래티넘" in clean_text(emblem.get("itemName"))
    ]


def extract_platinum_skill_name(item_name: str) -> str:
    match = re.search(r"\[([^\]]+)\]", clean_text(item_name))
    return match.group(1).strip() if match else ""


def get_switching_avatar_db_entry(payload: dict) -> tuple[str, dict]:
    db = load_switching_avatar_db()
    jobs = db.get("jobs") if isinstance(db, dict) else {}
    if not isinstance(jobs, dict):
        return "", {}
    job_names = [
        clean_text(payload.get("jobName")),
        normalize_job_name(payload.get("jobName")),
        clean_text(payload.get("jobGrowName")),
        normalize_job_name(payload.get("jobGrowName")),
    ]
    job_keys = {name for name in job_names if name}
    for job_key, entry in jobs.items():
        if not isinstance(entry, dict):
            continue
        aliases = {
            clean_text(job_key),
            normalize_job_name(job_key),
            *[
                clean_text(alias)
                for alias in entry.get("aliases") or []
                if clean_text(alias)
            ],
            *[
                normalize_job_name(alias)
                for alias in entry.get("aliases") or []
                if clean_text(alias)
            ],
        }
        if job_keys & aliases:
            return clean_text(job_key), entry
    return "", {}


def get_switching_avatar_db_items(entry: dict, slot_key: str) -> list[dict]:
    slot = entry.get(slot_key) if isinstance(entry, dict) else {}
    if not isinstance(slot, dict):
        return []
    items = []
    seen = set()
    for item in slot.get("items") or []:
        if not isinstance(item, dict):
            continue
        item_name = clean_text(item.get("itemName") or item.get("name"))
        item_ids = [
            clean_text(item_id)
            for item_id in [item.get("itemId"), *(item.get("itemIds") or [])]
            if clean_text(item_id)
        ]
        if not item_ids:
            key = ("", item_name)
            if not item_name or key in seen:
                continue
            seen.add(key)
            items.append({"itemName": item_name, "itemId": ""})
            continue
        for item_id in item_ids:
            key = (item_id, item_name)
            if key in seen:
                continue
            seen.add(key)
            items.append({"itemName": item_name, "itemId": item_id})

    search_names = [
        clean_text(name)
        for name in slot.get("searchNames") or []
        if clean_text(name)
    ]
    item_ids = [
        clean_text(item_id)
        for item_id in slot.get("itemIds") or []
        if clean_text(item_id)
    ]
    for item_name in search_names:
        key = ("", item_name)
        if key not in seen:
            seen.add(key)
            items.append({"itemName": item_name, "itemId": ""})
    for item_id in item_ids:
        key = (item_id, "")
        if key not in seen:
            seen.add(key)
            items.append({"itemName": "", "itemId": item_id})
    return items


def is_matching_switching_platinum_emblem(emblem: dict, target_skill_names: list[str]) -> bool:
    skill_name = clean_text(extract_platinum_skill_name(emblem.get("itemName")))
    return any(
        skill_name_matches(skill_name, target_skill)
        for target_skill in target_skill_names or []
    )


def has_matching_switching_platinum(row: dict, target_skill_names: list[str]) -> bool:
    return any(
        is_matching_switching_platinum_emblem(emblem, target_skill_names)
        for emblem in get_platinum_emblems(row)
    )


def has_matching_switching_avatar_top_option(row: dict, target_skill_names: list[str]) -> bool:
    option_ability = clean_text(row.get("optionAbility") or (row.get("avatar") or {}).get("ability"))
    return any(
        skill_name_matches(option_ability, target_skill)
        for target_skill in target_skill_names or []
    )


def auction_row_price(row: dict) -> int | float | None:
    price = row.get("unitPrice") or row.get("currentPrice")
    return price if isinstance(price, (int, float)) and price > 0 else None


def fetch_switching_avatar_auction_rows(items: list[dict], debug_steps: list | None = None) -> list[dict]:
    started_at = time.perf_counter()
    rows = []
    seen_auction_no = set()
    allowed_names = {
        clean_text(item.get("itemName"))
        for item in items or []
        if clean_text(item.get("itemName"))
    }
    allowed_ids = {
        clean_text(item.get("itemId"))
        for item in items or []
        if clean_text(item.get("itemId"))
    }
    item_ids = sorted(allowed_ids)
    item_id_call_count = 0
    item_id_page_count = 0
    item_id_raw_row_count = 0
    item_id_accepted_row_count = 0
    for index in range(0, len(item_ids), 10):
        chunk = item_ids[index:index + 10]
        for page in range(SWITCHING_AVATAR_AUCTION_MAX_PAGES):
            offset = page * SWITCHING_AVATAR_AUCTION_PAGE_LIMIT
            item_id_call_count += 1
            page_rows = get_auction_rows_by_item_ids(
                chunk,
                limit=SWITCHING_AVATAR_AUCTION_PAGE_LIMIT,
                offset=offset,
            )
            if not page_rows:
                break
            item_id_page_count += 1
            item_id_raw_row_count += len(page_rows)
            for row in page_rows:
                row_item_id = clean_text(row.get("itemId"))
                row_item_name = clean_text(row.get("itemName"))
                if row_item_id not in allowed_ids or auction_row_price(row) is None:
                    continue
                auction_no = clean_text(row.get("auctionNo")) or f"{row_item_id}:{row_item_name}:{auction_row_price(row)}"
                if auction_no in seen_auction_no:
                    continue
                seen_auction_no.add(auction_no)
                rows.append(row)
                item_id_accepted_row_count += 1
            if len(page_rows) < SWITCHING_AVATAR_AUCTION_PAGE_LIMIT:
                break

    name_call_count = 0
    name_page_count = 0
    name_raw_row_count = 0
    name_accepted_row_count = 0
    for item in items or []:
        item_name = clean_text(item.get("itemName"))
        item_id = clean_text(item.get("itemId"))
        if item_id:
            continue
        for page in range(SWITCHING_AVATAR_AUCTION_MAX_PAGES):
            offset = page * SWITCHING_AVATAR_AUCTION_PAGE_LIMIT
            name_call_count += 1
            page_rows = get_auction_rows_by_name(
                item_name,
                word_type="match",
                limit=SWITCHING_AVATAR_AUCTION_PAGE_LIMIT,
                offset=offset,
            )
            if not page_rows:
                break
            name_page_count += 1
            name_raw_row_count += len(page_rows)
            for row in page_rows:
                row_item_id = clean_text(row.get("itemId"))
                row_item_name = clean_text(row.get("itemName"))
                if allowed_ids and row_item_id in allowed_ids:
                    matched = True
                else:
                    matched = bool(row_item_name and row_item_name in allowed_names)
                if not matched or auction_row_price(row) is None:
                    continue
                auction_no = clean_text(row.get("auctionNo")) or f"{row_item_id}:{row_item_name}:{auction_row_price(row)}"
                if auction_no in seen_auction_no:
                    continue
                seen_auction_no.add(auction_no)
                rows.append(row)
                name_accepted_row_count += 1
            if len(page_rows) < SWITCHING_AVATAR_AUCTION_PAGE_LIMIT:
                break
    if debug_steps is not None:
        debug_steps.append({
            "name": "fetch_switching_avatar_auction_rows",
            "ms": round((time.perf_counter() - started_at) * 1000, 1),
            "items": len(items or []),
            "itemIds": len(item_ids),
            "nameFallbackItems": sum(
                1
                for item in items or []
                if clean_text(item.get("itemName")) and not clean_text(item.get("itemId"))
            ),
            "itemIdCalls": item_id_call_count,
            "itemIdPages": item_id_page_count,
            "itemIdRawRows": item_id_raw_row_count,
            "itemIdRows": item_id_accepted_row_count,
            "nameCalls": name_call_count,
            "namePages": name_page_count,
            "nameRawRows": name_raw_row_count,
            "nameRows": name_accepted_row_count,
            "rows": len(rows),
        })
    return rows


def build_switching_avatar_price_option(row: dict, selected_price: int | float | None = None) -> dict:
    item_id = clean_text(row.get("itemId"))
    price = selected_price if isinstance(selected_price, (int, float)) and selected_price > 0 else auction_row_price(row)
    return {
        "itemId": item_id,
        "itemName": clean_item_display_name(row.get("itemName")),
        "itemRarity": clean_text(row.get("itemRarity")) or "레어",
        "iconUrl": get_item_icon_url(item_id),
        "auction": {
            "listingCount": int(row.get("regCount") or 1),
            "minUnitPrice": price,
            "averagePrice": row.get("averagePrice") if row.get("averagePrice", 0) > 0 else None,
            "auctionNo": row.get("auctionNo"),
            "expireDate": row.get("expireDate"),
        },
    }


def resolve_switching_avatar_price(
    slot_key: str,
    items: list[dict],
    target_skill_names: list[str],
    platinum_item: dict,
    require_top_option_match: bool = False,
) -> dict:
    normalized_items = tuple(
        sorted(
            (
                clean_text(item.get("itemId")),
                clean_text(item.get("itemName")),
            )
            for item in items or []
        )
    )
    normalized_skills = tuple(
        clean_text(skill)
        for skill in target_skill_names or []
        if clean_text(skill)
    )
    cache_key = (
        "switching_avatar",
        SWITCHING_AVATAR_RESOLVED_PRICE_CACHE_VERSION,
        slot_key,
        normalized_items,
        normalized_skills,
        clean_text(platinum_item.get("itemId")),
        clean_text((platinum_item.get("auction") or {}).get("auctionNo")),
        (platinum_item.get("auction") or {}).get("minUnitPrice"),
        bool(require_top_option_match),
    )

    def resolve_uncached():
        debug_steps = []
        rows = fetch_switching_avatar_auction_rows(items, debug_steps=debug_steps)
        raw_row_count = len(rows)
        if require_top_option_match:
            filter_started_at = time.perf_counter()
            rows = [
                row for row in rows
                if has_matching_switching_avatar_top_option(row, target_skill_names)
            ]
            debug_steps.append({
                "name": "filter_switching_avatar_top_option",
                "ms": round((time.perf_counter() - filter_started_at) * 1000, 1),
                "beforeRows": raw_row_count,
                "afterRows": len(rows),
                "targetSkills": list(normalized_skills),
            })
        classify_started_at = time.perf_counter()
        base_rows = [
            row for row in rows
            if not has_matching_switching_platinum(row, target_skill_names)
        ]
        prefilled_rows = [
            row for row in rows
            if has_matching_switching_platinum(row, target_skill_names)
        ]
        base_row = min(base_rows, key=lambda row: auction_row_price(row) or 10**30, default=None)
        prefilled_row = min(prefilled_rows, key=lambda row: auction_row_price(row) or 10**30, default=None)
        platinum_price = (platinum_item.get("auction") or {}).get("minUnitPrice")
        base_price = auction_row_price(base_row) if base_row else None
        prefilled_price = auction_row_price(prefilled_row) if prefilled_row else None
        debug_steps.append({
            "name": "classify_switching_avatar_price_rows",
            "ms": round((time.perf_counter() - classify_started_at) * 1000, 1),
            "rows": len(rows),
            "baseRows": len(base_rows),
            "prefilledRows": len(prefilled_rows),
        })
        separate_price = (
            base_price + platinum_price
            if isinstance(base_price, (int, float)) and base_price > 0
            and isinstance(platinum_price, (int, float)) and platinum_price > 0
            else None
        )
        use_prefilled = (
            isinstance(prefilled_price, (int, float)) and prefilled_price > 0
            and (
                not isinstance(separate_price, (int, float))
                or separate_price <= 0
                or prefilled_price <= separate_price
            )
        )
        use_separate = (
            not use_prefilled
            and isinstance(separate_price, (int, float))
            and separate_price > 0
        )
        if not use_prefilled and not use_separate:
            return {
                "selectedMode": "",
                "selectedPrice": None,
                "debug": {
                    "steps": debug_steps,
                    "cheapestBaseAvatarPrice": base_price,
                    "cheapestSwitchingPlatinumPrice": platinum_price,
                    "separatePrice": separate_price,
                    "prefilledPrice": prefilled_price,
                },
            }

        selected_row = prefilled_row if use_prefilled else base_row
        selected_price = prefilled_price if use_prefilled else separate_price
        selected_mode = "prefilled" if use_prefilled else "separate"
        selected_avatar = build_switching_avatar_price_option(selected_row, selected_price)
        return {
            "selectedMode": selected_mode,
            "selectedPrice": selected_price,
            "selectedAvatar": selected_avatar,
            "selectedPlatinum": platinum_item if use_separate else {},
            "debug": {
                "steps": debug_steps,
                "cheapestBaseAvatarPrice": base_price,
                "cheapestSwitchingPlatinumPrice": platinum_price,
                "separatePrice": separate_price,
                "prefilledPrice": prefilled_price,
                "selectedPrice": selected_price,
                "selectedMode": selected_mode,
                "selectedAvatarItemName": clean_item_display_name((selected_row or {}).get("itemName")),
                "selectedAvatarAuctionNo": clean_text((selected_row or {}).get("auctionNo")),
                "selectedPlatinumItemName": clean_item_display_name(platinum_item.get("itemName")) if use_separate else "",
                "selectedPlatinumAuctionNo": clean_text((platinum_item.get("auction") or {}).get("auctionNo")) if use_separate else "",
            },
        }

    return get_cached_resolved_price(
        cache_key,
        resolve_uncached,
        should_cache=lambda item: isinstance(item.get("selectedPrice"), (int, float))
        and item.get("selectedPrice") > 0,
    )


def get_avatar_auction_emblems(row: dict) -> list:
    return [
        *(row.get("emblems") or []),
        *((row.get("avatar") or {}).get("emblems") or []),
    ]


def get_matching_buffer_stat_emblem_count(row: dict, stat_name: str, target_stat: int | float = AVATAR_BRILLIANT_GREEN_STAT) -> int:
    stat_name = clean_text(stat_name)
    count = 0
    for emblem in get_avatar_auction_emblems(row):
        item_name = clean_text(emblem.get("itemName"))
        slot_color = clean_text(emblem.get("slotColor"))
        if "플래티넘" in item_name or "플래티넘" in slot_color:
            continue
        if get_emblem_primary_stat_value(item_name, stat_name) >= target_stat:
            count += 1
    return min(2, count)


def get_avatar_buffer_stat_emblem_total(row: dict, stat_name: str) -> float:
    stat_name = clean_text(stat_name)
    total = 0.0
    for emblem in get_avatar_auction_emblems(row):
        item_name = clean_text(emblem.get("itemName"))
        slot_color = clean_text(emblem.get("slotColor"))
        if "플래티넘" in item_name or "플래티넘" in slot_color:
            continue
        total += get_emblem_primary_stat_value(item_name, stat_name)
    return total


def build_completed_buffer_switching_avatar_row(
    row: dict,
    slot_id: str,
    slot_label: str,
    target_skill_name: str,
    stat_name: str,
    stat_emblem_item: dict,
    missing_platinum_count: int,
    missing_stat_count: int,
) -> dict:
    completed = {
        **(row or {}),
        "slotId": clean_text((row or {}).get("slotId")) or slot_id,
        "slotName": clean_text((row or {}).get("slotName")) or slot_label,
        "optionAbility": clean_text(
            (row or {}).get("optionAbility")
            or ((row or {}).get("avatar") or {}).get("ability")
            or ((row or {}).get("avatar") or {}).get("optionAbility")
        ),
    }
    if isinstance(completed.get("avatar"), dict):
        completed["avatar"] = {**completed["avatar"], "emblems": []}
    emblems = list(get_avatar_auction_emblems(row or {}))
    if missing_platinum_count > 0 and target_skill_name:
        emblems.append({
            "itemName": f"플래티넘 엠블렘[{target_skill_name}]",
            "slotColor": "플래티넘",
        })
    stat_item_name = clean_item_display_name(stat_emblem_item.get("itemName")) or get_avatar_emblem_item_name(stat_name, "green")
    for _ in range(max(0, missing_stat_count)):
        emblems.append({
            "itemName": stat_item_name,
            "slotColor": "녹색빛",
        })
    completed["emblems"] = emblems
    return completed


def calculate_buffer_switching_avatar_candidate_delta(
    server_id: str,
    character_id: str,
    slot_id: str,
    candidate_avatar_row: dict,
    buffer_baseline: dict,
    stat_name: str,
    buff_skill_name: str,
    raw_switching_avatar_rows: list | None = None,
) -> dict:
    current_rows, switching_rows, _ = get_buffer_switching_rows(server_id, character_id)
    raw_switching_row = get_avatar_slot(raw_switching_avatar_rows or [], slot_id)
    has_raw_switching_slot = bool(clean_text(raw_switching_row.get("slotId")) or clean_text(raw_switching_row.get("itemId")))
    item_ids = [
        clean_text(row.get("itemId"))
        for row in [*current_rows, *switching_rows, candidate_avatar_row]
        if isinstance(row, dict) and clean_text(row.get("itemId"))
    ]
    detail_by_id = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(item_ids)
        if clean_text(detail.get("itemId"))
    }
    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    job_name = clean_text(buffer_baseline.get("jobName"))
    candidate_switching_rows = replace_avatar_row(switching_rows, slot_id, candidate_avatar_row)
    current_metrics = get_buffer_switching_metrics(
        current_rows,
        switching_rows,
        detail_by_id,
        style_payload,
        job_name,
        stat_name,
        buff_skill_name,
    )
    candidate_metrics = get_buffer_switching_metrics(
        current_rows,
        candidate_switching_rows,
        detail_by_id,
        style_payload,
        job_name,
        stat_name,
        buff_skill_name,
    )
    current_slot_row = get_mixed_avatar_slot(switching_rows, slot_id)
    current_contribution = get_switching_avatar_skill_level_contribution(
        [current_slot_row] if current_slot_row else [],
        [buff_skill_name],
    )
    candidate_contribution = get_switching_avatar_skill_level_contribution(
        [candidate_avatar_row],
        [buff_skill_name],
    )
    stat_delta = (
        float(candidate_metrics.get("switchingStatDelta") or 0)
        - float(current_metrics.get("switchingStatDelta") or 0)
    )
    if not has_raw_switching_slot:
        stat_delta = (
            get_avatar_buffer_stat_emblem_total(candidate_avatar_row or {}, stat_name)
            - get_avatar_buffer_stat_emblem_total(current_slot_row or {}, stat_name)
            + float(candidate_metrics.get("switchingSkillStatDelta") or 0)
            - float(current_metrics.get("switchingSkillStatDelta") or 0)
        )
    return {
        "statDelta": stat_delta,
        "buffSkillLevelDelta": candidate_contribution - current_contribution,
        "currentBuffSkillLevelContribution": current_contribution,
        "candidateBuffSkillLevelContribution": candidate_contribution,
        "currentMetrics": current_metrics,
        "candidateMetrics": candidate_metrics,
        "usedCurrentAvatarFallback": not has_raw_switching_slot,
    }


def resolve_buffer_switching_avatar_price(
    slot_key: str,
    items: list[dict],
    target_skill_name: str,
    stat_name: str,
    platinum_item: dict,
    stat_emblem_item: dict,
    require_top_option_match: bool = False,
) -> dict:
    normalized_items = tuple(
        sorted(
            (
                clean_text(item.get("itemId")),
                clean_text(item.get("itemName")),
            )
            for item in items or []
        )
    )
    target_skill_name = clean_text(target_skill_name)
    stat_name = clean_text(stat_name)
    platinum_price = (platinum_item.get("auction") or {}).get("minUnitPrice")
    stat_emblem_price = (stat_emblem_item.get("auction") or {}).get("minUnitPrice")
    cache_key = (
        "switching_avatar",
        SWITCHING_AVATAR_RESOLVED_PRICE_CACHE_VERSION,
        "buffer_complete",
        slot_key,
        normalized_items,
        target_skill_name,
        stat_name,
        clean_text(platinum_item.get("itemId")),
        clean_text((platinum_item.get("auction") or {}).get("auctionNo")),
        platinum_price,
        clean_text(stat_emblem_item.get("itemId")),
        clean_text((stat_emblem_item.get("auction") or {}).get("auctionNo")),
        stat_emblem_price,
        bool(require_top_option_match),
    )

    def resolve_uncached():
        debug_steps = []
        rows = fetch_switching_avatar_auction_rows(items, debug_steps=debug_steps)
        raw_row_count = len(rows)
        if require_top_option_match:
            filter_started_at = time.perf_counter()
            rows = [
                row for row in rows
                if has_matching_switching_avatar_top_option(row, [target_skill_name])
            ]
            debug_steps.append({
                "name": "filter_buffer_switching_avatar_top_option",
                "ms": round((time.perf_counter() - filter_started_at) * 1000, 1),
                "beforeRows": raw_row_count,
                "afterRows": len(rows),
                "targetSkill": target_skill_name,
            })

        best = {}
        best_total_price = None
        evaluated = 0
        skipped_platinum = 0
        skipped_stat = 0
        for row in rows:
            avatar_price = auction_row_price(row)
            if not isinstance(avatar_price, (int, float)) or avatar_price <= 0:
                continue
            has_platinum = has_matching_switching_platinum(row, [target_skill_name])
            stat_count = get_matching_buffer_stat_emblem_count(row, stat_name)
            missing_platinum_count = 0 if has_platinum else 1
            missing_stat_count = max(0, 2 - stat_count)
            if missing_platinum_count and not (isinstance(platinum_price, (int, float)) and platinum_price > 0):
                skipped_platinum += 1
                continue
            if missing_stat_count and not (isinstance(stat_emblem_price, (int, float)) and stat_emblem_price > 0):
                skipped_stat += 1
                continue
            total_price = (
                avatar_price
                + (platinum_price if missing_platinum_count else 0)
                + (missing_stat_count * stat_emblem_price if missing_stat_count else 0)
            )
            evaluated += 1
            if best_total_price is None or total_price < best_total_price:
                best_total_price = total_price
                best = {
                    "row": row,
                    "totalPrice": total_price,
                    "avatarPrice": avatar_price,
                    "hasSwitchingPlatinum": has_platinum,
                    "statEmblemCount": stat_count,
                    "missingPlatinumCount": missing_platinum_count,
                    "missingStatEmblemCount": missing_stat_count,
                }

        debug_steps.append({
            "name": "select_buffer_switching_avatar_complete_price",
            "rows": len(rows),
            "evaluated": evaluated,
            "skippedMissingPlatinumPrice": skipped_platinum,
            "skippedMissingStatEmblemPrice": skipped_stat,
            "selectedPrice": best_total_price,
        })
        if not best:
            return {
                "selectedPrice": None,
                "debug": {
                    "steps": debug_steps,
                    "cheapestSwitchingPlatinumPrice": platinum_price,
                    "cheapestStatEmblemPrice": stat_emblem_price,
                },
            }
        row = best.get("row") or {}
        return {
            "selectedPrice": best_total_price,
            "selectedAvatar": build_switching_avatar_price_option(row, best_total_price),
            "selectedAvatarRow": row,
            "selectedPlatinum": platinum_item if best.get("missingPlatinumCount") else {},
            "selectedStatEmblem": stat_emblem_item if best.get("missingStatEmblemCount") else {},
            "priceMode": "complete" if not best.get("missingPlatinumCount") and not best.get("missingStatEmblemCount") else "mixed",
            "debug": {
                "steps": debug_steps,
                "avatarPrice": best.get("avatarPrice"),
                "cheapestSwitchingPlatinumPrice": platinum_price,
                "cheapestStatEmblemPrice": stat_emblem_price,
                "hasSwitchingPlatinum": best.get("hasSwitchingPlatinum"),
                "statEmblemCount": best.get("statEmblemCount"),
                "missingPlatinumCount": best.get("missingPlatinumCount"),
                "missingStatEmblemCount": best.get("missingStatEmblemCount"),
                "selectedPrice": best_total_price,
                "selectedAvatarItemName": clean_item_display_name(row.get("itemName")),
                "selectedAvatarAuctionNo": clean_text(row.get("auctionNo")),
            },
        }

    return get_cached_resolved_price(
        cache_key,
        resolve_uncached,
        should_cache=lambda item: isinstance(item.get("selectedPrice"), (int, float))
        and item.get("selectedPrice") > 0,
    )


def build_switching_avatar_recommendation_row(
    slot: str,
    selected_avatar: dict,
    display_item_name: str,
    selected_mode: str,
    item_explain: str,
    skill_damage_multiplier: float,
    raw_skill_damage_multiplier: float,
    damage_application_note: str,
    target_skill: str,
    equivalent_target_skills: list,
    current_switching_multiplier: float,
    candidate_switching_multiplier: float,
    price_warning_text: str = "",
    debug: dict | None = None,
) -> dict:
    return {
        "kind": "switchingAvatar",
        "slot": slot,
        "tier": "버프강화",
        "itemId": clean_text(selected_avatar.get("itemId")),
        "itemName": clean_item_display_name(display_item_name) or clean_item_display_name(selected_avatar.get("itemName")),
        "itemRarity": clean_text(selected_avatar.get("itemRarity") or "레어"),
        "iconUrl": selected_avatar.get("iconUrl") or get_item_icon_url(selected_avatar.get("itemId")),
        "itemExplain": item_explain,
        "effects": {"skillDamageMultiplier": skill_damage_multiplier},
        "skillDamageMultiplier": skill_damage_multiplier,
        "rawSkillDamageMultiplier": raw_skill_damage_multiplier,
        "damageApplicationNote": damage_application_note,
        "auction": selected_avatar.get("auction") or {},
        "needCount": 1,
        "targetSkill": target_skill,
        "equivalentTargetSkills": equivalent_target_skills,
        "currentSwitchingMultiplier": current_switching_multiplier,
        "candidateSwitchingMultiplier": candidate_switching_multiplier,
        "priceMode": selected_mode,
        "priceWarningText": price_warning_text,
        "recommendationPriority": 0,
        "debug": debug or {},
    }


def build_buffer_switching_avatar_recommendation_row(
    slot: str,
    selected_avatar: dict,
    display_item_name: str,
    item_explain: str,
    buffer_stat_gain: float,
    buffer_buff_skill_level_delta: int,
    target_skill: str,
    stat_name: str,
    price_mode: str,
    debug: dict | None = None,
) -> dict:
    return {
        "kind": "switchingAvatar",
        "slot": slot,
        "tier": "버프강화",
        "itemId": clean_text(selected_avatar.get("itemId")),
        "itemName": clean_item_display_name(display_item_name) or clean_item_display_name(selected_avatar.get("itemName")),
        "itemRarity": clean_text(selected_avatar.get("itemRarity") or "레어"),
        "iconUrl": selected_avatar.get("iconUrl") or get_item_icon_url(selected_avatar.get("itemId")),
        "itemExplain": item_explain,
        "effects": {"bufferStat": buffer_stat_gain},
        "auction": selected_avatar.get("auction") or {},
        "needCount": 1,
        "targetSkill": target_skill,
        "targetStat": stat_name,
        "bufferStatScope": "switching",
        "bufferBuffSkillLevelDelta": buffer_buff_skill_level_delta,
        "bufferAwakeningSkillLevelDelta": 0,
        "priceMode": price_mode,
        "recommendationPriority": 0,
        "debug": debug or {},
    }


def extract_emblem_option_text(item_name: str) -> str:
    match = re.search(r"\[([^\]]+)\]", clean_text(item_name))
    return match.group(1).strip() if match else ""


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


def get_row_buff_amplification(row: dict, detail: dict) -> float:
    item_effects = normalize_enchant_status(detail.get("itemStatus") or [])
    enchant_effects = normalize_enchant_status((row.get("enchant") or {}).get("status") or [])
    return float(item_effects.get("buffAmplification") or 0) + float(enchant_effects.get("buffAmplification") or 0)


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
        reinforce_skill_groups = [
            *(detail.get("itemReinforceSkill") or []),
            *((detail.get("itemBuff") or {}).get("reinforceSkill") or []),
        ]
        for job in reinforce_skill_groups:
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
    current_equipment = get_character_cached_payload(server_id, character_id, "equipment", "equip/equipment").get("equipment") or []
    current_avatar = get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar").get("avatar") or []
    current_creature_payload = get_character_cached_payload(server_id, character_id, "creature", "equip/creature")
    current_creature = current_creature_payload.get("creature") or {}
    buff_equipment_payload = get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
    buff_avatar_payload = get_character_cached_payload(server_id, character_id, "buff_avatar", "skill/buff/equip/avatar")
    buff_creature_payload = get_character_cached_payload(server_id, character_id, "buff_creature", "skill/buff/equip/creature")
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
    switching_buff_amplification_delta = (
        sum(get_row_buff_amplification(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}) for row in switching_rows)
        - sum(get_row_buff_amplification(row, detail_by_id.get(clean_text(row.get("itemId"))) or {}) for row in current_rows)
    )

    style_payload = get_character_cached_payload(server_id, character_id, "skill_style", "skill/style")
    style_rows = flatten_skill_rows(style_payload)
    style_by_name = {clean_text(row.get("name")): row for row in style_rows if clean_text(row.get("name"))}
    current_bonuses = get_setup_skill_bonuses(current_rows, detail_by_id, style_rows, job_name)
    switching_bonuses = get_setup_skill_bonuses(switching_rows, detail_by_id, style_rows, job_name)
    score_skills = BUFFER_SCORE_SKILLS.get(clean_text(buff_skill_name), {})
    relevant_skills = BUFFER_SWITCHING_SELF_STAT_SKILLS.get(clean_text(buff_skill_name), set())
    score_skill_names = set().union(*(score_skills.values() or [set()]))
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
        skill_detail = fetch_skill_detail_from_api(clean_text(style_payload.get("jobId")), skill_id)
        skill_detail_by_name[name] = skill_detail
        current_value = get_skill_level_stat_value(skill_detail, base_level + current_bonuses.get(name, 0), stat_name)
        switching_value = get_skill_level_stat_value(skill_detail, base_level + switching_bonuses.get(name, 0), stat_name)
        delta = switching_value - current_value
        if delta:
            skill_delta += delta
            skill_deltas[name] = delta
    current_self_stat_skills = {}
    for name in relevant_skills | score_skill_names:
        style_row = style_by_name.get(name) or {}
        skill_id = clean_text(style_row.get("skillId"))
        base_level = int(style_row.get("level") or 0)
        if not skill_id or base_level <= 0:
            continue
        skill_detail = skill_detail_by_name.get(name)
        if not skill_detail:
            skill_detail = fetch_skill_detail_from_api(clean_text(style_payload.get("jobId")), skill_id)
        current_level = base_level + current_bonuses.get(name, 0)
        current_self_stat_skills[name] = {
            "level": current_level,
            "requiredLevel": int(style_row.get("requiredLevel") or 0),
            "previousStat": get_skill_level_stat_value(skill_detail, current_level - 1, stat_name),
            "currentStat": get_skill_level_stat_value(skill_detail, current_level, stat_name),
            "nextStat": get_skill_level_stat_value(skill_detail, current_level + 1, stat_name),
            "previousPartyStat": get_skill_level_labeled_value(
                skill_detail,
                current_level - 1,
                lambda line: "힘" in line and "지능" in line and "증가" in line,
            ) if name in score_skills.get("auraStat", set()) else 0,
            "currentPartyStat": get_skill_level_labeled_value(
                skill_detail,
                current_level,
                lambda line: "힘" in line and "지능" in line and "증가" in line,
            ) if name in score_skills.get("auraStat", set()) else 0,
            "nextPartyStat": get_skill_level_labeled_value(
                skill_detail,
                current_level + 1,
                lambda line: "힘" in line and "지능" in line and "증가" in line,
            ) if name in score_skills.get("auraStat", set()) else 0,
            "previousPartyAttack": get_skill_level_labeled_value(
                skill_detail,
                current_level - 1,
                lambda line: "파티원" in line and "공격력 증가" in line,
            ) if name in score_skills.get("auraAttack", set()) else 0,
            "currentPartyAttack": get_skill_level_labeled_value(
                skill_detail,
                current_level,
                lambda line: "파티원" in line and "공격력 증가" in line,
            ) if name in score_skills.get("auraAttack", set()) else 0,
            "nextPartyAttack": get_skill_level_labeled_value(
                skill_detail,
                current_level + 1,
                lambda line: "파티원" in line and "공격력 증가" in line,
            ) if name in score_skills.get("auraAttack", set()) else 0,
        }
        skill_detail_by_name[name] = skill_detail

    active_self_stat = sum(
        get_skill_level_stat_value(
            skill_detail_by_name.get(name) or {},
            int((style_by_name.get(name) or {}).get("level") or 0) + current_bonuses.get(name, 0),
            stat_name,
        )
        for name in score_skills.get("activeSelfStat", set())
    )
    aura_stat = sum(
        get_skill_level_labeled_value(
            skill_detail_by_name.get(name) or {},
            int((style_by_name.get(name) or {}).get("level") or 0) + current_bonuses.get(name, 0),
            lambda line: "힘" in line and "지능" in line and "증가" in line,
        )
        for name in score_skills.get("auraStat", set())
    )
    aura_attack = sum(
        get_skill_level_labeled_value(
            skill_detail_by_name.get(name) or {},
            int((style_by_name.get(name) or {}).get("level") or 0) + current_bonuses.get(name, 0),
            lambda line: "파티원" in line and "공격력 증가" in line,
        )
        for name in score_skills.get("auraAttack", set())
    )
    return {
        "switchingStatDelta": direct_delta + skill_delta,
        "switchingDirectStatDelta": direct_delta,
        "switchingSkillStatDelta": skill_delta,
        "switchingSkillStatDeltas": skill_deltas,
        "switchingBuffAmplificationDelta": switching_buff_amplification_delta,
        "switchingTitleUsesCurrent": "TITLE" not in switching_equipment_by_slot,
        "currentSelfStatSkills": current_self_stat_skills,
        "activeSelfStat": active_self_stat,
        "auraStat": aura_stat,
        "auraAttack": aura_attack,
    }


def get_avatar_platinum_damage_percent(slot_label: str) -> float:
    return AVATAR_PLATINUM_FINAL_DAMAGE_PERCENT


def find_lowest_exact_item_by_name(item_name: str) -> dict:
    item_name = clean_text(item_name)
    try:
        auction_item = find_lowest_exact_auction_item_by_name(item_name)
        if auction_item:
            return auction_item
    except Exception:
        pass
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


def find_avatar_option_entry(payload: dict, preferred_role: str = "", preferred_variant: str = "") -> dict:
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
    if preferred_variant:
        matched_by_variant = [
            entry for entry in matched
            if clean_text(entry.get("variant")) == preferred_variant
        ]
        if matched_by_variant:
            matched = matched_by_variant
    elif len(matched) > 1:
        matched_without_variant = [
            entry for entry in matched
            if not clean_text(entry.get("variant"))
        ]
        if matched_without_variant:
            matched = matched_without_variant
    if preferred_role:
        matched_by_role = [
            entry for entry in matched
            if clean_text(entry.get("role")) == preferred_role
        ]
        if matched_by_role:
            matched = matched_by_role
    return matched[0] if matched else {}


def find_avatar_platinum_item(skill_name: str) -> dict:
    item_name = f"플래티넘 엠블렘[{clean_text(skill_name)}]"
    try:
        auction_item = find_lowest_exact_auction_item_by_name(item_name, word_type="match")
        if auction_item:
            return auction_item
    except Exception:
        pass
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


def find_avatar_platinum_selection_box() -> dict:
    selectable_names = {
        "기본 플래티넘 엠블렘 선택 상자",
        "프리미엄 플래티넘 엠블렘 선택 상자",
    }
    candidates = []
    seen_ids = set()
    for item_name in ["플래티넘 엠블렘 선택 상자", "플래티넘 선택 상자", "엠블렘 선택 상자"]:
        try:
            auction_item = find_lowest_auction_item_by_allowed_names(item_name, selectable_names)
        except Exception:
            auction_item = {}
        if clean_text(auction_item.get("itemName")) in selectable_names:
            item_id = clean_text(auction_item.get("itemId"))
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                candidates.append(auction_item)
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


def _choose_avatar_platinum_price_item_from_skills_uncached(normalized_skill_names: list[str], allow_selection_box: bool = False) -> dict:
    debug_steps = []
    direct_candidates = []
    for skill_name in normalized_skill_names:
        started_at = time.perf_counter()
        item = find_avatar_platinum_item(skill_name)
        debug_steps.append({
            "name": "find_avatar_platinum_item",
            "ms": round((time.perf_counter() - started_at) * 1000, 1),
            "skillName": skill_name,
            "itemName": clean_text(item.get("itemName")),
            "minUnitPrice": (item.get("auction") or {}).get("minUnitPrice"),
        })
        direct_candidates.append({
            **item,
            "targetSkillName": skill_name,
        })
    direct = min(
        direct_candidates,
        key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        default={},
    )
    selection_box = {}
    if allow_selection_box:
        started_at = time.perf_counter()
        selection_box = find_avatar_platinum_selection_box()
        debug_steps.append({
            "name": "find_avatar_platinum_selection_box",
            "ms": round((time.perf_counter() - started_at) * 1000, 1),
            "itemName": clean_text(selection_box.get("itemName")),
            "minUnitPrice": (selection_box.get("auction") or {}).get("minUnitPrice"),
        })
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
    selected = dict(selected or {})
    target_skill_name = clean_text(direct.get("targetSkillName")) if not use_box else normalized_skill_names[0]
    return {
        **selected,
        "priceSource": "selectionBox" if use_box else "direct",
        "directItem": direct,
        "selectionBoxItem": selection_box,
        "targetSkillName": target_skill_name,
        "equivalentSkillNames": normalized_skill_names,
        "priceWarningText": "선택 상자는 교환불가 아바타에만 사용 가능" if use_box else "",
        "_debugTimings": debug_steps,
    }


def choose_avatar_platinum_price_item_from_skills(skill_names: list[str], allow_selection_box: bool = False) -> dict:
    normalized_skill_names = []
    for skill_name in skill_names or []:
        skill_name = clean_text(skill_name)
        if skill_name and skill_name not in normalized_skill_names:
            normalized_skill_names.append(skill_name)
    if not normalized_skill_names:
        normalized_skill_names = [""]
    cache_key = (
        "platinum_emblem",
        AVATAR_PLATINUM_RESOLVED_PRICE_CACHE_VERSION,
        "skill_lowest",
        tuple(normalized_skill_names),
        bool(allow_selection_box),
    )
    return get_cached_resolved_price(
        cache_key,
        lambda: _choose_avatar_platinum_price_item_from_skills_uncached(normalized_skill_names, allow_selection_box),
        should_cache=lambda item: isinstance((item.get("auction") or {}).get("minUnitPrice"), (int, float))
        and (item.get("auction") or {}).get("minUnitPrice") > 0,
    )


def choose_avatar_platinum_price_item(skill_name: str, allow_selection_box: bool = False) -> dict:
    return choose_avatar_platinum_price_item_from_skills([skill_name], allow_selection_box=allow_selection_box)


def get_recommended_platinum_skill_by_slot(option_db: dict, default_skill: str, recommended_combo: dict | None = None) -> dict:
    combo = recommended_combo or next(iter(get_avatar_candidate_combos(option_db, {}) or []), {})
    platinum_skills = combo.get("platinumSkills") or []
    return {
        "상의 아바타": clean_text(platinum_skills[0]) if len(platinum_skills) > 0 else default_skill,
        "하의 아바타": clean_text(platinum_skills[1]) if len(platinum_skills) > 1 else default_skill,
    }


def load_character_avatar(server_id: str, character_id: str, buffer_baseline: dict | None = None) -> dict:
    steps = []
    timing_details = {}
    payload = get_character_cached_payload(server_id, character_id, "avatar", "equip/avatar")
    avatar_rows = payload.get("avatar") or []
    jacket = get_avatar_slot(avatar_rows, "JACKET")
    pants = get_avatar_slot(avatar_rows, "PANTS")
    is_dealer_crusader = (
        not buffer_baseline
        and clean_text(payload.get("jobName")) == "프리스트(남)"
        and clean_text(payload.get("jobGrowName")) == "眞 크루세이더"
        and is_male_crusader_dealer_style(server_id, character_id)
    )
    entry = _measure_step(
        steps,
        "find_avatar_option_entry",
        lambda: find_avatar_option_entry(
            payload,
            "dealer" if is_dealer_crusader else "",
            "dealer" if is_dealer_crusader else "",
        ),
    )
    if not buffer_baseline and clean_text(entry.get("role")) == "buffer":
        entry = {}
    option_db = entry.get("avatar") or {}
    buffer_stat_name = get_character_buffer_stat_name(payload, server_id, character_id) if buffer_baseline else ""
    primary_stat_name = buffer_stat_name or resolve_avatar_primary_stat_name(
        payload,
        avatar_rows,
        server_id,
        character_id,
    )
    avatar_combo_analysis = {}
    if not buffer_baseline and (option_db.get("candidateCombos") or option_db.get("platinumCandidates")):
        try:
            avatar_combo_analysis = _measure_step(
                steps,
                "select_best_avatar_combo_for_character",
                lambda: select_best_avatar_combo_for_character(
                    server_id,
                    character_id,
                    payload,
                    payload,
                    option_db,
                    prefer_current_top=True,
                ),
            )
        except Exception as error:
            avatar_combo_analysis = {"error": str(error)}
    recommended_avatar_combo = avatar_combo_analysis.get("recommendedCombo") or {}
    top_option = clean_text(recommended_avatar_combo.get("topSkill") or (option_db.get("topOptions") or [""])[0])
    platinum_skill = clean_text((option_db.get("platinumEmblems") or [""])[0])
    platinum_skill_by_slot = get_recommended_platinum_skill_by_slot(option_db, platinum_skill, recommended_avatar_combo)
    if buffer_stat_name:
        buffer_buff_skill_name = clean_text((buffer_baseline or {}).get("buffSkillName"))
        if buffer_buff_skill_name:
            top_option = top_option or buffer_buff_skill_name
            platinum_skill = platinum_skill or buffer_buff_skill_name
            platinum_skill_by_slot = {
                **platinum_skill_by_slot,
                "상의 아바타": clean_text(platinum_skill_by_slot.get("상의 아바타")) or buffer_buff_skill_name,
                "하의 아바타": clean_text(platinum_skill_by_slot.get("하의 아바타")) or buffer_buff_skill_name,
            }
    top_option_matched = skill_name_matches(jacket.get("optionAbility"), top_option)
    switching_rows = []
    if buffer_stat_name:
        switching_payload = get_character_cached_payload(
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
    skip_current_platinum_skills = {
        clean_text(skill)
        for skill in option_db.get("skipCurrentPlatinumSkills") or []
        if clean_text(skill)
    }
    for slot_id, slot_label, row in [
        ("JACKET", "상의 아바타", jacket),
        ("PANTS", "하의 아바타", pants),
    ]:
        if clean_text(row.get("itemRarity")) != "레어":
            continue
        emblems = get_platinum_emblems(row)
        current_platinum_skills = [
            clean_text(extract_platinum_skill_name(emblem.get("itemName")))
            for emblem in emblems
            if clean_text(extract_platinum_skill_name(emblem.get("itemName")))
        ]
        if any(skill_name_matches(current_skill, skip_skill) for current_skill in current_platinum_skills for skip_skill in skip_current_platinum_skills):
            platinum_slots.append(slot_label)
            continue
        target_platinum_skill = clean_text(platinum_skill_by_slot.get(slot_label) or platinum_skill)
        matched = any(
            skill_name_matches(extract_platinum_skill_name(emblem.get("itemName")), target_platinum_skill)
            for emblem in emblems
        ) if target_platinum_skill else False
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
    if not buffer_baseline:
        buff_payload = get_character_cached_payload(server_id, character_id, "buff_equipment", "skill/buff/equip/equipment")
        if not clean_text(buff_payload.get("jobName")) or not clean_text(buff_payload.get("jobGrowName")):
            buff_payload = {
                **buff_payload,
                "jobName": clean_text(buff_payload.get("jobName")) or clean_text(payload.get("jobName")),
                "jobGrowName": clean_text(buff_payload.get("jobGrowName")) or clean_text(payload.get("jobGrowName")),
            }
        buff_skill_info = ((buff_payload.get("skill") or {}).get("buff") or {}).get("skillInfo") or {}
        buff_skill_name = clean_text(buff_skill_info.get("name"))
        switching_entry = find_dealer_switching_buff_entry(
            buff_payload,
            is_dealer_crusader=is_dealer_crusader,
        )
        if switching_entry and buff_skill_name and clean_text(switching_entry.get("buffSkillName")) == buff_skill_name:
            equivalent_platinum_skills = [
                buff_skill_name,
                *[
                    clean_text(skill_name)
                    for skill_name in switching_entry.get("equivalentSwitchingPlatinumSkills") or []
                    if clean_text(skill_name)
                ],
            ]
            per_level_coefficients = [
                float(row.get("value") or 0)
                for row in switching_entry.get("damageIncreasePerLevelCoefficients") or []
                if float(row.get("value") or 0) > 0
            ]
            current_coefficients = match_current_switching_coefficients(buff_skill_info, switching_entry)
            if len(per_level_coefficients) == 1 and len(current_coefficients) > 1:
                per_level_coefficients = per_level_coefficients * len(current_coefficients)
            if per_level_coefficients and len(per_level_coefficients) == len(current_coefficients):
                switching_avatar_payload = get_character_cached_payload(
                    server_id,
                    character_id,
                    "buff_avatar",
                    "skill/buff/equip/avatar",
                )
                dealer_switching_rows = ((switching_avatar_payload.get("skill") or {}).get("buff") or {}).get("avatar") or []
                dealer_effective_switching_rows = merge_switching_avatar_rows_with_current(
                    dealer_switching_rows,
                    avatar_rows,
                )
                target_required_levels = get_switching_skill_required_levels(
                    server_id,
                    character_id,
                    buff_skill_info,
                    equivalent_platinum_skills,
                )
                current_switching_level_total = get_current_dealer_switching_level_total(
                    server_id,
                    character_id,
                    buff_payload,
                    clean_text(buff_payload.get("jobName")),
                    buff_skill_name,
                    target_required_levels[0] if target_required_levels else 0,
                    equivalent_platinum_skills[1:],
                    target_required_levels,
                    avatar_rows=dealer_effective_switching_rows,
                )
                current_multiplier = get_switching_damage_multiplier(current_coefficients)
                switching_platinum_item = None
                switching_avatar_platinum_item = None
                note = get_damage_application_note(switching_entry)
                switching_avatar_db_key, switching_avatar_db_entry = get_switching_avatar_db_entry(buff_payload)
                if switching_avatar_db_entry:
                    for slot_id, slot_label, db_slot_key, candidate_contribution in [
                        ("JACKET", "벞강 상의", "top", 2),
                        ("PANTS", "벞강 하의", "bottom", 1),
                    ]:
                        raw_row = get_avatar_slot(dealer_switching_rows, slot_id)
                        if clean_text(raw_row.get("itemRarity")) == "레어":
                            continue
                        row = raw_row or get_avatar_slot(dealer_effective_switching_rows, slot_id)
                        items = get_switching_avatar_db_items(switching_avatar_db_entry, db_slot_key)
                        if not items:
                            continue
                        current_contribution = get_switching_avatar_skill_level_contribution(
                            [row],
                            equivalent_platinum_skills,
                        )
                        if candidate_contribution <= current_contribution:
                            continue
                        effective_level_delta = get_capped_switching_level_delta(
                            current_switching_level_total,
                            current_contribution,
                            candidate_contribution,
                        )
                        if effective_level_delta <= 0:
                            continue
                        candidate_coefficients = [
                            current + effective_level_delta * per_level
                            for current, per_level in zip(current_coefficients, per_level_coefficients)
                        ]
                        candidate_multiplier = get_switching_damage_multiplier(candidate_coefficients)
                        if current_multiplier <= 0 or candidate_multiplier <= current_multiplier:
                            continue
                        raw_skill_damage_multiplier = candidate_multiplier / current_multiplier
                        skill_damage_multiplier = get_applied_switching_multiplier(raw_skill_damage_multiplier, switching_entry)
                        if switching_avatar_platinum_item is None:
                            switching_avatar_platinum_item = _measure_step(
                                steps,
                                f"choose_avatar_platinum_price_item:buff_avatar:{buff_skill_name}",
                                lambda skill_names=equivalent_platinum_skills: choose_avatar_platinum_price_item_from_skills(skill_names, allow_selection_box=False),
                            )
                            timing_details[f"choose_avatar_platinum_price_item:buff_avatar:{buff_skill_name}"] = switching_avatar_platinum_item.get("_debugTimings") or []
                        price_option = _measure_step(
                            steps,
                            f"resolve_switching_avatar_price:{slot_id}:{switching_avatar_db_key}",
                            lambda slot=db_slot_key, slot_items=items, platinum=switching_avatar_platinum_item: resolve_switching_avatar_price(
                                slot,
                                slot_items,
                                equivalent_platinum_skills,
                                platinum,
                                require_top_option_match=slot_id == "JACKET",
                            ),
                        )
                        timing_details[
                            f"resolve_switching_avatar_price:{slot_id}:{switching_avatar_db_key}"
                        ] = (price_option.get("debug") or {}).get("steps") or []
                        selected_avatar = price_option.get("selectedAvatar") or {}
                        selected_price = price_option.get("selectedPrice")
                        if not selected_avatar or not isinstance(selected_price, (int, float)) or selected_price <= 0:
                            continue
                        target_skill_name = clean_text(switching_avatar_platinum_item.get("targetSkillName")) or buff_skill_name
                        selected_avatar_name = clean_item_display_name(selected_avatar.get("itemName"))
                        selected_mode = clean_text(price_option.get("selectedMode"))
                        platinum_label = f"플티 [{target_skill_name}]"
                        if selected_mode == "prefilled":
                            display_item_name = selected_avatar_name
                            item_explain = (
                                f"상의 옵션 [{buff_skill_name} Lv +1] + {platinum_label}"
                                if slot_id == "JACKET"
                                else platinum_label
                            )
                        else:
                            platinum_item_name = clean_item_display_name(switching_avatar_platinum_item.get("itemName")) or f"플래티넘 엠블렘[{target_skill_name}]"
                            display_item_name = f"{selected_avatar_name} + {platinum_item_name}"
                            item_explain = (
                                f"따로 구매 후 조합:\n상의 옵션 [{buff_skill_name} Lv +1] + {platinum_label}"
                                if slot_id == "JACKET"
                                else f"따로 구매 후 조합:\n{platinum_label}"
                            )
                        if target_skill_name != buff_skill_name:
                            item_explain = f"{item_explain} ({buff_skill_name} +1Lv 대체)"
                        if note:
                            item_explain = f"{item_explain} ({note})"
                        debug = {
                            **(price_option.get("debug") or {}),
                            "slot": db_slot_key,
                            "isMissingSwitchingAvatar": True,
                            "jobKey": switching_avatar_db_key,
                            "currentContribution": current_contribution,
                            "candidateContribution": candidate_contribution,
                            "effectiveLevelDelta": effective_level_delta,
                        }
                        recommendations.append(build_switching_avatar_recommendation_row(
                            slot_label,
                            selected_avatar,
                            display_item_name,
                            selected_mode,
                            item_explain,
                            skill_damage_multiplier,
                            raw_skill_damage_multiplier,
                            note,
                            target_skill_name,
                            equivalent_platinum_skills,
                            current_multiplier,
                            candidate_multiplier,
                            "",
                            debug,
                        ))
                for slot_id, slot_label in [
                    ("JACKET", "벞강 상의"),
                    ("PANTS", "벞강 하의"),
                ]:
                    row = get_avatar_slot(dealer_switching_rows, slot_id)
                    if clean_text(row.get("itemRarity")) != "레어":
                        continue
                    current_platinum_skills = [
                        clean_text(extract_platinum_skill_name(emblem.get("itemName")))
                        for emblem in get_platinum_emblems(row)
                        if clean_text(extract_platinum_skill_name(emblem.get("itemName")))
                    ]
                    current_contribution = 1 if any(
                        skill_name_matches(skill, target_skill)
                        for skill in current_platinum_skills
                        for target_skill in equivalent_platinum_skills
                    ) else 0
                    candidate_contribution = 1
                    if candidate_contribution <= current_contribution:
                        continue
                    effective_level_delta = get_capped_switching_level_delta(
                        current_switching_level_total,
                        current_contribution,
                        candidate_contribution,
                    )
                    if effective_level_delta <= 0:
                        continue
                    candidate_coefficients = [
                        current + effective_level_delta * per_level
                        for current, per_level in zip(current_coefficients, per_level_coefficients)
                    ]
                    candidate_multiplier = get_switching_damage_multiplier(candidate_coefficients)
                    if current_multiplier <= 0 or candidate_multiplier <= current_multiplier:
                        continue
                    raw_skill_damage_multiplier = candidate_multiplier / current_multiplier
                    skill_damage_multiplier = get_applied_switching_multiplier(raw_skill_damage_multiplier, switching_entry)
                    if switching_platinum_item is None:
                        switching_platinum_item = _measure_step(
                            steps,
                            f"choose_avatar_platinum_price_item:buff:{buff_skill_name}",
                            lambda skill_names=equivalent_platinum_skills: choose_avatar_platinum_price_item_from_skills(skill_names, allow_selection_box=True),
                        )
                        timing_details[f"choose_avatar_platinum_price_item:buff:{buff_skill_name}"] = switching_platinum_item.get("_debugTimings") or []
                    item = switching_platinum_item
                    item_id = clean_text(item.get("itemId"))
                    target_skill_name = clean_text(item.get("targetSkillName")) or buff_skill_name
                    item_explain = f"{slot_label} [{target_skill_name}] 교체"
                    if target_skill_name != buff_skill_name:
                        item_explain = f"{item_explain} ({buff_skill_name} +1Lv 대체)"
                    if note:
                        item_explain = f"{item_explain} ({note})"
                    recommendations.append(build_switching_platinum_recommendation_row(
                        slot_label,
                        item_id,
                        item.get("itemName") or f"플래티넘 엠블렘[{buff_skill_name}]",
                        item.get("itemRarity"),
                        item.get("iconUrl") or (get_item_icon_url(item_id) if item_id else ""),
                        item_explain,
                        skill_damage_multiplier,
                        raw_skill_damage_multiplier,
                        note,
                        item.get("auction") or {},
                        target_skill_name,
                        equivalent_platinum_skills,
                        current_platinum_skills[0] if current_platinum_skills else "",
                        current_multiplier,
                        candidate_multiplier,
                        item.get("priceSource"),
                        item.get("priceWarningText"),
                    ))
    if buffer_stat_name:
        if not buffer_baseline:
            buffer_baseline = load_character_buffer_baseline(server_id, character_id) or {}
        buffer_buff_skill_name = clean_text(buffer_baseline.get("buffSkillName"))
        switching_avatar_db_key, switching_avatar_db_entry = get_switching_avatar_db_entry(payload)
        stat_emblem_item = {}
        switching_avatar_platinum_item_by_skill = {}
        if switching_avatar_db_entry and buffer_buff_skill_name:
            for slot_id, slot_label, db_slot_key in [
                ("JACKET", "벞강 상의", "top"),
                ("PANTS", "벞강 하의", "bottom"),
            ]:
                raw_current_row = get_avatar_slot(switching_rows, slot_id)
                if clean_text(raw_current_row.get("itemRarity")) == "레어":
                    continue
                target_platinum_skill = buffer_buff_skill_name
                if not target_platinum_skill:
                    continue
                items = get_switching_avatar_db_items(switching_avatar_db_entry, db_slot_key)
                if not items:
                    continue
                if target_platinum_skill not in switching_avatar_platinum_item_by_skill:
                    switching_avatar_platinum_item_by_skill[target_platinum_skill] = _measure_step(
                        steps,
                        f"choose_avatar_platinum_price_item:buffer_switching_avatar:{target_platinum_skill}",
                        lambda skill_name=target_platinum_skill: choose_avatar_platinum_price_item(skill_name, allow_selection_box=True),
                    )
                    timing_details[
                        f"choose_avatar_platinum_price_item:buffer_switching_avatar:{target_platinum_skill}"
                    ] = switching_avatar_platinum_item_by_skill[target_platinum_skill].get("_debugTimings") or []
                if not stat_emblem_item:
                    stat_debug_steps = []
                    stat_emblem_item = _measure_step(
                        steps,
                        f"find_buffer_switching_stat_emblem:{primary_stat_name}",
                        lambda: find_lowest_avatar_emblem_by_prefix(primary_stat_name, "green", stat_debug_steps),
                    )
                    timing_details[f"find_buffer_switching_stat_emblem:{primary_stat_name}"] = stat_debug_steps
                price_option = _measure_step(
                    steps,
                    f"resolve_buffer_switching_avatar_price:{slot_id}:{switching_avatar_db_key}",
                    lambda slot=db_slot_key, slot_items=items, target_skill=target_platinum_skill: resolve_buffer_switching_avatar_price(
                        slot,
                        slot_items,
                        target_skill,
                        primary_stat_name,
                        switching_avatar_platinum_item_by_skill.get(target_skill) or {},
                        stat_emblem_item,
                        require_top_option_match=slot_id == "JACKET",
                    ),
                )
                timing_details[
                    f"resolve_buffer_switching_avatar_price:{slot_id}:{switching_avatar_db_key}"
                ] = (price_option.get("debug") or {}).get("steps") or []
                selected_avatar = price_option.get("selectedAvatar") or {}
                selected_price = price_option.get("selectedPrice")
                if not selected_avatar or not isinstance(selected_price, (int, float)) or selected_price <= 0:
                    continue
                selected_avatar_name = clean_item_display_name(selected_avatar.get("itemName"))
                missing_platinum_count = int((price_option.get("debug") or {}).get("missingPlatinumCount") or 0)
                missing_stat_count = int((price_option.get("debug") or {}).get("missingStatEmblemCount") or 0)
                completed_avatar_row = build_completed_buffer_switching_avatar_row(
                    price_option.get("selectedAvatarRow") or selected_avatar,
                    slot_id,
                    slot_label,
                    target_platinum_skill,
                    primary_stat_name,
                    stat_emblem_item,
                    missing_platinum_count,
                    missing_stat_count,
                )
                switching_avatar_delta = calculate_buffer_switching_avatar_candidate_delta(
                    server_id,
                    character_id,
                    slot_id,
                    completed_avatar_row,
                    buffer_baseline,
                    primary_stat_name,
                    buffer_buff_skill_name,
                    switching_rows,
                )
                buffer_stat_gain = float(switching_avatar_delta.get("statDelta") or 0)
                buffer_buff_skill_level_delta = int(switching_avatar_delta.get("buffSkillLevelDelta") or 0)
                if buffer_stat_gain <= 0 and buffer_buff_skill_level_delta <= 0:
                    continue
                display_parts = [selected_avatar_name]
                if missing_platinum_count:
                    display_parts.append(f"플래티넘 엠블렘[{target_platinum_skill}]")
                if missing_stat_count:
                    stat_item_name = clean_item_display_name(stat_emblem_item.get("itemName")) or get_avatar_emblem_item_name(primary_stat_name, "green")
                    display_parts.append(f"{stat_item_name} x{missing_stat_count}")
                display_item_name = " + ".join(part for part in display_parts if part)
                explain_parts = []
                if slot_id == "JACKET":
                    explain_parts.append(f"상의 옵션 [{buffer_buff_skill_name} Lv +1]")
                explain_parts.append(f"플티 [{target_platinum_skill}]")
                explain_parts.append(f"{primary_stat_name} 엠블렘 x2")
                item_explain = " + ".join(explain_parts)
                if clean_text(price_option.get("priceMode")) == "mixed":
                    item_explain = f"따로 구매 후 조합:\n{item_explain}"
                debug = {
                    **(price_option.get("debug") or {}),
                    "slot": db_slot_key,
                    "jobKey": switching_avatar_db_key,
                    "switchingMetricStatDelta": buffer_stat_gain,
                    "currentSwitchingMetrics": switching_avatar_delta.get("currentMetrics") or {},
                    "candidateSwitchingMetrics": switching_avatar_delta.get("candidateMetrics") or {},
                    "usedCurrentAvatarFallback": switching_avatar_delta.get("usedCurrentAvatarFallback"),
                    "currentBuffSkillLevelContribution": switching_avatar_delta.get("currentBuffSkillLevelContribution"),
                    "candidateBuffSkillLevelContribution": switching_avatar_delta.get("candidateBuffSkillLevelContribution"),
                    "bufferStatGain": buffer_stat_gain,
                    "bufferBuffSkillLevelDelta": buffer_buff_skill_level_delta,
                }
                recommendations.append(build_buffer_switching_avatar_recommendation_row(
                    slot_label,
                    selected_avatar,
                    display_item_name,
                    item_explain,
                    buffer_stat_gain,
                    buffer_buff_skill_level_delta,
                    target_platinum_skill,
                    primary_stat_name,
                    clean_text(price_option.get("priceMode")),
                    debug,
                ))
    buffer_platinum_deltas = {}
    buffer_skill_levels = {}
    if buffer_stat_name and platinum_skill and missing_or_wrong_slots:
        if not buffer_baseline:
            buffer_baseline = load_character_buffer_baseline(server_id, character_id) or {}
        buffer_skill_levels = buffer_baseline
        for slot_label in missing_or_wrong_slots:
            slot_id = "JACKET" if slot_label == "상의 아바타" else "PANTS"
            target_platinum_skill = clean_text(platinum_skill_by_slot.get(slot_label) or platinum_skill)
            if not target_platinum_skill:
                continue
            slot_delta = _measure_step(
                steps,
                f"get_buffer_platinum_stat_deltas:{slot_label}",
                lambda skill_name=target_platinum_skill, target_slot_id=slot_id: get_buffer_platinum_stat_deltas(
                    buffer_baseline,
                    avatar_rows,
                    skill_name,
                    [target_slot_id],
                ),
            )
            buffer_platinum_deltas.update(slot_delta)
    if platinum_skill and missing_or_wrong_slots:
        for slot_label in missing_or_wrong_slots:
            target_platinum_skill = clean_text(platinum_skill_by_slot.get(slot_label) or platinum_skill)
            if not target_platinum_skill:
                continue
            item = _measure_step(
                steps,
                f"choose_avatar_platinum_price_item:{slot_label}",
                lambda skill_name=target_platinum_skill: choose_avatar_platinum_price_item(skill_name, allow_selection_box=True),
            )
            timing_details[f"choose_avatar_platinum_price_item:{slot_label}"] = item.get("_debugTimings") or []
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
            skill_damage_multiplier = (
                0
                if buffer_stat_name
                else get_avatar_platinum_skill_damage_multiplier(
                    avatar_combo_analysis,
                    slot_label,
                    target_platinum_skill,
                )
            )
            dealer_effects = (
                {"skillDamageMultiplier": skill_damage_multiplier}
                if skill_damage_multiplier > 0
                else {"finalDamage": get_avatar_platinum_damage_percent(slot_label)}
            )
            item_id = clean_text(item.get("itemId"))
            effects = (
                {"bufferStat": platinum_delta.get("statDelta", 0)}
                if buffer_stat_name
                else dealer_effects
            )
            buffer_buff_skill_level_delta = (
                (1 if target_platinum_skill == buff_skill_name else 0)
                - (1 if current_platinum_skill == buff_skill_name else 0)
                if buffer_stat_scope == "common"
                else 0
            )
            buffer_awakening_skill_level_delta = (
                (1 if target_platinum_skill == awakening_skill_name else 0)
                - (1 if current_platinum_skill == awakening_skill_name else 0)
                if buffer_stat_name
                else 0
            )
            recommendations.append(build_platinum_emblem_recommendation_row(
                slot_label,
                item_id,
                item.get("itemName") or f"플래티넘 엠블렘[{target_platinum_skill}]",
                item.get("itemRarity"),
                item.get("iconUrl") or (get_item_icon_url(item_id) if item_id else ""),
                f"{slot_label} [{target_platinum_skill}] 교체",
                effects,
                skill_damage_multiplier or None,
                item.get("auction") or {},
                target_platinum_skill,
                platinum_delta.get("skillDeltas") or {},
                platinum_delta.get("skillLevels") or {},
                current_platinum_skill,
                buffer_buff_skill_level_delta,
                buffer_awakening_skill_level_delta,
                [slot_label],
                item.get("priceSource"),
                item.get("priceWarningText"),
                buffer_stat_scope,
            ))
    if buffer_stat_name:
        current_buffer_configs, switching_buffer_configs = get_buffer_avatar_emblem_configs(switching_rows)
        current_emblem_debug = _measure_step(
            steps,
            "build_buffer_avatar_emblem_recommendations",
            lambda: build_avatar_emblem_recommendations_debug(
                avatar_rows,
                primary_stat_name,
                find_lowest_exact_item_by_name,
                current_buffer_configs,
                True,
            ),
        )
        timing_details["build_buffer_avatar_emblem_recommendations"] = current_emblem_debug.get("steps") or []
        recommendations.extend(current_emblem_debug.get("recommendations") or [])
        switching_emblem_debug = _measure_step(
            steps,
            "build_buffer_switching_avatar_emblem_recommendations",
            lambda: build_avatar_emblem_recommendations_debug(
                switching_rows,
                primary_stat_name,
                find_lowest_exact_item_by_name,
                switching_buffer_configs,
                True,
            ),
        )
        timing_details["build_buffer_switching_avatar_emblem_recommendations"] = switching_emblem_debug.get("steps") or []
        recommendations.extend(switching_emblem_debug.get("recommendations") or [])
    else:
        emblem_debug = _measure_step(
            steps,
            "build_avatar_emblem_recommendations",
            lambda: build_avatar_emblem_recommendations_debug(avatar_rows, primary_stat_name, find_lowest_exact_item_by_name),
        )
        timing_details["build_avatar_emblem_recommendations"] = emblem_debug.get("steps") or []
        recommendations.extend(emblem_debug.get("recommendations") or [])
    jacket_payload = {
        "itemName": clean_text(jacket.get("itemName")),
        "itemRarity": clean_text(jacket.get("itemRarity")),
        "isRare": clean_text(jacket.get("itemRarity")) == "레어",
        "isRareClone": is_rare_clone_avatar(jacket),
        "optionAbility": clean_text(jacket.get("optionAbility")),
        "topOptionMatched": top_option_matched,
    }
    pants_payload = {
        "itemName": clean_text(pants.get("itemName")),
        "itemRarity": clean_text(pants.get("itemRarity")),
        "isRare": clean_text(pants.get("itemRarity")) == "레어",
        "isRareClone": is_rare_clone_avatar(pants),
    }
    avatar_slot_payloads = []
    for row in avatar_rows:
        slot_id = clean_text(row.get("slotId"))
        item_id = clean_text(row.get("itemId"))
        emblems = [
            {
                "itemId": clean_text(emblem.get("itemId")),
                "itemName": clean_item_display_name(emblem.get("itemName")),
                "slotColor": clean_text(emblem.get("slotColor")),
            }
            for emblem in row.get("emblems") or []
            if (clean_text(emblem.get("itemId")) or clean_item_display_name(emblem.get("itemName")))
            and "플래티넘" not in clean_text(emblem.get("slotColor"))
            and "플래티넘" not in clean_text(emblem.get("itemName"))
        ]
        platinum_emblems = [
            {
                "itemId": clean_text(emblem.get("itemId")),
                "itemName": clean_item_display_name(emblem.get("itemName")),
                "slotColor": clean_text(emblem.get("slotColor")),
            }
            for emblem in get_platinum_emblems(row)
            if clean_text(emblem.get("itemId")) or clean_item_display_name(emblem.get("itemName"))
        ]
        avatar_slot_payloads.append({
            "slotId": slot_id,
            "slotName": clean_text(row.get("slotName")),
            "itemId": item_id,
            "itemName": clean_item_display_name(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": get_item_icon_url(item_id) if item_id else "",
            "emblems": emblems[:2],
            "platinumEmblems": platinum_emblems[:2],
        })
    avatar_payload = {
        "dbMatched": bool(entry),
        "primaryStatName": primary_stat_name,
        "expectedTopOption": top_option,
        "expectedPlatinumEmblem": platinum_skill,
        "expectedPlatinumEmblemsBySlot": platinum_skill_by_slot,
        "recommendedCombo": recommended_avatar_combo,
        "comboAnalysisError": avatar_combo_analysis.get("error"),
        "rareAvatarCount": len(rare_slots),
        "rareAvatarSlots": rare_slots,
        "rareCloneAvatarCount": len(clone_slots),
        "rareCloneAvatarSlots": clone_slots,
        "jacket": jacket_payload,
        "pants": pants_payload,
        "slots": avatar_slot_payloads,
        "platinumCount": len(platinum_slots),
        "platinumSlots": platinum_slots,
        "missingOrWrongPlatinumSlots": missing_or_wrong_slots,
        "needsRareAvatarSet": needs_rare_avatar_set,
        "missingBaseRareAvatarSlots": missing_base_rare_slots,
        "rareAvatarSetPurchasable": False,
        "needsReview": bool(option_db.get("needsReview")),
    }
    return build_character_avatar_payload(
        payload,
        avatar_payload,
        recommendations,
        steps,
        timing_details,
    )
