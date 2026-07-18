import unittest
from unittest.mock import Mock, patch

import server.character_equipment_service as service
from server.repositories import skill_repository


CONTEXT_KEY = "job-1:skill-1"
SWITCHING_CONTEXT_KEY = f"{CONTEXT_KEY}:switching"


def contribution(value):
    return [{
        "contextKey": CONTEXT_KEY,
        "jobId": "job-1",
        "skillId": "skill-1",
        "skillName": "테스트 스킬",
        "levelContribution": value,
    }]


def skill_detail(maximum=14):
    return {
        "levelInfo": {
            "optionDesc": "체력 증가량 {value1}",
            "rows": [
                {"level": level, "optionValue": {"value1": level * 10}}
                for level in range(7, maximum + 1)
            ],
        },
    }


def baseline():
    return {
        "isBuffer": True,
        "jobId": "job-1",
        "jobName": "테스트 직업",
        "statName": "체력",
        "currentSelfStatSkills": {
            "테스트 스킬": {
                "contextKey": CONTEXT_KEY,
                "jobId": "job-1",
                "skillId": "skill-1",
                "level": 10,
                "requiredLevel": 20,
                "affectsSelfStat": True,
                "affectsAuraStat": False,
                "affectsAuraAttack": False,
            },
        },
    }


def build_context(groups, context_key=CONTEXT_KEY, switching_levels=None, maximum=14):
    return service.build_buffer_skill_contexts_from_groups(
        baseline(),
        groups,
        {CONTEXT_KEY: skill_detail(maximum)},
        switching_levels,
    )[context_key]


class BufferSkillContextRangeTest(unittest.TestCase):
    def test_independent_groups_add_but_same_group_candidates_do_not(self):
        independent = build_context({
            "a": {"baseContributions": [], "candidateContributions": [contribution(1)]},
            "b": {"baseContributions": [], "candidateContributions": [contribution(1)]},
        })
        alternatives = build_context({
            "a": {
                "baseContributions": [],
                "candidateContributions": [contribution(1), contribution(1)],
            },
        })

        self.assertEqual(independent["maxReachableLevel"], 12)
        self.assertEqual(independent["netChangesByLevel"]["12"]["selfStatSkillDelta"], 20)
        self.assertEqual(alternatives["maxReachableLevel"], 11)
        self.assertNotIn("12", alternatives["netChangesByLevel"])

    def test_zero_is_reachable_only_for_actual_zero_candidate(self):
        nonzero = build_context({
            "replacement": {
                "baseContributions": contribution(1),
                "candidateContributions": [contribution(2)],
            },
        })
        removal = build_context({
            "replacement": {
                "baseContributions": contribution(1),
                "candidateContributions": [[]],
            },
        })

        self.assertEqual((nonzero["minReachableLevel"], nonzero["maxReachableLevel"]), (10, 11))
        self.assertNotIn("9", nonzero["netChangesByLevel"])
        self.assertEqual(removal["minReachableLevel"], 9)
        self.assertEqual(removal["netChangesByLevel"]["9"]["selfStatSkillDelta"], -10)

    def test_missing_absolute_row_omits_context(self):
        contexts = service.build_buffer_skill_contexts_from_groups(
            baseline(),
            {
                "a": {"baseContributions": [], "candidateContributions": [contribution(1)]},
                "b": {"baseContributions": [], "candidateContributions": [contribution(1)]},
            },
            {CONTEXT_KEY: skill_detail(11)},
        )
        self.assertEqual(contexts, {})

    def test_switching_scope_uses_switching_level(self):
        context = build_context(
            {
                "switching": {
                    "baseContributions": [],
                    "candidateContributions": [contribution(1)],
                    "scope": "switching",
                },
            },
            SWITCHING_CONTEXT_KEY,
            {CONTEXT_KEY: 12},
        )
        self.assertEqual((context["currentLevel"], context["maxReachableLevel"]), (12, 13))


class BufferSkillContextSupplyTest(unittest.TestCase):
    def test_enchant_response_reuses_loaded_detail_and_excludes_avatar(self):
        duplicate_baseline = baseline()
        template = duplicate_baseline["currentSelfStatSkills"].pop("테스트 스킬")
        duplicate_baseline["currentSelfStatSkills"] = {
            "테스트 A": {**template, "contextKey": "context-a"},
            "테스트 B": {**template, "contextKey": "context-b"},
        }
        payload = {
            "cards": [{
                "role": "buffer",
                "sources": [
                    {"role": "buffer", "slot": "TOP", "bufferSkillContributions": [{"contextKey": "context-a", "levelContribution": 1}]},
                    {"role": "buffer", "slot": "BOTTOM", "bufferSkillContributions": [{"contextKey": "context-b", "levelContribution": 1}]},
                ],
            }],
        }
        with patch.object(service, "get_character_cached_payload", return_value={"equipment": []}), \
                patch.object(service, "build_equipment_enchant_rows_and_upgrades", return_value=([], [])), \
                patch.object(service, "get_skill_detail", return_value=skill_detail()) as lookup:
            result = service.build_buffer_enchant_skill_context_payload(
                "server",
                "character",
                payload,
                recommendation_payloads={"avatar": {"recommendations": [{"targetSkillContributions": contribution(2)}]}},
                baseline=duplicate_baseline,
                skill_detail_by_context={"context-a": skill_detail()},
            )

        self.assertEqual(set(result["bufferSkillContexts"]), {"context-a", "context-b"})
        lookup.assert_not_called()

    def test_loadout_avatar_requires_explicit_target_slot(self):
        contexts = service.build_buffer_loadout_skill_contexts(
            baseline(),
            {CONTEXT_KEY: skill_detail()},
            {CONTEXT_KEY: 12},
            [],
            [],
            {"recommendations": [{
                "kind": "platinumEmblem",
                "slot": "상의 아바타",
                "baseSkillContributions": [],
                "targetSkillContributions": contribution(1),
            }]},
        )
        self.assertEqual(contexts, {})

    def test_load_character_enchants_strips_private_baseline_fields(self):
        private_baseline = {
            **baseline(),
            "_bufferSkillDetails": {CONTEXT_KEY: skill_detail()},
            "_bufferSwitchingSkillLevels": {CONTEXT_KEY: 12},
        }
        mocks = {
            "get_character_cached_payload": Mock(return_value={"equipment": []}),
            "build_equipment_enchant_rows_and_upgrades": Mock(return_value=([], [])),
            "_get_equipment_base_element_bonus_debug": Mock(return_value={"value": 0, "steps": []}),
            "load_character_damage_baseline": Mock(return_value={}),
            "load_upgrade_material_prices": Mock(return_value={}),
            "build_black_fang_recommendations_debug": Mock(return_value={"recommendations": [], "steps": []}),
            "load_character_oath_upgrades": Mock(return_value={}),
            "load_character_buffer_baseline": Mock(return_value=private_baseline),
            "get_equipment_total_set_point": Mock(return_value=0),
            "load_oath_tune_stage_db": Mock(return_value={}),
            "load_upgrade_expected_db": Mock(return_value={}),
            "build_character_enchants_payload": Mock(side_effect=lambda _p, _d, b, *_a: {"bufferBaseline": b}),
        }
        with patch.multiple(service, **mocks):
            result = service.load_character_enchants("server", "character", include_skill_details=True)

        mocks["load_character_buffer_baseline"].assert_called_once_with(
            "server", "character", include_skill_details=True,
        )
        self.assertNotIn("_bufferSkillDetails", result["bufferBaseline"])
        self.assertEqual(result["_bufferSkillDetails"], {CONTEXT_KEY: skill_detail()})
        self.assertEqual(result["_bufferSwitchingSkillLevels"], {CONTEXT_KEY: 12})

    def test_loadout_reuses_loaded_baseline_details_and_current_rows(self):
        loaded_baseline = baseline()
        enchant_payload = {
            "serverId": "server", "characterId": "character", "bufferBaseline": loaded_baseline,
            "damageBaseline": {}, "_bufferSkillDetails": {CONTEXT_KEY: skill_detail()},
            "_bufferSwitchingSkillLevels": {CONTEXT_KEY: 12},
        }
        mocks = {
            "start_api_fanout_trace": Mock(return_value="trace"),
            "finish_api_fanout_trace": Mock(return_value={}),
            "write_ops_log": Mock(),
            "prefetch_loadout_item_details": Mock(),
            "load_character_enchants": Mock(return_value=enchant_payload),
            "load_character_creature": Mock(return_value={"creature": {}, "debugTimings": {}}),
            "load_character_title": Mock(return_value={"title": {}, "debugTimings": {}}),
            "load_character_aura": Mock(return_value={"aura": {}, "debugTimings": {}}),
            "load_character_avatar": Mock(return_value={"avatar": {}, "recommendations": [], "debugTimings": {}}),
            "load_buffer_switching_title_recommendations": Mock(return_value=[{
                "baseSkillContributions": [],
                "targetSkillContributions": contribution(1),
                "skillContributionScope": "switching",
            }]),
            "load_dealer_switching_fragment_recommendations_for_character": Mock(return_value=[]),
            "load_buffer_switching_creature_release_recommendations": Mock(return_value=[]),
            "build_buff_loadout_payload": Mock(return_value={}),
            "load_character_buffer_baseline": Mock(side_effect=AssertionError("duplicate baseline load")),
            "get_skill_detail": Mock(side_effect=AssertionError("duplicate skill lookup")),
        }
        with patch.multiple(service, **mocks):
            result = service.load_character_loadout("server", "character")

        mocks["load_character_enchants"].assert_called_once_with(
            "server", "character", include_skill_details=True,
        )
        for name in ("load_character_creature", "load_character_title", "load_character_aura"):
            mocks[name].assert_called_once_with("server", "character")
        mocks["load_character_avatar"].assert_called_once_with("server", "character", loaded_baseline)
        self.assertEqual(result["bufferSkillContexts"][SWITCHING_CONTEXT_KEY]["maxReachableLevel"], 13)


class SkillRepositoryCacheTest(unittest.TestCase):
    def test_duplicate_lookup_uses_existing_repository_cache(self):
        skill_repository._SKILL_DETAIL_CACHE.clear()
        skill_repository._SKILL_DETAIL_IN_FLIGHT.clear()
        try:
            with patch.object(skill_repository, "fetch_skill_detail_from_api", return_value=skill_detail()) as fetch:
                self.assertEqual(
                    skill_repository.get_skill_detail("job-1", "skill-1"),
                    skill_repository.get_skill_detail("job-1", "skill-1"),
                )
            fetch.assert_called_once_with("job-1", "skill-1")
        finally:
            skill_repository._SKILL_DETAIL_CACHE.clear()
            skill_repository._SKILL_DETAIL_IN_FLIGHT.clear()


if __name__ == "__main__":
    unittest.main()
