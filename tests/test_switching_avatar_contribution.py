import ast
import re
import unittest
from pathlib import Path


SOURCE_PATH = Path(__file__).resolve().parents[1] / "server" / "character_equipment_service.py"
TARGET_FUNCTIONS = {
    "build_buff_loadout_item_payload",
    "build_buff_loadout_avatar_payload",
    "resolve_effective_buff_avatar_rows",
    "build_buff_loadout_payload",
    "get_named_skill_level_bonus",
    "get_named_skill_level_bonus_any",
    "normalize_skill_name",
    "skill_name_matches",
    "get_platinum_emblems",
    "extract_platinum_skill_name",
    "is_matching_switching_platinum_emblem",
    "get_switching_avatar_skill_level_contribution_parts",
    "get_switching_avatar_skill_level_contribution",
    "add_named_skill_bonuses",
    "get_setup_skill_bonuses",
    "calculate_buffer_switching_avatar_candidate_delta",
}


def clean_text(value):
    return str(value or "").strip()


def load_target_namespace():
    source = SOURCE_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(SOURCE_PATH))
    functions = [
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name in TARGET_FUNCTIONS
    ]
    namespace = {
        "re": re,
        "clean_text": clean_text,
        "fetch_item_details": lambda _item_ids: [],
    }
    exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE_PATH), "exec"), namespace)
    return namespace


CURRENT_AVATAR = {
    "slotId": "JACKET",
    "slotName": "상의 아바타",
    "itemId": "rental-jacket",
    "itemName": "2026 아라드 패스 로즈쿼츠 코르셋 웨딩 탑",
    "optionAbility": "러블리 템포 스킬Lv +1",
    "buffAvatarSource": "wornFallback",
    "emblems": [],
}
CURRENT_DETAIL = {
    "itemId": "rental-jacket",
    "itemReinforceSkill": [{
        "jobName": "아처",
        "skills": [{"name": "러블리 템포", "value": 1}],
    }],
}
TARGET_AVATAR = {
    "slotId": "JACKET",
    "slotName": "상의 아바타",
    "itemId": "rare-jacket",
    "itemName": "레어 클론 아바타 상의",
    "itemRarity": "레어",
    "optionAbility": "러블리 템포 스킬Lv +1",
    "emblems": [{
        "itemId": "lovely-tempo-platinum",
        "itemName": "플래티넘 엠블렘[러블리 템포]",
        "slotColor": "플래티넘",
    }],
}


class SwitchingAvatarContributionTest(unittest.TestCase):
    def setUp(self):
        self.ns = load_target_namespace()

    def test_makimuse_rental_top_and_normal_rare_candidate_are_both_plus_two(self):
        parts = self.ns["get_switching_avatar_skill_level_contribution_parts"]
        total = self.ns["get_switching_avatar_skill_level_contribution"]

        current_parts = parts(CURRENT_AVATAR, ["러블리 템포"], "아처", CURRENT_DETAIL)
        candidate_parts = parts(TARGET_AVATAR, ["러블리 템포"], "아처", {})

        self.assertEqual(current_parts, {
            "topOptionSkillLevel": 1,
            "itemSkillLevel": 1,
            "platinumSkillLevel": 0,
        })
        self.assertEqual(candidate_parts, {
            "topOptionSkillLevel": 1,
            "itemSkillLevel": 0,
            "platinumSkillLevel": 1,
        })
        self.assertEqual(total(
            [CURRENT_AVATAR],
            ["러블리 템포"],
            "아처",
            {"rental-jacket": CURRENT_DETAIL},
        ), 2)
        self.assertEqual(total(
            [TARGET_AVATAR],
            ["러블리 템포"],
            "아처",
            {"rare-jacket": {}},
        ), 2)

    def test_buff_loadout_payload_uses_the_same_rental_contribution(self):
        ns = self.ns
        payloads = {
            "buff_equipment": {
                "jobName": "아처",
                "jobGrowName": "眞 뮤즈",
                "skill": {"buff": {"skillInfo": {
                    "skillId": "lovely-tempo",
                    "name": "러블리 템포",
                    "option": {"level": 10},
                }, "equipment": []}},
            },
            "buff_avatar": {"skill": {"buff": {"avatar": []}}},
            "buff_creature": {"skill": {"buff": {"creature": []}}},
            "avatar": {"avatar": [CURRENT_AVATAR]},
        }
        ns.update({
            "clean_item_display_name": clean_text,
            "get_item_icon_url": lambda item_id: f"icon:{item_id}",
            "get_avatar_auction_emblems": lambda row: list(row.get("emblems") or []),
            "get_character_cached_payload": lambda _server, _character, resource, _path: payloads.get(resource, {}),
            "find_dealer_switching_buff_entry": lambda *_args, **_kwargs: {},
            "match_current_switching_coefficients": lambda *_args: [],
            "load_dealer_switching_buff_db": lambda: {"metadata": {"baseLevel": 20}},
            "get_switching_creature_target_skill_names": lambda skill, equivalents: [
                name for name in [skill, *(equivalents or [])] if name
            ],
            "get_buff_skill_required_level": lambda *_args: 0,
            "get_switching_skill_required_levels": lambda *_args: [],
            "get_switching_fragment_coefficients": lambda *_args: [],
            "get_item_explain": lambda _detail: "",
            "is_switching_fragment_item_name": lambda *_args: False,
            "fetch_item_details": lambda item_ids: [
                CURRENT_DETAIL for item_id in item_ids if item_id == "rental-jacket"
            ],
        })

        payload = ns["build_buff_loadout_payload"]("cain", "makimuse")

        self.assertEqual(len(payload["avatar"]), 1)
        self.assertEqual(payload["avatar"][0]["buffAvatarSource"], "wornFallback")
        self.assertEqual(payload["avatar"][0]["buffContribution"], {
            "topOptionSkillLevel": 1,
            "itemSkillLevel": 1,
            "platinumSkillLevel": 0,
        })

    def test_item_reinforce_skill_uses_actual_value_and_job_target_matching(self):
        parts = self.ns["get_switching_avatar_skill_level_contribution_parts"]
        future_detail = {
            "itemId": "future-jacket",
            "itemReinforceSkill": [
                {
                    "jobName": "아처",
                    "skills": [
                        {"name": "러블리 템포", "value": 2},
                        {"name": "다른 스킬", "value": 9},
                    ],
                },
                {
                    "jobName": "마법사(여)",
                    "skills": [{"name": "러블리 템포", "value": 7}],
                },
            ],
        }
        result = parts(
            {"itemId": "future-jacket", "optionAbility": "러블리 템포 스킬Lv +1"},
            ["러블리 템포"],
            "아처",
            future_detail,
        )
        self.assertEqual(result["topOptionSkillLevel"], 1)
        self.assertEqual(result["itemSkillLevel"], 2)
        self.assertEqual(sum(result.values()), 3)

    def test_general_top_bottom_and_platinum_regression(self):
        parts = self.ns["get_switching_avatar_skill_level_contribution_parts"]
        top = parts(
            {"slotId": "JACKET", "optionAbility": "러블리 템포 스킬Lv +1"},
            ["러블리 템포"],
            "아처",
            {},
        )
        plain_top = parts(
            {"slotId": "JACKET", "optionAbility": "러블리 템포"},
            ["러블리 템포"],
            "아처",
            {},
        )
        bottom = parts({
            "slotId": "PANTS",
            "emblems": [{
                "itemName": "플래티넘 엠블렘[러블리 템포]",
                "slotColor": "플래티넘",
            }],
        }, ["러블리 템포"], "아처", {})
        wrong_platinum = parts({
            "slotId": "PANTS",
            "emblems": [{
                "itemName": "플래티넘 엠블렘[다른 스킬]",
                "slotColor": "플래티넘",
            }],
        }, ["러블리 템포"], "아처", {})

        self.assertEqual(top, {
            "topOptionSkillLevel": 1,
            "itemSkillLevel": 0,
            "platinumSkillLevel": 0,
        })
        self.assertEqual(plain_top, top)
        self.assertEqual(bottom, {
            "topOptionSkillLevel": 0,
            "itemSkillLevel": 0,
            "platinumSkillLevel": 1,
        })
        self.assertEqual(sum(wrong_platinum.values()), 0)

    def test_buffer_candidate_delta_is_zero_without_double_counting_setup_bonus(self):
        ns = self.ns
        ns["get_buffer_switching_rows"] = lambda _server, _character: (
            [],
            [CURRENT_AVATAR],
            {},
        )
        ns["fetch_item_details"] = lambda item_ids: [
            detail
            for detail in [CURRENT_DETAIL, {"itemId": "rare-jacket"}]
            if detail["itemId"] in set(item_ids)
        ]
        ns["get_character_cached_payload"] = lambda *_args: {}
        ns["flatten_skill_rows"] = lambda _payload: []
        ns["replace_avatar_row"] = lambda rows, slot_id, avatar_row: [
            avatar_row if clean_text(row.get("slotId")) == clean_text(slot_id) else row
            for row in rows
        ]
        ns["get_buffer_switching_metrics"] = lambda *_args: {
            "switchingStatDelta": 0,
            "switchingDirectStatDelta": 0,
        }
        ns["get_buffer_named_skill_contributions"] = lambda bonuses, _baseline: bonuses

        result = ns["calculate_buffer_switching_avatar_candidate_delta"](
            "cain",
            "makimuse",
            "JACKET",
            TARGET_AVATAR,
            {"jobName": "아처"},
            "정신력",
            "러블리 템포",
            [],
        )

        self.assertEqual(result["currentBuffSkillLevelContribution"], 2)
        self.assertEqual(result["candidateBuffSkillLevelContribution"], 2)
        self.assertEqual(result["buffSkillLevelDelta"], 0)
        self.assertEqual(result["baseSkillContributions"], {"러블리 템포": 2})
        self.assertEqual(result["targetSkillContributions"], {"러블리 템포": 2})
        self.assertTrue(result["usedCurrentAvatarFallback"])


if __name__ == "__main__":
    unittest.main()
