#!/usr/bin/env python3

import csv
import json
from pathlib import Path
from typing import Any

API_JSON = Path("Docs/equipment_score_api_dump.json")
OFFICIAL_JSON = Path("Docs/equipment_score_official_dump.json")
OUT_TSV = Path("Docs/equipment_score_compare.tsv")


def load_rows(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return [row for row in payload.get("rows", []) if isinstance(row, dict)]


def main() -> None:
    api_rows = load_rows(API_JSON)
    official_by_name = {row.get("name"): row for row in load_rows(OFFICIAL_JSON)}
    merged = []
    for row in api_rows:
        official = official_by_name.get(row.get("name"), {})
        merged.append({
            **row,
            "officialEquipmentPoint": official.get("equipmentPoint", 0),
            "officialBuffPoint": official.get("buffPoint", 0),
            "officialBufferCharacter": official.get("bufferCharacter", False),
        })

    columns = [
        "role", "name", "jobGrowName", "fame",
        "officialEquipmentPoint", "officialBuffPoint", "officialBufferCharacter",
        "weaponRarity", "weaponReinforce", "weaponRefine",
        "amplificationSum", "amplificationCount", "reinforceSum", "tuneSum", "tune3Count",
        "titleName", "titleLevelTag", "setName", "setRarity", "setPoint", "setPointMin", "setPointAdjusted",
        "setFinalDamage", "setBuffPower", "setFame", "setEpicCount", "setPrimevalCount", "tuneSetPointSum",
        "avatarCount", "rareAvatarCount", "activePlatinumCount", "activePlatinumSlots",
        "activeJacketOption", "activePantsOption",
        "creatureName", "creatureRarity", "artifactCount", "artifactUniqueCount",
        "buffSkillName", "buffSkillLevel", "buffEquipmentCount",
        "buffFragmentCount", "buffDenseFragmentCount", "buffTitleName", "buffTitleLevelTag",
        "buffAvatarCount", "buffTopAvatar", "buffPantsAvatar", "buffTopOption", "buffPantsOption",
        "buffPlatinumCount", "buffPlatinumSlots", "buffCreatureCount", "buffCreatureName",
        "str", "int", "vit", "spr", "physicalAttack", "magicalAttack", "independentAttack", "element",
        "elementDamage", "attackIncrease", "attackAmplification", "finalDamageIncrease",
        "cooldownReduction", "buffPower", "buffAmplification",
    ]
    with OUT_TSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(merged)

    print(f"merged rows: {len(merged)}")
    print(f"missing official rows: {sum(1 for row in merged if not row['officialEquipmentPoint'] and not row['officialBuffPoint'])}")
    print(f"wrote {OUT_TSV}")


if __name__ == "__main__":
    main()
