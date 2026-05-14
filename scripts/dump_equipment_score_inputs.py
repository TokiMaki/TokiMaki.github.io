#!/usr/bin/env python3

import csv
import json
import os
import re
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

API_KEY = os.environ.get("NEOPLE_API_KEY", "1Ayz6a2QI20mISxbzHV2Ak2xLDYIvMgA")
REQUEST_TIMEOUT = 30
REQUEST_DELAY = 0.08
OUT_JSON = Path("Docs/equipment_score_api_dump.json")
OUT_TSV = Path("Docs/equipment_score_api_dump.tsv")

ROSTER = [
    {"serverId": "cain", "name": "마키로그", "role": "hell"},
    {"serverId": "cain", "name": "마키남멬", "role": "hell"},
    {"serverId": "cain", "name": "마키남슾", "role": "hell"},
    {"serverId": "cain", "name": "마키듀얼", "role": "hell"},
    {"serverId": "cain", "name": "마키헌터", "role": "hell"},
    {"serverId": "cain", "name": "마키비질", "role": "hell"},
    {"serverId": "cain", "name": "마키엘븐", "role": "hell"},
    {"serverId": "cain", "name": "마키여슼", "role": "hell"},
    {"serverId": "cain", "name": "마키트븜", "role": "hell"},
    {"serverId": "cain", "name": "마키키멜", "role": "hell"},
    {"serverId": "cain", "name": "마키트슈", "role": "hell"},
    {"serverId": "cain", "name": "마키여긒", "role": "hell"},
    {"serverId": "cain", "name": "마키메딕", "role": "alt"},
    {"serverId": "cain", "name": "마키뮤즈", "role": "alt"},
    {"serverId": "cain", "name": "마키남크", "role": "alt"},
    {"serverId": "cain", "name": "마키여렌", "role": "alt"},
    {"serverId": "cain", "name": "마키여크", "role": "alt"},
    {"serverId": "cain", "name": "마키븝퍼", "role": "alt"},
    {"serverId": "cain", "name": "마키인챈", "role": "alt"},
    {"serverId": "cain", "name": "마키븜퍼", "role": "alt"},
    {"serverId": "cain", "name": "마키마신", "role": "alt"},
    {"serverId": "cain", "name": "마키수라", "role": "alt"},
    {"serverId": "cain", "name": "마키븜즈", "role": "alt"},
    {"serverId": "cain", "name": "마키닼템", "role": "alt"},
    {"serverId": "cain", "name": "마키뱅가", "role": "alt"},
    {"serverId": "cain", "name": "마키버섴", "role": "alt"},
    {"serverId": "cain", "name": "마키여넨", "role": "alt"},
    {"serverId": "cain", "name": "마키블레", "role": "alt"},
    {"serverId": "cain", "name": "마키스마", "role": "alt"},
    {"serverId": "cain", "name": "마키블메", "role": "alt"},
    {"serverId": "cain", "name": "마키배메", "role": "alt"},
    {"serverId": "cain", "name": "마키마도", "role": "alt"},
    {"serverId": "cain", "name": "마키뮤지", "role": "alt"},
    {"serverId": "cain", "name": "마키팔라", "role": "alt"},
    {"serverId": "cain", "name": "마키남렌", "role": "alt"},
    {"serverId": "cain", "name": "마키힛맨", "role": "alt"},
]


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").replace("\u00a0", " ").split()).strip()


def parse_number(value: Any) -> float:
    text = clean_text(value).replace(",", "").replace("%", "")
    if not text or text == "-":
        return 0
    try:
        return float(text)
    except ValueError:
        return 0


def request_json(url: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "apikey": API_KEY,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("응답 형식이 올바르지 않습니다.")
    time.sleep(REQUEST_DELAY)
    return payload


def api_url(server_id: str, character_id: str, path: str) -> str:
    return f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/{path}?apikey={API_KEY}"


def search_character(server_id: str, character_name: str) -> dict[str, Any]:
    url = (
        f"https://api.neople.co.kr/df/servers/{server_id}/characters"
        f"?characterName={quote(character_name)}&limit=20&wordType=match&apikey={API_KEY}"
    )
    payload = request_json(url)
    rows = payload.get("rows") or []
    target = clean_text(character_name)
    match = next((row for row in rows if clean_text(row.get("characterName")) == target), rows[0] if rows else None)
    if not match:
        raise RuntimeError(f"캐릭터를 찾지 못했습니다: {server_id}/{character_name}")
    return match


def get_nested(source: dict[str, Any], *keys: str, fallback: Any = None) -> Any:
    current: Any = source
    for key in keys:
        if not isinstance(current, dict):
            return fallback
        current = current.get(key)
    return current if current is not None else fallback


def list_from(source: Any) -> list[dict[str, Any]]:
    return [item for item in source if isinstance(item, dict)] if isinstance(source, list) else []


def status_map(rows: list[dict[str, Any]]) -> dict[str, float]:
    return {clean_text(row.get("name")): parse_number(row.get("value")) for row in rows}


def get_slot(rows: list[dict[str, Any]], slot_id: str) -> dict[str, Any] | None:
    return next((row for row in rows if clean_text(row.get("slotId")) == slot_id), None)


def count_platinum_emblems(avatar_rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    count = 0
    slots: list[str] = []
    for row in avatar_rows:
        emblems = list_from(row.get("emblems") or [])
        row_count = sum(1 for emblem in emblems if "플래티넘" in clean_text(emblem.get("slotColor")) or "플래티넘" in clean_text(emblem.get("itemName")))
        if row_count:
            count += row_count
            slots.append(clean_text(row.get("slotName")))
    return count, slots


def title_level(name: str) -> int:
    match = re.search(r"\[(\d+)Lv\]", clean_text(name))
    return int(match.group(1)) if match else 0


def summarize_equipment(payload: dict[str, Any]) -> dict[str, Any]:
    equipment = list_from(payload.get("equipment") or [])
    title = get_slot(equipment, "TITLE") or {}
    weapon = get_slot(equipment, "WEAPON") or {}
    amp_levels = [int(parse_number(row.get("reinforce"))) for row in equipment if clean_text(row.get("amplificationName"))]
    reinforce_levels = [int(parse_number(row.get("reinforce"))) for row in equipment if parse_number(row.get("reinforce")) > 0]
    tune_levels = [
        int(parse_number(tune.get("level")))
        for row in equipment
        for tune in list_from(row.get("tune") or [])
    ]
    tune_set_points = [
        parse_number(tune.get("setPoint"))
        for row in equipment
        for tune in list_from(row.get("tune") or [])
    ]
    enchant_status = [
        status
        for row in equipment
        for status in list_from(get_nested(row, "enchant", "status", fallback=[]))
    ]
    enchant = status_map(enchant_status)
    set_infos = list_from(payload.get("setItemInfo") or [])
    set_info = set_infos[0] if set_infos else payload.get("setItemInfo") or {}
    if not isinstance(set_info, dict):
        set_info = {}
    set_active = set_info.get("active") if isinstance(set_info.get("active"), dict) else {}
    set_active_status = status_map(list_from(set_active.get("status") or []))
    set_point_info = set_active.get("setPoint") if isinstance(set_active.get("setPoint"), dict) else {}
    slot_info = list_from(set_info.get("slotInfo") or [])
    return {
        "equipmentCount": len(equipment),
        "titleName": clean_text(title.get("itemName")),
        "titleLevelTag": title_level(clean_text(title.get("itemName"))),
        "weaponName": clean_text(weapon.get("itemName")),
        "weaponRarity": clean_text(weapon.get("itemRarity")),
        "weaponReinforce": int(parse_number(weapon.get("reinforce"))),
        "weaponRefine": int(parse_number(weapon.get("refine"))),
        "amplificationSum": sum(amp_levels),
        "amplificationCount": len(amp_levels),
        "reinforceSum": sum(reinforce_levels),
        "tuneSum": sum(tune_levels),
        "tune3Count": sum(1 for level in tune_levels if level >= 3),
        "tuneSetPointSum": sum(tune_set_points),
        "setName": clean_text(set_info.get("setItemName") or set_info.get("name")),
        "setRarity": clean_text(set_info.get("setItemRarityName")),
        "setPoint": parse_number(set_point_info.get("current") or set_info.get("setPoint") or set_info.get("point")),
        "setPointMin": parse_number(set_point_info.get("min")),
        "setPointAdjusted": parse_number(set_point_info.get("adjustedPoint")),
        "setFinalDamage": set_active_status.get("최종 데미지 증가", 0),
        "setBuffPower": set_active_status.get("버프력", 0),
        "setFame": set_active_status.get("모험가 명성", 0),
        "setEpicCount": sum(1 for row in slot_info if clean_text(row.get("itemRarity")) == "에픽"),
        "setPrimevalCount": sum(1 for row in slot_info if clean_text(row.get("itemRarity")) == "태초"),
        "enchantElement": max([value for key, value in enchant.items() if "속성 강화" in key] or [0]),
        "enchantAttack": max([value for key, value in enchant.items() if "공격력" in key or "공격" in key] or [0]),
        "enchantStat": max([value for key, value in enchant.items() if key in {"힘", "지능", "체력", "정신력"}] or [0]),
        "enchantFinalDamage": sum(value for key, value in enchant.items() if "최종" in key),
    }


def summarize_avatar(payload: dict[str, Any]) -> dict[str, Any]:
    avatar = list_from(payload.get("avatar") or [])
    platinum_count, platinum_slots = count_platinum_emblems(avatar)
    return {
        "avatarCount": len(avatar),
        "rareAvatarCount": sum(1 for row in avatar if clean_text(row.get("itemRarity")) == "레어"),
        "activePlatinumCount": platinum_count,
        "activePlatinumSlots": platinum_slots,
        "activeJacketOption": clean_text((get_slot(avatar, "JACKET") or {}).get("optionAbility")),
        "activePantsOption": clean_text((get_slot(avatar, "PANTS") or {}).get("optionAbility")),
    }


def summarize_creature(payload: dict[str, Any]) -> dict[str, Any]:
    creature = payload.get("creature") if isinstance(payload.get("creature"), dict) else {}
    artifacts = list_from(creature.get("artifact") or [])
    return {
        "creatureName": clean_text(creature.get("itemName")),
        "creatureRarity": clean_text(creature.get("itemRarity")),
        "artifactCount": len(artifacts),
        "artifactUniqueCount": sum(1 for row in artifacts if clean_text(row.get("itemRarity")) == "유니크"),
    }


def buff_source(payload: dict[str, Any], key: str) -> list[dict[str, Any]]:
    return list_from(get_nested(payload, "skill", "buff", key, fallback=[]))


def summarize_buff(equipment_payload: dict[str, Any], avatar_payload: dict[str, Any], creature_payload: dict[str, Any]) -> dict[str, Any]:
    skill_info = get_nested(equipment_payload, "skill", "buff", "skillInfo", fallback={}) or {}
    skill_option = skill_info.get("option") if isinstance(skill_info.get("option"), dict) else {}
    buff_equipment = buff_source(equipment_payload, "equipment")
    buff_avatar = buff_source(avatar_payload, "avatar")
    buff_creature = buff_source(creature_payload, "creature")
    buff_title = get_slot(buff_equipment, "TITLE") or {}
    buff_top = get_slot(buff_avatar, "JACKET") or {}
    buff_pants = get_slot(buff_avatar, "PANTS") or {}
    buff_platinum_count, buff_platinum_slots = count_platinum_emblems(buff_avatar)
    dense_count = sum(1 for row in buff_equipment if "짙은 심연의 편린" in clean_text(row.get("itemName")))
    fragment_count = sum(1 for row in buff_equipment if "심연의 편린" in clean_text(row.get("itemName")))
    return {
        "buffSkillName": clean_text(skill_info.get("name")),
        "buffSkillLevel": parse_number(skill_option.get("level")),
        "buffEquipmentCount": len(buff_equipment),
        "buffFragmentCount": fragment_count,
        "buffDenseFragmentCount": dense_count,
        "buffTitleName": clean_text(buff_title.get("itemName")),
        "buffTitleLevelTag": title_level(clean_text(buff_title.get("itemName"))),
        "buffAvatarCount": len(buff_avatar),
        "buffTopAvatar": bool(buff_top),
        "buffPantsAvatar": bool(buff_pants),
        "buffTopOption": clean_text(buff_top.get("optionAbility")),
        "buffPantsOption": clean_text(buff_pants.get("optionAbility")),
        "buffPlatinumCount": buff_platinum_count,
        "buffPlatinumSlots": buff_platinum_slots,
        "buffCreatureCount": len(buff_creature),
        "buffCreatureName": clean_text(buff_creature[0].get("itemName")) if buff_creature else "",
    }


def summarize_status(payload: dict[str, Any]) -> dict[str, Any]:
    stats = status_map(list_from(payload.get("status") or []))
    return {
        "str": stats.get("힘", 0),
        "int": stats.get("지능", 0),
        "vit": stats.get("체력", 0),
        "spr": stats.get("정신력", 0),
        "physicalAttack": stats.get("물리 공격", 0),
        "magicalAttack": stats.get("마법 공격", 0),
        "independentAttack": stats.get("독립 공격", 0),
        "element": max([value for key, value in stats.items() if "속성 강화" in key] or [0]),
        "elementDamage": max([value for key, value in stats.items() if "속성 피해" in key] or [0]),
        "attackIncrease": stats.get("공격력 증가", 0),
        "attackAmplification": stats.get("공격력 증폭", 0),
        "finalDamageIncrease": stats.get("최종 데미지 증가", 0),
        "cooldownReduction": stats.get("최종 쿨타임 감소율", 0),
        "buffPower": stats.get("버프력", 0),
        "buffAmplification": stats.get("버프력 증폭", 0),
    }


def fetch_character_summary(roster_row: dict[str, str]) -> dict[str, Any]:
    server_id = roster_row["serverId"]
    search = search_character(server_id, roster_row["name"])
    character_id = clean_text(search.get("characterId"))
    base = {
        "serverId": server_id,
        "characterId": character_id,
        "name": clean_text(search.get("characterName")) or roster_row["name"],
        "role": roster_row["role"],
        "jobName": clean_text(search.get("jobName")),
        "jobGrowName": clean_text(search.get("jobGrowName")),
        "fame": parse_number(search.get("fame")),
    }
    endpoints = {
        "equipment": request_json(api_url(server_id, character_id, "equip/equipment")),
        "avatar": request_json(api_url(server_id, character_id, "equip/avatar")),
        "creature": request_json(api_url(server_id, character_id, "equip/creature")),
        "buffEquipment": request_json(api_url(server_id, character_id, "skill/buff/equip/equipment")),
        "buffAvatar": request_json(api_url(server_id, character_id, "skill/buff/equip/avatar")),
        "buffCreature": request_json(api_url(server_id, character_id, "skill/buff/equip/creature")),
        "status": request_json(api_url(server_id, character_id, "status")),
    }
    return {
        **base,
        **summarize_equipment(endpoints["equipment"]),
        **summarize_avatar(endpoints["avatar"]),
        **summarize_creature(endpoints["creature"]),
        **summarize_buff(endpoints["buffEquipment"], endpoints["buffAvatar"], endpoints["buffCreature"]),
        **summarize_status(endpoints["status"]),
    }


def main() -> None:
    rows: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for index, roster_row in enumerate(ROSTER, start=1):
        label = f"{index:02d}/{len(ROSTER)} {roster_row['name']}"
        try:
            row = fetch_character_summary(roster_row)
            rows.append(row)
            print(f"{label}: ok")
        except (HTTPError, URLError, TimeoutError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
            errors.append({**roster_row, "error": str(exc)})
            print(f"{label}: error {exc}")

    OUT_JSON.write_text(json.dumps({"rows": rows, "errors": errors}, ensure_ascii=False, indent=2), encoding="utf-8")
    if rows:
        columns = [
            "role", "name", "jobGrowName", "fame",
            "weaponRarity", "weaponReinforce", "weaponRefine", "amplificationSum", "tuneSum", "tune3Count",
            "titleName", "titleLevelTag", "setName", "setRarity", "setPoint", "setFinalDamage", "setBuffPower",
            "setEpicCount", "setPrimevalCount", "tuneSetPointSum",
            "activePlatinumCount", "activePlatinumSlots", "activeJacketOption", "activePantsOption",
            "creatureName", "artifactUniqueCount",
            "buffSkillName", "buffSkillLevel", "buffDenseFragmentCount", "buffTitleLevelTag",
            "buffTopAvatar", "buffPantsAvatar", "buffPlatinumCount", "buffCreatureCount",
            "str", "int", "physicalAttack", "magicalAttack", "independentAttack", "element",
            "elementDamage", "attackIncrease", "attackAmplification", "finalDamageIncrease",
            "cooldownReduction", "buffPower", "buffAmplification",
        ]
        with OUT_TSV.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns, delimiter="\t", extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_TSV}")
    if errors:
        print(f"errors: {len(errors)}")


if __name__ == "__main__":
    main()
