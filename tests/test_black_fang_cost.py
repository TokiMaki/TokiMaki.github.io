import unittest
from unittest.mock import patch

from server.candidates.black_fang import (
    build_black_fang_recommendations_debug,
    get_black_fang_equipment_body_effect_pair,
    get_black_fang_scroll_name,
    parse_black_fang_scroll_cost,
    resolve_black_fang_source_equipment,
)
from server.effects import subtract_effects


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

    def test_black_fang_preserves_equal_base_element_bonus(self):
        current_effects, target_effects = get_black_fang_equipment_body_effect_pair({
            "itemStatus": [{"name": "공격력 증가", "value": "3400%"}],
            "itemExplainDetail": "모든 속성 강화 +40",
        }, {
            "itemStatus": [{"name": "공격력 증가", "value": "3600%"}],
            "itemExplainDetail": "모든 속성 강화 +40",
        })

        effects = subtract_effects(target_effects, current_effects)

        self.assertEqual(current_effects["elementAll"], 40)
        self.assertEqual(target_effects["elementAll"], 40)
        self.assertNotIn("elementAll", effects)

    def test_black_fang_preserves_current_element_without_parsing_target_explain(self):
        for current_element in (40, 50):
            with self.subTest(current_element=current_element):
                current_effects, target_effects = get_black_fang_equipment_body_effect_pair({
                    "itemStatus": [{"name": "공격력 증가", "value": "3400%"}],
                    "itemExplainDetail": f"모든 속성 강화 +{current_element}",
                }, {
                    "itemStatus": [{"name": "공격력 증가", "value": "3600%"}],
                    "itemExplainDetail": "조건 달성 시 모든 속성 강화 +999",
                })

                effects = subtract_effects(target_effects, current_effects)

                self.assertEqual(current_effects["elementAll"], current_element)
                self.assertEqual(target_effects["elementAll"], current_element)
                self.assertNotIn("elementAll", effects)

    def test_black_fang_does_not_double_element_when_only_target_item_status_has_it(self):
        current_effects, target_effects = get_black_fang_equipment_body_effect_pair({
            "itemStatus": [{"name": "공격력 증가", "value": "3400%"}],
            "itemExplainDetail": "모든 속성 강화 +50",
        }, {
            "itemStatus": [
                {"name": "공격력 증가", "value": "3600%"},
                {"name": "모든 속성 강화", "value": 50},
            ],
        })

        effects = subtract_effects(target_effects, current_effects)

        self.assertEqual(current_effects["elementAll"], 50)
        self.assertEqual(target_effects["elementAll"], 50)
        self.assertNotIn("elementAll", effects)

    def test_black_fang_applies_explicit_item_status_element_delta(self):
        current_effects, target_effects = get_black_fang_equipment_body_effect_pair({
            "itemStatus": [
                {"name": "공격력 증가", "value": "3400%"},
                {"name": "모든 속성 강화", "value": 40},
            ],
        }, {
            "itemStatus": [
                {"name": "공격력 증가", "value": "3600%"},
                {"name": "모든 속성 강화", "value": 50},
            ],
        })

        effects = subtract_effects(target_effects, current_effects)

        self.assertEqual(current_effects["elementAll"], 40)
        self.assertEqual(target_effects["elementAll"], 50)
        self.assertEqual(effects["elementAll"], 10)

    def test_designated_relic_ring_uses_equipped_item_as_current_effects(self):
        equipment = {
            "slotId": "RING",
            "slotName": "반지",
            "itemId": "designated-id",
            "itemName": "거룩한 희생의 반지",
            "itemRarity": "태초",
            "setItemId": "set-id",
            "setItemName": "그림자에 숨은 죽음 세트",
            "itemTypeDetail": "반지",
        }
        set_detail = {
            "setItems": [{
                "slotId": "RING",
                "itemId": "original-id",
                "itemName": "칠흑같은 그림자 속 반지 - 독",
                "itemRarity": "태초",
            }],
        }
        black_item = {
            "itemId": "black-id",
            "itemName": "흑아 : 칠흑같은 그림자 속 반지 - 독",
            "itemRarity": "태초",
            "itemTypeDetail": "반지",
        }
        details = [
            {"itemId": "scroll-id", "itemExplainDetail": ""},
            {
                "itemId": "designated-id",
                "itemStatus": [
                    {"name": "공격력 증가", "value": "3500%"},
                    {"name": "최종 데미지 증가", "value": "30%"},
                ],
                "itemExplainDetail": "모든 속성 강화 +40",
            },
            {
                "itemId": "original-id",
                "itemStatus": [
                    {"name": "공격력 증가", "value": "3000%"},
                    {"name": "최종 데미지 증가", "value": "20%"},
                ],
                "itemExplainDetail": "모든 속성 강화 +40",
            },
            {
                "itemId": "black-id",
                "itemRarity": "태초",
                "itemStatus": [
                    {"name": "공격력 증가", "value": "3600%"},
                    {"name": "최종 데미지 증가", "value": "31%"},
                ],
                "itemExplainDetail": "모든 속성 강화 +40",
            },
        ]

        with patch(
            "server.candidates.black_fang.get_designated_relic_item_ids",
            return_value={"designated-id"},
        ), patch(
            "server.candidates.black_fang.fetch_set_item_detail",
            return_value=set_detail,
        ), patch(
            "server.candidates.black_fang.find_black_fang_scroll_price_item",
            return_value={
                "itemId": "scroll-id",
                "itemName": "흑아 태초 변환서 - 그림자에 숨은 죽음",
                "itemRarity": "태초",
                "auction": {"minUnitPrice": 1000},
            },
        ), patch(
            "server.candidates.black_fang._find_exact_item_by_match_name",
            return_value=black_item,
        ), patch(
            "server.candidates.black_fang.fetch_item_details",
            return_value=details,
        ):
            result = build_black_fang_recommendations_debug([equipment], {})

        row = result["recommendations"][0]
        self.assertEqual(row["currentEffects"]["attackIncrease"], 3500)
        self.assertEqual(row["currentEffects"]["finalDamage"], 30)
        self.assertEqual(row["targetEffects"]["attackIncrease"], 3600)
        self.assertEqual(row["targetEffects"]["finalDamage"], 31)
        self.assertEqual(row["effects"]["attackIncrease"], 100)
        self.assertEqual(row["effects"]["finalDamage"], 1)
        self.assertNotIn("elementAll", row["effects"])


if __name__ == "__main__":
    unittest.main()
