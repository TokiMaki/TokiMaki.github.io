import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from server import item_skill_option_service
from server.repositories import character_repository


class CharacterRepositoryCacheCleanupTest(unittest.TestCase):
    def setUp(self):
        character_repository._CHARACTER_RESPONSE_CACHE.clear()
        item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE.clear()

    def tearDown(self):
        character_repository._CHARACTER_RESPONSE_CACHE.clear()
        item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE.clear()

    def test_character_memory_cache_removes_expired_entry_and_keeps_valid_hit(self):
        now = 1_000.0
        expired_key = ("cain", "expired", "equipment")
        valid_key = ("cain", "valid", "equipment")
        valid_payload = {"equipment": [{"itemId": "valid"}]}
        with character_repository._CHARACTER_RESPONSE_CACHE_LOCK:
            character_repository._CHARACTER_RESPONSE_CACHE[expired_key] = {
                "payload": {"expired": True},
                "stored_at": now - 20,
                "expires_at": now - 1,
            }
            character_repository._CHARACTER_RESPONSE_CACHE[valid_key] = {
                "payload": valid_payload,
                "stored_at": now - 1,
                "expires_at": now + 10,
            }

        with patch.object(character_repository.time, "time", return_value=now), \
                patch.object(character_repository, "_get_character_sqlite_cached_payload", return_value=None), \
                patch.object(character_repository, "fetch_character_payload_from_api") as fetch_payload:
            self.assertIsNone(
                character_repository.get_character_cached_computed_payload(
                    "cain",
                    "expired",
                    "equipment",
                )
            )
            self.assertNotIn(expired_key, character_repository._CHARACTER_RESPONSE_CACHE)
            result = character_repository.get_character_cached_payload(
                "cain",
                "valid",
                "equipment",
                "equip/equipment",
            )

        self.assertIs(result, valid_payload)
        self.assertIn(valid_key, character_repository._CHARACTER_RESPONSE_CACHE)
        fetch_payload.assert_not_called()

    def test_character_memory_cache_prunes_to_explicit_maximum(self):
        base_time = 2_000.0
        with patch.object(character_repository, "CHARACTER_RESPONSE_CACHE_MAX_ENTRIES", 2):
            for index in range(3):
                character_repository._save_character_memory_cached_payload(
                    ("cain", f"character-{index}", "equipment"),
                    {"index": index},
                    base_time + index,
                )

        self.assertEqual(len(character_repository._CHARACTER_RESPONSE_CACHE), 2)
        self.assertNotIn(
            ("cain", "character-0", "equipment"),
            character_repository._CHARACTER_RESPONSE_CACHE,
        )

    def test_sqlite_expired_rows_are_cleaned_on_configured_save_count(self):
        original_initialized = character_repository._CHARACTER_SQLITE_CACHE_INITIALIZED
        original_save_count = character_repository._CHARACTER_SQLITE_CACHE_SAVE_COUNT
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                cache_dir = Path(temp_dir)
                cache_path = cache_dir / "character-response-cache.sqlite"
                with patch.object(character_repository, "CHARACTER_CACHE_DIR", cache_dir), \
                        patch.object(character_repository, "CHARACTER_SQLITE_CACHE_PATH", cache_path), \
                        patch.object(character_repository, "CHARACTER_SQLITE_CACHE_CLEANUP_INTERVAL_SAVES", 2):
                    character_repository._CHARACTER_SQLITE_CACHE_INITIALIZED = False
                    character_repository._CHARACTER_SQLITE_CACHE_SAVE_COUNT = 0
                    character_repository._ensure_character_sqlite_cache()
                    now_ms = 1_000_000
                    with closing(character_repository._connect_character_sqlite_cache()) as conn:
                        conn.execute(
                            """
                            INSERT INTO character_response_cache (
                                cache_key,
                                server_id,
                                character_id,
                                resource,
                                payload_json,
                                cached_at_ms,
                                expires_at_ms,
                                updated_at_ms
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                "expired",
                                "cain",
                                "expired",
                                "equipment",
                                "{}",
                                now_ms - 100,
                                now_ms - 1,
                                now_ms - 100,
                            ),
                        )
                        conn.commit()

                    character_repository._save_character_sqlite_cached_payload(
                        ("cain", "first", "equipment"),
                        {"value": 1},
                        now_ms,
                    )
                    with closing(sqlite3.connect(str(cache_path))) as conn:
                        expired_count_after_first = conn.execute(
                            "SELECT COUNT(*) FROM character_response_cache WHERE cache_key = 'expired'"
                        ).fetchone()[0]

                    character_repository._save_character_sqlite_cached_payload(
                        ("cain", "second", "equipment"),
                        {"value": 2},
                        now_ms + 1,
                    )
                    with closing(sqlite3.connect(str(cache_path))) as conn:
                        expired_count_after_second = conn.execute(
                            "SELECT COUNT(*) FROM character_response_cache WHERE cache_key = 'expired'"
                        ).fetchone()[0]
                        valid_count = conn.execute(
                            "SELECT COUNT(*) FROM character_response_cache WHERE cache_key != 'expired'"
                        ).fetchone()[0]

                self.assertEqual(expired_count_after_first, 1)
                self.assertEqual(expired_count_after_second, 0)
                self.assertEqual(valid_count, 2)
        finally:
            character_repository._CHARACTER_SQLITE_CACHE_INITIALIZED = original_initialized
            character_repository._CHARACTER_SQLITE_CACHE_SAVE_COUNT = original_save_count


class CharacterSkillContextCacheCleanupTest(unittest.TestCase):
    def setUp(self):
        item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE.clear()

    def tearDown(self):
        item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE.clear()

    def test_skill_context_cache_removes_expired_entry_and_keeps_valid_hit(self):
        now = 3_000.0
        expired_key = ("cain", "expired")
        valid_key = ("cain", "valid")
        valid_context = {"jobId": "valid-job"}
        item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE.update({
            expired_key: {
                "context": {"jobId": "expired-job"},
                "stored_at": now - 100,
                "expires_at": now - 1,
            },
            valid_key: {
                "context": valid_context,
                "stored_at": now - 1,
                "expires_at": now + 10,
            },
        })

        def build_context(server_id, character_id):
            self.assertEqual((server_id, character_id), expired_key)
            self.assertNotIn(expired_key, item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE)
            return {"jobId": "fresh-job"}

        with patch.object(item_skill_option_service.time, "time", return_value=now), \
                patch.object(item_skill_option_service, "_build_character_skill_context", side_effect=build_context) as build:
            refreshed = item_skill_option_service.get_character_skill_context(*expired_key)
            hit = item_skill_option_service.get_character_skill_context(*valid_key)

        self.assertEqual(refreshed, {"jobId": "fresh-job"})
        self.assertIs(hit, valid_context)
        self.assertEqual(build.call_count, 1)

    def test_skill_context_cache_prunes_to_explicit_maximum(self):
        with patch.object(item_skill_option_service, "_CHARACTER_SKILL_CONTEXT_MAX_ENTRIES", 2), \
                patch.object(item_skill_option_service.time, "time", side_effect=[4_000.0, 4_001.0, 4_002.0]), \
                patch.object(
                    item_skill_option_service,
                    "_build_character_skill_context",
                    side_effect=lambda _server_id, character_id: {"characterId": character_id},
                ):
            for index in range(3):
                item_skill_option_service.get_character_skill_context(
                    "cain",
                    f"character-{index}",
                )

        self.assertEqual(len(item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE), 2)
        self.assertNotIn(
            ("cain", "character-0"),
            item_skill_option_service._CHARACTER_SKILL_CONTEXT_CACHE,
        )


if __name__ == "__main__":
    unittest.main()
