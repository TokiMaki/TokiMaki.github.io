import json
import math
import unittest
from pathlib import Path
from unittest.mock import patch

from server.candidates.relic_craft import _build_materials, build_relic_craft_recommendations_debug
from server.equipment_body import (
    get_relic_craft_final_damage_percent,
    normalize_relic_craft_target_equipment_body,
)


ROOT = Path(__file__).resolve().parents[1]


class RelicCraftEquipmentBodyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database = json.loads((ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        cls.database = database
        cls.recipe = database["crafts"][0]
        cls.target = cls.recipe["target"]
        cls.authoritative_effects = cls.recipe["authoritativeEffects"]
        cls.cube_recipe = database["crafts"][1]
        cls.heart_recipe = database["crafts"][2]

    def build_body(self, *, tune_set_point=145, normalized_status=None, authoritative_effects=None):
        detail = {
            "itemId": self.target["itemId"],
            "itemName": self.target["itemName"],
            "itemRarity": self.target["itemRarity"],
            "itemTypeDetail": self.target["itemTypeDetail"],
            "tune": [{"level": 0, "setPoint": tune_set_point, "upgrade": False}],
            "itemReinforceSkill": [],
            "itemBuff": {
                "explain": "30레벨 버프 스킬 Lv +1\n50레벨 액티브 스킬 Lv +2",
                "reinforceSkill": [],
            },
        }
        return normalize_relic_craft_target_equipment_body(
            target_config=self.target,
            target_detail=detail,
            normalized_status=normalized_status or {
                "finalDamage": 62.5,
                "attackIncrease": 3729.0,
                "buffPower": 12930,
            },
            precision=self.recipe["precision100"],
            authoritative_effects=authoritative_effects or self.authoritative_effects,
            icon_url="icon",
            item_explain="explain",
        )

    def test_normalizes_authoritative_effects_once(self):
        body, reason = self.build_body()
        expected_final_damage = 70.67376612

        self.assertEqual(reason, "")
        self.assertTrue(math.isclose(
            get_relic_craft_final_damage_percent(self.authoritative_effects),
            expected_final_damage,
            abs_tol=1e-8,
        ))
        self.assertTrue(math.isclose(body["effects"]["finalDamage"], expected_final_damage, abs_tol=1e-8))
        self.assertNotEqual(body["effects"]["finalDamage"], 62.5)
        self.assertEqual(body["effects"]["buffPower"], 17580.0)
        self.assertEqual(body["effects"]["attackIncrease"], 3729.0)
        self.assertEqual(body["tuneLevel"], 0)
        self.assertEqual(body["tuneSetPoint"], 145)
        self.assertFalse(body["tuneUpgradeable"])
        self.assertEqual(body["tuneRemaining"], 0)

        aggregated_body, aggregated_reason = self.build_body(
            normalized_status={
                "finalDamage": 62.5,
                "attackIncrease": 3729.0,
                "buffPower": 17580,
            }
        )
        self.assertEqual(aggregated_reason, "")
        self.assertEqual(aggregated_body["effects"]["buffPower"], 17580.0)

    def test_weather_cube_authoritative_effect_and_recipe_contract(self):
        recipe = self.cube_recipe
        target = dict(recipe["target"], itemId="weather-cube-target")
        authoritative_effects = recipe["authoritativeEffects"]
        expected_final_damage = 78.86166335323423

        self.assertTrue(recipe["target"]["itemId"])
        self.assertEqual(recipe["target"]["slotId"], "EARRING")
        self.assertEqual(recipe["manualPrices"]["weatherCubeShell"]["unitPrice"], 3500000000)
        self.assertTrue(math.isclose(
            get_relic_craft_final_damage_percent(authoritative_effects),
            expected_final_damage,
            abs_tol=1e-10,
        ))
        self.assertEqual(
            authoritative_effects["finalDamage"]["additionalMultipliers"][0],
            {
                "type": "fixedFinalDamageMultiplier",
                "sourceCooldownReductionPercent": 4,
                "equivalentFinalDamagePercent": 1.59935,
                "count": 5,
            },
        )
        self.assertEqual(
            authoritative_effects["buffPower"]["body"]
            + authoritative_effects["buffPower"]["precision"],
            17580,
        )

        material_amounts = {}
        for group_name in ("baseCraft", "precision100"):
            operation_count = recipe[group_name].get("operationCount", 1)
            for material in recipe[group_name]["materials"]:
                amount = material.get("amount", 0) + material.get("amountPerAttempt", 0) * operation_count
                material_amounts[material["key"]] = (
                    material_amounts.get(material["key"], 0) + amount
                )
        self.assertEqual(material_amounts, {
            "weatherCubeShell": 1,
            "ignoranceDream": 1200,
            "historiaQuartz": 2500,
            "primordialSoul": 5,
        })
        self.assertEqual(
            recipe["baseCraft"]["fixedGold"]
            + recipe["precision100"]["fixedGoldPerAttempt"]
            * recipe["precision100"]["operationCount"],
            200000000,
        )

        detail = {
            **target,
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
            "itemReinforceSkill": [],
            "itemBuff": {},
        }
        body, reason = normalize_relic_craft_target_equipment_body(
            target_config=target,
            target_detail=detail,
            normalized_status={"finalDamage": 62.5, "attackIncrease": 4000, "buffPower": 12930},
            precision=recipe["precision100"],
            authoritative_effects=authoritative_effects,
            icon_url="cube-icon",
            item_explain="cube explain",
        )
        self.assertEqual(reason, "")
        self.assertTrue(math.isclose(body["effects"]["finalDamage"], expected_final_damage, abs_tol=1e-10))
        self.assertEqual(body["effects"]["buffPower"], 17580)
        self.assertFalse(body["tuneUpgradeable"])

    def test_plague_heart_authoritative_effect_material_and_synergy_contract(self):
        recipe = self.heart_recipe
        authoritative_effects = recipe["authoritativeEffects"]

        self.assertEqual(recipe["target"]["slotId"], "SUPPORT")
        self.assertTrue(math.isclose(
            get_relic_craft_final_damage_percent(authoritative_effects),
            65.22,
            abs_tol=1e-10,
        ))
        self.assertEqual(
            authoritative_effects["buffPower"]["body"]
            + authoritative_effects["buffPower"]["precision"],
            17430,
        )
        self.assertEqual(
            authoritative_effects["conditionalEffects"]["blackFangSynergy"],
            {
                "dealerFinalDamagePercentPerItem": 3,
                "dealerEquipmentScoreMultiplier": 1.092552,
                "bufferBuffPowerPerItem": 75,
                "maxCount": 3,
                "aggregation": "multiplicative",
            },
        )

        materials = _build_materials(recipe, {
            "epicSoul": {
                "label": "에픽 소울 결정",
                "itemId": "epic-soul",
                "auction": {"minUnitPrice": 10, "averagePrice": 10, "listingCount": 1},
            },
            "primordialSoul": {
                "label": "태초 소울 결정",
                "itemId": "primordial-soul",
                "auction": {"minUnitPrice": 20, "averagePrice": 20, "listingCount": 1},
            },
        })
        material_by_key = {material["key"]: material for material in materials}
        self.assertEqual({key: row["amount"] for key, row in material_by_key.items()}, {
            "blackHeartPulse": 1,
            "plagueSeed": 1950,
            "epicSoul": 1500,
            "primordialSoul": 25,
        })
        self.assertEqual({key: row["craftAmount"] for key, row in material_by_key.items()}, {
            "blackHeartPulse": 1,
            "plagueSeed": 1200,
            "epicSoul": 500,
            "primordialSoul": 25,
        })
        self.assertEqual({key: row["tuneAmount"] for key, row in material_by_key.items()}, {
            "blackHeartPulse": 0,
            "plagueSeed": 750,
            "epicSoul": 1000,
            "primordialSoul": 0,
        })
        self.assertEqual({key: row["tuneAmountPerAttempt"] for key, row in material_by_key.items()}, {
            "blackHeartPulse": 0,
            "plagueSeed": 30,
            "epicSoul": 40,
            "primordialSoul": 0,
        })
        base_material_by_key = {
            material["key"]: material
            for material in recipe["baseCraft"]["materials"]
        }
        self.assertEqual(
            material_by_key["blackHeartPulse"]["itemId"],
            base_material_by_key["blackHeartPulse"]["itemId"],
        )
        self.assertEqual(
            material_by_key["plagueSeed"]["itemId"],
            base_material_by_key["plagueSeed"]["itemId"],
        )
        self.assertEqual(material_by_key["blackHeartPulse"]["auction"]["priceSource"], "displayOnly")
        self.assertEqual(material_by_key["plagueSeed"]["auction"]["minUnitPrice"], 0)
        self.assertEqual(
            recipe["baseCraft"]["fixedGold"]
            + recipe["precision100"]["fixedGoldPerAttempt"]
            * recipe["precision100"]["operationCount"],
            200000000,
        )
        self.assertNotIn("pilgrimSeal", material_by_key)

        target = dict(recipe["target"], itemId="plague-heart-target")
        detail = {
            **target,
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
            "itemReinforceSkill": [],
            "itemBuff": {},
        }
        body, reason = normalize_relic_craft_target_equipment_body(
            target_config=target,
            target_detail=detail,
            normalized_status={"attackIncrease": 4000},
            precision=recipe["precision100"],
            authoritative_effects=authoritative_effects,
            icon_url="heart-icon",
            item_explain="heart explain",
        )
        self.assertEqual(reason, "")
        self.assertTrue(math.isclose(body["effects"]["finalDamage"], 65.22, abs_tol=1e-10))
        self.assertEqual(body["effects"]["buffPower"], 17430)
        self.assertEqual(
            body["conditionalEffects"]["blackFangSynergy"]["bufferBuffPowerPerItem"],
            75,
        )

    def test_uses_detail_tune_set_point_without_local_fallback(self):
        body, reason = self.build_body(tune_set_point=187)
        self.assertEqual(reason, "")
        self.assertEqual(body["tuneSetPoint"], 187)

        missing_body, missing_reason = self.build_body(tune_set_point=0)
        self.assertEqual(missing_body, {})
        self.assertEqual(missing_reason, "missing_relic_craft_target_set_point")

    def test_rejects_missing_authoritative_effect_contract(self):
        malformed = json.loads(json.dumps(self.authoritative_effects))
        malformed["finalDamage"]["additionalMultipliers"][0][
            "objectDamagePerFinalDamagePercent"
        ] = 0
        body, reason = self.build_body(authoritative_effects=malformed)
        self.assertEqual(body, {})
        self.assertEqual(reason, "invalid_relic_craft_final_damage")

        body, reason = self.build_body(normalized_status={"finalDamage": 62.5, "buffPower": 12930})
        self.assertEqual(body, {})
        self.assertEqual(reason, "missing_relic_craft_attack_increase")

    def test_keeps_existing_2620_eligibility_boundary(self):
        equipment_rows = [
            {
                "slotId": "MAGIC_STON",
                "slotName": "마법석",
                "itemId": "current-magic-stone",
                "itemName": "칠흑의 정화 마법석",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 215}],
            },
            {
                "slotId": "WEAPON",
                "slotName": "무기",
                "itemId": "other-equipment",
                "itemName": "기타 장비",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 2400}],
            },
        ]

        result = build_relic_craft_recommendations_debug(equipment_rows, {})
        self.assertEqual(result["recommendations"], [])
        self.assertEqual(result["steps"], [{
            "reason": "below_relic_craft_minimum_equipment_set_point",
            "currentEquipmentSetPoint": 2615.0,
            "minimumEquipmentSetPoint": 2620.0,
        }])

    def test_eligible_candidate_keeps_effects_cost_and_set_point_contract(self):
        equipment_rows = [
            {
                "slotId": "MAGIC_STON",
                "slotName": "마법석",
                "itemId": "current-magic-stone",
                "itemName": "칠흑의 정화 마법석",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 215}],
            },
            {
                "slotId": "WEAPON",
                "slotName": "무기",
                "itemId": "other-equipment",
                "itemName": "기타 장비",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 2405}],
            },
        ]
        shared_item_buff = {
            "explain": "30레벨 버프 스킬 Lv +1\n50레벨 액티브 스킬 Lv +2",
            "reinforceSkill": [],
        }
        current_detail = {
            "itemId": "current-magic-stone",
            "itemName": "칠흑의 정화 마법석",
            "itemRarity": "에픽",
            "itemTypeDetail": "마법석",
            "itemStatus": [
                {"name": "공격력 증가", "value": "3189%"},
                {"name": "버프력", "value": 11220},
                {"name": "최종 데미지 증가", "value": "35.3%"},
            ],
            "itemBuff": shared_item_buff,
        }
        target_detail = {
            "itemId": self.target["itemId"],
            "itemName": self.target["itemName"],
            "itemRarity": self.target["itemRarity"],
            "itemTypeDetail": self.target["itemTypeDetail"],
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
            "itemStatus": [
                {"name": "공격력 증가", "value": "3729%"},
                {"name": "최종 데미지 증가", "value": "62.5%"},
            ],
            "itemBuff": shared_item_buff,
        }
        materials = [{
            "key": "perfumeBottle",
            "label": "힘을 잃은 기품의 향수병",
            "amount": 1,
            "auction": {"minUnitPrice": 1200000000},
        }]

        with patch(
            "server.candidates.relic_craft.fetch_item_details",
            return_value=[current_detail, target_detail],
        ), patch(
            "server.candidates.relic_craft._build_materials",
            return_value=materials,
        ):
            result = build_relic_craft_recommendations_debug(equipment_rows, {})

        self.assertEqual(len(result["recommendations"]), 1)
        row = result["recommendations"][0]
        self.assertEqual(row["currentEquipmentSetPoint"], 2620.0)
        self.assertEqual(row["targetEquipmentSetPoint"], 2550.0)
        self.assertEqual(row["minimumCurrentEquipmentSetPoint"], 2620.0)
        self.assertEqual(row["targetEquipmentBody"]["tuneSetPoint"], 145.0)
        self.assertEqual(row["targetEquipmentBody"]["effects"]["buffPower"], 17580.0)
        self.assertTrue(math.isclose(
            row["targetEquipmentBody"]["effects"]["finalDamage"],
            70.67376612,
            abs_tol=1e-8,
        ))
        self.assertEqual(row["expectedGold"], 200000000.0)
        self.assertEqual(row["craftFixedGold"], 100000000.0)
        self.assertEqual(row["tuneFixedGoldPerAttempt"], 4000000.0)
        self.assertEqual(row["materials"], materials)
        self.assertEqual(row["targetPrecisionPercent"], 100.0)
        self.assertEqual(row["precisionOperationCount"], 25)

    def test_builds_all_relic_craft_recommendations_together_when_ids_are_filled(self):
        database = json.loads(json.dumps(self.database))
        cube_recipe = database["crafts"][1]
        cube_recipe["target"]["itemId"] = "weather-cube-target"
        heart_recipe = database["crafts"][2]
        heart_recipe["target"]["itemId"] = "plague-heart-target"
        equipment_rows = [
            {
                "slotId": "MAGIC_STON",
                "slotName": "마법석",
                "itemId": "current-magic-stone",
                "itemName": "현재 마법석",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 215}],
            },
            {
                "slotId": "EARRING",
                "slotName": "귀걸이",
                "itemId": "current-earring",
                "itemName": "현재 귀걸이",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 215}],
            },
            {
                "slotId": "SUPPORT",
                "slotName": "보조장비",
                "itemId": "current-support",
                "itemName": "현재 보조장비",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 215}],
            },
            {
                "slotId": "WEAPON",
                "slotName": "무기",
                "itemId": "set-point-host",
                "itemName": "세트포인트 장비",
                "itemRarity": "에픽",
                "tune": [{"level": 0, "setPoint": 1975}],
            },
        ]
        shared_buff = {"explain": "", "reinforceSkill": []}
        details = [
            {
                "itemId": "current-magic-stone",
                "itemName": "현재 마법석",
                "itemRarity": "에픽",
                "itemTypeDetail": "마법석",
                "itemStatus": [
                    {"name": "공격력 증가", "value": "3100%"},
                    {"name": "버프력", "value": 11000},
                    {"name": "최종 데미지 증가", "value": "35%"},
                ],
                "itemBuff": shared_buff,
            },
            {
                "itemId": "current-earring",
                "itemName": "현재 귀걸이",
                "itemRarity": "에픽",
                "itemTypeDetail": "귀걸이",
                "itemStatus": [
                    {"name": "공격력 증가", "value": "3200%"},
                    {"name": "버프력", "value": 11100},
                    {"name": "최종 데미지 증가", "value": "36%"},
                ],
                "itemBuff": shared_buff,
            },
            {
                "itemId": "current-support",
                "itemName": "현재 보조장비",
                "itemRarity": "에픽",
                "itemTypeDetail": "보조장비",
                "itemStatus": [
                    {"name": "공격력 증가", "value": "3300%"},
                    {"name": "버프력", "value": 11200},
                    {"name": "최종 데미지 증가", "value": "37%"},
                ],
                "itemBuff": shared_buff,
            },
            {
                "itemId": self.target["itemId"],
                "itemName": self.target["itemName"],
                "itemRarity": self.target["itemRarity"],
                "itemTypeDetail": self.target["itemTypeDetail"],
                "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
                "itemStatus": [{"name": "공격력 증가", "value": "3729%"}],
                "itemBuff": shared_buff,
            },
            {
                "itemId": "weather-cube-target",
                "itemName": cube_recipe["target"]["itemName"],
                "itemRarity": cube_recipe["target"]["itemRarity"],
                "itemTypeDetail": cube_recipe["target"]["itemTypeDetail"],
                "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
                "itemStatus": [{"name": "공격력 증가", "value": "3800%"}],
                "itemBuff": shared_buff,
            },
            {
                "itemId": "plague-heart-target",
                "itemName": heart_recipe["target"]["itemName"],
                "itemRarity": heart_recipe["target"]["itemRarity"],
                "itemTypeDetail": heart_recipe["target"]["itemTypeDetail"],
                "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
                "itemStatus": [{"name": "공격력 증가", "value": "3900%"}],
                "itemBuff": shared_buff,
            },
        ]

        def build_materials(recipe, _material_prices):
            return [{
                "key": recipe["key"],
                "label": recipe["key"],
                "amount": 1,
                "auction": {"minUnitPrice": 1},
            }]

        with patch(
            "server.candidates.relic_craft.load_relic_craft_db",
            return_value=database,
        ), patch(
            "server.candidates.relic_craft.fetch_item_details",
            return_value=details,
        ) as fetch_details, patch(
            "server.candidates.relic_craft._build_materials",
            side_effect=build_materials,
        ):
            result = build_relic_craft_recommendations_debug(equipment_rows, {})

        self.assertEqual(
            [row["slot"] for row in result["recommendations"]],
            ["마법석", "귀걸이", "보조장비"],
        )
        self.assertEqual(
            [row["targetSlotId"] for row in result["recommendations"]],
            ["MAGIC_STON", "EARRING", "SUPPORT"],
        )
        self.assertEqual(fetch_details.call_count, 1)
        self.assertEqual(set(fetch_details.call_args.args[0]), {
            "current-magic-stone",
            "current-earring",
            "current-support",
            self.target["itemId"],
            "weather-cube-target",
            "plague-heart-target",
        })
        cube_row = result["recommendations"][1]
        self.assertTrue(math.isclose(
            cube_row["targetEffects"]["finalDamage"],
            78.86166335323423,
            abs_tol=1e-10,
        ))
        self.assertEqual(cube_row["targetEffects"]["buffPower"], 17580.0)
        self.assertEqual(cube_row["targetEquipmentBody"]["tuneUpgradeable"], False)
        self.assertEqual(cube_row["targetEquipmentSetPoint"], 2550.0)
        heart_row = result["recommendations"][2]
        self.assertTrue(math.isclose(
            heart_row["targetEffects"]["finalDamage"],
            65.22,
            abs_tol=1e-10,
        ))
        self.assertEqual(heart_row["targetEffects"]["buffPower"], 17430.0)
        self.assertEqual(
            heart_row["targetEquipmentBody"]["conditionalEffects"]["blackFangSynergy"],
            heart_recipe["authoritativeEffects"]["conditionalEffects"]["blackFangSynergy"],
        )
        self.assertEqual(heart_row["targetEquipmentSetPoint"], 2550.0)

    def test_calculation_constants_have_one_authoritative_source(self):
        helper_source = (ROOT / "server/equipment_body.py").read_text(encoding="utf-8")
        frontend_source = (ROOT / "src/dnfHellTool/enchantView.js").read_text(encoding="utf-8")
        relic_start = frontend_source.index("function getRelicCraftRows")
        relic_end = frontend_source.index("\nfunction attachEquipmentBodyBaseData", relic_start)
        relic_source = frontend_source[relic_start:relic_end]

        for forbidden in ("90900", "270000", "48.9", "13.1", "12930", "4650", "62.5"):
            self.assertNotIn(forbidden, helper_source)
            self.assertNotIn(forbidden, relic_source)
        self.assertIn("authoritativeEffects", (ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        self.assertNotIn("effectsByPrecision", (ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        self.assertNotIn('"calculator"', (ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        self.assertIn("replaceEquipmentBodyInRows", relic_source)
        self.assertNotIn("targetSlotId: 'MAGIC_STON'", relic_source)
        self.assertIn("제작 재료", frontend_source)
        self.assertIn("조율 재료", frontend_source)
        self.assertIn("craftAmount", frontend_source)
        self.assertIn("tuneAmount", frontend_source)
        self.assertIn("tuneAmountPerAttempt", (ROOT / "server/candidates/relic_craft.py").read_text(encoding="utf-8"))
        self.assertIn("조율 재료 (", frontend_source)
        black_fang_presenter_source = (ROOT / "server/presenters/black_fang_presenter.py").read_text(encoding="utf-8")
        self.assertIn('"sourceType": "blackFang"', black_fang_presenter_source)


if __name__ == "__main__":
    unittest.main()
