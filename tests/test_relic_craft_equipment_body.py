import json
import math
import unittest
from pathlib import Path
from unittest.mock import patch

from server.candidates.relic_craft import build_relic_craft_recommendations_debug
from server.equipment_body import (
    get_relic_craft_final_damage_percent,
    normalize_relic_craft_target_equipment_body,
)


ROOT = Path(__file__).resolve().parents[1]


class RelicCraftEquipmentBodyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database = json.loads((ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        cls.recipe = database["crafts"][0]
        cls.target = cls.recipe["target"]
        cls.authoritative_effects = cls.recipe["authoritativeEffects"]

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
        self.assertEqual(body["tuneSetPoint"], 145)

        aggregated_body, aggregated_reason = self.build_body(
            normalized_status={
                "finalDamage": 62.5,
                "attackIncrease": 3729.0,
                "buffPower": 17580,
            }
        )
        self.assertEqual(aggregated_reason, "")
        self.assertEqual(aggregated_body["effects"]["buffPower"], 17580.0)

    def test_uses_detail_tune_set_point_without_local_fallback(self):
        body, reason = self.build_body(tune_set_point=187)
        self.assertEqual(reason, "")
        self.assertEqual(body["tuneSetPoint"], 187)

        missing_body, missing_reason = self.build_body(tune_set_point=0)
        self.assertEqual(missing_body, {})
        self.assertEqual(missing_reason, "missing_relic_craft_target_set_point")

    def test_rejects_missing_authoritative_effect_contract(self):
        malformed = json.loads(json.dumps(self.authoritative_effects))
        malformed["finalDamage"]["objectDamagePerFinalDamagePercent"] = 0
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
        self.assertEqual(row["targetEquipmentBody"]["tuneSetPoint"], 145.0)
        self.assertEqual(row["targetEquipmentBody"]["effects"]["buffPower"], 17580.0)
        self.assertTrue(math.isclose(
            row["targetEquipmentBody"]["effects"]["finalDamage"],
            70.67376612,
            abs_tol=1e-8,
        ))
        self.assertEqual(row["expectedGold"], 200000000.0)
        self.assertEqual(row["materials"], materials)
        self.assertEqual(row["targetPrecisionPercent"], 100.0)
        self.assertEqual(row["precisionOperationCount"], 25)

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
        black_fang_presenter_source = (ROOT / "server/presenters/black_fang_presenter.py").read_text(encoding="utf-8")
        self.assertIn('"sourceType": "blackFang"', black_fang_presenter_source)


if __name__ == "__main__":
    unittest.main()
