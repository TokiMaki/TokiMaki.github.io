import json
import math
import unittest
from pathlib import Path

from server.equipment_body import (
    PERFUME_ITEM_ID,
    get_perfume_final_damage_percent,
    normalize_perfume_target_equipment_body,
)


ROOT = Path(__file__).resolve().parents[1]


class RelicCraftEquipmentBodyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database = json.loads((ROOT / "Docs/relic_craft_db.json").read_text(encoding="utf-8"))
        cls.recipe = database["crafts"][0]

    def build_body(self, *, tune_set_point=187, precision=None, normalized_status=None):
        target = self.recipe["target"]
        detail = {
            "itemId": PERFUME_ITEM_ID,
            "itemName": target["itemName"],
            "itemRarity": target["itemRarity"],
            "itemTypeDetail": target["itemTypeDetail"],
            "tune": [{"level": 0, "setPoint": tune_set_point, "upgrade": False}],
            "itemReinforceSkill": [],
            "itemBuff": {},
        }
        return normalize_perfume_target_equipment_body(
            target_config=target,
            target_detail=detail,
            normalized_status=normalized_status or {
                "finalDamage": 62.5,
                "attackIncrease": 45.0,
                "buffPower": 12930,
            },
            precision=precision or self.recipe["precision100"],
            icon_url="icon",
            item_explain="explain",
        )

    def test_normalizes_authoritative_final_damage_and_total_buff_power_once(self):
        body, reason = self.build_body()
        self.assertEqual(reason, "")
        self.assertTrue(math.isclose(get_perfume_final_damage_percent(), 70.67376612, abs_tol=1e-8))
        self.assertTrue(math.isclose(body["effects"]["finalDamage"], 70.67376612, abs_tol=1e-8))
        self.assertNotEqual(body["effects"]["finalDamage"], 62.5)
        self.assertEqual(body["effects"]["buffPower"], 17580.0)
        self.assertEqual(body["effects"]["attackIncrease"], 45.0)
        self.assertNotIn("precisionFinalDamage", body["effects"])
        self.assertNotIn("objectMultiplier", body["effects"])

        aggregated_body, aggregated_reason = self.build_body(
            normalized_status={
                "finalDamage": 62.5,
                "attackIncrease": 45.0,
                "buffPower": 17580,
            }
        )
        self.assertEqual(aggregated_reason, "")
        self.assertEqual(aggregated_body["effects"]["buffPower"], 17580.0)

    def test_uses_detail_tune_set_point_without_docs_145_fallback(self):
        body, reason = self.build_body(tune_set_point=187)
        self.assertEqual(reason, "")
        self.assertEqual(body["tuneSetPoint"], 187)
        self.assertNotEqual(body["tuneSetPoint"], 145)

        missing_body, missing_reason = self.build_body(tune_set_point=0)
        self.assertEqual(missing_body, {})
        self.assertEqual(missing_reason, "missing_relic_craft_target_set_point")

    def test_stops_candidate_when_precision_semantics_are_missing(self):
        precision = json.loads(json.dumps(self.recipe["precision100"]))
        precision["effectsByPrecision"]["milestones"][-1]["finalDamage"] = 0
        body, reason = self.build_body(precision=precision)
        self.assertEqual(body, {})
        self.assertEqual(reason, "invalid_relic_craft_precision_final_damage")

    def test_effect_normalization_is_independent_from_cost_resolution(self):
        source = (ROOT / "server/candidates/relic_craft.py").read_text(encoding="utf-8")
        normalize_index = source.index("normalize_perfume_target_equipment_body(")
        material_index = source.index("materials = _build_materials(")
        self.assertLess(normalize_index, material_index)
        helper_source = (ROOT / "server/equipment_body.py").read_text(encoding="utf-8")
        self.assertNotIn("material_prices", helper_source)
        self.assertNotIn("expectedGold", helper_source)

    def test_frontend_has_no_precision_or_object_recalculation(self):
        source = (ROOT / "src/dnfHellTool/enchantView.js").read_text(encoding="utf-8")
        relic_start = source.index("function getRelicCraftRows")
        relic_end = source.index("\nfunction attachBlackFangBaseBodyData", relic_start)
        relic_source = source[relic_start:relic_end]
        for forbidden in ("90900", "270000", "48.9", "13.1", "62.5"):
            self.assertNotIn(forbidden, relic_source)
        self.assertIn("replaceEquipmentBodyInRows", relic_source)
        self.assertNotIn("replaceRelicCraftBody", source)
        self.assertNotIn("replaceBlackFangBody", source)


if __name__ == "__main__":
    unittest.main()
