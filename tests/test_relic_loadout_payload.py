import unittest

from server.presenters.character_enchants_presenter import build_equipment_upgrade_payload


class RelicLoadoutPayloadTest(unittest.TestCase):
    def test_relic_equipment_is_marked_by_configured_id_or_api_marker(self):
        cases = [
            (
                "df77236c51ea1274a3deb79c3e470695",
                "우아한 기품의 향수",
                "마법석",
                "MAGIC_STON",
            ),
            (
                "14449881bc371352c250502e7b201506",
                "영롱한 날씨의 큐브",
                "귀걸이",
                "EARRING",
            ),
            (
                "6e1fcf6e59ed8d5a95dc152b84fe93ce",
                "만병을 잉태한 역병의 심장",
                "보조장비",
                "SUPPORT",
            ),
            (
                "aa5273499f19ddba846919dbb6857d82",
                "광휘를 머금은 눈동자",
                "반지",
                "RING",
            ),
        ]

        for item_id, item_name, slot_name, slot_id in cases:
            with self.subTest(item_name=item_name):
                marker = (
                    {
                        "exaltedInfo": {"damage": "54.6%", "buff": 13030},
                        "potency": {"value": 100, "damage": "17.1%", "buff": 4250},
                    }
                    if item_name == "광휘를 머금은 눈동자"
                    else {"potency": {"value": 100}}
                )
                payload = build_equipment_upgrade_payload({
                    "slotName": slot_name,
                    "slotId": slot_id,
                    "itemId": item_id,
                    "itemName": item_name,
                    "itemRarity": "태초",
                    **marker,
                    "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
                })

                self.assertTrue(payload["isRelic"])
                self.assertEqual(payload["precisionPercent"], 100)

    def test_regular_equipment_is_not_marked_as_relic(self):
        payload = build_equipment_upgrade_payload({
            "slotName": "마법석",
            "slotId": "MAGIC_STON",
            "itemId": "regular-magic-stone",
            "itemName": "일반 마법석",
            "itemRarity": "태초",
        })

        self.assertFalse(payload["isRelic"])

    def test_weapon_progress_fields_are_not_relic_markers(self):
        for progress in (
            {"weaponRelease": {"value": 100, "damage": "13.7%", "buff": 4700}},
            {"potency": {"value": 100, "damage": "13.7%", "buff": 4700}},
        ):
            with self.subTest(progress=next(iter(progress))):
                payload = build_equipment_upgrade_payload({
                    "slotName": "무기",
                    "slotId": "WEAPON",
                    "itemId": "legacy-weapon",
                    "itemName": "흉터가 깃든 분노",
                    "itemRarity": "태초",
                    **progress,
                })

                self.assertFalse(payload["isRelic"])
                self.assertIsNone(payload["precisionPercent"])


if __name__ == "__main__":
    unittest.main()
