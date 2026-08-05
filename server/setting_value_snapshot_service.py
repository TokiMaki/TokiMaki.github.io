import time

from .neople_client import clean_text
from .repositories.equipment_score_repository import get_cached_official_equipment_score
from .repositories.setting_value_repository import (
    load_setting_value_ranking,
    save_setting_value_snapshot,
)
from .setting_value_service import build_character_setting_value


class SettingValueFinalizeUnavailable(Exception):
    pass


def _int_value(value) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _build_equipment_snapshot(loadout: dict, enchant_detail_by_slot: dict | None = None) -> list[dict]:
    equipment_slots = {
        "무기", "상의", "하의", "머리어깨", "벨트", "신발",
        "팔찌", "목걸이", "반지", "보조장비", "마법석", "귀걸이",
    }
    enchant_by_slot = {
        clean_text(row.get("slot")): row
        for row in loadout.get("enchants") or []
        if clean_text(row.get("slot"))
    }
    unique_item_ids = {
        clean_text(row.get("itemId"))
        for row in ((loadout.get("settingValueInputs") or {}).get("uniqueEquipmentRows") or [])
        if clean_text(row.get("itemId"))
    }
    enchant_detail_by_slot = enchant_detail_by_slot or {}
    snapshots = []
    for row in loadout.get("equipmentUpgrades") or []:
        slot = clean_text(row.get("slot"))
        if slot not in equipment_slots:
            continue
        enchant = enchant_by_slot.get(slot) or {}
        enchant_detail = enchant_detail_by_slot.get(slot) or {}
        enchant_tier = clean_text(enchant_detail.get("tier"))
        snapshots.append({
            "slot": slot,
            "slotId": clean_text(row.get("slotId")),
            "itemId": clean_text(row.get("itemId")),
            "itemName": clean_text(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": clean_text(row.get("iconUrl")),
            "reinforce": _int_value(row.get("reinforce")),
            "isAmplified": bool(row.get("isAmplified")),
            "tuneLevel": _int_value(row.get("tuneLevel")),
            "hasEnchant": bool(enchant),
            "enchant": {
                "effects": enchant.get("effects") or {},
                "reinforceSkill": enchant.get("reinforceSkill") or [],
                "effectText": clean_text(enchant_detail.get("effectText")),
                "tier": enchant_tier,
                "isEnd": bool(enchant_detail.get("isEnd")) or enchant_tier == "종결",
            } if enchant else None,
            "isRelic": clean_text(row.get("itemId")) in unique_item_ids,
        })
    return snapshots


def _build_oath_snapshot(loadout: dict) -> list[dict]:
    oath = loadout.get("oathUpgrades") or {}
    rows = []
    if clean_text(oath.get("itemId")) or clean_text(oath.get("itemName")):
        rows.append({
            "kind": "oath",
            "itemId": clean_text(oath.get("itemId")),
            "itemName": clean_text(oath.get("itemName")),
            "itemRarity": clean_text(oath.get("itemRarity")),
            "iconUrl": clean_text(oath.get("iconUrl")),
            "setName": clean_text(oath.get("setName")),
            "setOptionName": clean_text(oath.get("setOptionName")),
            "setRarityName": clean_text(oath.get("setRarityName")),
            "setPoint": _int_value(oath.get("setPoint")),
            "tuneLevel": 0,
        })
    rows.extend(
        {
            "kind": "crystal",
            "itemId": clean_text(row.get("itemId")),
            "itemName": clean_text(row.get("itemName")),
            "itemRarity": clean_text(row.get("itemRarity")),
            "iconUrl": clean_text(row.get("iconUrl")),
            "tuneLevel": _int_value(row.get("tuneLevel")),
        }
        for row in oath.get("crystals") or []
        if clean_text(row.get("itemId"))
    )
    return rows


def finalize_character_setting_value(
    loadout: dict,
    enchant_catalog: dict,
    title_catalog: dict,
    aura_catalog: dict,
    creature_catalog: dict,
) -> dict:
    inputs = loadout.get("settingValueInputs") or {}
    if _int_value(inputs.get("schemaVersion")) != 1 or clean_text(inputs.get("status")) != "ready":
        raise SettingValueFinalizeUnavailable("세팅 추정 가치 계산 입력이 준비되지 않았습니다.")

    required_payloads = (loadout, enchant_catalog, title_catalog, aura_catalog, creature_catalog)
    if not all(isinstance(payload, dict) and payload for payload in required_payloads):
        raise SettingValueFinalizeUnavailable("스펙업 순서 가격 정보가 준비되지 않았습니다.")
    if not enchant_catalog.get("cards") or not title_catalog.get("groups") \
            or not aura_catalog.get("groups") or not creature_catalog.get("groups"):
        raise SettingValueFinalizeUnavailable("스펙업 순서 가격 정보가 비어 있습니다.")

    setting_value = build_character_setting_value(
        enchant_rows=loadout.get("enchants") or [],
        equipment_upgrades=loadout.get("equipmentUpgrades") or [],
        title=loadout.get("title") or {},
        aura=loadout.get("aura") or {},
        creature=loadout.get("creature") or {},
        avatar_slots=((loadout.get("avatar") or {}).get("avatar") or {}).get("slots") or [],
        buff_loadout=loadout.get("buffLoadout") or {},
        upgrade_expected_db=loadout.get("upgradeExpectedDb") or {},
        material_prices=loadout.get("upgradeMaterialPrices") or {},
        black_fang_rows=inputs.get("blackFangRows") or [],
        unique_equipment_rows=inputs.get("uniqueEquipmentRows") or [],
        direct_prices=inputs.get("directPrices") or {},
        enchant_catalog=enchant_catalog,
        title_catalog=title_catalog,
        aura_catalog=aura_catalog,
        creature_catalog=creature_catalog,
        platinum_price_by_name=inputs.get("platinumPriceByName") or {},
        buff_title_price_candidate=inputs.get("buffTitlePriceCandidate") or {},
        buff_creature_price_candidate=inputs.get("buffCreaturePriceCandidate") or {},
    )
    if _int_value(setting_value.get("totalGold")) <= 0:
        raise SettingValueFinalizeUnavailable("세팅 추정 가치를 계산하지 못했습니다.")

    buffer_baseline = loadout.get("bufferBaseline") or {}
    damage_baseline = loadout.get("damageBaseline") or {}
    role = "buffer" if buffer_baseline.get("isBuffer") else "dealer"
    baseline = buffer_baseline if role == "buffer" else damage_baseline
    server_id = clean_text(loadout.get("serverId")).lower()
    character_id = clean_text(loadout.get("characterId"))
    character_name = clean_text(loadout.get("characterName"))
    if not server_id or not character_id or not character_name:
        raise SettingValueFinalizeUnavailable("캐릭터 정보가 올바르지 않습니다.")

    score = get_cached_official_equipment_score(server_id, character_name)
    updated_at_ms = int(time.time() * 1000)
    stored_setting_value = {
        key: value
        for key, value in setting_value.items()
        if key != "details"
    }
    enchant_detail_by_slot = {
        clean_text(item.get("slot")): item
        for group in setting_value.get("details") or []
        if clean_text(group.get("key")) == "enchant"
        for item in group.get("items") or []
        if clean_text(item.get("slot"))
    }
    stored_snapshot = {
        "serverId": server_id,
        "characterId": character_id,
        "characterName": character_name,
        "jobName": clean_text(baseline.get("jobName")),
        "jobGrowName": clean_text(baseline.get("jobGrowName")),
        "statName": clean_text(baseline.get("statName")),
        "role": role,
        "fame": _int_value(loadout.get("fame")),
        "equipmentScore": _int_value(score.get("equipmentScore")) or None,
        "buffScore": _int_value(score.get("buffScore")) or None,
        "settingValue": stored_setting_value,
        "equipment": _build_equipment_snapshot(loadout, enchant_detail_by_slot),
        "oath": _build_oath_snapshot(loadout),
        "updatedAtMs": updated_at_ms,
    }
    if not save_setting_value_snapshot(stored_snapshot):
        raise SettingValueFinalizeUnavailable("세팅 추정 가치 저장에 실패했습니다.")
    return {
        **stored_snapshot,
        "settingValue": setting_value,
    }


def get_setting_value_ranking(role: str = "dealer", sort: str = "value", limit: int = 100) -> dict:
    normalized_role = clean_text(role).lower()
    if normalized_role not in {"dealer", "buffer"}:
        normalized_role = "dealer"
    normalized_sort = clean_text(sort).lower()
    if normalized_sort not in {"value", "score", "fame"}:
        normalized_sort = "value"
    return {
        "role": normalized_role,
        "sort": normalized_sort,
        "rows": load_setting_value_ranking(normalized_role, normalized_sort, limit),
    }
