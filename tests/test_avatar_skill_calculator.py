import json
import unittest
from pathlib import Path
from unittest.mock import patch

from server.avatar_skill_optimizer import (
    evaluate_avatar_combo,
    extract_current_avatar_skills,
    get_avatar_candidate_combos,
    get_character_avatar_skill_infos,
    resolve_weapon_mastery_skill_name,
    select_best_avatar_combo_for_character,
)
from server.calculators.avatar_skill_calculator import (
    estimate_skill_plus_one,
    find_skill_attack_option_value_key,
    get_skill_attack_ratio,
    normalize_skill_key,
    parse_skill_attack_percent,
)


def build_skill_detail(job_id, name, option_desc, rows):
    return {
        "jobId": job_id,
        "name": name,
        "levelInfo": {
            "optionDesc": option_desc,
            "rows": [
                {
                    "level": level,
                    "optionValue": values,
                }
                for level, values in rows
            ],
        },
    }


class AvatarSkillCalculatorTests(unittest.TestCase):
    def test_skill_attack_patterns_ignore_damage_ratio_descriptions(self):
        self.assertIsNone(
            parse_skill_attack_percent("성화 지속 피해 공격력: 스킬 공격력의 5%")
        )
        self.assertEqual(
            find_skill_attack_option_value_key(
                "성화 지속 피해 공격력: 스킬 공격력의 {value2}%\n"
                "기본 공격 및 전직 계열 스킬 공격력 증가율: {value5}%"
            ),
            "value5",
        )
    def test_explicit_value_key_uses_authoritative_option_value(self):
        detail = build_skill_detail(
            "test-job",
            "테스트 스킬",
            "별도 공격력: 스킬 공격력의 {value2}%\n"
            "기본 공격 및 전직 계열 스킬 공격력 증가율: {value5}%",
            [
                (16, {"value2": 5, "value5": 18}),
                (18, {"value2": 5, "value5": 20}),
            ],
        )
        for row in detail["levelInfo"]["rows"]:
            row["optionDesc"] = "성화 지속 피해 공격력: 스킬 공격력의 5%"

        result = get_skill_attack_ratio(
            detail,
            16,
            2,
            effect_spec={"mode": "increase", "valueKeys": ["value5"]},
        )

        self.assertTrue(result["calculable"])
        self.assertAlmostEqual(result["multiplier"], 1.20 / 1.18)

    def test_afterimage_uses_direct_attack_ratio(self):
        detail = build_skill_detail(
            "ddc49e9ad1ff72a00b53c6cff5b1e920",
            "인법 : 잔영 남기기",
            "잔영 공격 비율: {value1}%",
            [
                (18, {"value1": 118}),
                (19, {"value1": 120}),
            ],
        )

        result = estimate_skill_plus_one(
            detail,
            18,
            effect_spec={"mode": "ratio", "valueKeys": ["value1"]},
        )

        self.assertTrue(result["calculable"])
        self.assertAlmostEqual(result["multiplier"], 120 / 118)

    def test_named_common_passives_use_authoritative_option_value(self):
        cases = [
            (
                "1645c45aabb008c98406b3a16447040d",
                "삼화취정",
                "value1",
            ),
            (
                "944b9aab492c15a8474f96947ceeb9e4",
                "G-오퍼레이터",
                "value3",
            ),
            (
                "0ee8fa5dc525c1a1f23fc6911e921e4a",
                "대자연의 가호",
                "value1",
            ),
            (
                "b522a95d819a5559b775deb9a490e49a",
                "계열 강화",
                "value1",
            ),
        ]
        for job_id, skill_name, value_key in cases:
            with self.subTest(skill_name=skill_name):
                detail = build_skill_detail(
                    job_id,
                    skill_name,
                    "다른 효과: {value9}%",
                    [
                        (10, {value_key: 20, "value9": 90}),
                        (11, {value_key: 22, "value9": 99}),
                    ],
                )

                result = estimate_skill_plus_one(
                    detail,
                    10,
                    effect_spec={"mode": "increase", "valueKeys": [value_key]},
                )

                self.assertTrue(result["calculable"])
                self.assertAlmostEqual(result["multiplier"], 1.22 / 1.20)

    def test_dimension_alignment_amplifies_post_corrected_effective_stat(self):
        detail = build_skill_detail(
            "17e417b31686389eebff6d754c3401ea",
            "차원일치",
            "힘/지능 증가율: {value3}%",
            [
                (18, {"value3": 36}),
                (19, {"value3": 38}),
            ],
        )

        result = estimate_skill_plus_one(
            detail,
            18,
            {
                "currentFinalStat": 11071,
                "baseStat": 762,
                "currentAvatarAddedLevel": 1,
                "equippedCurrentLevel": 19,
            },
            {"mode": "statAmplification", "valueKeys": ["value3"]},
        )

        self.assertTrue(result["calculable"])
        self.assertAlmostEqual(result["incrementalDamagePercent"], 1.4700472579)
        self.assertEqual(result["equippedSkillAttackPercent"], 38)
        self.assertEqual(result["equippedStatPostMultiplier"], 1.38)

    def test_recognized_coefficient_uses_recognized_level_only(self):
        detail = build_skill_detail(
            "test-job",
            "쇼타임",
            "캐스팅 시간 감소율: {value1}%",
            [(10, {"value1": 20}), (11, {"value1": 22})],
        )

        result = estimate_skill_plus_one(
            detail,
            10,
            {"currentRecognizedLevel": 2},
            {"mode": "recognizedCoefficient"},
        )

        self.assertTrue(result["calculable"])
        self.assertAlmostEqual(result["multiplier"], 1.26 / 1.24)

    def test_multiple_effect_values_are_multiplied(self):
        detail = build_skill_detail(
            "test-job",
            "중화기 마스터리",
            "공격력 증가율 : {value3}%\n중화기 스킬 공격력 증가율 : {value4}%",
            [
                (11, {"value3": 11, "value4": 22}),
                (12, {"value3": 12, "value4": 24}),
            ],
        )

        result = estimate_skill_plus_one(
            detail,
            11,
            effect_spec={
                "mode": "multiply",
                "valueKeys": ["value3", "value4"],
            },
        )

        self.assertTrue(result["calculable"])
        self.assertAlmostEqual(
            result["multiplier"],
            ((1.12 * 1.24) / (1.11 * 1.22)),
        )

    def test_weapon_mastery_uses_equipped_weapon_type(self):
        self.assertEqual(
            resolve_weapon_mastery_skill_name("眞 소드마스터", "무기 숙련", "소검"),
            "속성의 소검 마스터리",
        )
        self.assertEqual(
            resolve_weapon_mastery_skill_name("眞 다크나이트", "어둠의 검사", "대검"),
            "어둠의 대검 마스터리",
        )
        self.assertEqual(
            resolve_weapon_mastery_skill_name("眞 다크나이트", "어둠의 검사", ""),
            "어둠의 검사",
        )

    @patch("server.avatar_skill_optimizer.get_current_non_avatar_skill_bonuses", return_value={})
    @patch("server.avatar_skill_optimizer.get_current_weapon_type", return_value="소검")
    @patch("server.item_skill_option_service.get_character_skill_context")
    def test_weapon_mastery_uses_parent_level_with_resolved_skill_detail(
        self,
        get_skill_context,
        _get_weapon_type,
        _get_setup_bonuses,
    ):
        mastery_detail = build_skill_detail(
            "1645c45aabb008c98406b3a16447040d",
            "속성의 소검 마스터리",
            "물리 공격력 증가율: {value1}%",
            [(20, {"value1": 30}), (21, {"value1": 32})],
        )
        get_skill_context.return_value = {
            "styleByName": {
                "무기숙련": {
                    "name": "무기 숙련",
                    "skillId": "parent-skill",
                    "level": 20,
                },
            },
            "skillByName": {
                "속성의소검마스터리": {
                    "name": "속성의 소검 마스터리",
                    "skillId": "resolved-skill",
                },
            },
            "skillDetailById": {
                "resolved-skill": mastery_detail,
            },
        }

        analyzed, skill_infos = get_character_avatar_skill_infos(
            "cain",
            "character",
            {
                "jobId": "1645c45aabb008c98406b3a16447040d",
                "jobGrowId": "grow-id",
                "jobName": "귀검사(여)",
                "jobGrowName": "眞 소드마스터",
            },
            ["무기 숙련"],
            current_avatar={},
            skill_effect_specs={
                "무기 숙련": {
                    "mode": "increase",
                    "valueKeys": ["value1"],
                },
            },
        )

        self.assertTrue(analyzed[0]["calculable"])
        self.assertEqual(analyzed[0]["resolvedSkillName"], "속성의 소검 마스터리")
        self.assertEqual(skill_infos["무기숙련"]["currentLevel"], 20)

    def test_recognized_coefficient_combines_avatar_levels_once(self):
        recognized = build_skill_detail(
            "test-job",
            "성화",
            "",
            [(16, {})],
        )
        skill_infos = {
            "성화": {
                "skillName": "성화",
                "currentLevel": 16,
                "detail": recognized,
                "effectContext": {"recognizedBaseLevel": 0},
                "effectSpec": {"mode": "recognizedCoefficient"},
            },
        }
        result = evaluate_avatar_combo(
            {
                "topSkill": "성화",
                "platinumSkills": ["성화", "성화"],
            },
            {},
            skill_infos,
            include_price=False,
        )

        self.assertTrue(result["calculable"])
        self.assertAlmostEqual(result["multiplier"], 1.26 / 1.20)

    def test_single_platinum_keeps_its_physical_slot(self):
        current = extract_current_avatar_skills({
            "avatar": [
                {"slotId": "JACKET", "optionAbility": "현재 상의", "emblems": []},
                {
                    "slotId": "PANTS",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[블러드]",
                    }],
                },
            ],
        })

        self.assertEqual(current["platinumSkills"], ["블러드"])
        self.assertEqual(current["platinumSlotSkills"], ["", "블러드"])

    def test_single_direct_platinum_selects_strongest_slot_aware_combo(self):
        option_db = {
            "topOptions": ["현재 상의"],
            "platinumEmblems": ["블러드"],
            "platinumCandidates": ["블러드", "블러드 혼"],
        }
        avatar_payload = {
            "avatar": [
                {"slotId": "JACKET", "optionAbility": "현재 상의", "emblems": []},
                {
                    "slotId": "PANTS",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[블러드]",
                    }],
                },
            ],
        }
        skill_infos = {
            "블러드": {"effectSpec": {"mode": "increase"}},
            "블러드혼": {"effectSpec": {"mode": "increase"}},
            "현재상의": {"effectSpec": {"mode": "increase"}},
        }

        def evaluate(combo, *_args, **_kwargs):
            platinum_skills = combo.get("platinumSkills") or []
            is_mixed = set(platinum_skills) == {"블러드", "블러드 혼"}
            return {
                **combo,
                "calculable": True,
                "incrementalDamagePercent": 10 if is_mixed else 1,
                "changeCount": 1 if is_mixed else 2,
                "slotChangeCount": (
                    1 if platinum_skills == ["블러드 혼", "블러드"] else 2
                ),
            }

        with (
            patch(
                "server.avatar_skill_optimizer.get_character_avatar_skill_infos",
                return_value=([], skill_infos),
            ),
            patch("server.avatar_skill_optimizer.evaluate_avatar_combo", side_effect=evaluate),
        ):
            result = select_best_avatar_combo_for_character(
                "cain",
                "character",
                {},
                avatar_payload,
                option_db,
                prefer_current_top=True,
            )

        self.assertEqual(
            result["recommendedCombo"]["platinumSkills"],
            ["블러드 혼", "블러드"],
        )

    def test_single_recognized_platinum_uses_db_fallback_for_empty_slot(self):
        option_db = {
            "topOptions": ["현재 상의"],
            "platinumEmblems": ["인정 플티"],
            "platinumCandidates": ["인정 플티", "직접 플티"],
            "candidateCombos": [{
                "rank": 1,
                "topOption": "현재 상의",
                "platinumEmblems": ["인정 플티", "인정 플티"],
            }],
        }
        avatar_payload = {
            "avatar": [
                {"slotId": "JACKET", "optionAbility": "현재 상의", "emblems": []},
                {
                    "slotId": "PANTS",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[인정 플티]",
                    }],
                },
            ],
        }
        skill_infos = {
            "인정플티": {"effectSpec": {"mode": "recognizedCoefficient"}},
            "직접플티": {"effectSpec": {"mode": "increase"}},
            "현재상의": {"effectSpec": {"mode": "increase"}},
        }

        with (
            patch(
                "server.avatar_skill_optimizer.get_character_avatar_skill_infos",
                return_value=([], skill_infos),
            ),
            patch(
                "server.avatar_skill_optimizer.evaluate_avatar_combo",
                side_effect=lambda combo, *_args, **_kwargs: {
                    **combo,
                    "calculable": True,
                    "incrementalDamagePercent": 1,
                },
            ),
        ):
            result = select_best_avatar_combo_for_character(
                "cain",
                "character",
                {},
                avatar_payload,
                option_db,
                prefer_current_top=True,
            )

        self.assertEqual(result["selectionScope"], "emptyPlatinumDbFallback")
        self.assertEqual(
            result["recommendedCombo"]["platinumSkills"],
            ["인정 플티", "인정 플티"],
        )
        self.assertEqual(
            result["currentAvatarSkills"]["platinumSlotSkills"],
            ["", "인정 플티"],
        )

    def test_empty_platinum_uses_db_combo_when_recognized_candidate_exists(self):
        option_db = {
            "topOptions": ["첫 상의", "현재 상의"],
            "platinumEmblems": ["인정 플티"],
            "platinumCandidates": ["인정 플티", "직접 플티"],
            "candidateCombos": [
                {
                    "rank": 1,
                    "topOption": "첫 상의",
                    "platinumEmblems": ["인정 플티", "인정 플티"],
                },
                {
                    "rank": 2,
                    "topOption": "현재 상의",
                    "platinumEmblems": ["직접 플티", "직접 플티"],
                },
            ],
        }
        avatar_payload = {
            "avatar": [
                {"slotId": "JACKET", "optionAbility": "현재 상의", "emblems": []},
                {"slotId": "PANTS", "emblems": []},
            ],
        }
        skill_infos = {
            "인정플티": {"effectSpec": {"mode": "recognizedCoefficient"}},
            "직접플티": {"effectSpec": {"mode": "increase"}},
            "첫상의": {"effectSpec": {"mode": "increase"}},
            "현재상의": {"effectSpec": {"mode": "increase"}},
        }

        def evaluate(combo, *_args, **_kwargs):
            return {
                **combo,
                "calculable": True,
                "incrementalDamagePercent": (
                    100 if "인정 플티" in (combo.get("platinumSkills") or []) else 1
                ),
            }

        with (
            patch(
                "server.avatar_skill_optimizer.get_character_avatar_skill_infos",
                return_value=([], skill_infos),
            ),
            patch("server.avatar_skill_optimizer.evaluate_avatar_combo", side_effect=evaluate),
        ):
            result = select_best_avatar_combo_for_character(
                "cain",
                "character",
                {},
                avatar_payload,
                option_db,
                prefer_current_top=True,
            )

        self.assertEqual(result["selectionScope"], "emptyPlatinumDbFallback")
        self.assertEqual(result["recommendedCombo"]["topSkill"], "현재 상의")
        self.assertEqual(
            result["recommendedCombo"]["platinumSkills"],
            ["직접 플티", "직접 플티"],
        )

    def test_equipped_recognized_platinum_skips_combo_replacement(self):
        option_db = {
            "topOptions": ["현재 상의"],
            "platinumEmblems": ["직접 플티"],
            "platinumCandidates": ["인정 플티", "직접 플티"],
        }
        avatar_payload = {
            "avatar": [
                {
                    "slotId": "JACKET",
                    "optionAbility": "현재 상의",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[인정 플티]",
                    }],
                },
                {
                    "slotId": "PANTS",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[인정 플티]",
                    }],
                },
            ],
        }
        skill_infos = {
            "인정플티": {"effectSpec": {"mode": "recognizedCoefficient"}},
            "직접플티": {"effectSpec": {"mode": "increase"}},
            "현재상의": {"effectSpec": {"mode": "increase"}},
        }

        with (
            patch(
                "server.avatar_skill_optimizer.get_character_avatar_skill_infos",
                return_value=([], skill_infos),
            ),
            patch(
                "server.avatar_skill_optimizer.evaluate_avatar_combo",
                side_effect=lambda combo, *_args, **_kwargs: {
                    **combo,
                    "calculable": True,
                    "incrementalDamagePercent": 1,
                },
            ),
        ):
            result = select_best_avatar_combo_for_character(
                "cain",
                "character",
                {},
                avatar_payload,
                option_db,
                prefer_current_top=True,
            )

        self.assertEqual(result["selectionScope"], "currentRecognizedPlatinum")
        self.assertEqual(
            result["recommendedCombo"]["platinumSkills"],
            ["인정 플티", "인정 플티"],
        )
        self.assertEqual(result["recommendedCombos"], [])

    def test_equipped_direct_platinum_still_uses_direct_combo_comparison(self):
        option_db = {
            "topOptions": ["현재 상의"],
            "platinumEmblems": ["직접 플티"],
            "platinumCandidates": ["직접 플티", "인정 플티"],
        }
        avatar_payload = {
            "avatar": [
                {
                    "slotId": "JACKET",
                    "optionAbility": "현재 상의",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[직접 플티]",
                    }],
                },
                {
                    "slotId": "PANTS",
                    "emblems": [{
                        "slotColor": "플래티넘",
                        "itemName": "플래티넘 엠블렘[직접 플티]",
                    }],
                },
            ],
        }
        skill_infos = {
            "인정플티": {"effectSpec": {"mode": "recognizedCoefficient"}},
            "직접플티": {"effectSpec": {"mode": "increase"}},
            "현재상의": {"effectSpec": {"mode": "increase"}},
        }

        def evaluate(combo, *_args, **_kwargs):
            return {
                **combo,
                "calculable": True,
                "incrementalDamagePercent": (
                    100 if "인정 플티" in (combo.get("platinumSkills") or []) else 1
                ),
                "changeCount": 0,
                "slotChangeCount": 0,
            }

        with (
            patch(
                "server.avatar_skill_optimizer.get_character_avatar_skill_infos",
                return_value=([], skill_infos),
            ),
            patch("server.avatar_skill_optimizer.evaluate_avatar_combo", side_effect=evaluate),
        ):
            result = select_best_avatar_combo_for_character(
                "cain",
                "character",
                {},
                avatar_payload,
                option_db,
                prefer_current_top=True,
            )

        self.assertNotEqual(result["selectionScope"], "currentRecognizedPlatinum")
        self.assertEqual(
            result["recommendedCombo"]["platinumSkills"],
            ["직접 플티", "직접 플티"],
        )

    def test_all_dealer_avatar_candidates_have_effect_metadata(self):
        db_path = Path(__file__).resolve().parents[1] / "Docs" / "avatar_option_db.json"
        db = json.loads(db_path.read_text(encoding="utf-8"))
        missing = []
        for entry in db.get("entries") or []:
            if entry.get("role") != "dealer":
                continue
            avatar = entry.get("avatar") or {}
            effect_keys = {
                normalize_skill_key(name)
                for name in (avatar.get("skillEffects") or {})
            }
            candidate_names = [
                *(avatar.get("topOptions") or []),
                *(avatar.get("platinumEmblems") or []),
                *(avatar.get("platinumCandidates") or []),
            ]
            for combo in avatar.get("candidateCombos") or []:
                candidate_names.append(combo.get("topOption"))
                candidate_names.extend(combo.get("platinumEmblems") or [])
            for skill_name in candidate_names:
                if skill_name and normalize_skill_key(skill_name) not in effect_keys:
                    missing.append(
                        f"{entry.get('classGroup')}:{entry.get('guideName')}:{skill_name}"
                    )
        self.assertEqual(missing, [])

    def test_avatar_candidate_combo_does_not_expose_adoption_rate(self):
        result = get_avatar_candidate_combos({
            "candidateCombos": [{
                "rank": 1,
                "topOption": "상의 스킬",
                "platinumEmblems": ["플티 스킬", "플티 스킬"],
                "adoptionRate": 73.88,
            }],
        }, {})

        self.assertEqual(len(result), 1)
        self.assertNotIn("adoptionRate", result[0])
        self.assertEqual(result[0]["sourceRank"], 1)


if __name__ == "__main__":
    unittest.main()
