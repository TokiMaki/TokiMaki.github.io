import time
import unittest
from unittest.mock import patch

from server.price_cache import get_price_cache_ttl_seconds
from server.repositories import material_price_repository
from server.repositories.auction_repository import (
    _lowest_auction_price_from_rows,
    build_unavailable_auction_price,
    build_unlisted_auction_price,
)


class AuctionPriceStatusTest(unittest.TestCase):
    def tearDown(self):
        material_price_repository._UPGRADE_MATERIAL_PRICE_CACHE.clear()

    def test_successful_price_and_empty_listing_have_distinct_statuses(self):
        priced = _lowest_auction_price_from_rows([
            {
                "unitPrice": 123,
                "regCount": 2,
                "upgrade": 0,
                "upgradeMax": 0,
            },
        ])
        unlisted = _lowest_auction_price_from_rows([])

        self.assertEqual(priced["priceStatus"], "priced")
        self.assertEqual(priced["minUnitPrice"], 123)
        self.assertEqual(unlisted["priceStatus"], "unlisted")
        self.assertIsNone(unlisted["minUnitPrice"])
        self.assertEqual(
            material_price_repository.UPGRADE_MATERIAL_PRICE_ITEMS["harmonyCrystal"]["itemId"],
            "1f575027600618cabf8a3516601dfd29",
        )
        self.assertEqual(
            material_price_repository.UPGRADE_MATERIAL_PRICE_ITEMS["lionCore"]["itemId"],
            "01a0ba48b5af060379a11fe43cc2b517",
        )
        self.assertNotIn(
            "highElementalCrystal",
            material_price_repository.UPGRADE_MATERIAL_DISPLAY_ITEMS,
        )
        self.assertEqual(
            material_price_repository.find_upgrade_material_price_config_by_label(
                "태초 소울 결정"
            )["itemId"],
            "d288ebf406a65f4ec23d1f9c33227888",
        )

    def test_failed_lookup_is_unavailable_and_uses_short_cache_ttl(self):
        unavailable = build_unavailable_auction_price()

        self.assertEqual(unavailable["priceStatus"], "unavailable")
        self.assertIsNone(unavailable["minUnitPrice"])
        self.assertEqual(get_price_cache_ttl_seconds({"errors": []}), 600)
        self.assertEqual(get_price_cache_ttl_seconds({"errors": [{"error": "temporary"}]}), 60)

    def test_material_lookup_failure_is_not_zero_and_retries_after_one_minute(self):
        started_at = time.time()
        with (
            patch.object(
                material_price_repository,
                "UPGRADE_MATERIAL_PRICE_ITEMS",
                {"sample": {"label": "표본", "itemId": "sample-id"}},
            ),
            patch.object(
                material_price_repository,
                "get_lowest_auction_price",
                side_effect=RuntimeError("temporary"),
            ),
        ):
            payload = material_price_repository.load_upgrade_material_prices()

        auction = payload["sample"]["auction"]
        cached = material_price_repository._UPGRADE_MATERIAL_PRICE_CACHE["payload"]
        self.assertEqual(auction["priceStatus"], "unavailable")
        self.assertIsNone(auction["minUnitPrice"])
        self.assertGreater(cached["expires_at"], started_at)
        self.assertLessEqual(cached["expires_at"] - started_at, 61)

    def test_material_keeps_last_price_while_retrying_empty_listing(self):
        priced = _lowest_auction_price_from_rows([
            {
                "unitPrice": 123,
                "regCount": 2,
                "upgrade": 0,
                "upgradeMax": 0,
            },
        ])
        with (
            patch.object(
                material_price_repository,
                "UPGRADE_MATERIAL_PRICE_ITEMS",
                {"sample": {"label": "표본", "itemId": "sample-id"}},
            ),
            patch.object(
                material_price_repository,
                "get_lowest_auction_price",
                side_effect=[priced, build_unlisted_auction_price()],
            ),
        ):
            first_payload = material_price_repository.load_upgrade_material_prices()
            material_price_repository._UPGRADE_MATERIAL_PRICE_CACHE["payload"]["expires_at"] = 0
            retry_started_at = time.time()
            second_payload = material_price_repository.load_upgrade_material_prices()

        self.assertEqual(first_payload["sample"]["auction"]["minUnitPrice"], 123)
        retained = second_payload["sample"]["auction"]
        self.assertEqual(retained["priceStatus"], "priced")
        self.assertEqual(retained["minUnitPrice"], 123)
        self.assertTrue(retained["isLastKnownPrice"])
        self.assertEqual(retained["lookupPriceStatus"], "unlisted")
        cached = material_price_repository._UPGRADE_MATERIAL_PRICE_CACHE["payload"]
        self.assertLessEqual(cached["expires_at"] - retry_started_at, 61)


if __name__ == "__main__":
    unittest.main()
