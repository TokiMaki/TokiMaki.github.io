import unittest
from unittest.mock import patch

from server.presenters import character_enchants_presenter


class CharacterEnchantsPresenterTest(unittest.TestCase):
    def test_current_enchant_rows_receive_tier_metadata(self):
        equipment_rows = [{
            "slotName": "상의",
            "slotId": "JACKET",
            "itemId": "equipment-1",
            "itemName": "테스트 상의",
            "itemRarity": "에픽",
            "enchant": {
                "status": [{"name": "힘", "value": 50}],
                "reinforceSkill": [],
            },
        }]

        def annotate(rows, cards):
            self.assertEqual(cards, [{"sources": []}])
            return [{**row, "tier": "종결", "isEnd": True} for row in rows]

        with patch.object(
            character_enchants_presenter,
            "load_enchant_tier_cards",
            return_value=[{"sources": []}],
        ), patch.object(
            character_enchants_presenter,
            "annotate_current_enchant_tiers",
            side_effect=annotate,
        ):
            rows, equipment_upgrades = (
                character_enchants_presenter.build_equipment_enchant_rows_and_upgrades(
                    equipment_rows
                )
            )

        self.assertEqual(rows[0]["tier"], "종결")
        self.assertTrue(rows[0]["isEnd"])
        self.assertEqual(equipment_upgrades[0]["slot"], "상의")


if __name__ == "__main__":
    unittest.main()
