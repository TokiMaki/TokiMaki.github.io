import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Docs" / "강화.txt"
SAFE_WEAPON_SOURCE = ROOT / "Docs" / "무기안전강화.json"
STAT_SOURCE = ROOT / "Docs" / "증폭별증가량.json"
WEAPON_ATTACK_SOURCE = ROOT / "Docs" / "무기물마독상승량.json"
OUTPUT = ROOT / "Docs" / "reinforcement_expected_db.json"


def round_value(value):
    return round(value, 6)


def parse_number(text):
    return int(text.replace(",", "").strip())


def parse_percent(text):
    return float(text.replace("%", "").strip())


def parse_source():
    lines = [
        line.strip()
        for line in SOURCE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    rows = []
    index = 0
    transition_pattern = re.compile(r"^(\d+)\s*→\s*(\d+)$")

    while index < len(lines):
        match = transition_pattern.match(lines[index])
        if not match:
            index += 1
            continue
        if index + 6 >= len(lines):
            raise ValueError(f"incomplete reinforcement row: {lines[index]}")

        rows.append(
            {
                "from": int(match.group(1)),
                "to": int(match.group(2)),
                "successRatePercent": parse_percent(lines[index + 1]),
                "colorlessCube": parse_number(lines[index + 2]),
                "weaponGold": parse_number(lines[index + 3]),
                "specialEquipmentGold": parse_number(lines[index + 4]),
                "penalty": lines[index + 6],
            }
        )
        index += 7

    return rows


def load_stat_rows():
    with STAT_SOURCE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return {
        row["level"]: {
            "specialEquipmentStat": row["specialEquipmentStat"],
            "earringAttack": row["earringAttack"],
            "finalDamagePercent": row["finalDamagePercent"],
        }
        for row in payload["rows"]
    }


def load_weapon_attack_rows():
    with WEAPON_ATTACK_SOURCE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return {
        row["level"]: row["attack"]
        for row in payload["rows"]
    }


def load_safe_weapon_rows():
    with SAFE_WEAPON_SOURCE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload["rows"]


def diff_value(next_value, current_value):
    if next_value is None or current_value is None:
        return None
    return round_value(next_value - current_value)


def reinforcement_final_damage(stat_by_level, level):
    if level < 12:
        return 0
    stat = stat_by_level.get(level - 1) or {}
    return stat.get("finalDamagePercent")


def weapon_attack_gain(weapon_attack_by_level, level):
    next_value = weapon_attack_by_level.get(level)
    if next_value is None:
        return None
    previous_value = weapon_attack_by_level.get(level - 1, 0)
    return diff_value(next_value, previous_value)


def build_gain(stat_by_level, weapon_attack_by_level, level):
    current_stat = stat_by_level.get(level - 1)
    next_stat = stat_by_level.get(level)
    if not current_stat or not next_stat:
        return {}

    return {
        "weapon": {
            "attack": weapon_attack_gain(weapon_attack_by_level, level),
        },
        "support": {
            "additionalStat": diff_value(next_stat["specialEquipmentStat"], current_stat["specialEquipmentStat"]),
        },
        "magicStone": {
            "additionalStat": diff_value(next_stat["specialEquipmentStat"], current_stat["specialEquipmentStat"]),
        },
        "earring": {
            "attack": diff_value(next_stat["earringAttack"], current_stat["earringAttack"]),
        },
    }


def build_final_damage(stat_by_level, level):
    current_final_damage = reinforcement_final_damage(stat_by_level, level - 1)
    next_final_damage = reinforcement_final_damage(stat_by_level, level)
    final_damage_gain = diff_value(next_final_damage, current_final_damage)
    return {
        "weapon": final_damage_gain,
        "earring": final_damage_gain,
    }


def build_effects_by_level(stat_by_level, weapon_attack_by_level, max_level):
    rows = []
    for level in range(0, max_level + 1):
        stat = stat_by_level.get(level) or {}
        final_damage = reinforcement_final_damage(stat_by_level, level)
        row = {"level": level}
        weapon = {}
        weapon_attack = weapon_attack_by_level.get(level)
        if weapon_attack:
            weapon["attack"] = weapon_attack
        if final_damage:
            weapon["finalDamage"] = final_damage
        if weapon:
            row["weapon"] = weapon
        special_equipment_stat = stat.get("specialEquipmentStat")
        if special_equipment_stat:
            row["specialEquipment"] = {"allStat": special_equipment_stat}
        earring = {}
        earring_attack = stat.get("earringAttack")
        if earring_attack:
            earring["attack"] = earring_attack
        if final_damage:
            earring["finalDamage"] = final_damage
        if earring:
            row["earring"] = earring
        rows.append(row)
    return rows


def solve_linear_system(matrix, vector):
    size = len(vector)
    rows = [matrix[index][:] + [vector[index]] for index in range(size)]

    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(rows[row][column]))
        if abs(rows[pivot][column]) < 1e-12:
            raise ValueError("singular expectation matrix")
        rows[column], rows[pivot] = rows[pivot], rows[column]

        pivot_value = rows[column][column]
        rows[column] = [value / pivot_value for value in rows[column]]

        for row in range(size):
            if row == column:
                continue
            factor = rows[row][column]
            if abs(factor) < 1e-12:
                continue
            rows[row] = [
                rows[row][col] - factor * rows[column][col]
                for col in range(size + 1)
            ]

    return [rows[row][size] for row in range(size)]


def is_destruction_attempt(row, equipment_type):
    if equipment_type == "weapon":
        return row["to"] >= 13
    if equipment_type == "specialEquipment":
        return row["to"] >= 11
    raise ValueError(f"unknown equipment type: {equipment_type}")


def failure_level(row, equipment_type):
    if is_destruction_attempt(row, equipment_type):
        return 0
    return row["from"]


def solve_resource_expectations(rows, target_level, equipment_type, gold_key, resource_name):
    matrix = []
    vector = []
    row_by_from = {row["from"]: row for row in rows}

    for level in range(target_level):
        row_data = row_by_from[level]
        next_level = row_data["to"]
        success_rate = row_data["successRatePercent"] / 100.0
        fail_rate = 1.0 - success_rate
        fail_level = failure_level(row_data, equipment_type)

        if resource_name == "gold":
            cost = row_data[gold_key]
        elif resource_name == "colorlessCube":
            cost = row_data["colorlessCube"]
        elif resource_name == "protectionTicket":
            cost = fail_rate if is_destruction_attempt(row_data, equipment_type) else 0.0
        else:
            raise ValueError(f"unknown resource: {resource_name}")

        equation = [0.0 for _ in range(target_level)]
        equation[level] = 1.0
        if next_level < target_level:
            equation[next_level] -= success_rate
        equation[fail_level] -= fail_rate
        matrix.append(equation)
        vector.append(cost)

    return solve_linear_system(matrix, vector)


def solve_resource_expectation(rows, target_level, equipment_type, gold_key, resource_name, start_level=0):
    return solve_resource_expectations(rows, target_level, equipment_type, gold_key, resource_name)[start_level]


def build_expected_cost(rows, target_level, equipment_type, gold_key, start_level=0):
    return {
        "gold": round_value(solve_resource_expectation(rows, target_level, equipment_type, gold_key, "gold", start_level)),
        "colorlessCube": round_value(solve_resource_expectation(rows, target_level, equipment_type, gold_key, "colorlessCube", start_level)),
        "protectionTicket": round_value(solve_resource_expectation(rows, target_level, equipment_type, gold_key, "protectionTicket", start_level)),
    }


def build_safe_weapon_reinforcement(rows, stat_by_level, weapon_attack_by_level):
    safe_rows = []
    for row in rows:
        gain = build_gain(stat_by_level, weapon_attack_by_level, row["toLevel"])
        final_damage = build_final_damage(stat_by_level, row["toLevel"])
        safe_rows.append({
            "level": row["toLevel"],
            "successRatePercent": row["successRatePercent"],
            "bonusPercent": row["failureBonusPercent"],
            "gain": {
                "weapon": gain.get("weapon", {}),
            },
            "finalDamagePercent": {
                "weapon": final_damage.get("weapon"),
            },
            "stepExpected": {
                "weapon": dict(row["expected"]),
            },
            "expectedFromZero": {
                "weapon": dict(row["expectedFromZero"]),
            },
        })
    return safe_rows


def build_db():
    rows = parse_source()
    safe_weapon_rows = load_safe_weapon_rows()
    stat_by_level = load_stat_rows()
    weapon_attack_by_level = load_weapon_attack_rows()
    max_effect_level = max(row["to"] for row in rows)
    payload_rows = []

    for row in rows:
        level = row["to"]
        payload_rows.append(
            {
                "level": level,
                "successRatePercent": row["successRatePercent"],
                "gain": build_gain(stat_by_level, weapon_attack_by_level, level),
                "finalDamagePercent": build_final_damage(stat_by_level, level),
                "stepExpected": {
                    "weapon": build_expected_cost(rows, level, "weapon", "weaponGold", row["from"]),
                    "specialEquipment": build_expected_cost(rows, level, "specialEquipment", "specialEquipmentGold", row["from"]),
                },
                "expectedFromZero": {
                    "weapon": build_expected_cost(rows, level, "weapon", "weaponGold"),
                    "specialEquipment": build_expected_cost(rows, level, "specialEquipment", "specialEquipmentGold"),
                },
            }
        )

    return {
        "schemaVersion": 4,
        "sources": {
            "cost": "Docs/강화.txt",
            "safeWeaponReinforcement": "Docs/무기안전강화.json",
            "stat": "Docs/증폭별증가량.json",
            "weaponAttack": "Docs/무기물마독상승량.json",
        },
        "rules": {
            "failureBeforeLevel10": "실패시 단계 유지",
            "weaponDestructionFromLevel13": "무기는 13강 도전부터 실패시 강화보호권 1개 소모 후 0강 복귀",
            "specialEquipmentDestructionFromLevel11": "보조장비/마법석/귀걸이는 11강 도전부터 실패시 강화보호권 1개 소모 후 0강 복귀",
            "recommendedSlots": ["weapon", "support", "magicStone", "earring"],
            "statApplication": {
                "weapon": "12강부터 최종데미지 적용",
                "support": "추가 스탯만 적용",
                "magicStone": "추가 스탯만 적용",
                "earring": "물리/마법/독립 공격력과 12강부터 최종데미지 적용",
                "finalDamage": "강화 12강은 0.4%, 이후는 11증 이후 최종데미지 테이블을 한 단계씩 밀어 사용",
                "finalDamageField": "최종데미지는 gain과 분리해 finalDamagePercent에 기록",
            },
            "safeWeaponReinforcement": {
                "range": "0강부터 12강까지 무기 안전강화 비용을 우선 기준으로 사용",
                "failure": "단계 하락 없음",
                "bonusPercent": "실패할 때마다 다음 시도 성공률에 누적 가산",
            },
        },
        "effectsByLevel": build_effects_by_level(stat_by_level, weapon_attack_by_level, max_effect_level),
        "reinforcement": payload_rows,
        "safeWeaponReinforcement": build_safe_weapon_reinforcement(safe_weapon_rows, stat_by_level, weapon_attack_by_level),
    }


def main():
    payload = build_db()
    with OUTPUT.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()
