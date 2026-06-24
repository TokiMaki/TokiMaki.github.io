def build_character_preview_payload(
    equipment_payload: dict,
    adventure_name: str,
    enchants: list,
    equipment_upgrades: list,
    title: dict | None,
    creature: dict | None,
    aura: dict | None,
) -> dict:
    return {
        "serverId": equipment_payload.get("serverId"),
        "characterId": equipment_payload.get("characterId"),
        "characterName": equipment_payload.get("characterName"),
        "adventureName": adventure_name,
        "fame": equipment_payload.get("fame"),
        "enchants": enchants,
        "equipmentUpgrades": equipment_upgrades,
        "title": title,
        "creature": creature,
        "aura": aura,
    }
