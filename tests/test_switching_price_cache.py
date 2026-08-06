import unittest
from unittest.mock import patch

from server import character_equipment_service
from server.repositories import auction_repository, resolved_price_repository


class SwitchingPriceCacheTest(unittest.TestCase):
    def setUp(self):
        resolved_price_repository._RESOLVED_PRICE_CACHE.clear()
        self._persistent_patcher = patch.object(
            auction_repository,
            "remember_last_known_auction_item",
            return_value=True,
        )
        self._persistent_patcher.start()

    def tearDown(self):
        self._persistent_patcher.stop()
        resolved_price_repository._RESOLVED_PRICE_CACHE.clear()

    def test_switching_title_keeps_last_completed_enchant_price(self):
        title_config = {
            "itemId": "switch-title",
            "itemName": "버프강화 칭호",
            "enchantBuffSkillLevelDelta": 0,
        }
        row = {
            "itemId": "switch-title",
            "itemName": "버프강화 칭호",
            "itemTypeDetail": "칭호",
            "itemRarity": "레어",
            "unitPrice": 123,
            "regCount": 1,
            "enchant": {"reinforceSkill": []},
        }
        with patch.object(
            character_equipment_service,
            "get_auction_rows",
            side_effect=[[row], []],
        ) as lookup:
            first = character_equipment_service.load_switching_title_price_candidate(
                title_config,
                "마법사(여)",
                "환수 폭주",
            )
            cache_key = (
                "switching_title",
                character_equipment_service.SWITCHING_TITLE_RESOLVED_PRICE_CACHE_VERSION,
                "switch-title",
                "마법사(여)",
                "환수 폭주",
                0,
            )
            resolved_price_repository._RESOLVED_PRICE_CACHE[cache_key]["expires_at"] = 0
            second = character_equipment_service.load_switching_title_price_candidate(
                title_config,
                "마법사(여)",
                "환수 폭주",
            )

        self.assertEqual(first["auction"]["minUnitPrice"], 123)
        self.assertEqual(second["auction"]["minUnitPrice"], 123)
        self.assertTrue(second["auction"]["isLastKnownPrice"])
        self.assertEqual(second["auction"]["lookupPriceStatus"], "unlisted")
        self.assertEqual(lookup.call_count, 2)

    def test_switching_title_price_requires_the_buff_skill_enchant(self):
        title_config = {
            "itemId": "switch-title",
            "itemName": "버프강화 칭호",
            "enchantBuffSkillLevelDelta": 2,
        }
        plain_row = {
            "itemId": "switch-title",
            "itemName": "버프강화 칭호",
            "itemTypeDetail": "칭호",
            "itemRarity": "레어",
            "unitPrice": 100,
            "regCount": 1,
            "enchant": {"reinforceSkill": []},
        }
        enchanted_row = {
            **plain_row,
            "unitPrice": 300,
            "enchant": {
                "reinforceSkill": [{
                    "jobName": "마법사(여)",
                    "skills": [{"name": "환수 폭주", "value": 2}],
                }],
            },
        }
        with patch.object(
            character_equipment_service,
            "get_auction_rows",
            return_value=[plain_row, enchanted_row],
        ):
            result = character_equipment_service.load_switching_title_price_candidate(
                title_config,
                "마법사(여)",
                "환수 폭주",
            )

        self.assertEqual(result["auction"]["minUnitPrice"], 300)
        self.assertEqual(
            result["enchant"]["reinforceSkill"][0]["skills"][0]["value"],
            2,
        )

    def test_switching_fragment_uses_common_auction_price_repository(self):
        expected = {
            "priceStatus": "priced",
            "minUnitPrice": 456,
        }
        with patch.object(
            character_equipment_service,
            "get_lowest_auction_price",
            return_value=expected,
        ) as lookup:
            result = character_equipment_service.get_lowest_switching_fragment_auction("fragment")

        self.assertEqual(result, expected)
        lookup.assert_called_once_with("fragment")


if __name__ == "__main__":
    unittest.main()
