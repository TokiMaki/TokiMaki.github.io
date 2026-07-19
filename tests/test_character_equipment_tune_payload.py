import unittest

from server.character_equipment_service import build_equipment_upgrade_payload


class EquipmentTunePayloadTest(unittest.TestCase):
    def test_non_equipment_slot_is_not_tuneable(self):
        for tune_row in (
            {"level": 0, "setPoint": 0, "upgrade": True},
            {"level": 0, "setPoint": 0},
        ):
            with self.subTest(tune_row=tune_row):
                payload = build_equipment_upgrade_payload({
                    "slotName": "보조무기",
                    "slotId": "SUPPORT_WEAPON",
                    "itemId": "balmung",
                    "itemName": "살룡검 발뭉",
                    "itemRarity": "에픽",
                    "tune": [tune_row],
                })

                self.assertFalse(payload["tuneUpgradeable"])
                self.assertEqual(payload["tuneRemaining"], 0)

    def test_regular_special_equipment_slots_remain_tuneable(self):
        for slot_name, slot_id in (("귀걸이", "EARRING"), ("마법석", "MAGIC_STON")):
            with self.subTest(slot_name=slot_name):
                payload = build_equipment_upgrade_payload({
                    "slotName": slot_name,
                    "slotId": slot_id,
                    "itemId": slot_id.lower(),
                    "itemName": f"정상 {slot_name}",
                    "itemRarity": "에픽",
                    "tune": [{"level": 0, "setPoint": 215, "upgrade": True}],
                })

                self.assertTrue(payload["tuneUpgradeable"])
                self.assertEqual(payload["tuneRemaining"], 3)
                self.assertEqual(payload["tuneSetPoint"], 215)

    def test_primeval_set_point_is_preserved_without_tune_eligibility(self):
        payload = build_equipment_upgrade_payload({
            "slotName": "보조장비",
            "slotId": "SUPPORT",
            "itemId": "heart",
            "itemName": "만병을 잉태한 역병의 심장",
            "itemRarity": "태초",
            "tune": [{"level": 0, "setPoint": 145, "upgrade": False}],
        })

        self.assertFalse(payload["tuneUpgradeable"])
        self.assertEqual(payload["tuneRemaining"], 0)
        self.assertEqual(payload["tuneSetPoint"], 145)


if __name__ == "__main__":
    unittest.main()
