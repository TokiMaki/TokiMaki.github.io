import math
import time

from ..data_store import load_relic_craft_db
from ..effects import normalize_enchant_status, subtract_effects
from ..equipment_body import (
    get_equipment_tune_set_point,
    normalize_relic_craft_target_equipment_body,
    resolve_canonical_equipment_slot_id,
    resolve_canonical_equipment_slot_name,
)
from ..neople_client import clean_text, get_item_explain, get_item_icon_url
from ..presenters.relic_craft_presenter import build_relic_craft_recommendation_row
from ..repositories.item_repository import fetch_item_details, resolve_exact_item_by_name
from ..repositories.material_price_repository import build_upgrade_material_display_rows


def _number(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


def _get_enabled_recipes() -> list:
    return [
        recipe
        for recipe in load_relic_craft_db().get("crafts") or []
        if recipe.get("enabled") and recipe.get("sourceType") == "relicCraft"
    ]


def _get_equipment_set_point(equipment_rows: list) -> float:
    return sum(get_equipment_tune_set_point(equipment) for equipment in equipment_rows or [])


def _build_materials(recipe: dict, material_prices: dict) -> list:
    by_key = {}
    for group in (recipe.get("baseCraft") or {}, recipe.get("precision100") or {}):
        for material in group.get("materials") or []:
            key = clean_text(material.get("key"))
            if not key:
                return []
            merged = by_key.setdefault(key, dict(material, amount=0))
            merged["amount"] = _number(merged.get("amount")) + _number(material.get("amount"))

    rows = []
    for key, material in by_key.items():
        amount = _number(material.get("amount"))
        if amount <= 0:
            return []
        if material.get("priceSource") == "localManual":
            price = _number(((recipe.get("manualPrices") or {}).get(key) or {}).get("unitPrice"))
            if price <= 0:
                return []
            auction = {
                "listingCount": 0,
                "minUnitPrice": price,
                "averagePrice": price,
                "auctionNo": None,
                "priceSource": "localManual",
                "isSynthetic": True,
            }
            label = clean_text(material.get("label"))
            item = resolve_exact_item_by_name(label) if label else {}
            label = clean_text(item.get("itemName")) or label
            item_id = clean_text(material.get("itemId") or item.get("itemId"))
        else:
            price_row = material_prices.get(key) or {}
            auction = dict(price_row.get("auction") or {})
            if _number(auction.get("minUnitPrice")) <= 0:
                return []
            label = clean_text(price_row.get("label") or material.get("label"))
            item_id = clean_text(price_row.get("itemId") or material.get("itemId"))
        rows.append({
            "key": key,
            "label": label,
            "itemId": item_id,
            "amount": int(amount),
            "auction": auction,
        })
    return build_upgrade_material_display_rows(rows)


def _build_current_equipment_body(current: dict, current_detail: dict, current_effects: dict) -> dict:
    item_id = clean_text(current.get("itemId"))
    return {
        "slotId": resolve_canonical_equipment_slot_id(current),
        "slot": resolve_canonical_equipment_slot_name(current),
        "slotName": resolve_canonical_equipment_slot_name(current),
        "itemId": item_id,
        "itemName": clean_text(current.get("itemName")),
        "itemRarity": clean_text(current.get("itemRarity")),
        "iconUrl": get_item_icon_url(item_id) if item_id else "",
        "effects": dict(current_effects or {}),
        "tuneSetPoint": get_equipment_tune_set_point(current),
        "itemReinforceSkill": current_detail.get("itemReinforceSkill") or [],
        "itemBuff": current_detail.get("itemBuff") or {},
        "itemExplain": get_item_explain(current_detail),
    }


def _build_recipe_contexts(recipes: list, equipment_rows: list, current_set_point: float) -> tuple[list, list]:
    contexts = []
    steps = []
    for recipe in recipes:
        target_config = recipe.get("target") or {}
        target_item_id = clean_text(target_config.get("itemId"))
        target_slot_id = resolve_canonical_equipment_slot_id(target_config)
        if not target_item_id or not target_slot_id:
            # Item ids intentionally left blank in the DB are inactive until filled.
            continue
        current = next((
            row for row in equipment_rows or []
            if resolve_canonical_equipment_slot_id(row) == target_slot_id
        ), {})
        if not current or clean_text(current.get("itemId")) == target_item_id:
            continue

        minimum_current_set_point = _number(
            ((recipe.get("eligibility") or {}).get("minimumCurrentEquipmentSetPoint"))
        )
        if current_set_point < minimum_current_set_point:
            steps.append({
                "reason": "below_relic_craft_minimum_equipment_set_point",
                "currentEquipmentSetPoint": current_set_point,
                "minimumEquipmentSetPoint": minimum_current_set_point,
            })
            continue
        contexts.append({
            "recipe": recipe,
            "targetConfig": target_config,
            "targetItemId": target_item_id,
            "current": current,
        })
    return contexts, steps


def _build_recipe_recommendation(
    *,
    context: dict,
    details: dict,
    material_prices: dict,
    current_set_point: float,
) -> tuple[dict, dict]:
    recipe = context["recipe"]
    target_config = context["targetConfig"]
    target_item_id = context["targetItemId"]
    current = context["current"]
    current_detail = details.get(clean_text(current.get("itemId"))) or {}
    target_detail = details.get(target_item_id) or {}
    if not current_detail:
        return {}, {"reason": "missing_or_invalid_relic_craft_item_detail"}

    precision = recipe.get("precision100") or {}
    target_body, target_reason = normalize_relic_craft_target_equipment_body(
        target_config=target_config,
        target_detail=target_detail,
        normalized_status=normalize_enchant_status(target_detail.get("itemStatus") or []),
        precision=precision,
        authoritative_effects=recipe.get("authoritativeEffects") or {},
        icon_url=get_item_icon_url(target_item_id),
        item_explain=get_item_explain(target_detail),
    )
    if target_reason:
        return {}, {"reason": target_reason}

    current_effects = normalize_enchant_status(current_detail.get("itemStatus") or [])
    current_body = _build_current_equipment_body(current, current_detail, current_effects)
    target_effects = target_body["effects"]
    effects = subtract_effects(target_effects, current_effects)
    if not effects:
        return {}, {"reason": "no_relic_craft_effect_delta"}

    target_set_point = (
        current_set_point
        - _number(current_body.get("tuneSetPoint"))
        + _number(target_body.get("tuneSetPoint"))
    )

    materials = _build_materials(recipe, material_prices)
    if not materials:
        return {}, {"reason": "missing_relic_craft_material_price"}

    fixed_gold = _number((recipe.get("baseCraft") or {}).get("fixedGold")) + _number(
        precision.get("fixedGold")
    )
    if fixed_gold <= 0:
        return {}, {"reason": "missing_relic_craft_fixed_gold"}

    display = recipe.get("display") or {}
    row = build_relic_craft_recommendation_row(
        slot=target_body["slot"],
        target_slot_id=target_body["slotId"],
        item_id=target_body["itemId"],
        item_name=target_body["itemName"],
        item_rarity=target_body["itemRarity"],
        icon_url=target_body["iconUrl"],
        item_explain=(
            f"{current_body['itemName']} -> {target_body['itemName']} "
            f"(정밀도 {int(_number(precision.get('targetPercent')))}%)"
        ),
        effects=effects,
        current_effects=current_effects,
        target_effects=target_effects,
        current_equipment_body=current_body,
        target_equipment_body=target_body,
        auction={
            "listingCount": 0,
            "minUnitPrice": fixed_gold,
            "averagePrice": fixed_gold,
            "auctionNo": None,
            "priceSource": "fixedCraftGold",
            "isSynthetic": True,
        },
        expected_gold=fixed_gold,
        materials=materials,
        material_text=" / ".join(
            f"{material['label']} {material['amount']:,}개" for material in materials
        ),
        card_title=display.get("cardTitle") or "유물 제작",
        card_subtitle=display.get("cardSubtitle") or target_body["slot"],
        source_type=recipe.get("sourceType") or "relicCraft",
        tier=target_body["itemRarity"],
        precision_percent=_number(precision.get("targetPercent")),
        precision_operation_count=int(_number(precision.get("operationCount"))),
        current_slot_set_point=current_body["tuneSetPoint"],
        target_slot_set_point=target_body["tuneSetPoint"],
        current_equipment_set_point=current_set_point,
        target_equipment_set_point=target_set_point,
    )
    return row, {
        "name": "build_relic_craft_recommendation",
        "currentEquipmentSetPoint": current_set_point,
        "targetEquipmentSetPoint": target_set_point,
    }


def build_relic_craft_recommendations_debug(
    equipment_rows: list,
    material_prices: dict | None = None,
) -> dict:
    started_at = time.perf_counter()
    recipes = _get_enabled_recipes()
    if not recipes:
        return {"recommendations": [], "steps": [{"reason": "missing_relic_craft_target_item"}]}

    current_set_point = _get_equipment_set_point(equipment_rows)
    contexts, steps = _build_recipe_contexts(recipes, equipment_rows, current_set_point)
    if not contexts:
        return {"recommendations": [], "steps": steps}

    detail_ids = []
    for context in contexts:
        detail_ids.extend([
            context["current"].get("itemId"),
            context["targetItemId"],
        ])
    details = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(detail_ids)
    }

    recommendations = []
    for context in contexts:
        row, step = _build_recipe_recommendation(
            context=context,
            details=details,
            material_prices=material_prices or {},
            current_set_point=current_set_point,
        )
        if row:
            recommendations.append(row)
            step["ms"] = round((time.perf_counter() - started_at) * 1000, 1)
        if step:
            steps.append(step)

    return {
        "recommendations": recommendations,
        "steps": steps,
    }
