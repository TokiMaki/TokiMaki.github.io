import unittest
from unittest.mock import patch

import server.data_store as data_store
from server.character_equipment_service import (
    _get_character_base_attack_debug,
    build_damage_baseline_from_status_payload,
)
from server.data_store import (
    load_job_attack_type_db,
    load_job_base_stats,
    resolve_job_attack_sources,
    resolve_job_base_stat_row,
)


class JobBaseStatResolverTest(unittest.TestCase):
    def test_male_crusader_alias(self):
        row = resolve_job_base_stat_row("프리스트(남)", "眞 크루세이더")

        self.assertEqual(row.get("힘"), 630)
        self.assertEqual(row.get("지능"), 618)

    def test_female_crusader_alias(self):
        row = resolve_job_base_stat_row("프리스트(여)", "眞 크루세이더")

        self.assertEqual(row.get("힘"), 630)
        self.assertEqual(row.get("지능"), 818)

    def test_regular_job_keeps_exact_lookup(self):
        expected = load_job_base_stats().get("眞 버서커")

        self.assertIs(resolve_job_base_stat_row("귀검사(남)", "眞 버서커"), expected)

    def test_unknown_job_keeps_empty_result(self):
        self.assertEqual(resolve_job_base_stat_row("알 수 없음", "眞 알 수 없음"), {})

    def test_attack_type_db_contains_all_current_jobs(self):
        self.assertEqual(len(load_job_attack_type_db().get("jobs") or []), 71)

    def test_unknown_attack_type_keeps_fallback_enabled(self):
        self.assertEqual(
            resolve_job_attack_sources(
                "unknown-job",
                "unknown-grow",
            ),
            [],
        )

    def test_configured_attack_sources_exclude_unrelated_attack_values(self):
        original_cache = data_store._JOB_ATTACK_TYPE_DB_CACHE
        try:
            data_store._JOB_ATTACK_TYPE_DB_CACHE = {
                "jobs": [
                    {
                        "jobId": "fighter-female",
                        "jobGrowId": "striker",
                        "attackSources": ["physical"],
                    },
                    {
                        "jobId": "hybrid-job",
                        "jobGrowId": "hybrid-grow",
                        "attackSources": ["physical", "magical"],
                    },
                ],
            }
            status = [
                {"name": "힘", "value": 5000},
                {"name": "지능", "value": 4000},
                {"name": "물리 공격", "value": 3000},
                {"name": "마법 공격", "value": 3200},
                {"name": "독립 공격", "value": 4000},
            ]

            physical = build_damage_baseline_from_status_payload({
                "jobId": "fighter-female",
                "jobGrowId": "striker",
                "jobName": "격투가(여)",
                "jobGrowName": "眞 스트라이커",
                "status": status,
            })
            hybrid = build_damage_baseline_from_status_payload({
                "jobId": "hybrid-job",
                "jobGrowId": "hybrid-grow",
                "jobName": "테스트",
                "jobGrowName": "眞 하이브리드",
                "status": status,
            })

            self.assertEqual((physical["attackSource"], physical["attack"]), ("physical", 3000))
            self.assertEqual((hybrid["attackSource"], hybrid["attack"]), ("magical", 3200))
        finally:
            data_store._JOB_ATTACK_TYPE_DB_CACHE = original_cache

    def test_character_base_attack_sums_unmodified_attack_sources(self):
        equipment = [
            {
                "slotId": "WEAPON",
                "itemId": "weapon",
                "reinforce": 13,
                "refine": 0,
                "enchant": {"status": [{"name": "물리 공격력", "value": 30}]},
            },
            {
                "slotId": "EARRING",
                "itemId": "earring",
                "reinforce": 11,
                "enchant": {"status": []},
            },
            {
                "slotId": "JACKET",
                "itemId": "jacket",
                "reinforce": 11,
                "enchant": {"status": [{"name": "물리 공격력", "value": 260}]},
            },
        ]
        avatar = [{"slotId": "AURORA", "itemId": "aura"}]
        creature = {
            "itemId": "creature",
            "artifact": [{"itemId": "artifact"}],
        }
        details = [
            {"itemId": "weapon", "itemStatus": [{"name": "물리 공격력", "value": 1757}]},
            {"itemId": "earring", "itemStatus": []},
            {"itemId": "jacket", "itemStatus": []},
            {"itemId": "aura", "itemStatus": [{"name": "물리 공격력", "value": 50}]},
            {"itemId": "creature", "itemStatus": []},
            {"itemId": "artifact", "itemStatus": [{"name": "물리 공격력", "value": 25}]},
        ]

        with patch("server.character_equipment_service.fetch_item_details", return_value=details):
            result = _get_character_base_attack_debug(
                equipment,
                avatar,
                creature,
                "physical",
            )

        self.assertEqual(result["basePotential"], 95)
        self.assertEqual(result["bodyAttack"], 1832)
        self.assertEqual(result["enchantAttack"], 290)
        self.assertEqual(result["upgradeAttack"], 1211)
        self.assertEqual(result["value"], 3428)

    def test_explicit_character_base_attack_ignores_mastery_inflated_status(self):
        result = build_damage_baseline_from_status_payload({
            "jobId": "fighter-female",
            "jobGrowId": "striker",
            "jobName": "격투가(여)",
            "jobGrowName": "眞 스트라이커",
            "status": [
                {"name": "힘", "value": 5000},
                {"name": "물리 공격", "value": 5042},
                {"name": "마법 공격", "value": 3428},
                {"name": "독립 공격", "value": 3428},
            ],
        }, character_base_attack=3428)

        self.assertEqual((result["attackSource"], result["attack"]), ("physical", 3428))


if __name__ == "__main__":
    unittest.main()
