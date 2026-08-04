import unittest

from server.calculators.setting_value_calculator import (
    build_setting_value_payload,
    calculate_equipment_upgrade_details,
    calculate_equipment_upgrade_values,
    price_expected_cost,
)


def priced(unit_price):
    return {
        "label": "재료",
        "auction": {
            "priceStatus": "priced",
            "minUnitPrice": unit_price,
        },
    }


class SettingValueCalculatorTest(unittest.TestCase):
    def test_amplified_weapon_uses_amplification_only(self):
        upgrade_db = {
            "amplification": {
                "rules": {
                    "normal": {
                        "goldPerAttempt": {
                            "weapon": 10,
                            "nonWeapon": 5,
                        },
                    },
                },
                "safeAmplification": [{
                    "level": 10,
                    "expectedFromZero": {
                        "weapon": {"gold": 100, "harmonyCrystal": 2},
                        "nonWeapon": {"gold": 50, "harmonyCrystal": 1},
                    },
                }],
                "normalAmplification": [{
                    "level": 11,
                    "successRatePercent": 50,
                }],
            },
            "reinforcement": {
                "safeWeaponReinforcement": [{
                    "level": 11,
                    "expectedFromZero": {"weapon": {"gold": 999999}},
                }],
            },
        }
        material_prices = {
            "harmonyCrystal": priced(5),
            "contradictionCrystal": priced(3),
            "amplificationProtectionTicket": priced(7),
        }

        result = calculate_equipment_upgrade_values([{
            "slot": "무기",
            "reinforce": 11,
            "isAmplified": True,
        }], upgrade_db, material_prices)

        self.assertEqual(result["amplification"], 373)
        self.assertEqual(result["weaponReinforcement"], 0)

        details = calculate_equipment_upgrade_details([{
            "slot": "무기",
            "itemName": "증폭 무기",
            "reinforce": 11,
            "isAmplified": True,
        }], upgrade_db, material_prices)
        self.assertEqual(details["amplification"], [{
            "label": "무기 +11 증폭",
            "slot": "무기",
            "itemName": "증폭 무기",
            "level": 11,
            "mode": "amplification",
            "gold": 373,
            "priceStatus": "priced",
        }])

    def test_weapon_reinforcement_accumulates_safe_twelve_and_normal_steps(self):
        upgrade_db = {
            "amplification": {},
            "reinforcement": {
                "safeWeaponReinforcement": [{
                    "level": 12,
                    "expectedFromZero": {
                        "weapon": {"gold": 100, "lionCore": 10},
                    },
                }],
                "reinforcement": [{
                    "level": 13,
                    "stepExpected": {
                        "weapon": {
                            "gold": 20,
                            "colorlessCube": 4,
                            "protectionTicket": 0.5,
                        },
                    },
                }],
            },
        }
        material_prices = {
            "lionCore": priced(2),
            "colorlessCube": priced(3),
            "reinforcementProtectionTicket": priced(8),
        }

        result = calculate_equipment_upgrade_values([{
            "slot": "무기",
            "reinforce": 13,
            "isAmplified": False,
        }], upgrade_db, material_prices)

        self.assertEqual(result["amplification"], 0)
        self.assertEqual(result["weaponReinforcement"], 156)

    def test_unpriced_required_material_does_not_turn_into_zero_cost_material(self):
        material_prices = {
            "lionCore": {
                "auction": {
                    "priceStatus": "unlisted",
                    "minUnitPrice": 0,
                },
            },
        }

        self.assertIsNone(
            price_expected_cost(
                {"gold": 100, "lionCore": 10},
                material_prices,
                "reinforcement",
            ),
        )

    def test_public_payload_uses_only_setting_value_result_contract(self):
        payload = build_setting_value_payload({
            "amplification": 100.4,
            "title": 200.6,
        })

        self.assertEqual(payload["label"], "세팅 추정 가치")
        self.assertEqual(payload["totalGold"], 301)
        self.assertNotIn("completedCount", payload)
        self.assertNotIn("pricedCount", payload)
        self.assertNotIn("coverage", payload)


if __name__ == "__main__":
    unittest.main()
