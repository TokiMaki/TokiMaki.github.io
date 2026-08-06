import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.repositories import item_repository


class ItemRepositoryCacheTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.cache_dir = Path(self.temp_dir.name)
        self.cache_path = self.cache_dir / "character-response-cache.sqlite"
        self.patches = [
            patch.object(item_repository, "CHARACTER_CACHE_DIR", self.cache_dir),
            patch.object(item_repository, "CHARACTER_SQLITE_CACHE_PATH", self.cache_path),
        ]
        for current_patch in self.patches:
            current_patch.start()
        item_repository._ITEM_DETAIL_CACHE.clear()
        item_repository._ITEM_DETAIL_SQLITE_CACHE_INITIALIZED = False

    def tearDown(self):
        item_repository._ITEM_DETAIL_CACHE.clear()
        item_repository._ITEM_DETAIL_SQLITE_CACHE_INITIALIZED = False
        for current_patch in reversed(self.patches):
            current_patch.stop()
        self.temp_dir.cleanup()

    def test_sqlite_cache_survives_memory_cache_clear(self):
        detail = {"itemId": "item-1", "itemName": "테스트 아이템"}
        with patch.object(item_repository, "fetch_item_details_from_api", return_value=[detail]) as fetch_api:
            self.assertEqual(item_repository.fetch_item_details(["item-1"]), [detail])
            item_repository._ITEM_DETAIL_CACHE.clear()
            self.assertEqual(item_repository.fetch_item_details(["item-1"]), [detail])

        fetch_api.assert_called_once_with(["item-1"])

    def test_expired_sqlite_cache_is_refetched(self):
        first = {"itemId": "item-1", "itemName": "이전 정보"}
        refreshed = {"itemId": "item-1", "itemName": "갱신 정보"}
        expired_time = 1_000 + (item_repository.ITEM_DETAIL_CACHE_TTL_MS / 1000) + 1
        with patch.object(item_repository.time, "time", side_effect=[1_000, 1_000, expired_time, expired_time]), \
                patch.object(
                    item_repository,
                    "fetch_item_details_from_api",
                    side_effect=[[first], [refreshed]],
                ) as fetch_api:
            self.assertEqual(item_repository.fetch_item_details(["item-1"]), [first])
            item_repository._ITEM_DETAIL_CACHE.clear()
            self.assertEqual(item_repository.fetch_item_details(["item-1"]), [refreshed])

        self.assertEqual(fetch_api.call_count, 2)

    def test_missing_api_rows_are_not_cached(self):
        with patch.object(item_repository, "fetch_item_details_from_api", return_value=[]) as fetch_api:
            self.assertEqual(item_repository.fetch_item_details(["missing"]), [])
            self.assertEqual(item_repository.fetch_item_details(["missing"]), [])

        self.assertEqual(fetch_api.call_count, 2)


if __name__ == "__main__":
    unittest.main()
