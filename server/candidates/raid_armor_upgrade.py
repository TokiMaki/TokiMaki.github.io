import math
import time

from ..data_store import load_raid_armor_upgrade_db, load_relic_craft_db
from ..effects import normalize_enchant_status, subtract_effects
from ..equipment_body import (
    get_equipment_tune_set_point,
    resolve_canonical_equipment_slot_id,
    resolve_canonical_equipment_slot_name,
)
from ..neople_client import clean_text, get_item_explain, get_item_icon_url
from ..presenters.raid_armor_upgrade_presenter import (
    build_raid_armor_designation_recommendation_row,
    build_raid_armor_upgrade_recommendation_row,
)
from ..repositories.item_repository import fetch_item_details
from ..repositories.material_price_repository import (
    build_upgrade_material_display_rows,
    get_upgrade_material_config,
)


def _number(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


def _normalize_equipment_body(stage: dict, detail: dict, slot_id: str) -> dict:
    item_id = clean_text(stage.get("itemId"))
    slot_name = resolve_canonical_equipment_slot_name({"slotId": slot_id})
    if not item_id or clean_text(detail.get("itemId")) != item_id or not slot_name:
        return {}
    return {
        "slotId": slot_id,
        "slot": slot_name,
        "slotName": slot_name,
        "itemId": item_id,
        "itemName": clean_text(detail.get("itemName") or stage.get("itemName")),
        "itemRarity": clean_text(detail.get("itemRarity")),
        "setItemId": clean_text(detail.get("setItemId")),
        "setItemName": clean_text(detail.get("setItemName")),
        "iconUrl": get_item_icon_url(item_id),
        "effects": normalize_enchant_status(detail.get("itemStatus") or []),
        "tuneSetPoint": get_equipment_tune_set_point(detail),
        "itemReinforceSkill": detail.get("itemReinforceSkill") or [],
        "itemBuff": detail.get("itemBuff") or {},
        "itemExplain": get_item_explain(detail),
    }


def _build_materials(transition: dict, material_prices: dict) -> list:
    rows = []
    for configured in transition.get("materials") or []:
        key = clean_text(configured.get("key"))
        material_config = get_upgrade_material_config(key)
        if not key or not material_config:
            return []
        material = {**material_config, **configured}
        amount = _number(material.get("amount"))
        if amount <= 0:
            continue
        if clean_text(material.get("priceSource")) == "materialResolver":
            resolved = material_prices.get(key) or {}
            material["label"] = clean_text(resolved.get("label") or material.get("label"))
            material["itemId"] = clean_text(resolved.get("itemId") or material.get("itemId"))
            material["iconUrl"] = clean_text(resolved.get("iconUrl") or material.get("iconUrl"))
            material["auction"] = dict(resolved.get("auction") or {})
        else:
            material["auction"] = {
                "listingCount": 0,
                "minUnitPrice": 0,
                "averagePrice": 0,
                "auctionNo": None,
                "priceSource": "displayOnly",
                "isSynthetic": True,
            }
        material["amount"] = int(amount) if amount.is_integer() else amount
        rows.append(material)
    return build_upgrade_material_display_rows(rows)


def _find_equipped_piece(equipment_rows: list, pieces: list) -> tuple[dict, str, dict]:
    stage_by_item_id = {}
    for piece in pieces:
        for stage_name, stage in (piece.get("stages") or {}).items():
            item_id = clean_text(stage.get("itemId"))
            if item_id:
                stage_by_item_id[item_id] = (piece, stage_name)
    for equipment in equipment_rows or []:
        matched = stage_by_item_id.get(clean_text(equipment.get("itemId")))
        if matched:
            return matched[0], matched[1], equipment
    return {}, "", {}


_RIGHT_SLOT_IDS = ("WRIST", "AMULET", "RING", "SUPPORT", "MAGIC_STON", "EARRING")
_ACCESSORY_SLOT_IDS = ("WRIST", "AMULET", "RING")
_SPECIAL_SLOT_IDS = ("SUPPORT", "MAGIC_STON", "EARRING")
_RARITY_ORDER = {"레어": 0, "유니크": 1, "레전더리": 2, "에픽": 3, "태초": 4}


def _get_relic_item_ids() -> set[str]:
    return {
        clean_text((recipe.get("target") or {}).get("itemId"))
        for recipe in load_relic_craft_db().get("crafts") or []
        if recipe.get("enabled")
        and clean_text((recipe.get("target") or {}).get("itemId"))
    }


def _is_designation_excluded(equipment: dict, relic_item_ids: set[str]) -> bool:
    return (
        clean_text(equipment.get("itemId")) in relic_item_ids
        or clean_text(equipment.get("itemName")).startswith("흑아 :")
    )


def _build_final_transformation_contexts(
    equipment_rows: list,
    set_item_info: list,
    config: dict,
) -> list[dict]:
    transformation = config.get("finalTransformation") or {}
    targets_by_family = transformation.get("targetsByFamily") or {}
    right_targets_by_family = transformation.get("rightTargetsByFamily") or {}
    family_key = next((
        clean_text(row.get("setItemId"))
        for row in set_item_info or []
        if clean_text(row.get("setItemId")) in targets_by_family
    ), "")
    if not family_key:
        return []

    equipment_by_slot = {
        resolve_canonical_equipment_slot_id(equipment): equipment
        for equipment in equipment_rows or []
        if resolve_canonical_equipment_slot_id(equipment)
    }
    stage_by_item_id = {
        clean_text(stage.get("itemId")): (piece, stage_name)
        for piece in config.get("pieces") or []
        for stage_name, stage in (piece.get("stages") or {}).items()
        if clean_text(stage.get("itemId"))
    }
    source_stage = clean_text(transformation.get("sourceStage") or "consecrated")
    required_slots = [
        resolve_canonical_equipment_slot_id({"slotId": slot_id})
        for slot_id in transformation.get("requiredSlots") or []
    ]
    consecrated_sources = {}
    for slot_id in required_slots:
        equipment = equipment_by_slot.get(slot_id) or {}
        matched = stage_by_item_id.get(clean_text(equipment.get("itemId")))
        if not matched:
            return []
        source = (matched[0].get("stages") or {}).get(source_stage) or {}
        if not clean_text(source.get("itemId")):
            return []
        consecrated_sources[slot_id] = source

    for slot_id in _ACCESSORY_SLOT_IDS:
        equipment = equipment_by_slot.get(slot_id) or {}
        if _RARITY_ORDER.get(clean_text(equipment.get("itemRarity")), -1) < _RARITY_ORDER["태초"]:
            return []
    for slot_id in _SPECIAL_SLOT_IDS:
        equipment = equipment_by_slot.get(slot_id) or {}
        if _RARITY_ORDER.get(clean_text(equipment.get("itemRarity")), -1) < _RARITY_ORDER["에픽"]:
            return []

    relic_item_ids = _get_relic_item_ids()
    contexts = []
    family_targets = targets_by_family.get(family_key) or {}
    for slot_id in required_slots:
        equipment = consecrated_sources.get(slot_id) or {}
        target = family_targets.get(slot_id) or {}
        if clean_text(target.get("itemId")):
            contexts.append({"slotId": slot_id, "equipment": equipment, "target": target})

    right_targets = right_targets_by_family.get(family_key) or {}
    for slot_id in _RIGHT_SLOT_IDS:
        equipment = equipment_by_slot.get(slot_id) or {}
        target = right_targets.get(slot_id) or {}
        if (
            _is_designation_excluded(equipment, relic_item_ids)
            or not clean_text(target.get("itemId"))
            or clean_text(target.get("itemId")) == clean_text(equipment.get("itemId"))
        ):
            continue
        contexts.append({
            "slotId": slot_id,
            "equipment": equipment,
            "target": target,
            "preserveCurrentPerformance": True,
        })
    return contexts


def build_raid_armor_upgrade_recommendations_debug(
    equipment_rows: list,
    material_prices: dict | None = None,
    set_item_info: list | None = None,
) -> dict:
    started_at = time.perf_counter()
    config = load_raid_armor_upgrade_db()
    pieces = config.get("pieces") or []
    transitions = config.get("allowedTransitions") or []
    remaining_pieces = list(pieces)
    contexts = []
    while remaining_pieces:
        piece, equipped_stage, equipment = _find_equipped_piece(equipment_rows, remaining_pieces)
        if not piece:
            break
        remaining_pieces.remove(piece)
        reachable_stages = {equipped_stage}
        if equipped_stage == "base":
            reachable_stages.add("encroached")
        for transition in transitions:
            if clean_text(transition.get("from")) in reachable_stages:
                contexts.append((piece, equipped_stage, transition, equipment))

    final_contexts = _build_final_transformation_contexts(
        equipment_rows,
        set_item_info or [],
        config,
    )

    if not contexts and not final_contexts:
        return {"recommendations": [], "steps": []}

    detail_ids = {
        clean_text(stage.get("itemId"))
        for piece, _, _, _ in contexts
        for stage in (piece.get("stages") or {}).values()
        if clean_text(stage.get("itemId"))
    }
    detail_ids.update(
        clean_text(item.get("itemId"))
        for context in final_contexts
        for item in (context.get("equipment") or {}, context.get("target") or {})
        if clean_text(item.get("itemId"))
    )
    details = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(list(detail_ids))
        if clean_text(detail.get("itemId"))
    }

    recommendations = []
    skipped = []
    for piece, equipped_stage, transition, _ in contexts:
        stages = piece.get("stages") or {}
        from_stage = clean_text(transition.get("from"))
        to_stage = clean_text(transition.get("to"))
        base_config = stages.get(equipped_stage) or {}
        required_current_config = stages.get(from_stage) or {}
        target_config = stages.get(to_stage) or {}
        slot_id = resolve_canonical_equipment_slot_id({"slotId": piece.get("slotId")})
        base_body = _normalize_equipment_body(
            base_config,
            details.get(clean_text(base_config.get("itemId"))) or {},
            slot_id,
        )
        current_body = _normalize_equipment_body(
            required_current_config,
            details.get(clean_text(required_current_config.get("itemId"))) or {},
            slot_id,
        )
        target_body = _normalize_equipment_body(
            target_config,
            details.get(clean_text(target_config.get("itemId"))) or {},
            slot_id,
        )
        if not base_body or not current_body or not target_body:
            skipped.append({"reason": "missing_raid_armor_item_detail", "slotId": slot_id})
            continue
        fixed_gold = _number(transition.get("fixedGold"))
        materials = _build_materials(transition, material_prices or {})
        if fixed_gold <= 0 or not materials:
            skipped.append({"reason": "invalid_raid_armor_upgrade_cost", "slotId": slot_id})
            continue
        stage_label = clean_text(transition.get("label"))
        recommendations.append(build_raid_armor_upgrade_recommendation_row(
            stage_label=stage_label,
            from_stage=from_stage,
            to_stage=to_stage,
            required_current_item_id=clean_text(required_current_config.get("itemId")),
            base_equipment_body=base_body,
            current_equipment_body=current_body,
            target_equipment_body=target_body,
            effects=subtract_effects(target_body["effects"], current_body["effects"]),
            item_explain=(
                f"{clean_text(required_current_config.get('itemName'))} -> "
                f"{target_body['itemName']}"
            ),
            auction={
                "listingCount": 0,
                "minUnitPrice": fixed_gold,
                "averagePrice": fixed_gold,
                "auctionNo": None,
                "priceSource": "fixedUpgradeGold",
                "isSynthetic": True,
            },
            expected_gold=fixed_gold,
            materials=materials,
            material_text=" / ".join(
                f"{material['label']} {material['amount']:,}개" for material in materials
            ),
        ))

    designation_changes = []
    for context in final_contexts:
        slot_id = context["slotId"]
        equipment = context["equipment"]
        target = context["target"]
        current_body = _normalize_equipment_body(
            equipment,
            details.get(clean_text(equipment.get("itemId"))) or {},
            slot_id,
        )
        target_body = _normalize_equipment_body(
            target,
            details.get(clean_text(target.get("itemId"))) or {},
            slot_id,
        )
        if not current_body or not target_body:
            skipped.append({"reason": "missing_relic_set_item_detail", "slotId": slot_id})
            designation_changes = []
            break
        if context.get("preserveCurrentPerformance"):
            target_body = {
                **target_body,
                "effects": current_body["effects"],
                "tuneSetPoint": current_body["tuneSetPoint"],
                "itemReinforceSkill": current_body["itemReinforceSkill"],
                "itemBuff": current_body["itemBuff"],
            }
        designation_changes.append({
            "slotId": slot_id,
            "requiredCurrentItemId": current_body["itemId"],
            "baseEquipmentBody": current_body,
            "currentEquipmentBody": current_body,
            "targetEquipmentBody": target_body,
        })
    if designation_changes and len(designation_changes) == len(final_contexts):
        recommendations.append(
            build_raid_armor_designation_recommendation_row(designation_changes)
        )

    return {
        "recommendations": recommendations,
        "steps": [
            {
                "name": "build_raid_armor_upgrade_recommendations",
                "ms": round((time.perf_counter() - started_at) * 1000, 1),
                "count": len(recommendations),
            },
            *skipped,
        ],
    }
