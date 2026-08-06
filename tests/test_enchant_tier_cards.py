import unittest
from unittest.mock import patch

from server import enchant_service


class EnchantTierCardTest(unittest.TestCase):
    def test_reuses_enriched_price_cache_without_item_detail_fetch(self):
        cached_cards = [{
            "itemId": "card-1",
            "sources": [{
                "slot": "상의",
                "tier": "종결",
                "role": "dealer",
                "effects": {"finalDamage": 3},
                "reinforceSkill": [],
            }],
        }]
        previous_cache = dict(enchant_service._ENCHANT_PRICE_CACHE)
        previous_tier_cache = enchant_service._ENCHANT_TIER_CARD_CACHE
        try:
            enchant_service._ENCHANT_TIER_CARD_CACHE = None
            enchant_service._ENCHANT_PRICE_CACHE.clear()
            enchant_service._ENCHANT_PRICE_CACHE.update({
                "expires_at": 0,
                "refreshing": False,
                "payload": {
                    "schemaVersion": enchant_service.ENCHANT_PRICE_CACHE_SCHEMA_VERSION,
                    "cards": cached_cards,
                },
            })
            with patch.object(
                enchant_service,
                "load_price_cache_from_disk",
            ), patch.object(
                enchant_service,
                "fetch_item_details",
            ) as fetch_item_details:
                result = enchant_service.load_enchant_tier_cards()

            self.assertEqual(result, cached_cards)
            fetch_item_details.assert_not_called()
        finally:
            enchant_service._ENCHANT_TIER_CARD_CACHE = previous_tier_cache
            enchant_service._ENCHANT_PRICE_CACHE.clear()
            enchant_service._ENCHANT_PRICE_CACHE.update(previous_cache)


if __name__ == "__main__":
    unittest.main()
