import math
import time

from ..data_store import load_relic_craft_db
from ..effects import normalize_enchant_status, subtract_effects
from ..equipment_body import (
    get_equipment_tune_set_point,
    get_relic_precision_effects,
    normalize_relic_craft_target_equipment_body,
    resolve_relic_precision_percent,
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


def _material_number(value):
    number = _number(value)
    return int(number) if number.is_integer() else number


def _build_materials(
    recipe: dict,
    material_prices: dict,
    *,
    operation_count=None,
    include_craft: bool = True,
) -> list:
    by_key = {}
    precision = recipe.get("precision100") or {}
    resolved_operation_count = (
        _number(precision.get("operationCount"))
        if operation_count is None
        else max(0.0, _number(operation_count))
    )
    for group_name, group in (
        ("craft", recipe.get("baseCraft") or {}),
        ("tune", precision),
    ):
        for material in group.get("materials") or []:
            key = clean_text(material.get("key"))
            if not key:
                return []
            merged = by_key.setdefault(
                key,
                dict(
                    material,
                    amount=0,
                    craftAmount=0,
                    tuneAmount=0,
                    tuneAmountPerAttempt=0,
                ),
            )
            for metadata_key in ("label", "itemId", "priceSource"):
                if not clean_text(merged.get(metadata_key)) and clean_text(material.get(metadata_key)):
                    merged[metadata_key] = material.get(metadata_key)
            if group_name == "craft":
                if include_craft:
                    craft_amount = _number(material.get("amount"))
                    merged["craftAmount"] = _number(merged.get("craftAmount")) + craft_amount
            else:
                tune_amount_per_attempt = _number(material.get("amountPerAttempt"))
                merged["tuneAmountPerAttempt"] = (
                    _number(merged.get("tuneAmountPerAttempt")) + tune_amount_per_attempt
                )

    for material in by_key.values():
        material["tuneAmount"] = (
            _number(material.get("tuneAmountPerAttempt")) * resolved_operation_count
        )
        material["amount"] = _number(material.get("craftAmount")) + _number(material.get("tuneAmount"))

    rows = []
    for key, material in by_key.items():
        amount = _number(material.get("amount"))
        if amount <= 0:
            continue
        price_source = clean_text(material.get("priceSource"))
        if price_source == "displayOnly":
            auction = {
                "listingCount": 0,
                "minUnitPrice": 0,
                "averagePrice": 0,
                "auctionNo": None,
                "priceSource": "displayOnly",
                "isSynthetic": True,
            }
            label = clean_text(material.get("label"))
            item_id = clean_text(material.get("itemId"))
        elif price_source == "localManual":
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
            "amount": _material_number(amount),
            "craftAmount": _material_number(material.get("craftAmount")),
            "tuneAmount": _material_number(material.get("tuneAmount")),
            "tuneAmountPerAttempt": _material_number(material.get("tuneAmountPerAttempt")),
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
        if not current:
            continue

        same_item = clean_text(current.get("itemId")) == target_item_id
        current_precision_percent = None
        mode = "craft"
        minimum_current_set_point = _number(
            ((recipe.get("eligibility") or {}).get("minimumCurrentEquipmentSetPoint"))
        )
        if same_item:
            mode = "precision"
            current_precision_percent = resolve_relic_precision_percent(
                current.get("potency"),
            )
            if current_precision_percent is None:
                steps.append({
                    "reason": "unresolved_unique_precision_percent",
                    "itemId": target_item_id,
                    "potency": current.get("potency"),
                })
                continue
            if current_precision_percent >= 100:
                continue
            minimum_current_set_point = 0.0
        elif current_set_point < minimum_current_set_point:
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
            "mode": mode,
            "currentPrecisionPercent": current_precision_percent,
            "minimumCurrentEquipmentSetPoint": minimum_current_set_point,
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
    mode = context.get("mode") or "craft"
    current_precision_percent = context.get("currentPrecisionPercent")
    current_detail = details.get(clean_text(current.get("itemId"))) or {}
    target_detail = details.get(target_item_id) or {}
    if not current_detail or not target_detail:
        return {}, {"reason": "missing_or_invalid_relic_craft_item_detail"}

    precision = recipe.get("precision100") or {}
    authoritative_effects = recipe.get("authoritativeEffects") or {}
    normalized_target_status = normalize_enchant_status(target_detail.get("itemStatus") or [])
    target_body, target_reason = normalize_relic_craft_target_equipment_body(
        target_config=target_config,
        target_detail=target_detail,
        normalized_status=normalized_target_status,
        precision=precision,
        authoritative_effects=authoritative_effects,
        icon_url=get_item_icon_url(target_item_id),
        item_explain=get_item_explain(target_detail),
    )
    if target_reason:
        return {}, {"reason": target_reason}

    if mode == "precision":
        current_body, current_reason = normalize_relic_craft_target_equipment_body(
            target_config=target_config,
            target_detail=target_detail,
            normalized_status=normalized_target_status,
            precision=precision,
            authoritative_effects=authoritative_effects,
            icon_url=get_item_icon_url(target_item_id),
            item_explain=get_item_explain(target_detail),
            precision_percent=current_precision_percent,
        )
        if current_reason:
            return {}, {"reason": current_reason}
        current_effects = current_body["effects"]
    else:
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

    full_precision_operation_count = _number(precision.get("operationCount"))
    remaining_ratio = (
        max(0.0, 100.0 - _number(current_precision_percent)) / 100.0
        if mode == "precision"
        else 1.0
    )
    precision_operation_count = full_precision_operation_count * remaining_ratio
    materials = (
        _build_materials(
            recipe,
            material_prices,
            operation_count=precision_operation_count,
            include_craft=False,
        )
        if mode == "precision"
        else _build_materials(recipe, material_prices)
    )
    if not materials:
        return {}, {"reason": "missing_relic_craft_material_price"}

    craft_fixed_gold = (
        _number((recipe.get("baseCraft") or {}).get("fixedGold"))
        if mode == "craft"
        else 0.0
    )
    tune_fixed_gold_per_attempt = _number(precision.get("fixedGoldPerAttempt"))
    fixed_gold = craft_fixed_gold + tune_fixed_gold_per_attempt * precision_operation_count
    if fixed_gold <= 0:
        return {}, {"reason": "missing_relic_craft_fixed_gold"}

    display = recipe.get("display") or {}
    target_precision_percent = _number(precision.get("targetPercent"))
    current_precision_effects = (
        get_relic_precision_effects(precision, current_precision_percent)
        if mode == "precision"
        else {}
    )
    target_precision_effects = (
        get_relic_precision_effects(precision, target_precision_percent)
        if mode == "precision"
        else {}
    )
    item_explain = (
        f"{target_body['itemName']} 정밀도 {int(_number(current_precision_percent))}% -> "
        f"{int(target_precision_percent)}%"
        if mode == "precision"
        else (
            f"{current_body['itemName']} -> {target_body['itemName']} "
            f"(정밀도 {int(target_precision_percent)}%)"
        )
    )
    row = build_relic_craft_recommendation_row(
        slot=target_body["slot"],
        target_slot_id=target_body["slotId"],
        item_id=target_body["itemId"],
        item_name=target_body["itemName"],
        item_rarity=target_body["itemRarity"],
        icon_url=target_body["iconUrl"],
        item_explain=item_explain,
        effects=effects,
        current_effects=current_effects,
        target_effects=target_effects,
        current_precision_effects=current_precision_effects,
        target_precision_effects=target_precision_effects,
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
        craft_fixed_gold=craft_fixed_gold,
        tune_fixed_gold_per_attempt=tune_fixed_gold_per_attempt,
        materials=materials,
        material_text=" / ".join(
            f"{material['label']} {material['amount']:,}개" for material in materials
        ),
        card_title=(
            display.get("precisionCardTitle") or "유일 정밀"
            if mode == "precision"
            else display.get("cardTitle") or "유일 제작"
        ),
        card_subtitle=display.get("cardSubtitle") or target_body["slot"],
        source_type=recipe.get("sourceType") or "relicCraft",
        relic_craft_mode=mode,
        tier=target_body["itemRarity"],
        current_precision_percent=_number(current_precision_percent),
        precision_percent=target_precision_percent,
        full_precision_operation_count=full_precision_operation_count,
        precision_operation_count=precision_operation_count,
        current_slot_set_point=current_body["tuneSetPoint"],
        target_slot_set_point=target_body["tuneSetPoint"],
        current_equipment_set_point=current_set_point,
        target_equipment_set_point=target_set_point,
        minimum_current_equipment_set_point=context["minimumCurrentEquipmentSetPoint"],
    )
    return row, {
        "name": "build_relic_craft_recommendation",
        "mode": mode,
        "currentPrecisionPercent": current_precision_percent,
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
