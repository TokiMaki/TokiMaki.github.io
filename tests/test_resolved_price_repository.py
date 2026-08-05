import unittest

from server.repositories import resolved_price_repository as repository


class ResolvedPriceRepositoryTest(unittest.TestCase):
    def setUp(self):
        repository._RESOLVED_PRICE_CACHE.clear()

    def tearDown(self):
        repository._RESOLVED_PRICE_CACHE.clear()

    def test_keeps_last_successful_price_when_refresh_is_unlisted(self):
        cache_key = ("sample", 1, "item")
        priced = {
            "itemId": "item",
            "effects": {"str": 50},
            "auction": {
                "priceStatus": "priced",
                "minUnitPrice": 123,
            },
        }
        first = repository.get_cached_resolved_price(
            cache_key,
            lambda: priced,
            should_cache=lambda row: row.get("auction", {}).get("priceStatus") == "priced",
        )
        self.assertEqual(first["auction"]["minUnitPrice"], 123)

        repository._RESOLVED_PRICE_CACHE[cache_key]["expires_at"] = 0
        retained = repository.get_cached_resolved_price(
            cache_key,
            lambda: {
                "itemId": "item",
                "auction": {
                    "priceStatus": "unlisted",
                    "minUnitPrice": None,
                },
            },
            should_cache=lambda row: row.get("auction", {}).get("priceStatus") == "priced",
        )

        self.assertEqual(retained["auction"]["minUnitPrice"], 123)
        self.assertTrue(retained["isLastKnownPrice"])
        self.assertTrue(retained["auction"]["isLastKnownPrice"])
        self.assertEqual(retained["auction"]["lookupPriceStatus"], "unlisted")
        self.assertNotIn("isLastKnownPrice", retained["effects"])
        cached = repository._RESOLVED_PRICE_CACHE[cache_key]
        self.assertGreaterEqual(
            cached["expires_at"] - cached["last_accessed_at"],
            repository.RESOLVED_PRICE_UNLISTED_RETRY_SECONDS - 1,
        )

    def test_keeps_last_successful_price_when_refresh_errors(self):
        cache_key = ("sample", 1, "item")
        repository.get_cached_resolved_price(
            cache_key,
            lambda: {"priceStatus": "priced", "minUnitPrice": 321},
            should_cache=lambda row: row.get("priceStatus") == "priced",
        )
        repository._RESOLVED_PRICE_CACHE[cache_key]["expires_at"] = 0

        def fail():
            raise RuntimeError("temporary")

        retained = repository.get_cached_resolved_price(
            cache_key,
            fail,
            should_cache=lambda row: row.get("priceStatus") == "priced",
        )

        self.assertEqual(retained["minUnitPrice"], 321)
        self.assertTrue(retained["isLastKnownPrice"])
        self.assertEqual(retained["lookupPriceStatus"], "unavailable")
        cached = repository._RESOLVED_PRICE_CACHE[cache_key]
        self.assertLessEqual(
            cached["expires_at"] - cached["last_accessed_at"],
            repository.RESOLVED_PRICE_UNAVAILABLE_RETRY_SECONDS + 1,
        )

    def test_unlisted_result_without_previous_price_is_negative_cached(self):
        calls = 0

        def resolve_unlisted():
            nonlocal calls
            calls += 1
            return {"priceStatus": "unlisted", "minUnitPrice": None}

        cache_key = ("sample", 1, "missing")
        result = repository.get_cached_resolved_price(
            cache_key,
            resolve_unlisted,
            should_cache=lambda row: row.get("priceStatus") == "priced",
        )
        cached = repository.get_cached_resolved_price(
            cache_key,
            resolve_unlisted,
            should_cache=lambda row: row.get("priceStatus") == "priced",
        )

        self.assertEqual(result["priceStatus"], "unlisted")
        self.assertIsNone(result["minUnitPrice"])
        self.assertNotIn("isLastKnownPrice", result)
        self.assertEqual(cached, result)
        self.assertEqual(calls, 1)
        cache_record = repository._RESOLVED_PRICE_CACHE[cache_key]
        self.assertGreaterEqual(
            cache_record["expires_at"] - cache_record["last_accessed_at"],
            repository.RESOLVED_PRICE_UNLISTED_RETRY_SECONDS - 1,
        )

    def test_successful_price_uses_ten_minute_cache(self):
        cache_key = ("sample", 1, "priced")
        repository.get_cached_resolved_price(
            cache_key,
            lambda: {"priceStatus": "priced", "minUnitPrice": 100},
            should_cache=lambda row: row.get("priceStatus") == "priced",
        )

        cached = repository._RESOLVED_PRICE_CACHE[cache_key]
        self.assertGreaterEqual(
            cached["expires_at"] - cached["last_accessed_at"],
            repository.RESOLVED_PRICE_CACHE_TTL_SECONDS - 1,
        )


if __name__ == "__main__":
    unittest.main()
