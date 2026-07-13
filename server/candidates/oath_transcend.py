import re

from ..effects import normalize_enchant_status, parse_percent_or_number
from ..neople_client import clean_item_display_name, clean_text, get_item_icon_url
from ..repositories.item_repository import fetch_item_details, search_items_by_name
from ..repositories.material_price_repository import build_upgrade_material_display_rows
from ..presenters.oath_transcend_presenter import build_oath_transcend_recommendation_row
from ..calculators.oath_tune_calculator import (
    build_oath_set_point_context,
    get_oath_crystal_set_point,
    get_oath_detail_set_point,
    get_oath_total_set_point,
)


OATH_TRANSCEND_COSTS = {
    "에픽": {
        "gold": 3_750_000,
        "materials": [
            {"key": "radiantSoul", "label": "광휘의 소울", "amount": 200},
            {"key": "highElementalCrystal", "label": "상급 원소결정", "amount": 810},
            {"key": "solidSoul", "label": "솔리드 소울", "amount": 150},
        ],
    },
    "태초": {
        "gold": 15_000_000,
        "materials": [
            {"key": "radiantSoul", "label": "광휘의 소울", "amount": 500},
            {"key": "highElementalCrystal", "label": "상급 원소결정", "amount": 810},
            {"key": "solidSoul", "label": "솔리드 소울", "amount": 500},
        ],
    },
}

OATH_CRAFT_COSTS = {
    "에픽": {
        "gold": 2_000_000,
        "materials": [
            {"key": "oathCrystalFragment", "label": "서약 결정 조각", "amount": 1000},
            {"key": "epicSoul", "label": "에픽 소울", "amount": 20},
            {"key": "radiantSoul", "label": "광휘의 소울", "amount": 200},
        ],
    },
    "태초": {
        "gold": 7_500_000,
        "materials": [
            {"key": "oathCrystalFragment", "label": "서약 결정 조각", "amount": 1500},
            {"key": "primordialSoul", "label": "태초 소울", "amount": 5},
            {"key": "radiantSoul", "label": "광휘의 소울", "amount": 1000},
        ],
    },
}

OATH_TRANSCEND_TARGET_NAME_BY_RARITY = {
    "에픽": "완전한 광휘 결정",
    "태초": "태초의 광휘 결정",
}

CREATION_MIST_RING_NAME = "창조의 안개 결정 - 반지"
CREATION_MIST_RING_DAMAGE_FINAL_DAMAGE = 19
EQUIPMENT_REINFORCE_BUFF_POWER_PER_STACK = 150
OATH_TRANSCEND_BUFFER_EFFECT_KEYS = {"buffPower", "buffAmplification", "allStat", "str", "int"}
OATH_TRANSCEND_DAMAGE_EXCLUDED_EFFECT_KEYS = {"buffPower", "buffAmplification", "bufferStat"}


def get_oath_transcend_effects(detail: dict) -> dict:
    return normalize_enchant_status((detail or {}).get("itemStatus") or [])


def get_oath_transcend_role_effects(effects: dict, is_buffer: bool) -> dict:
    if is_buffer:
        allowed_keys = OATH_TRANSCEND_BUFFER_EFFECT_KEYS
        return {
            key: value
            for key, value in (effects or {}).items()
            if key in allowed_keys and parse_percent_or_number(value) > 0
        }
    return {
        key: value
        for key, value in (effects or {}).items()
        if key not in OATH_TRANSCEND_DAMAGE_EXCLUDED_EFFECT_KEYS and parse_percent_or_number(value) > 0
    }


def get_equipment_reinforce_by_slot(equipment_rows: list) -> dict:
    return {
        clean_text(row.get("slotName")): parse_percent_or_number(row.get("reinforce"))
        for row in equipment_rows or []
        if isinstance(row, dict) and clean_text(row.get("slotName"))
    }


def get_oath_equipment_reinforce_bonus_config(detail: dict) -> dict:
    explain = f"{clean_text((detail or {}).get('itemExplain'))} {clean_text((detail or {}).get('itemExplainDetail'))}"
    if not explain:
        return {}
    config_match = re.search(
        r"(?P<slot>[가-힣]+)\s*장비의\s*강화/증폭\s*수치가\s*(?P<base>\d+)\s*에서\s*1\s*증가할\s*때마다\s*최종\s*데미지\s*(?P<final_damage>[0-9.]+)\s*%\s*증가",
        explain,
    )
    max_stack_match = re.search(r"최대\s*(?P<max_stack>\d+)\s*중첩", explain)
    if not config_match or not max_stack_match:
        return {}
    return {
        "slot": clean_text(config_match.group("slot")),
        "baseReinforce": parse_percent_or_number(config_match.group("base")),
        "finalDamagePerStack": parse_percent_or_number(config_match.group("final_damage")),
        "maxStack": int(max_stack_match.group("max_stack")),
    }


def get_oath_equipment_reinforce_stack_count(detail: dict, equipment_reinforce_by_slot: dict | None = None) -> int:
    config = get_oath_equipment_reinforce_bonus_config(detail)
    if not config:
        return 0
    reinforce = parse_percent_or_number((equipment_reinforce_by_slot or {}).get(config.get("slot")))
    base_reinforce = parse_percent_or_number(config.get("baseReinforce"))
    max_stack = int(config.get("maxStack") or 0)
    if reinforce <= base_reinforce or max_stack <= 0:
        return 0
    return int(min(max_stack, max(0, reinforce - base_reinforce)))


def get_oath_transcend_current_effects(
    item_name: str,
    effects: dict,
    is_buffer: bool,
    equipment_reinforce_by_slot: dict | None = None,
    detail: dict | None = None,
) -> dict:
    item_name = clean_text(item_name)
    dynamic_config = get_oath_equipment_reinforce_bonus_config(detail or {})
    if dynamic_config:
        normalized_effects = dict(effects or {})
        stack_count = get_oath_equipment_reinforce_stack_count(detail or {}, equipment_reinforce_by_slot)
        if stack_count <= 0:
            return normalized_effects
        if is_buffer:
            normalized_effects["buffPower"] = parse_percent_or_number(normalized_effects.get("buffPower")) + stack_count * EQUIPMENT_REINFORCE_BUFF_POWER_PER_STACK
        else:
            final_damage_per_stack = parse_percent_or_number(dynamic_config.get("finalDamagePerStack"))
            if final_damage_per_stack > 0:
                normalized_effects["finalDamage"] = parse_percent_or_number(normalized_effects.get("finalDamage")) + stack_count * final_damage_per_stack
        return normalized_effects
    if is_buffer or item_name != CREATION_MIST_RING_NAME:
        return effects or {}
    normalized_effects = dict(effects or {})
    normalized_effects["finalDamage"] = CREATION_MIST_RING_DAMAGE_FINAL_DAMAGE
    return normalized_effects


def subtract_oath_effects(target_effects: dict, current_effects: dict) -> dict:
    keys = set((target_effects or {}).keys()) | set((current_effects or {}).keys())
    result = {}
    for key in keys:
        target_value = parse_percent_or_number((target_effects or {}).get(key))
        current_value = parse_percent_or_number((current_effects or {}).get(key))
        if key == "finalDamage":
            current_multiplier = 1 + current_value / 100
            target_multiplier = 1 + target_value / 100
            value = (target_multiplier / current_multiplier - 1) * 100 if current_multiplier > 0 else 0
        else:
            value = target_value - current_value
        if value > 0:
            result[key] = value
    return result


def get_oath_transcend_material_text(materials: list) -> str:
    return ", ".join(
        f"{clean_text(material.get('label'))} {int(material.get('amount') or 0):,}개"
        for material in materials or []
        if clean_text(material.get("label")) and int(material.get("amount") or 0) > 0
    )


def build_oath_transcend_materials(materials: list) -> list:
    return build_upgrade_material_display_rows(materials)


def combine_oath_effects(*effects_rows: dict) -> dict:
    result = {}
    final_damage_multiplier = 1.0
    for effects in effects_rows:
        for key, value in (effects or {}).items():
            amount = parse_percent_or_number(value)
            if not amount:
                continue
            if key == "finalDamage":
                final_damage_multiplier *= 1 + amount / 100
                continue
            result[key] = parse_percent_or_number(result.get(key)) + amount
    if final_damage_multiplier != 1:
        result["finalDamage"] = (final_damage_multiplier - 1) * 100
    return result


def merge_oath_decision_materials(rows: list) -> list:
    merged = {}
    for row in rows or []:
        for material in row.get("materials") or []:
            key = clean_text(material.get("key")) or clean_text(material.get("label"))
            if not key:
                continue
            previous = merged.setdefault(key, {**material, "amount": 0})
            previous["amount"] = int(previous.get("amount") or 0) + int(material.get("amount") or 0)
    return list(merged.values())


def build_oath_decision_variant_rows(
    rows: list,
    max_count: int,
    current_total_set_point: float,
    db: dict,
    source_type: str,
    kind: str,
    slot: str,
    tier: str,
) -> list:
    selected_rows = (rows or [])[:max(0, int(max_count or 0))]
    if not selected_rows:
        return []
    target_rarity = clean_text(selected_rows[0].get("targetRarity"))
    variant_total = len(selected_rows)
    variants = []
    for count in range(1, variant_total + 1):
        current_rows = selected_rows[:count]
        current_effects = combine_oath_effects(*(row.get("currentEffects") or {} for row in current_rows))
        target_effects = combine_oath_effects(*(row.get("targetEffects") or {} for row in current_rows))
        current_slot_set_point = sum(parse_percent_or_number(row.get("currentSlotSetPoint")) for row in current_rows)
        target_slot_set_point = sum(parse_percent_or_number(row.get("targetSlotSetPoint")) for row in current_rows)
        set_point_context = build_oath_set_point_context(
            current_total_set_point,
            current_slot_set_point,
            target_slot_set_point,
            db,
        )
        if not set_point_context:
            continue
        effects = subtract_oath_effects(target_effects, current_effects)
        materials = merge_oath_decision_materials(current_rows)
        first = current_rows[0]
        item_name = clean_text(first.get("targetItemName") or first.get("itemName"))
        if count > 1:
            item_name = f"{target_rarity} 서약 결정 {count}개"
        row = build_oath_transcend_recommendation_row(
            slot=slot,
            item_id=clean_text(first.get("itemId")),
            item_name=item_name,
            item_rarity=target_rarity,
            icon_url=clean_text(first.get("iconUrl")),
            current_item_name=f"서약 결정 {count}개",
            current_rarity="",
            current_effects=current_effects,
            target_effects=target_effects,
            effects=effects,
            expected_gold=sum(int(row.get("expectedGold") or 0) for row in current_rows),
            materials=materials,
            material_text=get_oath_transcend_material_text(materials),
            target_rarity=target_rarity,
            skill_damage_multiplier=set_point_context.get("skillDamageMultiplier"),
            oath_set_buff_power_delta=set_point_context.get("oathSetBuffPowerDelta"),
            set_point_context=set_point_context,
            source_type=source_type,
            kind=kind,
            tier=tier,
        )
        row.update({
            "variantGroupKey": f"{source_type}:{target_rarity}",
            "variantIndex": count - 1,
            "variantCount": count,
            "variantTotal": variant_total,
            "decisionPlan": [
                {
                    "slotIndex": int(candidate.get("targetSlotIndex") or 0),
                    "currentItemName": clean_text(candidate.get("currentItemName")),
                    "targetItemId": clean_text(candidate.get("itemId")),
                    "targetItemName": clean_text(candidate.get("targetItemName") or candidate.get("itemName")),
                    "targetRarity": clean_text(candidate.get("targetRarity")),
                }
                for candidate in current_rows
            ],
        })
        variants.append(row)
    return variants


def is_oath_unique_crystal_name(item_name: str, unique_keyword: str = "") -> bool:
    item_name = clean_text(item_name)
    if not item_name:
        return False
    if "고유" in item_name:
        return True
    unique_keyword = clean_text(unique_keyword) or "안개 결정"
    return bool(unique_keyword and unique_keyword in item_name)


def get_oath_crystal_family_name(item_name: str) -> str:
    item_name = clean_text(item_name)
    if " : " not in item_name:
        return ""
    family_name, suffix = item_name.split(" : ", 1)
    if "광휘 결정" not in suffix:
        return ""
    return clean_text(family_name)


def get_oath_context_family_name(crystals: list, unique_keyword: str = "") -> str:
    family_names = {
        family_name
        for crystal in crystals or []
        if isinstance(crystal, dict)
        if not is_oath_unique_crystal_name(crystal.get("itemName"), unique_keyword)
        for family_name in [get_oath_crystal_family_name(crystal.get("itemName"))]
        if family_name
    }
    return next(iter(family_names)) if len(family_names) == 1 else ""


def get_oath_craft_fragment_label(item_name: str, family_name: str = "") -> str:
    family_name = clean_text(family_name) or get_oath_crystal_family_name(item_name)
    return f"{family_name} 서약 결정 조각" if family_name else "서약 결정 조각"


def get_oath_transcend_target_item_name(item_name: str, target_rarity: str, family_name: str = "") -> str:
    family_name = clean_text(family_name) or get_oath_crystal_family_name(item_name)
    target_suffix = OATH_TRANSCEND_TARGET_NAME_BY_RARITY.get(clean_text(target_rarity))
    if not family_name or not target_suffix:
        return ""
    return f"{family_name} : {target_suffix}"


def is_oath_transcend_blocked_crystal(crystal: dict, unique_keyword: str = "") -> bool:
    item_name = clean_text((crystal or {}).get("itemName"))
    if not item_name:
        return True
    if item_name == "미광의 서약 결정":
        return True
    return False


def resolve_oath_transcend_target_detail(current_item_name: str, target_rarity: str, unique_keyword: str = "", family_name: str = "") -> dict:
    target_item_name = get_oath_transcend_target_item_name(current_item_name, target_rarity, family_name)
    if not target_item_name:
        return {}
    rows = search_items_by_name(target_item_name, word_type="match", limit=20)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == target_item_name
        and clean_text(row.get("itemRarity")) == clean_text(target_rarity)
        and clean_text(row.get("itemTypeDetail")) == "서약결정"
        and not is_oath_unique_crystal_name(row.get("itemName"), unique_keyword)
    ]
    if len(exact_rows) != 1:
        return {}
    item_id = clean_text(exact_rows[0].get("itemId"))
    return (fetch_item_details([item_id]) or [{}])[0] if item_id else {}


def get_oath_transcend_target_rarities(current_rarity: str, current_item_name: str = "", unique_keyword: str = "") -> list[str]:
    current_rarity = clean_text(current_rarity)
    if current_rarity in {"유니크", "레전더리"}:
        return ["에픽", "태초"]
    if current_rarity == "에픽":
        if is_oath_unique_crystal_name(current_item_name, unique_keyword):
            return ["에픽", "태초"]
        return ["태초"]
    return []


def get_oath_transcend_score(row: dict, is_buffer: bool) -> float:
    effects = row.get("effects") or {}
    if is_buffer:
        return parse_percent_or_number(effects.get("buffPower")) + parse_percent_or_number(row.get("oathSetBuffPowerDelta"))
    final_damage = parse_percent_or_number(effects.get("finalDamage"))
    skill_damage_multiplier = parse_percent_or_number(row.get("skillDamageMultiplier")) or 1
    return ((1 + final_damage / 100) * skill_damage_multiplier - 1) * 100


def build_oath_transcend_recommendations_debug(
    oath_payload: dict,
    buffer_baseline: dict | None = None,
    oath_tune_stage_db: dict | None = None,
    equipment_rows: list | None = None,
) -> dict:
    return build_oath_decision_recommendations_debug(
        oath_payload,
        buffer_baseline,
        oath_tune_stage_db,
        equipment_rows,
        costs_by_rarity=OATH_TRANSCEND_COSTS,
        source_type="oathTranscend",
        kind="oath_transcend",
        slot="서약 결정",
        tier="초월",
        step_name="build_oath_transcend_recommendations",
    )


def build_oath_craft_recommendations_debug(
    oath_payload: dict,
    buffer_baseline: dict | None = None,
    oath_tune_stage_db: dict | None = None,
    equipment_rows: list | None = None,
) -> dict:
    return build_oath_decision_recommendations_debug(
        oath_payload,
        buffer_baseline,
        oath_tune_stage_db,
        equipment_rows,
        costs_by_rarity=OATH_CRAFT_COSTS,
        source_type="oathCraft",
        kind="oath_craft",
        slot="서약 정가",
        tier="정가",
        step_name="build_oath_craft_recommendations",
    )


def build_oath_decision_recommendations_debug(
    oath_payload: dict,
    buffer_baseline: dict | None = None,
    oath_tune_stage_db: dict | None = None,
    equipment_rows: list | None = None,
    costs_by_rarity: dict | None = None,
    source_type: str = "oathTranscend",
    kind: str = "oath_transcend",
    slot: str = "서약 결정",
    tier: str = "초월",
    step_name: str = "build_oath_transcend_recommendations",
) -> dict:
    steps = []
    db = oath_tune_stage_db or {}
    costs_by_rarity = costs_by_rarity or OATH_TRANSCEND_COSTS
    unique_keyword = clean_text(db.get("uniqueCrystalNameKeyword")) or "안개 결정"
    oath = oath_payload.get("oath") or {}
    crystals = oath.get("crystal") or []
    is_buffer = bool((buffer_baseline or {}).get("isBuffer"))
    current_total_set_point = get_oath_total_set_point(oath)
    equipment_reinforce_by_slot = get_equipment_reinforce_by_slot(equipment_rows or [])
    epic_count = sum(
        1 for crystal in crystals
        if clean_text(crystal.get("itemRarity")) == "에픽"
        and not is_oath_unique_crystal_name(crystal.get("itemName"), unique_keyword)
    )
    epic_remaining = max(0, 8 - epic_count)
    primeval_count = sum(1 for crystal in crystals if clean_text(crystal.get("itemRarity")) == "태초")
    primeval_remaining = max(0, 3 - primeval_count)
    context_family_name = get_oath_context_family_name(crystals, unique_keyword)
    recommendations = []
    skipped = []

    for index, crystal in enumerate(crystals):
        if not isinstance(crystal, dict):
            continue
        current_item_name = clean_item_display_name(crystal.get("itemName"))
        current_rarity = clean_text(crystal.get("itemRarity"))
        current_is_unique = is_oath_unique_crystal_name(current_item_name, unique_keyword)
        current_family_name = context_family_name if current_is_unique else get_oath_crystal_family_name(current_item_name)
        if is_oath_transcend_blocked_crystal(crystal, unique_keyword):
            skipped.append({"index": index, "reason": "blocked"})
            continue
        if not current_family_name:
            skipped.append({"index": index, "reason": "missing_set_context"})
            continue
        current_id = clean_text(crystal.get("itemId"))
        current_detail = (fetch_item_details([current_id]) or [{}])[0] if current_id else {}
        current_effects = get_oath_transcend_effects(current_detail)
        if not current_effects:
            skipped.append({"index": index, "reason": "missing_current_effects"})
            continue
        current_calculation_effects = get_oath_transcend_current_effects(
            current_item_name,
            current_effects,
            is_buffer,
            equipment_reinforce_by_slot,
            current_detail,
        )
        for target_rarity in get_oath_transcend_target_rarities(current_rarity, current_item_name, unique_keyword):
            if target_rarity == "에픽" and epic_remaining <= 0:
                continue
            if target_rarity == "태초" and primeval_remaining <= 0:
                continue
            target_detail = resolve_oath_transcend_target_detail(current_item_name, target_rarity, unique_keyword, current_family_name)
            if not target_detail:
                skipped.append({"index": index, "targetRarity": target_rarity, "reason": "missing_target"})
                continue
            set_point_context = build_oath_set_point_context(
                current_total_set_point,
                get_oath_crystal_set_point(crystal),
                get_oath_detail_set_point(target_detail),
                db,
            )
            if not set_point_context:
                skipped.append({"index": index, "targetRarity": target_rarity, "reason": "missing_set_point"})
                continue
            target_effects = get_oath_transcend_effects(target_detail)
            current_role_effects = get_oath_transcend_role_effects(current_calculation_effects, is_buffer)
            target_role_effects = get_oath_transcend_role_effects(target_effects, is_buffer)
            effects = subtract_oath_effects(target_role_effects, current_role_effects)
            score = get_oath_transcend_score({
                "effects": effects,
                "skillDamageMultiplier": set_point_context.get("skillDamageMultiplier"),
                "oathSetBuffPowerDelta": set_point_context.get("oathSetBuffPowerDelta"),
            }, is_buffer)
            if score <= 0:
                skipped.append({"index": index, "targetRarity": target_rarity, "reason": "no_gain"})
                continue
            cost = costs_by_rarity.get(target_rarity) or {}
            expected_gold = int(cost.get("gold") or 0)
            cost_materials = []
            for material in cost.get("materials") or []:
                material_row = dict(material)
                if material_row.get("key") == "oathCrystalFragment":
                    material_row["label"] = get_oath_craft_fragment_label(current_item_name, current_family_name)
                cost_materials.append(material_row)
            materials = build_oath_transcend_materials(cost_materials)
            row = build_oath_transcend_recommendation_row(
                slot=slot,
                item_id=clean_text(target_detail.get("itemId")),
                item_name=clean_item_display_name(target_detail.get("itemName")),
                item_rarity=clean_text(target_detail.get("itemRarity")),
                icon_url=get_item_icon_url(clean_text(target_detail.get("itemId"))),
                current_item_name=current_item_name,
                current_rarity=current_rarity,
                current_effects=current_role_effects,
                target_effects=target_role_effects,
                effects=effects,
                expected_gold=expected_gold,
                materials=materials,
                material_text=get_oath_transcend_material_text(materials),
                target_rarity=target_rarity,
                skill_damage_multiplier=set_point_context.get("skillDamageMultiplier"),
                oath_set_buff_power_delta=set_point_context.get("oathSetBuffPowerDelta"),
                set_point_context=set_point_context,
                source_type=source_type,
                kind=kind,
                tier=tier,
            )
            row["_score"] = score
            row["targetSlotIndex"] = index
            recommendations.append(row)

    epic_rows = [row for row in recommendations if clean_text(row.get("targetRarity")) == "에픽"]
    primeval_rows = [row for row in recommendations if clean_text(row.get("targetRarity")) == "태초"]
    row_rank_key = lambda row: (
        -float(row.get("_score") or 0),
        -(parse_percent_or_number(row.get("targetSetPoint")) - parse_percent_or_number(row.get("currentSetPoint"))),
        int(row.get("expectedGold") or 0),
        clean_text(row.get("slot")),
    )
    epic_rows.sort(key=row_rank_key)
    primeval_rows.sort(key=row_rank_key)
    result_rows = [
        *build_oath_decision_variant_rows(
            epic_rows,
            min(epic_remaining, len(epic_rows)),
            current_total_set_point,
            db,
            source_type,
            kind,
            slot,
            tier,
        ),
        *build_oath_decision_variant_rows(
            primeval_rows,
            min(primeval_remaining, len(primeval_rows)),
            current_total_set_point,
            db,
            source_type,
            kind,
            slot,
            tier,
        ),
    ]
    result_rows.sort(key=lambda row: (
        int(row.get("expectedGold") or 0),
        clean_text(row.get("targetRarity")),
        clean_text(row.get("slot")),
    ))
    steps.append({
        "name": step_name,
        "crystalCount": len(crystals),
        "epicCount": epic_count,
        "epicRemaining": epic_remaining,
        "primevalCount": primeval_count,
        "primevalRemaining": primeval_remaining,
        "recommendationCount": len(result_rows),
        "skippedCount": len(skipped),
    })
    return {"recommendations": result_rows, "steps": steps}
