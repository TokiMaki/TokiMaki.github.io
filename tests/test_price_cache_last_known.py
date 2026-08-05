import unittest

from server.price_cache import merge_last_known_auction_prices


class PriceCacheLastKnownTest(unittest.TestCase):
    def test_catalog_refresh_keeps_last_price_for_same_candidate(self):
        previous = {
            "groups": [{
                "candidates": [{
                    "itemId": "item",
                    "slot": "상의",
                    "auction": {
                        "priceStatus": "priced",
                        "minUnitPrice": 123,
                    },
                }],
            }],
        }
        current = {
            "groups": [{
                "candidates": [{
                    "itemId": "item",
                    "slot": "상의",
                    "auction": {
                        "priceStatus": "unlisted",
                        "minUnitPrice": None,
                    },
                }],
            }],
        }

        merged = merge_last_known_auction_prices(previous, current)
        auction = merged["groups"][0]["candidates"][0]["auction"]

        self.assertEqual(auction["priceStatus"], "priced")
        self.assertEqual(auction["minUnitPrice"], 123)
        self.assertTrue(auction["isLastKnownPrice"])
        self.assertEqual(auction["lookupPriceStatus"], "unlisted")

    def test_catalog_refresh_does_not_mix_different_multiplied_rows(self):
        previous = {
            "cards": [{
                "itemId": "emblem",
                "slot": "상의 아바타",
                "needCount": 2,
                "auction": {
                    "priceStatus": "priced",
                    "minUnitPrice": 200,
                },
            }],
        }
        current = {
            "cards": [{
                "itemId": "emblem",
                "slot": "상의 아바타",
                "needCount": 1,
                "auction": {
                    "priceStatus": "unlisted",
                    "minUnitPrice": None,
                },
            }],
        }

        merged = merge_last_known_auction_prices(previous, current)
        auction = merged["cards"][0]["auction"]

        self.assertEqual(auction["priceStatus"], "unlisted")
        self.assertIsNone(auction["minUnitPrice"])
        self.assertNotIn("isLastKnownPrice", auction)


if __name__ == "__main__":
    unittest.main()
