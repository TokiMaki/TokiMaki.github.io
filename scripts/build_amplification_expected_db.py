import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STAT_SOURCE = ROOT / "Docs" / "증폭별증가량.json"
SAFE_SOURCE = ROOT / "Docs" / "안전증폭.json"
NORMAL_SOURCE = ROOT / "Docs" / "일반증폭.json"
OUTPUT = ROOT / "Docs" / "amplification_expected_db.json"


def load_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def round_value(value):
    return round(value, 6)


def expected_attempts(base_success_percent, failure_bonus_percent):
    survival = 1.0
    total = 0.0
    bonus_stack = 0

    while survival > 1e-12:
        success_percent = min(100.0, base_success_percent + bonus_stack)
        success_rate = success_percent / 100.0
        total += survival
        survival *= 1.0 - success_rate
        if success_percent >= 100:
            break
        bonus_stack += failure_bonus_percent

    return round_value(total)


def normalize_stats(payload):
    rows = payload.get("rows") or []
    normalized = []
    for row in rows:
        normalized.append(
            {
                "level": row["level"],
                "generalStat": row["generalStat"],
                "specialEquipmentStat": row["specialEquipmentStat"],
                "earringAttack": row["earringAttack"],
                "finalDamagePercent": row["finalDamagePercent"],
            }
        )
    return normalized


def diff_value(next_value, current_value):
    if next_value is None or current_value is None:
        return None
    return round_value(next_value - current_value)


def effect_row_by_level(stat_rows):
    rows = []
    for stat in stat_rows:
        level = stat["level"]
        row = {"level": level}
        common = {}
        if stat["generalStat"]:
            common["allStat"] = stat["generalStat"]
        if stat["finalDamagePercent"]:
            common["finalDamage"] = stat["finalDamagePercent"]
        if common:
            row["common"] = common
        if stat["specialEquipmentStat"]:
            row["specialEquipment"] = {"allStat": stat["specialEquipmentStat"]}
        if stat["earringAttack"]:
            row["earring"] = {"attack": stat["earringAttack"]}
        rows.append(row)
    return rows


def build_resource_cost(cost, attempts):
    return {
        "harmonyCrystal": round_value(cost["harmonyCrystal"] * attempts),
        "gold": round_value(cost["gold"] * attempts),
    }


def add_cost(left, right):
    return {
        "harmonyCrystal": round_value(left["harmonyCrystal"] + right["harmonyCrystal"]),
        "gold": round_value(left["gold"] + right["gold"]),
    }


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


def build_normal_success_rates(payload, max_level):
    explicit = {
        int(row["toLevel"]): float(row["successRatePercent"])
        for row in payload["successRates"]
    }
    rates = {}
    for target_level in range(1, max_level + 1):
        rates[target_level] = explicit.get(target_level, 20.0) / 100.0
    return rates


def get_normal_gold_per_attempt(normal_payload):
    costs = normal_payload["costs"]
    return {
        "weapon": costs["weapon"]["goldPerAttempt"],
        "nonWeapon": costs["nonWeapon"]["goldPerAttempt"],
    }


def normal_attempt_cost(target_level, gold):
    return {
        "gold": gold,
        "contradictionCrystal": target_level + 10,
        "protectionTicketOnFailure": 1 if target_level >= 11 else 0,
    }


def normal_failure_level(current_level, target_level):
    if target_level <= 10:
        return max(0, current_level - 3)
    return 0


def solve_normal_resource_expectations(target_level, success_rates, gold_per_attempt, resource_name):
    matrix = []
    vector = []

    for current_level in range(target_level):
        next_level = current_level + 1
        success_rate = success_rates[next_level]
        fail_rate = 1.0 - success_rate
        fail_level = normal_failure_level(current_level, next_level)
        if resource_name == "protectionTicket":
            cost = 1.0 * fail_rate if next_level >= 11 else 0.0
        else:
            cost = normal_attempt_cost(next_level, gold_per_attempt)[resource_name]

        row = [0.0 for _ in range(target_level)]
        row[current_level] = 1.0
        if next_level < target_level:
            row[next_level] -= success_rate
        row[fail_level] -= fail_rate
        matrix.append(row)
        vector.append(cost)

    return solve_linear_system(matrix, vector)


def solve_normal_resource_expectation(target_level, success_rates, gold_per_attempt, resource_name, start_level=0):
    return solve_normal_resource_expectations(target_level, success_rates, gold_per_attempt, resource_name)[start_level]


def build_normal_cost(target_level, success_rates, gold_per_attempt, start_level=0):
    return {
        "gold": round_value(solve_normal_resource_expectation(target_level, success_rates, gold_per_attempt, "gold", start_level)),
        "contradictionCrystal": round_value(solve_normal_resource_expectation(target_level, success_rates, gold_per_attempt, "contradictionCrystal", start_level)),
        "protectionTicket": round_value(solve_normal_resource_expectation(target_level, success_rates, gold_per_attempt, "protectionTicket", start_level)),
    }


def build_normal_cost_by_start_level(target_level, success_rates, gold_per_attempt):
    return {
        str(start_level): build_normal_cost(target_level, success_rates, gold_per_attempt, start_level)
        for start_level in range(target_level)
    }


def build_normal_amplification(normal_payload, stat_by_level):
    max_level = max(stat_by_level)
    success_rates = build_normal_success_rates(normal_payload, max_level)
    gold_per_attempt = get_normal_gold_per_attempt(normal_payload)
    weapon_gold = gold_per_attempt["weapon"]
    non_weapon_gold = gold_per_attempt["nonWeapon"]

    rows = []
    for target_level in range(1, max_level + 1):
        current_stat = stat_by_level[target_level - 1]
        next_stat = stat_by_level[target_level]
        weapon = build_normal_cost(target_level, success_rates, weapon_gold)
        non_weapon = build_normal_cost(target_level, success_rates, non_weapon_gold)
        rows.append(
            {
                "level": target_level,
                "successRatePercent": round_value(success_rates[target_level] * 100),
                "gain": {
                    "generalStat": diff_value(next_stat["generalStat"], current_stat["generalStat"]),
                    "specialEquipmentStat": diff_value(next_stat["specialEquipmentStat"], current_stat["specialEquipmentStat"]),
                    "earringAttack": diff_value(next_stat["earringAttack"], current_stat["earringAttack"]),
                },
                "finalDamagePercent": diff_value(next_stat["finalDamagePercent"], current_stat["finalDamagePercent"]),
                "stepExpected": {
                    "weapon": build_normal_cost(target_level, success_rates, weapon_gold, target_level - 1),
                    "nonWeapon": build_normal_cost(target_level, success_rates, non_weapon_gold, target_level - 1),
                },
                "expectedByStartLevel": {
                    "weapon": build_normal_cost_by_start_level(target_level, success_rates, weapon_gold),
                    "nonWeapon": build_normal_cost_by_start_level(target_level, success_rates, non_weapon_gold),
                },
                "expectedFromZero": {
                    "weapon": weapon,
                    "nonWeapon": non_weapon,
                },
            }
        )
    return rows


def build_db():
    stat_rows = normalize_stats(load_json(STAT_SOURCE))
    stat_by_level = {row["level"]: row for row in stat_rows}
    safe_payload = load_json(SAFE_SOURCE)
    safe_rows = safe_payload["rows"]
    normal_payload = load_json(NORMAL_SOURCE)
    normal_gold_per_attempt = get_normal_gold_per_attempt(normal_payload)

    safe_transitions = []
    cumulative_weapon = {"harmonyCrystal": 0, "gold": 0}
    cumulative_non_weapon = {"harmonyCrystal": 0, "gold": 0}

    for row in safe_rows:
        from_level, to_level = int(row["fromLevel"]), int(row["toLevel"])
        current_stat = stat_by_level.get(from_level)
        next_stat = stat_by_level.get(to_level)
        if not current_stat or not next_stat:
            raise ValueError(f"missing stat row for {from_level} -> {to_level}")

        success_rate_percent = row["successRatePercent"]
        bonus_percent = row["failureBonusPercent"]
        weapon_cost = row["costs"]["weapon"]
        non_weapon_cost = row["costs"]["nonWeapon"]
        attempts = expected_attempts(success_rate_percent, bonus_percent)
        weapon = build_resource_cost(weapon_cost, attempts)
        non_weapon = build_resource_cost(non_weapon_cost, attempts)
        cumulative_weapon = add_cost(cumulative_weapon, weapon)
        cumulative_non_weapon = add_cost(cumulative_non_weapon, non_weapon)

        safe_transitions.append(
            {
                "level": to_level,
                "successRatePercent": success_rate_percent,
                "bonusPercent": bonus_percent,
                "expectedAttempts": attempts,
                "gain": {
                    "generalStat": diff_value(next_stat["generalStat"], current_stat["generalStat"]),
                    "specialEquipmentStat": diff_value(next_stat["specialEquipmentStat"], current_stat["specialEquipmentStat"]),
                    "earringAttack": diff_value(next_stat["earringAttack"], current_stat["earringAttack"]),
                },
                "finalDamagePercent": diff_value(next_stat["finalDamagePercent"], current_stat["finalDamagePercent"]),
                "stepExpected": {
                    "weapon": weapon,
                    "nonWeapon": non_weapon,
                },
                "expectedFromZero": {
                    "weapon": dict(cumulative_weapon),
                    "nonWeapon": dict(cumulative_non_weapon),
                },
            }
        )

    return {
        "schemaVersion": 4,
        "sources": {
            "statIncrease": "Docs/증폭별증가량.json",
            "safeAmplification": "Docs/안전증폭.json",
            "normalAmplification": "Docs/일반증폭.json",
        },
        "rules": {
            "safe": {
                "failure": "단계 하락 없음",
                "bonusPercent": "실패할 때마다 다음 시도 성공률에 누적 가산",
            },
            "normal": {
                "failureUntilLevel10": "실패시 3단계 하락",
                "failureFromLevel11": "실패시 증폭보호권 1개 소모 후 0증폭 복귀",
                "successRateAfterLevel13Percent": 20,
                "goldPerAttempt": normal_gold_per_attempt,
                "contradictionCrystalPerAttempt": "도전 목표 증폭 단계 + 10",
                "statApplication": "강화로 오르는 공격력/추가 스탯에 증폭 스탯 상승량을 더한다",
                "finalDamage": "10증부터 모든 부위에 적용",
            },
        },
        "statByLevel": stat_rows,
        "effectsByLevel": effect_row_by_level(stat_rows),
        "safeAmplification": safe_transitions,
        "normalAmplification": build_normal_amplification(normal_payload, stat_by_level),
    }


def main():
    payload = build_db()
    with OUTPUT.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()
