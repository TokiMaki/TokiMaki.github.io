import time
import unittest
from unittest.mock import patch

from server.repositories import auction_repository
from server.repositories import resolved_price_repository


def auction_row(item_id, item_name, unit_price, item_type_detail="엠블렘"):
    return {
        "itemId": item_id,
        "itemName": item_name,
        "itemTypeDetail": item_type_detail,
        "unitPrice": unit_price,
        "regCount": 1,
        "upgrade": 0,
        "upgradeMax": 0,
    }


class AuctionPriceRepositoryCacheTest(unittest.TestCase):
    def setUp(self):
        resolved_price_repository._RESOLVED_PRICE_CACHE.clear()
        self._persistent_patchers = [
            patch.object(auction_repository, "get_last_known_auction_item", return_value={}),
            patch.object(auction_repository, "get_last_known_auction_item_by_name", return_value={}),
            patch.object(auction_repository, "remember_last_known_auction_item", return_value=True),
        ]
        for patcher in self._persistent_patchers:
            patcher.start()

    def tearDown(self):
        for patcher in reversed(self._persistent_patchers):
            patcher.stop()
        resolved_price_repository._RESOLVED_PRICE_CACHE.clear()

    def test_batch_lookup_calls_api_only_for_uncached_item_ids(self):
        calls = []

        def fetch(item_ids, limit=100):
            calls.append(list(item_ids))
            return [
                auction_row(item_id, f"item-{item_id}", 100 + index, "재료")
                for index, item_id in enumerate(item_ids)
            ]

        with patch.object(
            auction_repository,
            "get_auction_rows_by_item_ids_from_api",
            side_effect=fetch,
        ):
            first = auction_repository.get_lowest_auction_prices(["a", "b"])
            second = auction_repository.get_lowest_auction_prices(["a", "b", "c"])

        self.assertEqual(first["a"]["minUnitPrice"], 100)
        self.assertEqual(second["b"]["minUnitPrice"], 101)
        self.assertEqual(second["c"]["minUnitPrice"], 100)
        self.assertEqual(calls, [["a", "b"], ["c"]])

    def test_batch_lookup_keeps_last_price_when_current_listing_is_empty(self):
        responses = [
            [auction_row("item", "표본", 123, "재료")],
            [],
        ]
        with patch.object(
            auction_repository,
            "get_auction_rows_by_item_ids_from_api",
            side_effect=responses,
        ):
            first = auction_repository.get_lowest_auction_prices(["item"])
            cache_key = auction_repository._get_auction_item_cache_key("item")
            resolved_price_repository._RESOLVED_PRICE_CACHE[cache_key]["expires_at"] = 0
            second = auction_repository.get_lowest_auction_prices(["item"])

        self.assertEqual(first["item"]["minUnitPrice"], 123)
        self.assertEqual(second["item"]["minUnitPrice"], 123)
        self.assertTrue(second["item"]["isLastKnownPrice"])
        self.assertEqual(second["item"]["lookupPriceStatus"], "unlisted")

    def test_persisted_item_price_is_used_when_current_listing_is_empty(self):
        with (
            patch.object(
                auction_repository,
                "get_last_known_auction_item",
                return_value={
                    "itemId": "item",
                    "auction": {
                        "priceStatus": "priced",
                        "minUnitPrice": 654,
                    },
                },
            ),
            patch.object(
                auction_repository,
                "get_auction_rows_by_item_ids_from_api",
                return_value=[],
            ) as lookup,
        ):
            result = auction_repository.get_lowest_auction_prices(["item"])

        self.assertEqual(result["item"]["minUnitPrice"], 654)
        self.assertTrue(result["item"]["isLastKnownPrice"])
        self.assertEqual(result["item"]["lookupPriceStatus"], "unlisted")
        lookup.assert_called_once()

    def test_recent_persisted_item_price_skips_immediate_api_recheck(self):
        with (
            patch.object(
                auction_repository,
                "get_last_known_auction_item",
                return_value={
                    "itemId": "item",
                    "updatedAtMs": int(time.time() * 1000),
                    "auction": {
                        "priceStatus": "priced",
                        "minUnitPrice": 777,
                    },
                },
            ),
            patch.object(
                auction_repository,
                "get_auction_rows_by_item_ids_from_api",
            ) as lookup,
        ):
            result = auction_repository.get_lowest_auction_prices(["item"])

        self.assertEqual(result["item"]["minUnitPrice"], 777)
        self.assertNotIn("isLastKnownPrice", result["item"])
        lookup.assert_not_called()

    def test_current_items_reuse_priced_equivalent_with_same_name(self):
        name = "찬란한 붉은빛 엠블렘[지능]"
        with patch.object(
            auction_repository,
            "get_auction_rows_by_item_ids_from_api",
            return_value=[auction_row("tradable", name, 456)],
        ):
            result = auction_repository.get_lowest_auction_prices_for_items([
                {"itemId": "event", "itemName": name, "itemTypeDetail": "엠블렘"},
                {"itemId": "tradable", "itemName": name, "itemTypeDetail": "엠블렘"},
            ])

        self.assertEqual(result["event"]["minUnitPrice"], 456)
        self.assertEqual(result["event"]["priceItemId"], "tradable")
        self.assertEqual(result["event"]["priceSource"], "sameNameCachedItem")

    def test_cache_miss_looks_up_exact_name_and_reuses_tradable_item(self):
        name = "찬란한 붉은빛 엠블렘[지능]"
        with (
            patch.object(
                auction_repository,
                "get_auction_rows_by_item_ids_from_api",
                return_value=[],
            ),
            patch.object(
                auction_repository,
                "get_auction_rows_by_name_from_api",
                return_value=[auction_row("tradable", name, 789)],
            ) as name_lookup,
        ):
            result = auction_repository.get_lowest_auction_prices_for_items([
                {"itemId": "event", "itemName": name, "itemTypeDetail": "엠블렘"},
            ])

        self.assertEqual(result["event"]["minUnitPrice"], 789)
        self.assertEqual(result["event"]["priceItemId"], "tradable")
        self.assertEqual(result["event"]["priceSource"], "exactItemName")
        name_lookup.assert_called_once()

    def test_existing_name_search_cache_skips_second_name_api_lookup(self):
        name = "찬란한 붉은빛 엠블렘[지능]"
        auction_repository.remember_auction_item_price({
            "itemId": "tradable",
            "itemName": name,
            "itemTypeDetail": "엠블렘",
            "auction": {
                "priceStatus": "priced",
                "minUnitPrice": 999,
            },
        })
        with (
            patch.object(
                auction_repository,
                "get_auction_rows_by_item_ids_from_api",
                return_value=[],
            ),
            patch.object(
                auction_repository,
                "get_auction_rows_by_name_from_api",
            ) as name_lookup,
        ):
            result = auction_repository.get_lowest_auction_prices_for_items([
                {"itemId": "event", "itemName": name},
            ])

        self.assertEqual(result["event"]["minUnitPrice"], 999)
        self.assertEqual(result["event"]["priceItemId"], "tradable")
        name_lookup.assert_not_called()


if __name__ == "__main__":
    unittest.main()
