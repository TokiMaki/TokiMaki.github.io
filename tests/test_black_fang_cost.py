import unittest

from server.candidates.black_fang import (
    get_black_fang_scroll_name,
    parse_black_fang_scroll_cost,
    resolve_black_fang_source_equipment,
)


class BlackFangCostTest(unittest.TestCase):
    def test_parses_gold_when_amount_is_written_before_gold(self):
        detail = {
            "itemExplainDetail": """
<소모 재료>
태초 악세서리 1개
태초 소울 1개
5,000,000 골드
""",
        }

        result = parse_black_fang_scroll_cost(detail)

        self.assertEqual(result["fixedGold"], 5_000_000)
        self.assertEqual(result["materials"], [{"label": "태초 소울", "amount": 1}])

    def test_normalizes_black_fang_prefix_from_set_name(self):
        self.assertEqual(
            get_black_fang_scroll_name("흑아 : 칠흑의 정화 세트"),
            "흑아 태초 변환서 - 칠흑의 정화",
        )

    def test_resolves_designated_relic_to_original_set_accessory(self):
        equipment = {
            "slotId": "WRIST",
            "itemId": "designated-relic-id",
            "itemName": "드러난 진실의 팔찌",
            "itemRarity": "태초",
            "setItemId": "set-id",
            "setItemName": "그림자에 숨은 죽음 세트",
            "itemTypeDetail": "팔찌",
        }
        set_item_detail = {
            "setItemId": "set-id",
            "setItems": [
                {
                    "slotId": "WRIST",
                    "itemId": "original-id",
                    "itemName": "칠흑같은 그림자 속 팔찌 - 화",
                    "itemRarity": "태초",
                },
            ],
        }

        resolved = resolve_black_fang_source_equipment(
            equipment,
            {"designated-relic-id"},
            set_item_detail,
        )

        self.assertEqual(resolved["itemId"], "original-id")
        self.assertEqual(resolved["itemName"], "칠흑같은 그림자 속 팔찌 - 화")
        self.assertEqual(resolved["setItemId"], "set-id")
        self.assertEqual(resolved["itemTypeDetail"], "팔찌")


if __name__ == "__main__":
    unittest.main()
