import unittest

from server.upgrade_payloads import (
    build_current_aura_payload,
    resolve_effective_aura_item_id,
)


MOTION_AURA_ITEM_ID = "4754847cc0c85ffbcc6bd108e9207f6c"
ADVANCEMENT_MOTION_AURA_ITEM_ID = "166259bc2ab25cef100531ccf27e34a7"


class EffectiveAuraTest(unittest.TestCase):
    def test_regular_aura_keeps_equipped_item_even_with_clone_data(self):
        aura = {
            "itemId": "regular-aura",
            "clone": {
                "itemId": "appearance-aura",
            },
        }

        self.assertEqual(resolve_effective_aura_item_id(aura), "regular-aura")

    def test_motion_aura_uses_clone_item_as_effect_source(self):
        aura = {
            "itemId": MOTION_AURA_ITEM_ID,
            "itemName": "모험단 모션 오라 아바타",
            "itemRarity": "레어",
            "clone": {
                "itemId": "cloned-aura",
                "itemName": "열대야의 추억",
            },
        }
        detail = {
            "itemId": "cloned-aura",
            "itemName": "열대야의 추억",
            "itemRarity": "레어",
            "itemStatus": [
                {
                    "name": "모든 속성 강화",
                    "value": 40,
                },
            ],
        }

        payload = build_current_aura_payload(aura, detail)

        self.assertEqual(resolve_effective_aura_item_id(aura), "cloned-aura")
        self.assertEqual(payload["itemId"], "cloned-aura")
        self.assertEqual(payload["itemName"], "열대야의 추억")
        self.assertEqual(payload["effects"]["elementAll"], 40)
        self.assertEqual(payload["effectSource"], "clone")
        self.assertEqual(payload["equippedAura"]["itemId"], MOTION_AURA_ITEM_ID)

    def test_motion_aura_without_clone_falls_back_to_equipped_item(self):
        aura = {
            "itemId": MOTION_AURA_ITEM_ID,
            "clone": {
                "itemId": None,
            },
        }

        self.assertEqual(resolve_effective_aura_item_id(aura), MOTION_AURA_ITEM_ID)

    def test_advancement_motion_aura_uses_clone_item_as_effect_source(self):
        aura = {
            "itemId": ADVANCEMENT_MOTION_AURA_ITEM_ID,
            "itemName": "전직의 모션 오라 아바타",
            "clone": {
                "itemId": "cloned-aura",
            },
        }

        self.assertEqual(resolve_effective_aura_item_id(aura), "cloned-aura")


if __name__ == "__main__":
    unittest.main()
