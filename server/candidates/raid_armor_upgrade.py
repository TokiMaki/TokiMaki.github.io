import math
import time

from ..data_store import load_raid_armor_upgrade_db
from ..effects import normalize_enchant_status, subtract_effects
from ..equipment_body import (
    get_equipment_tune_set_point,
    resolve_canonical_equipment_slot_id,
    resolve_canonical_equipment_slot_name,
)
from ..neople_client import clean_text, get_item_explain, get_item_icon_url
from ..presenters.raid_armor_upgrade_presenter import (
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


def build_raid_armor_upgrade_recommendations_debug(
    equipment_rows: list,
    material_prices: dict | None = None,
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

    if not contexts:
        return {"recommendations": [], "steps": []}

    detail_ids = {
        clean_text(stage.get("itemId"))
        for piece, _, _, _ in contexts
        for stage in (piece.get("stages") or {}).values()
        if clean_text(stage.get("itemId"))
    }
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
