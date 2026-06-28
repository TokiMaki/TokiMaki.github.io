def build_oath_transcend_recommendation_row(
    slot: str,
    item_id: str,
    item_name: str,
    item_rarity: str,
    icon_url: str,
    current_item_name: str,
    current_rarity: str,
    current_effects: dict,
    target_effects: dict,
    effects: dict,
    expected_gold: int,
    materials: list,
    material_text: str,
    target_rarity: str,
    skill_damage_multiplier: float = 1,
    oath_set_buff_power_delta: float = 0,
    set_point_context: dict | None = None,
) -> dict:
    row = {
        "sourceType": "oathTranscend",
        "kind": "oath_transcend",
        "slot": slot,
        "tier": "초월",
        "itemId": item_id,
        "itemName": item_name,
        "itemRarity": item_rarity,
        "iconUrl": icon_url,
        "currentItemName": current_item_name,
        "currentRarity": current_rarity,
        "targetItemName": item_name,
        "targetRarity": target_rarity,
        "itemExplain": f"{current_item_name} -> {item_name}",
        "effects": effects,
        "currentEffects": current_effects,
        "targetEffects": target_effects,
        "auction": {"minUnitPrice": expected_gold},
        "expectedGold": expected_gold,
        "materials": materials,
        "materialText": material_text,
    }
    if skill_damage_multiplier and skill_damage_multiplier > 1:
        row["skillDamageMultiplier"] = skill_damage_multiplier
    if oath_set_buff_power_delta and oath_set_buff_power_delta > 0:
        row["oathSetBuffPowerDelta"] = oath_set_buff_power_delta
    for key, value in (set_point_context or {}).items():
        if key in {"skillDamageMultiplier", "oathSetBuffPowerDelta"}:
            continue
        row[key] = value
    return row
