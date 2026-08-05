import math


SETTING_VALUE_CATEGORY_ORDER = (
    ("amplification", "증폭 기대값"),
    ("weaponReinforcement", "무기 강화 기대값"),
    ("equipmentTune", "장비 조율"),
    ("oathTune", "서약 결정 조율"),
    ("blackFang", "흑아 변환"),
    ("enchant", "마법부여"),
    ("title", "칭호·칭호 보주"),
    ("aura", "오라"),
    ("creature", "크리쳐·아티팩트"),
    ("emblem", "엠블렘"),
    ("platinumEmblem", "플래티넘 엠블렘"),
    ("buffEnhancement", "버프강화"),
    ("uniqueEquipment", "유일 장비"),
)

EQUIPMENT_TUNE_COST_BY_RARITY = {
    "레전더리": {"gold": 600000, "materialKey": "legendarySoul", "materialAmount": 20},
    "에픽": {"gold": 1000000, "materialKey": "epicSoul", "materialAmount": 10},
}


def _number(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


def add_costs(*costs: dict) -> dict:
    result = {}
    for cost in costs:
        for key, value in (cost or {}).items():
            amount = _number(value)
            if abs(amount) > 0.000001:
                result[key] = _number(result.get(key)) + amount
    return result


def multiply_cost(cost: dict, multiplier) -> dict:
    multiplier = _number(multiplier)
    return {
        key: _number(value) * multiplier
        for key, value in (cost or {}).items()
        if abs(_number(value) * multiplier) > 0.000001
    }


def get_safe_amplification_expected_from_zero(level, cost_key: str, rows: list) -> dict | None:
    target_level = int(_number(level))
    if target_level <= 0:
        return {}
    row = next((item for item in rows or [] if int(_number(item.get("level"))) == target_level), None)
    if not row:
        return None
    cost = (row.get("expectedFromZero") or {}).get(cost_key)
    return dict(cost) if isinstance(cost, dict) else None


def get_amplification_attempt_cost(row: dict, cost_key: str, upgrade_db: dict) -> dict:
    target_level = int(_number((row or {}).get("level")))
    gold_per_attempt = _number(
        (((upgrade_db.get("amplification") or {}).get("rules") or {}).get("normal") or {})
        .get("goldPerAttempt", {})
        .get(cost_key)
    )
    return {
        "gold": gold_per_attempt,
        "contradictionCrystal": target_level + 10,
    }


def get_hybrid_amplification_expected_from_zero(level, cost_key: str, upgrade_db: dict) -> dict | None:
    target_level = int(_number(level))
    if target_level <= 0:
        return {}
    amplification_db = upgrade_db.get("amplification") or {}
    safe_rows = amplification_db.get("safeAmplification") or []
    if target_level <= 10:
        return get_safe_amplification_expected_from_zero(target_level, cost_key, safe_rows)

    total = get_safe_amplification_expected_from_zero(10, cost_key, safe_rows)
    if total is None:
        return None
    normal_rows = amplification_db.get("normalAmplification") or []
    for next_level in range(11, target_level + 1):
        row = next((
            item for item in normal_rows
            if int(_number(item.get("level"))) == next_level
        ), None)
        step_cost = get_hybrid_amplification_step_cost(
            row,
            next_level - 1,
            cost_key,
            upgrade_db,
        )
        if step_cost is None:
            return None
        total = add_costs(total, step_cost)
    return total


def get_hybrid_amplification_step_cost(
    row: dict | None,
    current_level,
    cost_key: str,
    upgrade_db: dict,
) -> dict | None:
    if not row:
        return None
    success_rate = _number(row.get("successRatePercent")) / 100
    if success_rate <= 0:
        fallback = (row.get("stepExpected") or {}).get(cost_key)
        return dict(fallback) if isinstance(fallback, dict) else None

    failure_rate = max(0.0, 1 - success_rate)
    direct_expected = multiply_cost(
        get_amplification_attempt_cost(row, cost_key, upgrade_db),
        1 / success_rate,
    )
    current_expected = get_hybrid_amplification_expected_from_zero(
        current_level,
        cost_key,
        upgrade_db,
    )
    if current_expected is None:
        return None
    rebuild_expected = multiply_cost(current_expected, failure_rate / success_rate)
    return add_costs(
        direct_expected,
        rebuild_expected,
        {"protectionTicket": failure_rate / success_rate},
    )


def get_weapon_reinforcement_expected_from_zero(level, upgrade_db: dict) -> dict | None:
    target_level = int(_number(level))
    if target_level <= 0:
        return {}
    reinforcement_db = upgrade_db.get("reinforcement") or {}
    safe_rows = reinforcement_db.get("safeWeaponReinforcement") or []
    if target_level <= 12:
        row = next((
            item for item in safe_rows
            if int(_number(item.get("level"))) == target_level
        ), None)
        cost = ((row or {}).get("expectedFromZero") or {}).get("weapon")
        return dict(cost) if isinstance(cost, dict) else None

    level_twelve = next((
        item for item in safe_rows
        if int(_number(item.get("level"))) == 12
    ), None)
    total = (((level_twelve or {}).get("expectedFromZero") or {}).get("weapon"))
    if not isinstance(total, dict):
        return None
    total = dict(total)
    normal_rows = reinforcement_db.get("reinforcement") or []
    for next_level in range(13, target_level + 1):
        row = next((
            item for item in normal_rows
            if int(_number(item.get("level"))) == next_level
        ), None)
        step_cost = ((row or {}).get("stepExpected") or {}).get("weapon")
        if not isinstance(step_cost, dict):
            return None
        total = add_costs(total, step_cost)
    return total


def get_priced_auction_gold(auction: dict | None, *, allow_synthetic: bool = True) -> float | None:
    if not isinstance(auction, dict):
        return None
    unit_price = _number(auction.get("minUnitPrice"))
    if unit_price <= 0:
        return None
    status = str(auction.get("priceStatus") or "").strip()
    if status == "priced":
        return unit_price
    if allow_synthetic and auction.get("isSynthetic"):
        return unit_price
    return None


def get_priced_row_gold(row: dict | None, *, allow_synthetic: bool = True) -> float | None:
    if not isinstance(row, dict):
        return None
    return get_priced_auction_gold(row.get("auction") or {}, allow_synthetic=allow_synthetic)


def price_expected_cost(cost: dict | None, material_prices: dict, mode: str) -> float | None:
    if not isinstance(cost, dict):
        return None
    total = _number(cost.get("gold"))
    for key, value in cost.items():
        if key == "gold":
            continue
        amount = _number(value)
        if amount <= 0:
            continue
        price_key = key
        if key == "protectionTicket":
            price_key = (
                "reinforcementProtectionTicket"
                if mode == "reinforcement"
                else "amplificationProtectionTicket"
            )
        unit_price = get_priced_row_gold(material_prices.get(price_key) or {})
        if unit_price is None:
            return None
        total += amount * unit_price
    return total


def _build_tune_detail(
    *,
    label: str,
    slot: str,
    item_name: str,
    item_rarity: str,
    level: int,
    mode: str,
    cost_rule: dict | None,
    material_prices: dict,
) -> dict:
    gold = None
    if isinstance(cost_rule, dict):
        material_key = str(cost_rule.get("materialKey") or "").strip()
        per_level_cost = {"gold": _number(cost_rule.get("gold"))}
        material_amount = _number(cost_rule.get("materialAmount"))
        if material_key and material_amount > 0:
            per_level_cost[material_key] = material_amount
        gold = price_expected_cost(
            multiply_cost(per_level_cost, level),
            material_prices,
            mode,
        )
    return {
        "label": label,
        "slot": slot,
        "itemName": item_name,
        "itemRarity": item_rarity,
        "level": level,
        "mode": mode,
        "gold": int(round(gold)) if gold is not None else None,
        "priceStatus": "priced" if gold is not None else "unpriced",
        "note": "조율 재료 가격이 준비되지 않음" if gold is None else "",
    }


def calculate_current_tune_details(
    equipment_upgrades: list,
    oath_upgrades: dict,
    oath_tune_db: dict,
    material_prices: dict,
) -> dict:
    details = {
        "equipmentTune": [],
        "oathTune": [],
    }
    for equipment in equipment_upgrades or []:
        level = max(0, min(3, int(_number(equipment.get("tuneLevel")))))
        if level <= 0:
            continue
        slot = str(equipment.get("slot") or "").strip()
        item_name = str(equipment.get("itemName") or "").strip()
        item_rarity = str(equipment.get("itemRarity") or "").strip()
        details["equipmentTune"].append(_build_tune_detail(
            label=f"{slot or '장비'} {level}조율",
            slot=slot,
            item_name=item_name,
            item_rarity=item_rarity,
            level=level,
            mode="equipmentTune",
            cost_rule=EQUIPMENT_TUNE_COST_BY_RARITY.get(item_rarity),
            material_prices=material_prices,
        ))

    oath_tune_db = oath_tune_db or {}
    cost_by_rarity = oath_tune_db.get("costByRarity") or {}
    unique_keyword = str(oath_tune_db.get("uniqueCrystalNameKeyword") or "안개 결정").strip()
    max_level = max(0, int(_number(oath_tune_db.get("maxTuneLevel"))) or 3)
    for crystal in (oath_upgrades or {}).get("crystals") or []:
        level = max(0, min(max_level, int(_number(crystal.get("tuneLevel")))))
        if level <= 0:
            continue
        item_name = str(crystal.get("itemName") or "").strip()
        if unique_keyword and unique_keyword in item_name:
            continue
        item_rarity = str(crystal.get("itemRarity") or "").strip()
        details["oathTune"].append(_build_tune_detail(
            label=f"{item_name or '서약 결정'} {level}조율",
            slot="서약 결정",
            item_name=item_name,
            item_rarity=item_rarity,
            level=level,
            mode="oathTune",
            cost_rule=cost_by_rarity.get(item_rarity),
            material_prices=material_prices,
        ))
    return details


def calculate_equipment_upgrade_values(
    equipment_upgrades: list,
    upgrade_db: dict,
    material_prices: dict,
) -> dict:
    details = calculate_equipment_upgrade_details(
        equipment_upgrades,
        upgrade_db,
        material_prices,
    )
    return {
        "amplification": sum(
            _number(row.get("gold"))
            for row in details.get("amplification") or []
            if row.get("gold") is not None
        ),
        "weaponReinforcement": sum(
            _number(row.get("gold"))
            for row in details.get("weaponReinforcement") or []
            if row.get("gold") is not None
        ),
    }


def calculate_equipment_upgrade_details(
    equipment_upgrades: list,
    upgrade_db: dict,
    material_prices: dict,
) -> dict:
    details = {
        "amplification": [],
        "weaponReinforcement": [],
    }
    for equipment in equipment_upgrades or []:
        level = int(_number(equipment.get("reinforce")))
        if level <= 0:
            continue
        slot = str(equipment.get("slot") or "").strip()
        item_name = str(equipment.get("itemName") or "").strip()
        if equipment.get("isAmplified"):
            cost_key = "weapon" if slot == "무기" else "nonWeapon"
            cost = get_hybrid_amplification_expected_from_zero(level, cost_key, upgrade_db)
            gold = price_expected_cost(cost, material_prices, "amplification")
            details["amplification"].append({
                "label": f"{slot or '장비'} +{level} 증폭",
                "slot": slot,
                "itemName": item_name,
                "level": level,
                "mode": "amplification",
                "gold": int(round(gold)) if gold is not None else None,
                "priceStatus": "priced" if gold is not None else "unpriced",
            })
            continue
        if slot != "무기":
            continue
        cost = get_weapon_reinforcement_expected_from_zero(level, upgrade_db)
        gold = price_expected_cost(cost, material_prices, "reinforcement")
        details["weaponReinforcement"].append({
            "label": f"{slot} +{level} 강화",
            "slot": slot,
            "itemName": item_name,
            "level": level,
            "mode": "reinforcement",
            "gold": int(round(gold)) if gold is not None else None,
            "priceStatus": "priced" if gold is not None else "unpriced",
        })
    return details


def price_cost_row(row: dict) -> float | None:
    fixed_gold = _number(row.get("fixedGold"))
    base_price = 0.0
    if row.get("auction"):
        resolved = get_priced_auction_gold(row.get("auction") or {})
        if resolved is None:
            return None
        base_price = resolved
    total = fixed_gold + base_price
    for material in row.get("materials") or []:
        amount = _number(material.get("amount"))
        if amount <= 0:
            continue
        auction = material.get("auction") or {}
        if auction.get("priceSource") == "displayOnly":
            continue
        unit_price = get_priced_auction_gold(auction)
        if unit_price is None:
            return None
        total += amount * unit_price
    return total


def sum_priced_rows(rows: list) -> float:
    total = 0.0
    for row in rows or []:
        price = price_cost_row(row)
        if price is not None:
            total += price
    return total


def build_setting_value_payload(category_values: dict, category_details: dict | None = None) -> dict:
    category_details = category_details or {}
    breakdown = [
        {
            "key": key,
            "label": label,
            "gold": int(round(max(0.0, _number(category_values.get(key))))),
        }
        for key, label in SETTING_VALUE_CATEGORY_ORDER
    ]
    return {
        "label": "세팅 추정 가치",
        "totalGold": sum(row["gold"] for row in breakdown),
        "breakdown": breakdown,
        "details": [
            {
                "key": row["key"],
                "label": row["label"],
                "gold": row["gold"],
                "items": category_details.get(row["key"]) or [],
            }
            for row in breakdown
        ],
    }
