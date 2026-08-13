import math
import time

from ..effects import normalize_enchant_status, order_effects, subtract_effects
from ..equipment_body import get_equipment_tune_set_point
from ..neople_client import clean_text, get_item_explain, get_item_icon_url
from ..presenters.weapon_tune_presenter import build_weapon_tune_recommendation_row
from ..repositories.item_repository import resolve_exact_item_by_name
from ..repositories.material_price_repository import (
    build_upgrade_material_display_rows,
    get_upgrade_material_config,
)


WEAPON_TUNE_FINAL_DAMAGE_BY_STAGE = {
    0: 376.7,
    1: 398.2,
    2: 420.6,
    3: 444.0,
    4: 500.0,
}
WEAPON_TUNE_BUFF_POWER_BY_STAGE = {
    0: 44_261,
    1: 45_961,
    2: 47_661,
    3: 49_361,
    4: 53_000,
}
WEAPON_TUNE_STEP_GOLD = 500_000
WEAPON_TUNE_STEP_BLACK_CALAMITY = 40
WEAPON_TUNE_FINAL_BLACK_CALAMITY = 80
WEAPON_TUNE_FINAL_PRIMORDIAL_SOUL = 2
WEAPON_RELEASE_MAX_FINAL_DAMAGE = 500.0
WEAPON_RELEASE_MAX_DAMAGE_PERCENT = 13.7
WEAPON_RELEASE_MAX_BUFF_POWER = 53_000
WEAPON_RELEASE_BUFF_POWER_GAIN = 4_700
WEAPON_RELEASE_GUARANTEED_PERCENT_PER_ATTEMPT = 5
WEAPON_RELEASE_STEP_GOLD = 150_000
WEAPON_RELEASE_STEP_BLACK_CALAMITY = 8
WEAPON_RELEASE_STEP_EPIC_SOUL = 1


def _number(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


def _get_weapon_tune_stage(equipment: dict) -> int:
    return max([
        int(_number(row.get("level")))
        for row in equipment.get("tune") or []
        if isinstance(row, dict)
    ] or [0])


def _has_weapon_release(equipment: dict) -> bool:
    value = equipment.get("weaponRelease")
    if isinstance(value, dict):
        return bool(value)
    if isinstance(value, list):
        return bool(value)
    return value not in (None, "", 0, False)


def _get_weapon_release_percent(equipment: dict) -> float | None:
    weapon_release = equipment.get("weaponRelease")
    if not isinstance(weapon_release, dict) or "value" not in weapon_release:
        return None
    value = _number(weapon_release.get("value"))
    if value < 0 or value > 100:
        return None
    return value


def _get_weapon_release_final_damage(release_percent: float) -> float:
    complete_multiplier = 1 + WEAPON_RELEASE_MAX_FINAL_DAMAGE / 100
    release_multiplier = 1 + (
        WEAPON_RELEASE_MAX_DAMAGE_PERCENT * release_percent / 100
    ) / 100
    base_multiplier = complete_multiplier / (1 + WEAPON_RELEASE_MAX_DAMAGE_PERCENT / 100)
    return (base_multiplier * release_multiplier - 1) * 100


def _get_weapon_release_buff_power(release_percent: float) -> float:
    base_buff_power = WEAPON_RELEASE_MAX_BUFF_POWER - WEAPON_RELEASE_BUFF_POWER_GAIN
    return base_buff_power + WEAPON_RELEASE_BUFF_POWER_GAIN * release_percent / 100


def _normalize_weapon_body(
    equipment: dict,
    stage: int,
    target_item: dict | None = None,
    final_damage: float | None = None,
    buff_power: float | None = None,
    release_percent: float | None = None,
) -> dict:
    target_item = target_item or equipment
    item_id = clean_text(target_item.get("itemId"))
    effects = normalize_enchant_status(equipment.get("itemStatus") or [])
    effects["finalDamage"] = (
        final_damage
        if final_damage is not None
        else WEAPON_TUNE_FINAL_DAMAGE_BY_STAGE[stage]
    )
    effects["buffPower"] = (
        buff_power
        if buff_power is not None
        else WEAPON_TUNE_BUFF_POWER_BY_STAGE[stage]
    )
    is_release = release_percent is not None
    return {
        "slotId": "WEAPON",
        "slot": "무기",
        "slotName": "무기",
        "itemId": item_id,
        "itemName": clean_text(target_item.get("itemName") or equipment.get("itemName")),
        "itemRarity": clean_text(target_item.get("itemRarity") or equipment.get("itemRarity")),
        "iconUrl": clean_text(target_item.get("iconUrl")) or get_item_icon_url(item_id),
        "effects": order_effects(effects),
        "tuneSetPoint": get_equipment_tune_set_point(equipment),
        "tuneLevel": 0 if is_release or stage >= 4 else stage,
        "tuneUpgradeable": False if is_release else stage < 4,
        "tuneRemaining": 0 if is_release or stage >= 4 else max(0, 3 - stage),
        "weaponReleasePercent": release_percent,
        "itemReinforceSkill": equipment.get("itemReinforceSkill") or [],
        "itemBuff": equipment.get("itemBuff") or {},
        "itemExplain": get_item_explain(equipment),
    }


def _build_material(key: str, amount: int, material_prices: dict) -> dict:
    config = get_upgrade_material_config(key)
    if not config or amount <= 0:
        return {}
    material = {**config, "key": key, "amount": amount}
    if clean_text(config.get("priceSource")) == "materialResolver":
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
    return material


def _build_tune_step(
    equipment: dict,
    current_body: dict,
    current_stage: int,
    target_stage: int,
    black_disease_item: dict,
    material_prices: dict,
) -> dict:
    normal_step_count = max(0, min(target_stage, 3) - current_stage)
    includes_final_upgrade = target_stage == 4
    black_calamity_count = (
        normal_step_count * WEAPON_TUNE_STEP_BLACK_CALAMITY
        + (WEAPON_TUNE_FINAL_BLACK_CALAMITY if includes_final_upgrade else 0)
    )
    fixed_gold = (normal_step_count + (1 if includes_final_upgrade else 0)) * WEAPON_TUNE_STEP_GOLD
    materials = [
        _build_material("blackCalamity", black_calamity_count, material_prices),
    ]
    if includes_final_upgrade:
        materials.append(_build_material(
            "primordialSoul",
            WEAPON_TUNE_FINAL_PRIMORDIAL_SOUL,
            material_prices,
        ))
    materials = build_upgrade_material_display_rows([row for row in materials if row])
    target_body = _normalize_weapon_body(
        equipment,
        target_stage,
        black_disease_item if includes_final_upgrade else None,
    )
    return {
        "index": target_stage - current_stage - 1,
        "currentWeaponTuneStage": current_stage,
        "targetWeaponTuneStage": target_stage,
        "tuneCount": target_stage - current_stage,
        "effects": subtract_effects(target_body["effects"], current_body["effects"]),
        "currentEffects": current_body["effects"],
        "targetEffects": target_body["effects"],
        "targetEquipmentBody": target_body,
        "itemExplain": f"{current_body['itemName']} {current_stage}/4 -> {target_body['itemName']} {target_stage}/4",
        "auction": {
            "listingCount": 0,
            "minUnitPrice": fixed_gold,
            "averagePrice": fixed_gold,
            "auctionNo": None,
            "priceSource": "fixedUpgradeGold",
            "isSynthetic": True,
        },
        "expectedGold": fixed_gold,
        "expectedMaterials": materials,
        "materialText": " / ".join(
            f"{material['label']} {material['amount']:,}개" for material in materials
        ),
    }


def _build_release_step(
    equipment: dict,
    current_body: dict,
    current_percent: float,
    target_percent: float,
    attempt_count: int,
    material_prices: dict,
) -> dict:
    fixed_gold = attempt_count * WEAPON_RELEASE_STEP_GOLD
    materials = build_upgrade_material_display_rows([
        _build_material(
            "blackCalamity",
            attempt_count * WEAPON_RELEASE_STEP_BLACK_CALAMITY,
            material_prices,
        ),
        _build_material(
            "epicSoul",
            attempt_count * WEAPON_RELEASE_STEP_EPIC_SOUL,
            material_prices,
        ),
    ])
    target_body = _normalize_weapon_body(
        equipment,
        0,
        final_damage=_get_weapon_release_final_damage(target_percent),
        buff_power=_get_weapon_release_buff_power(target_percent),
        release_percent=target_percent,
    )
    return {
        "index": 0,
        "weaponTuneMode": "release",
        "currentWeaponReleasePercent": current_percent,
        "targetWeaponReleasePercent": target_percent,
        "tuneCount": attempt_count,
        "effects": subtract_effects(target_body["effects"], current_body["effects"]),
        "currentEffects": current_body["effects"],
        "targetEffects": target_body["effects"],
        "targetEquipmentBody": target_body,
        "itemExplain": (
            f"{current_body['itemName']} 개방률 {current_percent:g}%"
            f" -> {target_percent:g}%"
        ),
        "auction": {
            "listingCount": 0,
            "minUnitPrice": fixed_gold,
            "averagePrice": fixed_gold,
            "auctionNo": None,
            "priceSource": "fixedUpgradeGold",
            "isSynthetic": True,
        },
        "expectedGold": fixed_gold,
        "expectedMaterials": materials,
        "materialText": " / ".join(
            f"{material['label']} {material['amount']:,}개" for material in materials
        ),
    }


def build_weapon_tune_recommendations_debug(
    equipment_rows: list,
    material_prices: dict | None = None,
) -> dict:
    started_at = time.perf_counter()
    weapon = next(
        (
            row for row in equipment_rows or []
            if clean_text(row.get("slotId")) == "WEAPON"
            or clean_text(row.get("slotName")) == "무기"
        ),
        {},
    )
    item_name = clean_text(weapon.get("itemName"))
    current_stage = _get_weapon_tune_stage(weapon)
    if not weapon:
        return {"recommendations": [], "steps": [{"reason": "missing_weapon"}]}
    if clean_text(weapon.get("itemRarity")) != "태초":
        return {"recommendations": [], "steps": [{"reason": "weapon_rarity_not_primeval"}]}
    if int(_number(weapon.get("itemAvailableLevel"))) != 115:
        return {"recommendations": [], "steps": [{"reason": "weapon_level_not_115"}]}
    if item_name.startswith("태초의 별") or item_name.startswith("검은 질병의 "):
        return {"recommendations": [], "steps": [{"reason": "weapon_tune_target_excluded"}]}
    if _has_weapon_release(weapon):
        current_percent = _get_weapon_release_percent(weapon)
        if current_percent is None:
            return {"recommendations": [], "steps": [{"reason": "invalid_weapon_release"}]}
        if current_percent >= 100:
            return {"recommendations": [], "steps": [{"reason": "weapon_release_complete"}]}
        attempt_count = math.ceil(
            (100 - current_percent) / WEAPON_RELEASE_GUARANTEED_PERCENT_PER_ATTEMPT
        )
        current_body = _normalize_weapon_body(
            weapon,
            0,
            final_damage=_get_weapon_release_final_damage(current_percent),
            buff_power=_get_weapon_release_buff_power(current_percent),
            release_percent=current_percent,
        )
        tune_steps = [_build_release_step(
            weapon,
            current_body,
            current_percent,
            100,
            attempt_count,
            material_prices or {},
        )]
        recommendation = build_weapon_tune_recommendation_row(
            current_equipment_body=current_body,
            current_weapon_tune_stage=0,
            tune_steps=tune_steps,
            weapon_tune_mode="release",
        )
        return {
            "recommendations": [recommendation],
            "steps": [{
                "name": "build_weapon_release_recommendations",
                "ms": round((time.perf_counter() - started_at) * 1000, 1),
                "count": 1,
            }],
        }
    if current_stage < 0 or current_stage >= 4:
        return {"recommendations": [], "steps": [{"reason": "weapon_tune_complete"}]}

    black_disease_name = f"검은 질병의 {item_name}"
    black_disease_item = resolve_exact_item_by_name(
        black_disease_name,
        clean_text(weapon.get("itemTypeDetail")),
    )
    maximum_target_stage = 4 if clean_text(black_disease_item.get("itemId")) else 3
    current_body = _normalize_weapon_body(weapon, current_stage)
    tune_steps = [
        _build_tune_step(
            weapon,
            current_body,
            current_stage,
            target_stage,
            black_disease_item,
            material_prices or {},
        )
        for target_stage in range(current_stage + 1, maximum_target_stage + 1)
    ]
    if not tune_steps:
        return {
            "recommendations": [],
            "steps": [{"reason": "missing_black_disease_weapon", "itemName": black_disease_name}],
        }
    recommendation = build_weapon_tune_recommendation_row(
        current_equipment_body=current_body,
        current_weapon_tune_stage=current_stage,
        tune_steps=tune_steps,
    )
    steps = [{
        "name": "build_weapon_tune_recommendations",
        "ms": round((time.perf_counter() - started_at) * 1000, 1),
        "count": 1,
    }]
    if maximum_target_stage < 4:
        steps.append({"reason": "missing_black_disease_weapon", "itemName": black_disease_name})
    return {"recommendations": [recommendation], "steps": steps}
