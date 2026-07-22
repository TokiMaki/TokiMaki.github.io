import json
import math
import unittest
from pathlib import Path
from unittest.mock import patch

from server.candidates.relic_craft import build_relic_craft_recommendations_debug
from server.equipment_body import (
    get_relic_craft_final_damage_percent,
    get_relic_precision_effects,
    resolve_relic_precision_percent,
)


ROOT = Path(__file__).resolve().parents[1]


class RelicPrecisionRecommendationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database = json.loads((ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        cls.recipes = database["crafts"]
        cls.perfume = cls.recipes[0]
        cls.cube = cls.recipes[1]
        cls.heart = cls.recipes[2]

    def test_precision_progression_tables_and_potency_value(self):
        cases = [
            (self.perfume, 25, {"finalDamage": 2.9, "buffPower": 1110, "adventureFame": 220}),
            (self.perfume, 100, {"finalDamage": 13.1, "buffPower": 4650, "adventureFame": 1000}),
            (self.cube, 25, {"finalDamage": 2.5, "buffPower": 1110, "adventureFame": 310}),
            (self.cube, 100, {"finalDamage": 10.0, "buffPower": 4650, "adventureFame": 1370}),
            (self.heart, 25, {"finalDamage": 2.5, "buffPower": 1070, "adventureFame": 310}),
            (self.heart, 100, {"finalDamage": 10.0, "buffPower": 4500, "adventureFame": 1370}),
        ]
        for recipe, percent, expected in cases:
            with self.subTest(recipe=recipe["key"], percent=percent):
                precision = recipe["precision100"]
                effects = get_relic_precision_effects(precision, percent)
                for key, value in expected.items():
                    self.assertTrue(math.isclose(effects[key], value, abs_tol=1e-8))
                self.assertEqual(resolve_relic_precision_percent({
                    "value": percent,
                    "damage": f"{effects['finalDamage']}%",
                    "buff": effects["buffPower"],
                }), percent)

        for recipe in self.recipes:
            precision = recipe["precision100"]
            for percent in (0, 24, 25, 49, 50, 74, 75, 99, 100):
                with self.subTest(recipe=recipe["key"], reverse_percent=percent):
                    effects = get_relic_precision_effects(precision, percent)
                    self.assertEqual(resolve_relic_precision_percent({
                        "value": percent,
                        "damage": f"{effects['finalDamage']}%",
                        "buff": effects["buffPower"],
                    }), percent)

        self.assertEqual(resolve_relic_precision_percent({
            "buff": 4500,
            "damage": "10%",
            "value": 100,
        }), 100)
        self.assertEqual(resolve_relic_precision_percent({"value": 25, "buff": 999}), 25)
        self.assertEqual(resolve_relic_precision_percent({"value": 0, "buff": "invalid"}), 0)
        self.assertEqual(resolve_relic_precision_percent({"value": "75"}), 75)
        self.assertIsNone(resolve_relic_precision_percent({"value": 25.5, "buff": 1110}))
        self.assertIsNone(resolve_relic_precision_percent({"value": -1}))
        self.assertIsNone(resolve_relic_precision_percent({"value": 101}))
        self.assertIsNone(resolve_relic_precision_percent({}))

    def test_special_multiplier_progresses_by_precision_milestones(self):
        perfume_effects = self.perfume["authoritativeEffects"]
        perfume_precision = self.perfume["precision100"]
        perfume_values = [
            get_relic_craft_final_damage_percent(perfume_effects, perfume_precision, percent)
            for percent in (0, 24, 25, 50, 75, 100)
        ]
        self.assertTrue(all(left < right for left, right in zip(perfume_values, perfume_values[1:])))
        self.assertTrue(math.isclose(perfume_values[-1], 70.67376612, abs_tol=1e-8))

        cube_effects = self.cube["authoritativeEffects"]
        cube_precision = self.cube["precision100"]
        cube_values = [
            get_relic_craft_final_damage_percent(cube_effects, cube_precision, percent)
            for percent in (0, 24, 25, 50, 75, 100)
        ]
        self.assertTrue(all(left < right for left, right in zip(cube_values, cube_values[1:])))
        self.assertTrue(math.isclose(cube_values[-1], 78.86166335323423, abs_tol=1e-10))

        heart_zero = get_relic_craft_final_damage_percent(
            self.heart["authoritativeEffects"], self.heart["precision100"], 0
        )
        heart_full = get_relic_craft_final_damage_percent(
            self.heart["authoritativeEffects"], self.heart["precision100"], 100
        )
        self.assertTrue(math.isclose(heart_zero, 50.2, abs_tol=1e-10))
        self.assertTrue(math.isclose(heart_full, 65.22, abs_tol=1e-10))

    def _perfume_detail(self):
        target = self.perfume["target"]
        return {
            **target,
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
            "itemStatus": [
                {"name": "공격력 증가", "value": "3729%"},
                {"name": "최종 데미지 증가", "value": "62.5%"},
            ],
            "itemReinforceSkill": [],
            "itemBuff": {},
        }

    def _material_prices(self):
        return {
            "behemothTear": {
                "label": "베히모스의 눈물(1회 교환 가능)",
                "itemId": "cbeb05e1c979e159f6a7501d6a294378",
                "auction": {"minUnitPrice": 100, "averagePrice": 100, "listingCount": 1},
            },
            "historiaQuartz": {
                "label": "히스토리아 쿼츠",
                "itemId": "c1e1dd70d4dbdf410fe715b339000821",
                "auction": {"minUnitPrice": 200, "averagePrice": 200, "listingCount": 1},
            },
        }

    def test_existing_25_percent_perfume_builds_precision_only_recommendation(self):
        precision = self.perfume["precision100"]
        potency = get_relic_precision_effects(precision, 25)
        equipment_rows = [{
            "slotId": "MAGIC_STON",
            "slotName": "마법석",
            "itemId": self.perfume["target"]["itemId"],
            "itemName": self.perfume["target"]["itemName"],
            "itemRarity": "태초",
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
            "potency": {
                "value": 25,
                "damage": f"{potency['finalDamage']}%",
                "buff": potency["buffPower"],
            },
        }]
        with patch(
            "server.candidates.relic_craft.fetch_item_details",
            return_value=[self._perfume_detail()],
        ):
            result = build_relic_craft_recommendations_debug(
                equipment_rows,
                self._material_prices(),
            )

        self.assertEqual(len(result["recommendations"]), 1)
        row = result["recommendations"][0]
        self.assertEqual(row["relicCraftMode"], "precision")
        self.assertEqual(row["cardTitle"], "향수 정밀")
        self.assertEqual(row["currentPrecisionPercent"], 25)
        self.assertEqual(row["targetPrecisionPercent"], 100)
        self.assertEqual(row["fullPrecisionOperationCount"], 25)
        self.assertEqual(row["precisionOperationCount"], 18.75)
        self.assertEqual(row["craftFixedGold"], 0)
        self.assertEqual(row["expectedGold"], 75000000)
        self.assertEqual(row["currentEquipmentSetPoint"], 145)
        self.assertEqual(row["targetEquipmentSetPoint"], 145)
        self.assertEqual(row["minimumCurrentEquipmentSetPoint"], 0)
        self.assertEqual(row["currentEquipmentBody"]["precisionPercent"], 25)
        self.assertEqual(row["targetEquipmentBody"]["precisionPercent"], 100)
        self.assertTrue(math.isclose(
            row["currentPrecisionEffects"]["finalDamage"],
            2.9,
            abs_tol=1e-8,
        ))
        self.assertEqual(row["currentPrecisionEffects"]["buffPower"], 1110.0)
        self.assertEqual(row["currentPrecisionEffects"]["adventureFame"], 220.0)
        self.assertTrue(math.isclose(
            row["targetPrecisionEffects"]["finalDamage"],
            13.1,
            abs_tol=1e-8,
        ))
        self.assertEqual(row["targetPrecisionEffects"]["buffPower"], 4650.0)
        self.assertEqual(row["targetPrecisionEffects"]["adventureFame"], 1000.0)
        self.assertEqual(
            {material["key"]: material["amount"] for material in row["materials"]},
            {"behemothTear": 150, "historiaQuartz": 375},
        )
        self.assertTrue(all(material["craftAmount"] == 0 for material in row["materials"]))
        self.assertNotIn("perfumeBottle", {material["key"] for material in row["materials"]})

    def test_potency_value_is_authoritative_and_invalid_value_is_skipped(self):
        detail = self._perfume_detail()
        target = self.perfume["target"]
        base_row = {
            "slotId": "MAGIC_STON",
            "slotName": "마법석",
            "itemId": target["itemId"],
            "itemName": target["itemName"],
            "itemRarity": "태초",
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
        }
        with patch("server.candidates.relic_craft.fetch_item_details", return_value=[detail]):
            full_result = build_relic_craft_recommendations_debug([
                {**base_row, "potency": {"value": 100, "damage": "10%", "buff": 4500}},
            ], self._material_prices())
            mismatched_effect_result = build_relic_craft_recommendations_debug([
                {**base_row, "potency": {"value": 25, "damage": "invalid", "buff": 999}},
            ], self._material_prices())
            invalid_result = build_relic_craft_recommendations_debug([
                {**base_row, "potency": {"value": 101, "damage": "10%", "buff": 4500}},
            ], self._material_prices())

        self.assertEqual(full_result["recommendations"], [])
        self.assertEqual(len(mismatched_effect_result["recommendations"]), 1)
        self.assertEqual(
            mismatched_effect_result["recommendations"][0]["currentPrecisionPercent"],
            25,
        )
        self.assertEqual(invalid_result["recommendations"], [])
        self.assertEqual(invalid_result["steps"][0]["reason"], "unresolved_unique_precision_percent")


if __name__ == "__main__":
    unittest.main()
