import unittest
from unittest.mock import patch

from server.calculators.oath_tune_calculator import build_oath_set_point_context
from server.candidates.oath_transcend import build_oath_transcend_recommendations_debug
from server.character_equipment_service import (
    build_equipment_upgrade_payload,
    build_oath_upgrade_payload,
    get_effective_equipment_total_set_point,
    normalize_oath_body_status,
    resolve_oath_body_upgrade_targets,
    resolve_primeval_oath_upgrade_target,
)
from server.data_store import get_raid_armor_stage_by_item_id, load_raid_armor_upgrade_db


class EquipmentTunePayloadTest(unittest.TestCase):
    def test_oath_body_status_removes_rarity_base_stat(self):
        for rarity, raw_stat, option_stat in (
            ("유니크", 328, 298),
            ("레전더리", 385, 350),
            ("에픽", 440, 400),
            ("태초", 495, 450),
        ):
            status = [
                {"name": name, "value": raw_stat}
                for name in ("힘", "지능", "체력", "정신력")
            ]
            self.assertEqual(normalize_oath_body_status(status, rarity)["allStat"], option_stat)

    @patch("server.character_equipment_service.fetch_item_details")
    @patch("server.character_equipment_service.search_items_by_name")
    def test_primeval_oath_upgrade_target_uses_same_family_detail(self, search_mock, detail_mock):
        search_mock.return_value = [{
            "itemId": "primeval-oath",
            "itemName": "강림한 여우 서약",
            "itemRarity": "태초",
            "itemTypeDetail": "서약",
        }]
        detail_mock.return_value = [{
            "itemId": "primeval-oath",
            "itemName": "강림한 여우 서약",
            "itemRarity": "태초",
            "setItemId": "fox-set",
            "itemStatus": [
                {"name": "최종 데미지 증가", "value": 57},
                {"name": "힘", "value": 495},
                {"name": "지능", "value": 495},
                {"name": "체력", "value": 495},
                {"name": "정신력", "value": 495},
            ],
            "oath": {"point": 655},
        }]

        target = resolve_primeval_oath_upgrade_target(
            {"itemName": "부름에 이끌린 여우 서약", "itemRarity": "레전더리"},
            {"setOptionName": "여우 : 초월"},
            {"setItemId": "fox-set"},
        )

        self.assertEqual(target["itemId"], "primeval-oath")
        self.assertEqual(target["setPoint"], 655)
        self.assertEqual(target["effects"]["finalDamage"], 57)
        self.assertEqual(target["effects"]["allStat"], 450)
        self.assertEqual(target["acquisitionOptions"][0]["amount"], 2)
        self.assertEqual(target["acquisitionOptions"][0]["displayLabel"], "광휘")
        self.assertEqual(
            target["acquisitionOptions"][0]["materialIconUrl"],
            "/asset/material/radiant-trace.png",
        )

    @patch("server.character_equipment_service.fetch_item_details")
    @patch("server.character_equipment_service.search_items_by_name")
    def test_oath_body_upgrade_targets_include_each_higher_rarity(self, search_mock, detail_mock):
        rarities = ["레전더리", "에픽", "태초"]
        search_mock.return_value = [{
            "itemId": f"{rarity}-oath",
            "itemName": f"{rarity} 여우 서약",
            "itemRarity": rarity,
            "itemTypeDetail": "서약",
        } for rarity in rarities]
        base_stats = {
            "레전더리": 35,
            "에픽": 40,
            "태초": 45,
        }
        option_stats = {
            "레전더리": 350,
            "에픽": 400,
            "태초": 450,
        }
        detail_mock.return_value = [{
            "itemId": f"{rarity}-oath",
            "itemName": f"{rarity} 여우 서약",
            "itemRarity": rarity,
            "setItemId": "fox-set",
            "itemStatus": [
                {"name": "최종 데미지 증가", "value": 20 + index * 10},
                *[
                    {"name": name, "value": option_stats[rarity] + base_stats[rarity]}
                    for name in ("힘", "지능", "체력", "정신력")
                ],
            ],
            "oath": {"point": 300 + index * 100},
        } for index, rarity in enumerate(rarities)]

        targets = resolve_oath_body_upgrade_targets(
            {"itemName": "유니크 여우 서약", "itemRarity": "유니크"},
            {"setOptionName": "여우 : 초월"},
            {"setItemId": "fox-set"},
        )

        self.assertEqual([target["itemRarity"] for target in targets], rarities)
        self.assertEqual([target["effects"]["allStat"] for target in targets], [350, 400, 450])
        self.assertNotIn("acquisitionOptions", targets[0])
        self.assertNotIn("acquisitionOptions", targets[1])
        self.assertEqual(targets[2]["acquisitionOptions"][0]["amount"], 2)

    @patch("server.character_equipment_service.fetch_item_details")
    @patch("server.character_equipment_service.search_items_by_name")
    def test_primeval_oath_upgrade_target_falls_back_to_item_name_family(self, search_mock, detail_mock):
        search_mock.return_value = [{
            "itemId": "primeval-oath",
            "itemName": "행운의 태초 서약",
            "itemRarity": "태초",
            "itemTypeDetail": "서약",
        }]
        detail_mock.return_value = [{
            "itemId": "primeval-oath",
            "itemName": "행운의 태초 서약",
            "itemRarity": "태초",
            "setItemId": "serendipity-set",
            "itemStatus": [{"name": "최종 데미지 증가", "value": 57}],
            "oath": {"point": 655},
        }]

        target = resolve_primeval_oath_upgrade_target(
            {"itemName": "필연성의 행운 서약", "itemRarity": "에픽"},
            {},
            {"setItemId": "serendipity-set"},
        )

        search_mock.assert_called_once_with("행운 서약", word_type="full", limit=30)
        self.assertEqual(target["itemId"], "primeval-oath")

    @patch("server.character_equipment_service.fetch_item_details")
    @patch("server.character_equipment_service.search_items_by_name")
    def test_mist_oath_upgrade_targets_use_equipment_set_family(self, search_mock, detail_mock):
        rarities = ["유니크", "레전더리", "에픽", "태초"]
        search_mock.return_value = [{
            "itemId": f"{rarity}-oath",
            "itemName": f"{rarity} 무리 서약",
            "itemRarity": rarity,
            "itemTypeDetail": "서약",
        } for rarity in rarities]
        detail_mock.return_value = [{
            "itemId": f"{rarity}-oath",
            "itemName": f"{rarity} 무리 서약",
            "itemRarity": rarity,
            "setItemId": "pack-set",
            "itemStatus": [{"name": "최종 데미지 증가", "value": 20 + index * 10}],
            "oath": {"point": 165 + index * 100},
        } for index, rarity in enumerate(rarities)]

        targets = resolve_oath_body_upgrade_targets(
            {"itemName": "영겁의 안개 서약", "itemRarity": "에픽"},
            {},
            {},
            "pack-set",
        )

        search_mock.assert_called_once_with("서약", max_pages=2, word_type="full", limit=30)
        self.assertEqual([target["itemRarity"] for target in targets], rarities)

    def test_primeval_oath_upgrade_target_excludes_primeval(self):
        self.assertEqual(resolve_primeval_oath_upgrade_target(
            {"itemName": "강림한 여우 서약", "itemRarity": "태초"}, {}, {},
        ), {})

    def test_effective_equipment_set_point_uses_oath_adjusted_active_point(self):
        self.assertEqual(get_effective_equipment_total_set_point({
            "equipment": [{"tune": [{"setPoint": 2525}]}],
            "setItemInfo": [{"active": {"setPoint": {"current": 2550}}}],
        }), 2550)

    @patch("server.character_equipment_service.fetch_item_details", return_value=[])
    def test_oath_upgrade_level_uses_unlocked_option_count(self, _fetch_item_details_mock):
        payload = build_oath_upgrade_payload({
            "oath": {
                "info": {
                    "itemId": "oath",
                    "itemName": "테스트 서약",
                    "oathUpgrade": {
                        "options": [
                            {"stepName": "첫 번째 진의"},
                            {"stepName": "두 번째 진의"},
                            {"stepName": "세 번째 진의"},
                        ],
                    },
                },
                "setInfo": {},
                "crystal": [],
            },
        })

        self.assertEqual(payload["oathUpgradeLevel"], 3)

    @patch("server.character_equipment_service.resolve_oath_body_upgrade_targets", return_value=[
        {"effects": {"attackIncrease": 2337.5}},
        {"effects": {"attackIncrease": 2337.5}},
    ])
    @patch("server.character_equipment_service.fetch_item_details")
    def test_mist_oath_effects_preserve_base_status_fields(
        self,
        fetch_item_details_mock,
        _resolve_targets_mock,
    ):
        fetch_item_details_mock.return_value = [{
            "itemId": "mist-oath",
            "itemStatus": [
                {"name": "최종 데미지 증가", "value": 62.5},
            ],
        }]
        payload = build_oath_upgrade_payload({
            "oath": {
                "info": {
                    "itemId": "mist-oath",
                    "itemName": "영겁의 안개 서약",
                    "itemRarity": "에픽",
                },
                "setInfo": {},
                "crystal": [],
            },
        }, {
            "mistAssimilation": {
                "status": [
                    {"name": "최종 데미지 증가", "value": 53},
                    {"name": "버프력", "value": 8893},
                ],
            },
        })

        self.assertEqual(payload["effects"]["finalDamage"], 53)
        self.assertEqual(payload["effects"]["attackIncrease"], 2337.5)
        self.assertEqual(payload["effects"]["buffPower"], 8893)

    @patch("server.character_equipment_service.fetch_item_details", return_value=[])
    def test_oath_upgrade_payload_preserves_borrowed_set_point(self, _fetch_item_details_mock):
        payload = build_oath_upgrade_payload({
            "oath": {
                "info": {"setPoint": 655},
                "setInfo": {"active": {"setPoint": {"current": 2485}}},
                "crystal": [{"setPoint": 1855}],
            },
        })

        self.assertEqual(payload["setPoint"], 2485)
        self.assertEqual(payload["rawSetPoint"], 2510)
        self.assertEqual(payload["reportedSetPoint"], 2485)
        self.assertEqual(payload["borrowedSetPoint"], 25)

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

    def test_named_unique_equipment_is_not_treated_as_relic_craft_equipment(self):
        payload = build_equipment_upgrade_payload({
            "slotName": "상의",
            "slotId": "JACKET",
            "itemId": "relic-jacket",
            "itemName": "고유 : 테스트 상의",
            "itemRarity": "에픽",
            "tune": [{"level": 0, "setPoint": 215, "upgrade": True}],
        })

        self.assertFalse(payload["isRelic"])
        self.assertFalse(payload["tuneUpgradeable"])
        self.assertEqual(payload["tuneRemaining"], 0)

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

    def test_raid_armor_stage_uses_registered_item_ids(self):
        database = load_raid_armor_upgrade_db()
        consecrated = database["pieces"][0]["stages"]["consecrated"]
        transformation = database["finalTransformation"]
        family_targets = next(iter(transformation["targetsByFamily"].values()))
        relic = family_targets[transformation["requiredSlots"][0]]

        self.assertEqual(
            get_raid_armor_stage_by_item_id(consecrated["itemId"]),
            "consecrated",
        )
        self.assertEqual(get_raid_armor_stage_by_item_id(relic["itemId"]), "relic")
        payload = build_equipment_upgrade_payload({
            "slotName": "머리어깨",
            "slotId": "SHOULDER",
            "itemId": consecrated["itemId"],
            "itemName": consecrated["itemName"],
            "itemRarity": "에픽",
            "tune": [{"level": 0, "setPoint": 215, "upgrade": False}],
        })
        self.assertEqual(payload["raidArmorStage"], "consecrated")

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
