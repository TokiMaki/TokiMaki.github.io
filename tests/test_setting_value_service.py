import unittest
from unittest.mock import patch

from server import setting_value_service


def auction(unit_price):
    return {
        "priceStatus": "priced",
        "minUnitPrice": unit_price,
    }


def priced_row(item_id, unit_price, **extra):
    return {
        "itemId": item_id,
        "auction": auction(unit_price),
        **extra,
    }


class SettingValueServiceTest(unittest.TestCase):
    def test_build_character_setting_value_uses_supplied_loadout_and_price_data(self):
        enchant_catalog = {
            "cards": [{
                "itemName": "테스트 카드",
                "auction": auction(10),
                "sources": [{
                    "slot": "상의",
                    "tier": "종결",
                    "effects": {"str": 50},
                    "reinforceSkill": [],
                }],
            }],
        }
        title_catalog = {
            "groups": [{
                "candidates": [{
                    **priced_row("title-main", 20),
                    "variant": "일반",
                    "effects": {"allStat": 1},
                    "enchantEffects": {"allStat": 1},
                }],
            }],
        }
        aura_catalog = {
            "groups": [{
                "candidates": [priced_row("aura-main", 30)],
            }],
        }
        creature_catalog = {
            "groups": [{
                "candidates": [
                    priced_row("creature-main", 40),
                    priced_row("creature-buff", 19),
                ],
            }],
            "artifactGroups": [{
                "candidates": [priced_row("artifact-main", 5)],
            }],
        }
        direct_prices = {
            item_id: auction(price)
            for item_id, price in {
                "title-main": 200,
                "creature-main": 400,
                "artifact-main": 50,
                "emblem-main": 2,
                "platinum-main": 3,
                "dense-fragment": 11,
                "buff-avatar": 12,
                "buff-emblem": 13,
                "buff-platinum": 14,
                "creature-buff": 190,
            }.items()
        }
        buff_loadout = {
            "equipment": [
                {"slotId": "TITLE", "itemId": "title-main"},
                {
                    "slotId": "PANTS",
                    "itemId": "dense-fragment",
                    "buffContribution": {"isDenseFragment": True},
                },
            ],
            "avatar": [{
                "buffAvatarSource": "actual",
                "itemId": "buff-avatar",
                "emblems": [{"itemId": "buff-emblem", "itemName": "찬란한 엠블렘"}],
                "platinumEmblems": [{
                    "itemId": "buff-platinum",
                    "itemName": "플래티넘 엠블렘[버프 스킬]",
                }],
            }],
            "creature": [{"itemId": "creature-buff"}],
        }

        with patch.object(
            setting_value_service,
            "calculate_equipment_upgrade_details",
            return_value={
                "amplification": [{"label": "상의 +11 증폭", "gold": 100}],
                "weaponReinforcement": [{"label": "무기 +13 강화", "gold": 200}],
            },
        ):
            result = setting_value_service.build_character_setting_value(
                enchant_rows=[{
                    "slot": "상의",
                    "itemName": "테스트 상의",
                    "effects": {"str": 50},
                    "reinforceSkill": [],
                }],
                equipment_upgrades=[],
                oath_upgrades={},
                oath_tune_stage_db={},
                title={
                    "itemId": "title-main",
                    "variant": "일반",
                    "effects": {"allStat": 1},
                    "enchantEffects": {"allStat": 1},
                },
                aura={"itemId": "aura-main"},
                creature={
                    "itemId": "creature-main",
                    "artifacts": [{"itemId": "artifact-main"}],
                },
                avatar_slots=[{
                    "emblems": [{"itemId": "emblem-main", "itemName": "찬란한 엠블렘"}],
                    "platinumEmblems": [{
                        "itemId": "platinum-main",
                        "itemName": "플래티넘 엠블렘[주력 스킬]",
                    }],
                }],
                buff_loadout=buff_loadout,
                upgrade_expected_db={},
                material_prices={},
                black_fang_rows=[{"fixedGold": 100, "materials": []}],
                unique_equipment_rows=[{
                    "fixedGold": 200,
                    "materials": [],
                    "priceComplete": True,
                }],
                direct_prices=direct_prices,
                enchant_catalog=enchant_catalog,
                title_catalog=title_catalog,
                aura_catalog=aura_catalog,
                creature_catalog=creature_catalog,
                platinum_price_by_name={
                    "플래티넘 엠블렘[주력 스킬]": priced_row("box-main", 7),
                    "플래티넘 엠블렘[버프 스킬]": priced_row("box-buff", 17),
                },
            )

        self.assertEqual(result["label"], "세팅 추정 가치")
        self.assertEqual(result["totalGold"], 786)
        breakdown = {row["key"]: row["gold"] for row in result["breakdown"]}
        self.assertEqual(breakdown["enchant"], 10)
        self.assertEqual(breakdown["title"], 20)
        self.assertEqual(breakdown["aura"], 30)
        self.assertEqual(breakdown["creature"], 45)
        self.assertEqual(breakdown["buffEnhancement"], 72)
        details = {row["key"]: row["items"] for row in result["details"]}
        self.assertEqual(details["amplification"][0]["label"], "상의 +11 증폭")
        self.assertEqual(details["enchant"][0]["slot"], "상의")
        self.assertEqual(details["enchant"][0]["label"], "상의 마법부여")
        self.assertEqual(details["enchant"][0]["itemName"], "테스트 상의")
        self.assertEqual(details["enchant"][0]["equipmentItemName"], "테스트 상의")
        self.assertEqual(details["enchant"][0]["priceItemName"], "테스트 카드")
        self.assertEqual(details["enchant"][0]["tier"], "종결")
        self.assertTrue(details["enchant"][0]["isEnd"])
        self.assertEqual(details["enchant"][0]["gold"], 10)
        self.assertIn("힘 +50", details["enchant"][0]["effectText"])
        self.assertEqual(
            sum(row["gold"] or 0 for row in details["creature"]),
            breakdown["creature"],
        )
        self.assertEqual(
            sum(row["gold"] or 0 for row in details["buffEnhancement"]),
            breakdown["buffEnhancement"],
        )
        self.assertNotIn("coverage", result)

    def test_enchant_match_requires_same_slot_and_effects(self):
        cards = [{
            "auction": auction(10),
            "sources": [{"slot": "하의", "effects": {"str": 50}}],
        }]
        self.assertEqual(
            setting_value_service._get_current_enchant_gold(
                [{"slot": "상의", "effects": {"str": 50}}],
                cards,
            ),
            0,
        )

    def test_enchant_end_tier_matches_equivalent_dealer_stats(self):
        cards = [{
            "sources": [{
                "slot": "상의",
                "tier": "종결",
                "role": "dealer",
                "effects": {"finalDamage": 3, "attack": 110, "allStat": 90},
                "reinforceSkill": [],
            }],
        }]
        details = setting_value_service._get_current_enchant_details(
            [{
                "slot": "상의",
                "effects": {"finalDamage": 3, "attack": 110, "str": 90, "int": 90},
                "reinforceSkill": [],
            }],
            cards,
        )
        self.assertEqual(details[0]["tier"], "종결")
        self.assertTrue(details[0]["isEnd"])
        self.assertIsNone(details[0]["gold"])

    def test_enchant_end_tier_matches_equivalent_armor_slot_group(self):
        cards = [{
            "sources": [{
                "slot": "벨트",
                "tier": "종결",
                "role": "dealer",
                "effects": {"finalDamage": 3, "attack": 15, "allStat": 50, "critical": 3},
                "reinforceSkill": [],
            }],
        }]
        details = setting_value_service._get_current_enchant_details(
            [{
                "slot": "신발",
                "effects": {"finalDamage": 3, "attack": 15, "allStat": 50, "critical": 3},
                "reinforceSkill": [],
            }],
            cards,
        )
        self.assertEqual(details[0]["tier"], "종결")
        self.assertTrue(details[0]["isEnd"])
        self.assertIsNone(details[0]["gold"])

    def test_annotate_current_enchant_tiers_marks_end_enchants(self):
        cards = [{
            "sources": [{
                "slot": "상의",
                "tier": "종결",
                "role": "dealer",
                "effects": {"finalDamage": 3, "allStat": 90},
                "reinforceSkill": [],
            }],
        }]
        rows = setting_value_service.annotate_current_enchant_tiers(
            [{
                "slot": "상의",
                "effects": {"finalDamage": 3, "str": 90, "int": 90},
                "reinforceSkill": [],
            }],
            cards,
        )
        self.assertEqual(rows[0]["tier"], "종결")
        self.assertTrue(rows[0]["isEnd"])

    def test_aura_value_reuses_exact_upgrade_candidate_price(self):
        current = {"itemId": "current-aura"}
        candidates = [
            priced_row("current-aura", 30, priceItem={"itemId": "tradable-aura-box"}),
            priced_row("other-aura", 10),
        ]
        self.assertEqual(setting_value_service._get_aura_candidate_gold(current, candidates), 30)

    def test_aura_value_uses_same_upgrade_stage_price(self):
        current = {"itemId": "old-aura", "effects": {"elementAll": 50}}
        candidates = [
            priced_row("current-stage-aura", 25, effects={"elementAll": 50}),
            priced_row("other-stage-aura", 10, effects={"elementAll": 40}),
        ]
        self.assertEqual(setting_value_service._get_aura_candidate_gold(current, candidates), 25)

    def test_aura_value_does_not_guess_without_stage_information(self):
        self.assertIsNone(
            setting_value_service._get_aura_candidate_gold(
                {"itemId": "unlisted-current-aura"},
                [priced_row("other-aura", 10)],
            ),
        )

    def test_creature_value_reuses_upgrade_tier_price_and_ignores_level_choice(self):
        current = {
            "itemId": "event-creature",
            "effects": {"finalDamage": 1.5, "elementAll": 40},
            "itemReinforceSkill": [{
                "jobName": "도적",
                "skills": [{"name": "히트 블리드", "value": 1}],
            }],
            "itemBuff": {},
            "variant": "플래티넘",
            "levelTag": 35,
            "skillDamageMultiplier": 1.014286,
            "skillDamagePercent": 1.428571,
        }
        candidates = [
            priced_row(
                "tradable-platinum-egg",
                77,
                effects={"finalDamage": 1.5, "elementAll": 40},
                itemReinforceSkill=[{
                    "jobName": "도적",
                    "skills": [{"name": "야타의 거울", "value": 1}],
                }],
                itemBuff={},
                variant="플래티넘",
                levelTag=75,
                skillDamageMultiplier=1.014286,
                skillDamagePercent=1.428571,
            ),
            priced_row(
                "normal-egg",
                35,
                effects={"elementAll": 40},
                itemReinforceSkill=[{
                    "jobName": "도적",
                    "skills": [{"name": "히트 블리드", "value": 1}],
                }],
                itemBuff={},
                variant="일반",
                skillDamageMultiplier=1.014286,
                skillDamagePercent=1.428571,
            ),
        ]
        self.assertEqual(
            setting_value_service._get_creature_candidate_gold(current, candidates),
            77,
        )

    def test_title_value_reuses_upgrade_performance_group_and_ignores_level_choice(self):
        current = {
            "itemId": "event-platinum-title-35",
            "variant": "플래티넘",
            "levelTag": 35,
            "skillDamagePercent": 10,
            "effects": {"finalDamage": 5, "elementAll": 6},
            "enchantEffects": {"elementAll": 6},
        }
        candidates = [
            priced_row(
                "tradable-platinum-title-75",
                80,
                variant="플래티넘",
                levelTag=75,
                skillDamagePercent=10,
                effects={"finalDamage": 5, "elementAll": 6},
                enchantEffects={"elementAll": 6},
                purchaseRoute="cleanTitlePlusBead",
            ),
            priced_row(
                "attached-platinum-title-30",
                72,
                variant="플래티넘",
                levelTag=30,
                skillDamagePercent=15,
                effects={"finalDamage": 5, "elementAll": 6},
                enchantEffects={"elementAll": 6},
                purchaseRoute="attachedBead",
            ),
            priced_row(
                "different-effect-title",
                30,
                variant="플래티넘",
                levelTag=35,
                skillDamagePercent=10,
                effects={"finalDamage": 5, "elementAll": 8},
                enchantEffects={"elementAll": 8},
            ),
            priced_row(
                "normal-title",
                20,
                variant="일반",
                effects={"finalDamage": 5, "elementAll": 6},
                enchantEffects={"elementAll": 6},
            ),
        ]
        self.assertEqual(
            setting_value_service._get_title_candidate_gold(current, candidates),
            72,
        )

    def test_event_artifact_uses_same_slot_effect_and_element_price(self):
        current = {
            "itemId": "event-blue-artifact",
            "slotColor": "BLUE",
            "effects": {"attack": 25, "critical": 5},
            "element": "dark",
            "artifactAllElement": 0,
            "artifactSingleElement": 0,
        }
        groups = [{
            "candidates": [
                priced_row(
                    "tradable-dark-artifact",
                    28,
                    slotColor="BLUE",
                    effects={"attack": 25, "critical": 5},
                    element="dark",
                    artifactAllElement=0,
                    artifactSingleElement=0,
                ),
                priced_row(
                    "tradable-light-artifact",
                    27,
                    slotColor="BLUE",
                    effects={"attack": 25, "critical": 5},
                    element="light",
                    artifactAllElement=0,
                    artifactSingleElement=0,
                ),
            ],
        }]
        self.assertEqual(
            setting_value_service._get_artifact_candidate_gold(current, groups),
            28,
        )

    def test_creature_category_sums_body_and_all_artifact_equivalents(self):
        creature = {
            "itemId": "event-creature",
            "effects": {"finalDamage": 1.5},
            "variant": "플래티넘",
            "levelTag": 35,
            "artifacts": [
                {
                    "itemId": "red",
                    "slotColor": "RED",
                    "effects": {"attackAmplification": 4},
                },
                {
                    "itemId": "event-blue",
                    "slotColor": "BLUE",
                    "effects": {"attack": 25},
                },
                {
                    "itemId": "event-green",
                    "slotColor": "GREEN",
                    "effects": {"allStat": 20},
                },
            ],
        }
        creature_catalog = {
            "groups": [{
                "candidates": [priced_row(
                    "tradable-creature",
                    70,
                    effects={"finalDamage": 1.5},
                    variant="플래티넘",
                    levelTag=35,
                )],
            }],
            "artifactGroups": [
                {"candidates": [priced_row(
                    "red",
                    2,
                    slotColor="RED",
                    effects={"attackAmplification": 4},
                )]},
                {"candidates": [priced_row(
                    "blue",
                    3,
                    slotColor="BLUE",
                    effects={"attack": 25},
                )]},
                {"candidates": [priced_row(
                    "green",
                    4,
                    slotColor="GREEN",
                    effects={"allStat": 20},
                )]},
            ],
        }
        result = setting_value_service.build_character_setting_value(
            enchant_rows=[],
            equipment_upgrades=[],
            title={},
            aura={},
            creature=creature,
            avatar_slots=[],
            buff_loadout={},
            upgrade_expected_db={},
            material_prices={},
            black_fang_rows=[],
            unique_equipment_rows=[],
            direct_prices={},
            enchant_catalog={},
            title_catalog={},
            aura_catalog={},
            creature_catalog=creature_catalog,
        )
        breakdown = {row["key"]: row["gold"] for row in result["breakdown"]}
        self.assertEqual(breakdown["creature"], 79)

    def test_buff_enhancement_uses_same_contribution_title_and_creature_candidates(self):
        result = setting_value_service.build_character_setting_value(
            enchant_rows=[],
            equipment_upgrades=[],
            title={"itemId": "main-title"},
            aura={},
            creature={"itemId": "main-creature"},
            avatar_slots=[],
            buff_loadout={
                "equipment": [{
                    "slotId": "TITLE",
                    "slotName": "칭호",
                    "itemId": "untradable-switch-title",
                    "itemName": "봉인의 수호자[어둠]",
                    "buffContribution": {"skillLevel": 3},
                }],
                "creature": [{
                    "itemId": "untradable-switch-creature",
                    "itemName": "아글라오페[25~30Lv]",
                    "buffContribution": {"skillLevel": 1},
                }],
            },
            upgrade_expected_db={},
            material_prices={},
            black_fang_rows=[],
            unique_equipment_rows=[],
            direct_prices={},
            enchant_catalog={},
            title_catalog={},
            aura_catalog={},
            creature_catalog={},
            buff_title_price_candidate=priced_row(
                "tradable-switch-title",
                70,
                itemName="모험가의 의지[어둠]",
                purchaseRouteLabel="버프 스킬 +3Lv 완성품",
            ),
            buff_creature_price_candidate=priced_row(
                "tradable-switch-creature",
                30,
                itemName="2026 쁘띠 바이킹 알",
                purchaseRouteLabel="버프 스킬 +1Lv 크리쳐",
            ),
        )

        breakdown = {row["key"]: row["gold"] for row in result["breakdown"]}
        details = {row["key"]: row["items"] for row in result["details"]}
        self.assertEqual(breakdown["buffEnhancement"], 100)
        self.assertEqual([row["gold"] for row in details["buffEnhancement"]], [70, 30])
        self.assertEqual(details["buffEnhancement"][0]["priceItemName"], "모험가의 의지[어둠]")
        self.assertEqual(details["buffEnhancement"][1]["priceItemName"], "2026 쁘띠 바이킹 알")

    def test_collect_direct_item_ids_uses_only_current_setting_items(self):
        result = setting_value_service.collect_setting_value_direct_item_ids(
            {"itemId": "title"},
            {"itemId": "aura"},
            {"itemId": "creature", "artifacts": [{"itemId": "artifact"}]},
            [{
                "emblems": [{"itemId": "emblem"}],
                "platinumEmblems": [{"itemId": "platinum"}],
            }],
            {
                "equipment": [
                    {"slotId": "TITLE", "itemId": "switch-title"},
                    {"itemId": "dense", "buffContribution": {"isDenseFragment": True}},
                    {"itemId": "ignored"},
                ],
                "avatar": [{
                    "buffAvatarSource": "actual",
                    "itemId": "switch-avatar",
                    "emblems": [{"itemId": "switch-emblem"}],
                }],
                "creature": [{"itemId": "switch-creature"}],
            },
        )
        self.assertEqual(set(result), {
            "title", "aura", "creature", "artifact", "emblem", "platinum",
            "switch-title", "dense", "switch-avatar", "switch-emblem", "switch-creature",
        })

    def test_direct_item_details_skip_empty_sockets_and_show_equivalent_price_item(self):
        details = setting_value_service._get_direct_item_details(
            [
                {"itemId": "", "itemName": "", "avatarSlot": "상의 아바타"},
                {
                    "itemId": "event-emblem",
                    "itemName": "찬란한 붉은빛 엠블렘[지능]",
                    "avatarSlot": "오라 아바타",
                },
            ],
            {
                "event-emblem": {
                    "priceStatus": "priced",
                    "minUnitPrice": 123,
                    "priceItemId": "tradable-emblem",
                    "priceItemName": "찬란한 붉은빛 엠블렘[지능]",
                    "priceSource": "sameNameCachedItem",
                },
            },
            kind="emblem",
        )

        self.assertEqual(len(details), 1)
        self.assertEqual(details[0]["gold"], 123)
        self.assertEqual(details[0]["priceItemName"], "찬란한 붉은빛 엠블렘[지능]")
        self.assertEqual(details[0]["note"], "동일 이름 거래품의 캐시 가격")


if __name__ == "__main__":
    unittest.main()
