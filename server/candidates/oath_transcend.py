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


def subtract_oath_effects(target_effects: dict, current_effects: dict) -> dict:
    keys = set((target_effects or {}).keys()) | set((current_effects or {}).keys())
    result = {}
    for key in keys:
        value = parse_percent_or_number((target_effects or {}).get(key)) - parse_percent_or_number((current_effects or {}).get(key))
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


def get_oath_crystal_family_name(item_name: str) -> str:
    item_name = clean_text(item_name)
    if " : " not in item_name:
        return ""
    family_name, suffix = item_name.split(" : ", 1)
    if "광휘 결정" not in suffix:
        return ""
    return clean_text(family_name)


def get_oath_craft_fragment_label(item_name: str) -> str:
    family_name = get_oath_crystal_family_name(item_name)
    return f"{family_name} 서약 결정 조각" if family_name else "서약 결정 조각"


def get_oath_transcend_target_item_name(item_name: str, target_rarity: str) -> str:
    family_name = get_oath_crystal_family_name(item_name)
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
    if "고유" in item_name:
        return True
    if unique_keyword and unique_keyword in item_name:
        return True
    return False


def resolve_oath_transcend_target_detail(current_item_name: str, target_rarity: str) -> dict:
    target_item_name = get_oath_transcend_target_item_name(current_item_name, target_rarity)
    if not target_item_name:
        return {}
    rows = search_items_by_name(target_item_name, word_type="match", limit=20)
    exact_rows = [
        row for row in rows
        if clean_text(row.get("itemName")) == target_item_name
        and clean_text(row.get("itemRarity")) == clean_text(target_rarity)
        and clean_text(row.get("itemTypeDetail")) == "서약결정"
    ]
    if len(exact_rows) != 1:
        return {}
    item_id = clean_text(exact_rows[0].get("itemId"))
    return (fetch_item_details([item_id]) or [{}])[0] if item_id else {}


def get_oath_transcend_target_rarities(current_rarity: str) -> list[str]:
    current_rarity = clean_text(current_rarity)
    if current_rarity in {"유니크", "레전더리"}:
        return ["에픽", "태초"]
    if current_rarity == "에픽":
        return ["태초"]
    return []


def get_oath_transcend_score(row: dict, is_buffer: bool) -> float:
    effects = row.get("effects") or {}
    if is_buffer:
        return parse_percent_or_number(effects.get("buffPower")) + parse_percent_or_number(row.get("oathSetBuffPowerDelta"))
    final_damage = parse_percent_or_number(effects.get("finalDamage"))
    skill_damage_multiplier = parse_percent_or_number(row.get("skillDamageMultiplier")) or 1
    return ((1 + final_damage / 100) * skill_damage_multiplier - 1) * 100


def build_oath_transcend_recommendations_debug(oath_payload: dict, buffer_baseline: dict | None = None, oath_tune_stage_db: dict | None = None) -> dict:
    return build_oath_decision_recommendations_debug(
        oath_payload,
        buffer_baseline,
        oath_tune_stage_db,
        costs_by_rarity=OATH_TRANSCEND_COSTS,
        source_type="oathTranscend",
        kind="oath_transcend",
        slot="서약 결정",
        tier="초월",
        step_name="build_oath_transcend_recommendations",
    )


def build_oath_craft_recommendations_debug(oath_payload: dict, buffer_baseline: dict | None = None, oath_tune_stage_db: dict | None = None) -> dict:
    return build_oath_decision_recommendations_debug(
        oath_payload,
        buffer_baseline,
        oath_tune_stage_db,
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
    primeval_count = sum(1 for crystal in crystals if clean_text(crystal.get("itemRarity")) == "태초")
    primeval_remaining = max(0, 3 - primeval_count)
    recommendations = []
    skipped = []

    for index, crystal in enumerate(crystals):
        if not isinstance(crystal, dict):
            continue
        current_item_name = clean_item_display_name(crystal.get("itemName"))
        current_rarity = clean_text(crystal.get("itemRarity"))
        if is_oath_transcend_blocked_crystal(crystal, unique_keyword):
            skipped.append({"index": index, "reason": "blocked"})
            continue
        current_id = clean_text(crystal.get("itemId"))
        current_detail = (fetch_item_details([current_id]) or [{}])[0] if current_id else {}
        current_effects = get_oath_transcend_effects(current_detail)
        if not current_effects:
            skipped.append({"index": index, "reason": "missing_current_effects"})
            continue
        for target_rarity in get_oath_transcend_target_rarities(current_rarity):
            if target_rarity == "태초" and primeval_remaining <= 0:
                continue
            target_detail = resolve_oath_transcend_target_detail(current_item_name, target_rarity)
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
            current_role_effects = get_oath_transcend_role_effects(current_effects, is_buffer)
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
                    material_row["label"] = get_oath_craft_fragment_label(current_item_name)
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
            recommendations.append(row)

    epic_rows = [row for row in recommendations if clean_text(row.get("targetRarity")) == "에픽"]
    primeval_rows = [row for row in recommendations if clean_text(row.get("targetRarity")) == "태초"]
    row_rank_key = lambda row: (-float(row.get("_score") or 0), int(row.get("expectedGold") or 0), clean_text(row.get("slot")))
    epic_rows.sort(key=row_rank_key)
    primeval_rows.sort(key=row_rank_key)
    selected_epic_rows = epic_rows[:1]
    selected_primeval_rows = primeval_rows[:min(1, primeval_remaining)]
    result_rows = [
        {key: value for key, value in row.items() if key != "_score"}
        for row in [*selected_epic_rows, *selected_primeval_rows]
    ]
    result_rows.sort(key=lambda row: (
        int(row.get("expectedGold") or 0),
        clean_text(row.get("targetRarity")),
        clean_text(row.get("slot")),
    ))
    steps.append({
        "name": step_name,
        "crystalCount": len(crystals),
        "primevalCount": primeval_count,
        "primevalRemaining": primeval_remaining,
        "recommendationCount": len(result_rows),
        "skippedCount": len(skipped),
    })
    return {"recommendations": result_rows, "steps": steps}
