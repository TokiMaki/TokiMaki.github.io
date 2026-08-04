import unittest

from server.candidates.black_fang import (
    get_black_fang_scroll_name,
    parse_black_fang_scroll_cost,
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


if __name__ == "__main__":
    unittest.main()
