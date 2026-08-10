import unittest
from unittest.mock import patch

from server.candidates.raid_armor_upgrade import (
    build_raid_armor_upgrade_recommendations_debug,
)


class RaidArmorUpgradeRecommendationTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
