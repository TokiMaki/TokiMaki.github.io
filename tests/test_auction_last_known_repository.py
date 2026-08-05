import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.repositories import auction_last_known_repository as repository


class AuctionLastKnownRepositoryTest(unittest.TestCase):
    def setUp(self):
        self._temporary_directory = tempfile.TemporaryDirectory()
        self._path_patcher = patch.object(
            repository,
            "AUCTION_LAST_KNOWN_CACHE_PATH",
            Path(self._temporary_directory.name) / "auction_last_known.json",
        )
        self._path_patcher.start()
        self._reset_repository()

    def tearDown(self):
        self._reset_repository()
        self._path_patcher.stop()
        self._temporary_directory.cleanup()

    def _reset_repository(self):
        repository._AUCTION_LAST_KNOWN_LOADED = False
        repository._AUCTION_LAST_KNOWN_DIRTY = False
        repository._AUCTION_LAST_KNOWN_SAVE_SCHEDULED = False
        repository._AUCTION_LAST_KNOWN_CACHE = {
            "items": {},
            "names": {},
        }

    def test_successful_price_survives_repository_reload_by_item_and_name(self):
        with patch.object(repository, "_schedule_last_known_cache_save"):
            stored = repository.remember_last_known_auction_item({
                "itemId": "tradable-emblem",
                "itemName": "찬란한 붉은빛 엠블렘[지능]",
                "itemTypeDetail": "엠블렘",
                "itemRarity": "레어",
                "auction": {
                    "priceStatus": "priced",
                    "minUnitPrice": 123456,
                    "isLastKnownPrice": True,
                    "lookupPriceStatus": "unlisted",
                },
            })
        self.assertTrue(stored)
        repository.flush_last_known_auction_prices()

        self._reset_repository()
        by_item = repository.get_last_known_auction_item("tradable-emblem")
        by_name = repository.get_last_known_auction_item_by_name(
            "찬란한 붉은빛 엠블렘[지능]",
            "엠블렘",
        )

        self.assertEqual(by_item["auction"]["minUnitPrice"], 123456)
        self.assertEqual(by_name["itemId"], "tradable-emblem")
        self.assertEqual(by_name["auction"]["priceStatus"], "priced")
        self.assertNotIn("isLastKnownPrice", by_name["auction"])
        self.assertNotIn("lookupPriceStatus", by_name["auction"])

    def test_item_only_refresh_preserves_existing_name_metadata(self):
        with patch.object(repository, "_schedule_last_known_cache_save"):
            repository.remember_last_known_auction_item({
                "itemId": "item",
                "itemName": "표본 아이템",
                "itemTypeDetail": "재료",
                "auction": {"priceStatus": "priced", "minUnitPrice": 100},
            })
            repository.remember_last_known_auction_item({
                "itemId": "item",
                "auction": {"priceStatus": "priced", "minUnitPrice": 200},
            })

        record = repository.get_last_known_auction_item("item")
        self.assertEqual(record["itemName"], "표본 아이템")
        self.assertEqual(record["itemTypeDetail"], "재료")
        self.assertEqual(record["auction"]["minUnitPrice"], 200)


if __name__ == "__main__":
    unittest.main()
