import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.repositories import setting_value_repository as repository


class SettingValueRepositoryTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.cache_dir = Path(self.temp_dir.name)
        self.db_path = self.cache_dir / "setting-value.sqlite"
        repository._SETTING_VALUE_SNAPSHOT_INITIALIZED = False
        self.patches = [
            patch.object(repository, "CHARACTER_CACHE_DIR", self.cache_dir),
            patch.object(repository, "CHARACTER_SQLITE_CACHE_PATH", self.db_path),
        ]
        for current_patch in self.patches:
            current_patch.start()

    def tearDown(self):
        for current_patch in reversed(self.patches):
            current_patch.stop()
        repository._SETTING_VALUE_SNAPSHOT_INITIALIZED = False
        self.temp_dir.cleanup()

    @staticmethod
    def snapshot(character_id, total_gold, fame=100, equipment_score=1000):
        return {
            "serverId": "cain",
            "characterId": character_id,
            "characterName": character_id,
            "jobName": "귀검사(남)",
            "jobGrowName": "眞 웨펀마스터",
            "role": "dealer",
            "fame": fame,
            "equipmentScore": equipment_score,
            "buffScore": None,
            "settingValue": {
                "label": "세팅 추정 가치",
                "totalGold": total_gold,
                "breakdown": [],
            },
            "equipment": [],
            "oath": [],
            "updatedAtMs": 1,
        }

    def test_upsert_keeps_only_latest_character_snapshot(self):
        self.assertTrue(repository.save_setting_value_snapshot(self.snapshot("one", 100)))
        self.assertTrue(repository.save_setting_value_snapshot(self.snapshot("one", 300)))
        rows = repository.load_setting_value_ranking("dealer", "value", 10)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["settingValue"]["totalGold"], 300)

    def test_ranking_sorts_by_requested_metric(self):
        repository.save_setting_value_snapshot(self.snapshot("value", 500, fame=100, equipment_score=1000))
        repository.save_setting_value_snapshot(self.snapshot("score", 300, fame=200, equipment_score=2000))
        repository.save_setting_value_snapshot(self.snapshot("fame", 100, fame=300, equipment_score=500))

        self.assertEqual(repository.load_setting_value_ranking("dealer", "value", 10)[0]["characterId"], "value")
        self.assertEqual(repository.load_setting_value_ranking("dealer", "score", 10)[0]["characterId"], "score")
        self.assertEqual(repository.load_setting_value_ranking("dealer", "fame", 10)[0]["characterId"], "fame")

    def test_selected_character_rank_includes_role_population_count(self):
        repository.save_setting_value_snapshot(self.snapshot("first", 500))
        repository.save_setting_value_snapshot(self.snapshot("second", 300))

        selected = repository.load_setting_value_character_rank("cain", "second", sort="value")

        self.assertEqual(selected["rank"], 2)
        self.assertEqual(selected["rankingTotalCount"], 2)


if __name__ == "__main__":
    unittest.main()
