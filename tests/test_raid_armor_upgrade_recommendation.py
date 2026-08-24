import json
import unittest
from pathlib import Path
from unittest.mock import patch

from server.candidates.raid_armor_upgrade import (
    build_raid_armor_upgrade_recommendations_debug,
)


class RaidArmorUpgradeRecommendationTest(unittest.TestCase):
    def test_final_transformation_uses_designation_equipment_for_right_slots(self):
        database = json.loads(
            Path("Docs/raid_armor_upgrade_db.json").read_text(encoding="utf-8")
        )
        transformation = database["finalTransformation"]
        expected_names = {
            "WRIST": "드러난 진실의 팔찌",
            "AMULET": "성스러운 믿음의 목걸이",
            "RING": "거룩한 희생의 반지",
            "SUPPORT": "초연한 청렴의 보조장비",
            "EARRING": "강인한 절제의 귀걸이",
            "MAGIC_STON": "무결한 순수의 마법석",
        }

        self.assertEqual(
            set(transformation["rightTargetsByFamily"]),
            set(transformation["targetsByFamily"]),
        )
        for targets in transformation["rightTargetsByFamily"].values():
            self.assertEqual(
                {slot_id: target["itemName"] for slot_id, target in targets.items()},
                expected_names,
            )
            self.assertTrue(all(target["itemId"] for target in targets.values()))

    def test_builds_id_based_stage_routes_and_costs(self):
        database = {
            "allowedTransitions": [
                {
                    "from": "base",
                    "to": "encroached",
                    "label": "잠식",
                    "fixedGold": 1_500_000,
                    "materials": [
                        {"key": "epicSoul", "amount": 3},
                        {"key": "plagueSeed", "amount": 480},
                    ],
                },
                {
                    "from": "encroached",
                    "to": "consecrated",
                    "label": "축성",
                    "fixedGold": 1_000_000,
                    "materials": [
                        {"key": "epicSoul", "amount": 1},
                        {"key": "dawnLightBud", "amount": 240},
                    ],
                },
                {
                    "from": "base",
                    "to": "consecrated",
                    "label": "축성",
                    "fixedGold": 2_500_000,
                    "materials": [
                        {"key": "epicSoul", "amount": 4},
                        {"key": "dawnLightBud", "amount": 360},
                    ],
                },
            ],
            "pieces": [{
                "familyKey": "test-set",
                "slotId": "JACKET",
                "stages": {
                    "base": {"itemId": "base-jacket", "itemName": "기본 상의"},
                    "encroached": {"itemId": "encroached-jacket", "itemName": "잠식 상의"},
                    "consecrated": {"itemId": "consecrated-jacket", "itemName": "축성 상의"},
                },
            }],
        }
        detail_by_id = {
            item_id: {
                "itemId": item_id,
                "itemName": item_name,
                "itemRarity": "에픽",
                "itemStatus": [{"name": "힘", "value": value}],
                "tune": [{"level": 0, "setPoint": set_point}],
            }
            for item_id, item_name, value, set_point in [
                ("base-jacket", "기본 상의", 100, 215),
                ("encroached-jacket", "잠식 상의", 110, 225),
                ("consecrated-jacket", "축성 상의", 120, 235),
            ]
        }
        material_prices = {
            "epicSoul": {
                "label": "에픽 소울 결정",
                "itemId": "epic-soul",
                "iconUrl": "epic-soul-icon",
                "auction": {"priceStatus": "priced", "minUnitPrice": 100},
            },
        }

        with patch(
            "server.candidates.raid_armor_upgrade.load_raid_armor_upgrade_db",
            return_value=database,
        ), patch(
            "server.candidates.raid_armor_upgrade.fetch_item_details",
            side_effect=lambda item_ids: [detail_by_id[item_id] for item_id in item_ids],
        ):
            result = build_raid_armor_upgrade_recommendations_debug(
                [{"slotId": "JACKET", "itemId": "base-jacket"}],
                material_prices,
            )

        rows = result["recommendations"]
        self.assertEqual(len(rows), 3)
        by_transition = {row["transitionKey"]: row for row in rows}
        self.assertEqual(by_transition["base:encroached"]["expectedGold"], 1_500_000)
        self.assertEqual(by_transition["base:consecrated"]["expectedGold"], 2_500_000)
        self.assertEqual(by_transition["encroached:consecrated"]["expectedGold"], 1_000_000)
        self.assertTrue(all(
            row["baseEquipmentBody"]["itemId"] == "base-jacket"
            for row in rows
        ))
        self.assertEqual(
            by_transition["encroached:consecrated"]["currentEquipmentBody"]["itemId"],
            "encroached-jacket",
        )
        self.assertEqual(
            by_transition["encroached:consecrated"]["requiredCurrentItemId"],
            "encroached-jacket",
        )
        seed = next(
            material
            for material in by_transition["base:encroached"]["materials"]
            if material["key"] == "plagueSeed"
        )
        self.assertEqual(seed["itemId"], "f4404a61f4522fa0a2a280366104033b")
        self.assertEqual(
            seed["iconUrl"],
            "https://img-api.neople.co.kr/df/items/f4404a61f4522fa0a2a280366104033b",
        )
        self.assertEqual(seed["amount"], 480)
        dawn = next(
            material
            for material in by_transition["base:consecrated"]["materials"]
            if material["key"] == "dawnLightBud"
        )
        self.assertEqual(dawn["iconUrl"], "/asset/enchant/dawnLightOrb.png")

    def test_builds_free_relic_designation_after_five_consecrated_armors(self):
        armor_slots = ["SHOULDER", "JACKET", "PANTS", "WAIST", "SHOES"]
        right_slots = ["AMULET", "WRIST", "RING", "SUPPORT", "MAGIC_STON", "EARRING"]
        database = {
            "allowedTransitions": [],
            "pieces": [{
                "familyKey": "test-set",
                "slotId": slot_id,
                "stages": {
                    "base": {
                        "itemId": f"base-{slot_id}",
                        "itemName": f"일반 {slot_id}",
                    },
                    "consecrated": {
                        "itemId": f"consecrated-{slot_id}",
                        "itemName": f"축성 {slot_id}",
                    },
                },
            } for slot_id in armor_slots],
            "finalTransformation": {
                "sourceStage": "consecrated",
                "requiredSlots": armor_slots,
                "targetsByFamily": {
                    "test-set": {
                        slot_id: {
                            "itemId": f"relic-{slot_id}",
                            "itemName": f"성유물 {slot_id}",
                        }
                        for slot_id in armor_slots
                    },
                },
                "rightTargetsByFamily": {
                    "test-set": {
                        slot_id: {
                            "itemId": f"target-{slot_id}",
                            "itemName": f"지목 {slot_id}",
                        }
                        for slot_id in right_slots
                    },
                },
            },
        }
        equipment = [
            {
                "slotId": slot_id,
                "itemId": f"base-{slot_id}",
                "itemName": f"일반 {slot_id}",
                "itemRarity": "에픽",
            }
            for slot_id in armor_slots
        ] + [
            {
                "slotId": slot_id,
                "itemId": "relic-magic" if slot_id == "MAGIC_STON" else f"current-{slot_id}",
                "itemName": "흑아 : 목걸이" if slot_id == "AMULET" else f"현재 {slot_id}",
                "itemRarity": "태초" if slot_id in {"AMULET", "WRIST", "RING"} else "에픽",
            }
            for slot_id in right_slots
        ]
        detail_by_id = {}
        for row in equipment:
            detail_by_id[row["itemId"]] = {
                **row,
                "itemName": row["itemName"],
                "itemStatus": [{"name": "힘", "value": 100}],
                "tune": [{"level": 0, "setPoint": 215}],
            }
        for slot_id in armor_slots:
            detail_by_id[f"consecrated-{slot_id}"] = {
                "itemId": f"consecrated-{slot_id}",
                "itemName": f"축성 {slot_id}",
                "itemRarity": "에픽",
                "setItemId": "test-set",
                "setItemName": "테스트 세트",
                "itemStatus": [{"name": "힘", "value": 110}],
                "tune": [{"level": 0, "setPoint": 225}],
            }
        for slot_id in armor_slots:
            detail_by_id[f"relic-{slot_id}"] = {
                "itemId": f"relic-{slot_id}",
                "itemName": f"성유물 {slot_id}",
                "itemRarity": "에픽",
                "setItemId": "test-set",
                "setItemName": "테스트 세트",
                "itemStatus": [{"name": "힘", "value": 120}],
                "tune": [{"level": 0, "setPoint": 235}],
            }
        for slot_id in right_slots:
            detail_by_id[f"target-{slot_id}"] = {
                "itemId": f"target-{slot_id}",
                "itemName": f"지목 {slot_id}",
                "itemRarity": "태초" if slot_id in {"AMULET", "WRIST", "RING"} else "에픽",
                "setItemId": "test-set",
                "setItemName": "테스트 세트",
                "itemStatus": [{"name": "힘", "value": 110}],
                "tune": [{"level": 0, "setPoint": 215}],
            }

        with patch(
            "server.candidates.raid_armor_upgrade.load_raid_armor_upgrade_db",
            return_value=database,
        ), patch(
            "server.candidates.raid_armor_upgrade.load_relic_craft_db",
            return_value={
                "crafts": [{
                    "enabled": True,
                    "target": {"itemId": "relic-magic"},
                }],
            },
        ), patch(
            "server.candidates.raid_armor_upgrade.fetch_item_details",
            side_effect=lambda item_ids: [detail_by_id[item_id] for item_id in item_ids],
        ):
            result = build_raid_armor_upgrade_recommendations_debug(
                equipment,
                {},
                [{"setItemId": "test-set"}],
            )
            incomplete = build_raid_armor_upgrade_recommendations_debug(
                equipment[1:],
                {},
                [{"setItemId": "test-set"}],
            )

        rows = result["recommendations"]
        self.assertEqual(len(rows), 1)
        designation = rows[0]
        self.assertEqual(designation["cardTitle"], "계시의 지목")
        self.assertEqual(designation["cardSubtitle"], "전체 장비")
        self.assertEqual(designation["upgradeStageLabel"], "축성")
        self.assertTrue(designation["freeAction"])
        self.assertEqual(designation["expectedGold"], 0)
        changes = designation["equipmentBodyChanges"]
        self.assertEqual(len(changes), 9)
        self.assertEqual(
            {change["slotId"] for change in changes},
            set(armor_slots) | {"WRIST", "RING", "SUPPORT", "EARRING"},
        )
        self.assertEqual(
            {
                change["requiredCurrentItemId"]
                for change in changes
                if change["slotId"] in armor_slots
            },
            {f"consecrated-{slot_id}" for slot_id in armor_slots},
        )
        for change in changes:
            if change["slotId"] in right_slots:
                self.assertEqual(
                    change["targetEquipmentBody"]["effects"],
                    change["currentEquipmentBody"]["effects"],
                )
                self.assertEqual(
                    change["targetEquipmentBody"]["tuneSetPoint"],
                    change["currentEquipmentBody"]["tuneSetPoint"],
                )
        self.assertEqual(incomplete["recommendations"], [])


if __name__ == "__main__":
    unittest.main()
