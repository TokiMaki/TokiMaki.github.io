def build_weapon_tune_recommendation_row(**values) -> dict:
    first_step = values["tune_steps"][0]
    current_body = values["current_equipment_body"]
    target_body = first_step["targetEquipmentBody"]
    mode = values.get("weapon_tune_mode") or "tune"
    is_release = mode == "release"
    return {
        "sourceType": "weaponTune",
        "weaponTuneMode": mode,
        "slot": "무기",
        "targetSlotId": "WEAPON",
        "tier": (
            f"{first_step['targetWeaponReleasePercent']:g}%"
            if is_release
            else f"{first_step['targetWeaponTuneStage']}/4"
        ),
        "cardTitle": "무기",
        "cardSubtitle": "개방" if is_release else "조율",
        "itemId": target_body["itemId"],
        "itemName": target_body["itemName"],
        "itemRarity": target_body["itemRarity"],
        "iconUrl": target_body["iconUrl"],
        "itemExplain": first_step["itemExplain"],
        "effects": first_step["effects"],
        "currentEffects": current_body["effects"],
        "targetEffects": target_body["effects"],
        "baseEquipmentBody": current_body,
        "currentEquipmentBody": current_body,
        "targetEquipmentBody": target_body,
        "currentWeaponTuneStage": values["current_weapon_tune_stage"],
        "targetWeaponTuneStage": first_step.get("targetWeaponTuneStage"),
        "currentWeaponReleasePercent": first_step.get("currentWeaponReleasePercent"),
        "targetWeaponReleasePercent": first_step.get("targetWeaponReleasePercent"),
        "tuneSteps": values["tune_steps"],
        "selectedTuneStepIndex": 0,
        "auction": first_step["auction"],
        "expectedGold": first_step["expectedGold"],
        "expectedMaterials": first_step["expectedMaterials"],
        "materials": first_step["expectedMaterials"],
        "materialText": first_step["materialText"],
        "targetItemId": target_body["itemId"],
        "targetItemName": target_body["itemName"],
        "targetItemRarity": target_body["itemRarity"],
        "targetIconUrl": target_body["iconUrl"],
        "targetItemExplain": target_body.get("itemExplain") or "",
        "simulatorSupported": True,
    }
