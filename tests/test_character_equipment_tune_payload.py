import unittest
from unittest.mock import patch

from server.calculators.oath_tune_calculator import build_oath_set_point_context
from server.candidates.oath_transcend import build_oath_transcend_recommendations_debug
from server.character_equipment_service import build_equipment_upgrade_payload


class EquipmentTunePayloadTest(unittest.TestCase):
    def test_other_family_set_point_uses_zero_current_contribution(self):
        context = build_oath_set_point_context(
            500,
            165,
            165,
            {
                "stageRows": [
                    {
                        "requiredPoint": 0,
                        "name": "기본",
                        "rarity": "레어",
                        "finalDamagePercent": 0,
                        "buffPower": 0,
                    },
                ],
                "blessingRows": [
                    {
                        "startPoint": 0,
                        "stepPoint": 25,
                        "finalDamagePercent": 0,
                        "finalDamagePerStep": 0,
                        "buffPower": 0,
                        "buffPowerPerStep": 0,
                    },
                ],
            },
            current_set_point_contribution=0,
        )

        self.assertEqual(context["currentSlotSetPoint"], 165)
        self.assertEqual(context["currentSetPointContribution"], 0)
        self.assertEqual(context["targetSetPoint"], 665)

    def test_non_equipment_slot_is_not_tuneable(self):
        for tune_row in (
            {"level": 0, "setPoint": 0, "upgrade": True},
            {"level": 0, "setPoint": 0},
        ):
            with self.subTest(tune_row=tune_row):
                payload = build_equipment_upgrade_payload({
                    "slotName": "보조무기",
                    "slotId": "SUPPORT_WEAPON",
                    "itemId": "balmung",
                    "itemName": "살룡검 발뭉",
                    "itemRarity": "에픽",
                    "tune": [tune_row],
                })

                self.assertFalse(payload["tuneUpgradeable"])
                self.assertEqual(payload["tuneRemaining"], 0)

    def test_regular_special_equipment_slots_remain_tuneable(self):
        for slot_name, slot_id in (("귀걸이", "EARRING"), ("마법석", "MAGIC_STON")):
            with self.subTest(slot_name=slot_name):
                payload = build_equipment_upgrade_payload({
                    "slotName": slot_name,
                    "slotId": slot_id,
                    "itemId": slot_id.lower(),
                    "itemName": f"정상 {slot_name}",
                    "itemRarity": "에픽",
                    "tune": [{"level": 0, "setPoint": 215, "upgrade": True}],
                })

                self.assertTrue(payload["tuneUpgradeable"])
                self.assertEqual(payload["tuneRemaining"], 3)
                self.assertEqual(payload["tuneSetPoint"], 215)

    def test_primeval_set_point_is_preserved_without_tune_eligibility(self):
        payload = build_equipment_upgrade_payload({
            "slotName": "보조장비",
            "slotId": "SUPPORT",
            "itemId": "heart",
            "itemName": "만병을 잉태한 역병의 심장",
            "itemRarity": "태초",
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
        })

        self.assertFalse(payload["tuneUpgradeable"])
        self.assertEqual(payload["tuneRemaining"], 0)
        self.assertEqual(payload["tuneSetPoint"], 145)

    @patch("server.candidates.oath_transcend.build_oath_transcend_materials", side_effect=lambda rows: rows)
    @patch("server.candidates.oath_transcend.build_oath_set_point_context")
    @patch("server.candidates.oath_transcend.get_oath_transcend_effects", side_effect=lambda detail: detail.get("effects") or {})
    @patch("server.candidates.oath_transcend.resolve_oath_transcend_target_detail")
    @patch("server.candidates.oath_transcend.fetch_item_details")
    def test_mixed_oath_families_target_main_family_and_replace_other_family_first(
        self,
        fetch_item_details_mock,
        resolve_target_detail_mock,
        _get_effects_mock,
        set_point_context_mock,
        _build_materials_mock,
    ):
        crystals = [
            {"itemId": "a-unique", "itemName": "A : 미약한 광휘 결정", "itemRarity": "유니크", "setPoint": 80},
            {"itemId": "a-legend", "itemName": "A : 찬란한 광휘 결정", "itemRarity": "레전더리", "setPoint": 90},
            {"itemId": "unique-epic", "itemName": "잔향의 안개 결정", "itemRarity": "에픽", "setPoint": 165},
            {"itemId": "b-unique", "itemName": "B : 미약한 광휘 결정", "itemRarity": "유니크", "setPoint": 85},
            {"itemId": "b-legend", "itemName": "B : 찬란한 광휘 결정", "itemRarity": "레전더리", "setPoint": 95},
        ]
        current_damage_by_id = {
            "a-unique": 1,
            "a-legend": 2,
            "unique-epic": 7,
            "b-unique": 8,
            "b-legend": 9,
        }

        def fetch_details(item_ids):
            return [
                {
                    "itemId": item_id,
                    "effects": {"finalDamage": current_damage_by_id[item_id]},
                }
                for item_id in item_ids
                if item_id in current_damage_by_id
            ]

        def resolve_target(_current_name, target_rarity, _unique_keyword, family_name):
            self.assertEqual(family_name, "A")
            return {
                "itemId": f"a-{target_rarity}",
                "itemName": f"A : {target_rarity} 광휘 결정",
                "itemRarity": target_rarity,
                "effects": {"finalDamage": 20 if target_rarity == "에픽" else 30},
                "setPoint": 130 if target_rarity == "에픽" else 145,
            }

        fetch_item_details_mock.side_effect = fetch_details
        resolve_target_detail_mock.side_effect = resolve_target

        def build_set_point_context(
            current_total,
            current_slot,
            target_slot,
            _db,
            current_contribution=None,
        ):
            contribution = current_slot if current_contribution is None else current_contribution
            return {
                "currentSetPoint": current_total,
                "targetSetPoint": current_total - contribution + target_slot,
                "currentSlotSetPoint": current_slot,
                "currentSetPointContribution": contribution,
                "targetSlotSetPoint": target_slot,
                "skillDamageMultiplier": 1.01,
                "oathSetBuffPowerDelta": 10,
            }

        set_point_context_mock.side_effect = build_set_point_context

        result = build_oath_transcend_recommendations_debug({
            "oath": {
                "setInfo": {
                    "setName": "경계의 A 서약",
                    "setOptionName": "A : 미스틱 웨폰",
                    "setPoint": {"current": 350},
                },
                "crystal": crystals,
            },
        })
        epic_variant = next(
            row for row in result["recommendations"]
            if row["targetRarity"] == "에픽" and row["variantCount"] == 5
        )

        self.assertEqual(epic_variant["targetFamilyName"], "A")
        self.assertEqual(epic_variant["variantTotal"], 5)
        self.assertEqual(
            [entry["slotIndex"] for entry in epic_variant["decisionPlan"]],
            [3, 4, 0, 1, 2],
        )
        self.assertEqual(
            [entry["currentSetPointContribution"] for entry in epic_variant["decisionPlan"]],
            [0, 0, 80, 90, 165],
        )
        self.assertEqual(
            {entry["targetFamilyName"] for entry in epic_variant["decisionCandidatePool"]},
            {"A"},
        )


if __name__ == "__main__":
    unittest.main()
