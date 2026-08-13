import unittest
from unittest.mock import patch

from server.candidates.weapon_tune import build_weapon_tune_recommendations_debug


class WeaponTuneRecommendationTest(unittest.TestCase):
    def setUp(self):
        self.weapon = {
            "slotId": "WEAPON",
            "slotName": "무기",
            "itemId": "primeval-weapon",
            "itemName": "특형 - 호위무신의 운검",
            "itemRarity": "태초",
            "itemAvailableLevel": 115,
            "itemTypeDetail": "도",
            "itemStatus": [
                {"name": "최종 데미지 증가", "value": 999},
                {"name": "공격력 증가", "value": 1200},
                {"name": "힘", "value": 100},
            ],
            "tune": [{"level": 0, "setPoint": 0}],
            "itemReinforceSkill": [{"jobName": "공통", "levelRange": []}],
        }
        self.black_disease_weapon = {
            "itemId": "black-disease-weapon",
            "itemName": "검은 질병의 특형 - 호위무신의 운검",
            "itemRarity": "태초",
            "itemTypeDetail": "도",
            "iconUrl": "black-disease-icon",
        }
        self.material_prices = {
            "primordialSoul": {
                "label": "태초 소울 결정",
                "itemId": "primordial-soul",
                "iconUrl": "primordial-soul-icon",
                "auction": {"priceStatus": "priced", "minUnitPrice": 1000},
            },
        }

    def test_builds_cumulative_variants_and_uses_exact_final_weapon(self):
        with patch(
            "server.candidates.weapon_tune.resolve_exact_item_by_name",
            return_value=self.black_disease_weapon,
        ) as resolve_item:
            result = build_weapon_tune_recommendations_debug(
                [self.weapon],
                self.material_prices,
            )

        row = result["recommendations"][0]
        self.assertEqual(row["sourceType"], "weaponTune")
        self.assertEqual(row["cardTitle"], "무기")
        self.assertEqual(row["cardSubtitle"], "조율")
        self.assertEqual(row["currentEquipmentBody"]["effects"]["finalDamage"], 376.7)
        self.assertEqual(row["currentEquipmentBody"]["effects"]["buffPower"], 44_261)
        self.assertEqual(row["currentEquipmentBody"]["effects"]["attackIncrease"], 1200)
        self.assertEqual([step["targetWeaponTuneStage"] for step in row["tuneSteps"]], [1, 2, 3, 4])
        self.assertEqual([step["expectedGold"] for step in row["tuneSteps"]], [500_000, 1_000_000, 1_500_000, 2_000_000])
        self.assertEqual(
            [step["targetEquipmentBody"]["effects"]["finalDamage"] for step in row["tuneSteps"]],
            [398.2, 420.6, 444.0, 500.0],
        )
        self.assertEqual(
            [step["targetEquipmentBody"]["effects"]["buffPower"] for step in row["tuneSteps"]],
            [45_961, 47_661, 49_361, 53_000],
        )
        final_step = row["tuneSteps"][-1]
        self.assertEqual(final_step["targetEquipmentBody"]["itemId"], "black-disease-weapon")
        self.assertEqual(final_step["targetEquipmentBody"]["iconUrl"], "black-disease-icon")
        material_amounts = {
            material["key"]: material["amount"]
            for material in final_step["expectedMaterials"]
        }
        self.assertEqual(material_amounts, {"blackCalamity": 200, "primordialSoul": 2})
        calamity = next(
            material for material in final_step["expectedMaterials"]
            if material["key"] == "blackCalamity"
        )
        self.assertEqual(calamity["iconUrl"], "/asset/enchant/blackCalamity.png")
        resolve_item.assert_called_once_with(
            "검은 질병의 특형 - 호위무신의 운검",
            "도",
        )

    def test_omits_final_variant_when_exact_weapon_is_missing(self):
        with patch(
            "server.candidates.weapon_tune.resolve_exact_item_by_name",
            return_value={},
        ):
            result = build_weapon_tune_recommendations_debug(
                [self.weapon],
                self.material_prices,
            )

        row = result["recommendations"][0]
        self.assertEqual([step["targetWeaponTuneStage"] for step in row["tuneSteps"]], [1, 2, 3])
        self.assertTrue(any(
            step.get("reason") == "missing_black_disease_weapon"
            for step in result["steps"]
        ))

    def test_excludes_star_release_and_completed_weapons(self):
        cases = [
            {**self.weapon, "itemName": "태초의 별 - 도"},
            {**self.weapon, "itemName": "검은 질병의 특형 - 호위무신의 운검"},
        ]
        with patch(
            "server.candidates.weapon_tune.resolve_exact_item_by_name",
            return_value=self.black_disease_weapon,
        ):
            for weapon in cases:
                with self.subTest(item_name=weapon["itemName"]):
                    result = build_weapon_tune_recommendations_debug(
                        [weapon],
                        self.material_prices,
                    )
                    self.assertEqual(result["recommendations"], [])

    def test_excludes_weapons_below_level_115(self):
        result = build_weapon_tune_recommendations_debug(
            [{**self.weapon, "itemAvailableLevel": 110}],
            self.material_prices,
        )

        self.assertEqual(result["recommendations"], [])
        self.assertEqual(result["steps"], [{"reason": "weapon_level_not_115"}])

    def test_builds_weapon_release_variants_from_base_percent(self):
        weapon = {
            **self.weapon,
            "weaponRelease": {"value": 0, "damage": "0%", "buff": 0},
            "tune": [{"level": 0, "upgrade": False}],
        }

        result = build_weapon_tune_recommendations_debug(
            [weapon],
            self.material_prices,
        )

        row = result["recommendations"][0]
        self.assertEqual(row["weaponTuneMode"], "release")
        self.assertEqual(row["cardTitle"], "무기")
        self.assertEqual(row["cardSubtitle"], "개방")
        self.assertEqual(row["currentWeaponReleasePercent"], 0)
        self.assertEqual(row["targetWeaponReleasePercent"], 100)
        self.assertEqual(row["tuneCount"], 20)
        self.assertEqual(len(row["tuneSteps"]), 1)
        final_step = row["tuneSteps"][0]
        self.assertEqual(final_step["targetWeaponReleasePercent"], 100)
        self.assertAlmostEqual(
            row["currentEquipmentBody"]["effects"]["finalDamage"],
            (6 / 1.137 - 1) * 100,
        )
        self.assertEqual(
            row["currentEquipmentBody"]["effects"]["buffPower"],
            48_300,
        )
        self.assertAlmostEqual(
            final_step["targetEquipmentBody"]["effects"]["finalDamage"],
            500,
        )
        self.assertEqual(
            final_step["targetEquipmentBody"]["effects"]["buffPower"],
            53_000,
        )
        self.assertEqual(final_step["expectedGold"], 3_000_000)
        self.assertEqual(
            {
                material["key"]: material["amount"]
                for material in final_step["expectedMaterials"]
            },
            {"blackCalamity": 160, "epicSoul": 20},
        )

    def test_weapon_release_uses_remaining_guaranteed_attempts_and_excludes_complete(self):
        partial_weapon = {
            **self.weapon,
            "weaponRelease": {"value": 92, "damage": "12.604%", "buff": 0},
        }
        result = build_weapon_tune_recommendations_debug(
            [partial_weapon],
            self.material_prices,
        )
        row = result["recommendations"][0]
        self.assertEqual(row["targetWeaponReleasePercent"], 100)
        self.assertEqual(row["tuneCount"], 2)
        self.assertEqual(
            [step["targetWeaponReleasePercent"] for step in row["tuneSteps"]],
            [100],
        )
        self.assertEqual(row["tuneSteps"][0]["expectedGold"], 300_000)
        self.assertEqual(
            row["currentEquipmentBody"]["effects"]["buffPower"],
            52_624,
        )

        complete_result = build_weapon_tune_recommendations_debug(
            [{**self.weapon, "weaponRelease": {"value": 100, "damage": "13.7%"}}],
            self.material_prices,
        )
        self.assertEqual(complete_result["recommendations"], [])


if __name__ == "__main__":
    unittest.main()
