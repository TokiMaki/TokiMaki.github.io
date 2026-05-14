#!/usr/bin/env python3

import csv
import math
from pathlib import Path
from typing import Any

IN_TSV = Path("Docs/equipment_score_compare.tsv")
OUT_TSV = Path("Docs/equipment_damage_formula.tsv")


def number(row: dict[str, Any], key: str) -> float:
    try:
        return float(row.get(key) or 0)
    except (TypeError, ValueError):
        return 0.0


def ratio_from_percent(value: float) -> float:
    return 1 + value / 100


def cooldown_damage_ratio(cooldown_reduction: float) -> float:
    if cooldown_reduction >= 100:
        return math.inf
    return 100 / (100 - cooldown_reduction)


def calculate_damage_row(row: dict[str, Any]) -> dict[str, Any]:
    official_equipment_point = number(row, "officialEquipmentPoint")
    selected_stat = max(number(row, "str"), number(row, "int"))
    selected_attack_phys_mag = max(number(row, "physicalAttack"), number(row, "magicalAttack"))
    selected_attack_with_independent = max(
        number(row, "physicalAttack"),
        number(row, "magicalAttack"),
        number(row, "independentAttack"),
    )
    stat_ratio = ratio_from_percent(selected_stat / 2.5)
    attack_increase_ratio = ratio_from_percent(number(row, "attackIncrease"))
    attack_amplification_ratio = ratio_from_percent(number(row, "attackAmplification"))
    final_damage_ratio = ratio_from_percent(number(row, "finalDamageIncrease"))
    element_damage_ratio = ratio_from_percent(number(row, "elementDamage"))
    cooldown_ratio = cooldown_damage_ratio(number(row, "cooldownReduction"))

    common_damage_ratio = (
        stat_ratio
        * element_damage_ratio
        * attack_increase_ratio
        * attack_amplification_ratio
        * final_damage_ratio
    )
    damage_index_phys_mag = selected_attack_phys_mag * common_damage_ratio
    damage_index_with_independent = selected_attack_with_independent * common_damage_ratio
    damage_index_phys_mag_dps = damage_index_phys_mag * cooldown_ratio
    damage_index_with_independent_dps = damage_index_with_independent * cooldown_ratio

    return {
        "role": row.get("role", ""),
        "name": row.get("name", ""),
        "jobGrowName": row.get("jobGrowName", ""),
        "officialEquipmentPoint": official_equipment_point,
        "selectedStat": selected_stat,
        "statRatio": stat_ratio,
        "selectedAttackPhysMag": selected_attack_phys_mag,
        "selectedAttackWithIndependent": selected_attack_with_independent,
        "elementDamage": number(row, "elementDamage"),
        "elementDamageRatio": element_damage_ratio,
        "attackIncrease": number(row, "attackIncrease"),
        "attackIncreaseRatio": attack_increase_ratio,
        "attackAmplification": number(row, "attackAmplification"),
        "attackAmplificationRatio": attack_amplification_ratio,
        "finalDamageIncrease": number(row, "finalDamageIncrease"),
        "finalDamageRatio": final_damage_ratio,
        "cooldownReduction": number(row, "cooldownReduction"),
        "cooldownDamageRatio": cooldown_ratio,
        "damageIndexPhysMag": damage_index_phys_mag,
        "damageIndexPhysMagDps": damage_index_phys_mag_dps,
        "damageIndexWithIndependent": damage_index_with_independent,
        "damageIndexWithIndependentDps": damage_index_with_independent_dps,
        "scorePerPhysMagDamageIndex": official_equipment_point / damage_index_phys_mag if damage_index_phys_mag else 0,
        "scorePerPhysMagDamageIndexDps": official_equipment_point / damage_index_phys_mag_dps if damage_index_phys_mag_dps else 0,
        "scorePerIndependentDamageIndex": official_equipment_point / damage_index_with_independent if damage_index_with_independent else 0,
        "scorePerIndependentDamageIndexDps": official_equipment_point / damage_index_with_independent_dps if damage_index_with_independent_dps else 0,
    }


def main() -> None:
    rows = list(csv.DictReader(IN_TSV.open(encoding="utf-8"), delimiter="\t"))
    output_rows = [calculate_damage_row(row) for row in rows]
    columns = [
        "role", "name", "jobGrowName", "officialEquipmentPoint",
        "selectedStat", "statRatio",
        "selectedAttackPhysMag", "selectedAttackWithIndependent",
        "elementDamage", "elementDamageRatio",
        "attackIncrease", "attackIncreaseRatio",
        "attackAmplification", "attackAmplificationRatio",
        "finalDamageIncrease", "finalDamageRatio",
        "cooldownReduction", "cooldownDamageRatio",
        "damageIndexPhysMag", "damageIndexPhysMagDps",
        "damageIndexWithIndependent", "damageIndexWithIndependentDps",
        "scorePerPhysMagDamageIndex", "scorePerPhysMagDamageIndexDps",
        "scorePerIndependentDamageIndex", "scorePerIndependentDamageIndexDps",
    ]
    with OUT_TSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, delimiter="\t")
        writer.writeheader()
        writer.writerows(output_rows)
    print(f"wrote {OUT_TSV}")


if __name__ == "__main__":
    main()
