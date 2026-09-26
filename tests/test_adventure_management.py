import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server import adventure_management_service as service
from server import character_search_service

REAL_LIVE_EQUIPMENT = service._live_equipment


class AdventureManagementTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        database = Path(self.temp_dir.name) / "characters.sqlite"
        self.candidates = [
            {"serverId": "cain", "characterId": "one", "characterName": "첫째", "adventureName": "테스트"},
            {"serverId": "cain", "characterId": "two", "characterName": "둘째", "adventureName": "테스트"},
        ]
        self.enterContext(patch.object(service, "_connect_character_sqlite_cache", side_effect=lambda: sqlite3.connect(database)))
        self.enterContext(patch.object(service, "get_cached_adventure_search_candidates", return_value=self.candidates))
        self.enterContext(patch.object(service, "_live_character_adventure", return_value="테스트"))
        equipment = [
            {"slotId": "JACKET", "slotName": "상의", "itemId": "item-one", "itemName": "테스트 상의"},
            {"slotId": "EARRING", "slotName": "귀걸이", "itemId": "item-two", "itemName": "테스트 귀걸이"},
        ]
        self.live_equipment = self.enterContext(patch.object(service, "_live_equipment", return_value=equipment))
        self.enterContext(patch.object(service.secrets, "choice", side_effect=lambda rows: rows[0]))
        with service._LOCK:
            service._CHALLENGES.clear()
            service._EDIT_GRANTS.clear()
            service._START_TIMES.clear()

    def test_equipment_removal_grants_edit_and_saved_preferences_filter_search(self):
        challenge = service.start_adventure_challenge("테스트")
        self.assertEqual((challenge["serverId"], challenge["characterId"]), ("cain", "one"))
        with self.assertRaises(service.AdventureManagementError):
            service.verify_adventure_challenge(challenge["challengeToken"])
        self.live_equipment.return_value = [{"slotId": "EARRING", "itemId": "item-two"}]
        grant = service.verify_adventure_challenge(challenge["challengeToken"])
        with self.assertRaises(service.AdventureManagementError):
            service.verify_adventure_challenge(challenge["challengeToken"])
        service.save_adventure_search_settings(
            "테스트", grant["editToken"], ["cain:two", "cain:one"], ["cain:one"],
        )
        visible, hidden_count = service.apply_adventure_search_settings(self.candidates, "테스트")
        self.assertEqual([row["characterId"] for row in visible], ["two"])
        self.assertEqual(hidden_count, 1)
        with self.assertRaises(service.AdventureManagementError):
            service.save_adventure_search_settings("다른 모험단", grant["editToken"], [], [])
        service.revoke_adventure_edit_grant(grant["editToken"])
        with self.assertRaises(service.AdventureManagementError):
            service.save_adventure_search_settings("테스트", grant["editToken"], [], [])

    def test_unverified_write_and_hiding_everyone_are_rejected(self):
        with self.assertRaises(service.AdventureManagementError):
            service.save_adventure_search_settings("테스트", "invalid", [], [])
        challenge = service.start_adventure_challenge("테스트")
        self.live_equipment.return_value = [{"slotId": "EARRING", "itemId": "item-two"}]
        grant = service.verify_adventure_challenge(challenge["challengeToken"])
        with self.assertRaises(service.AdventureManagementError):
            service.save_adventure_search_settings(
                "테스트", grant["editToken"], [], ["cain:one", "cain:two"],
            )

    def test_edit_roster_includes_cached_scores_for_visible_and_hidden_characters(self):
        challenge = service.start_adventure_challenge("테스트")
        self.live_equipment.return_value = [{"slotId": "EARRING", "itemId": "item-two"}]
        summaries = {
            ("cain", "one"): {"equipmentScore": 123456, "buffScore": None},
            ("cain", "two"): {"equipmentScore": None, "buffScore": 234567},
        }
        with patch.object(character_search_service, "load_setting_value_score_summaries", return_value=summaries):
            grant = service.verify_adventure_challenge(challenge["challengeToken"])
        self.assertEqual(grant["candidates"][0]["equipmentScore"], 123456)
        self.assertEqual(grant["candidates"][1]["buffScore"], 234567)

    def test_first_search_remembers_fame_order_and_appends_new_candidates(self):
        self.candidates[0]["fame"] = 100
        self.candidates[1].update(serverId="bakal", fame=300)
        with patch.object(character_search_service, "get_cached_adventure_search_candidates", return_value=self.candidates):
            with patch.object(character_search_service, "attach_cached_score_summaries"):
                first = character_search_service.search_adventure_characters_response("테스트")
                self.assertEqual([row["characterId"] for row in first["candidates"]], ["two", "one"])

                self.candidates.append({"serverId": "cain", "characterId": "three", "characterName": "셋째", "fame": 999})
                second = character_search_service.search_adventure_characters_response("테스트")
                self.assertEqual([row["characterId"] for row in second["candidates"]], ["two", "one", "three"])

                service._EDIT_GRANTS["edit-token"] = {"adventure": "테스트", "expires": service.time.time() + 600}
                service.save_adventure_search_settings(
                    "테스트", "edit-token", ["cain:one", "bakal:two", "cain:three"], ["bakal:two"],
                )
                self.candidates.append({"serverId": "cain", "characterId": "four", "characterName": "넷째", "fame": 1000})
                third = character_search_service.search_adventure_characters_response("테스트")

        self.assertEqual([row["characterId"] for row in third["candidates"]], ["one", "three", "four"])
        self.assertEqual(service.get_adventure_search_settings("테스트"), {
            "order": ["cain:one", "bakal:two", "cain:three", "cain:four"],
            "hidden": ["bakal:two"],
        })

    def test_lost_challenge_does_not_block_a_new_challenge(self):
        challenge = service.start_adventure_challenge("테스트")
        next_challenge = service.start_adventure_challenge("테스트")
        self.assertNotEqual(challenge["challengeToken"], next_challenge["challengeToken"])
        service.cancel_adventure_challenge(challenge["challengeToken"])
        self.assertIn(next_challenge["challengeToken"], service._CHALLENGES)

    def test_start_limit_resets_after_one_minute_without_expiring_challenge(self):
        with patch.object(service.time, "time", return_value=1000):
            challenges = [service.start_adventure_challenge("테스트") for _ in range(5)]
            with self.assertRaises(service.AdventureManagementRateLimitError):
                service.start_adventure_challenge("테스트")
        with patch.object(service.time, "time", return_value=1060):
            next_challenge = service.start_adventure_challenge("테스트")
        self.assertIn(challenges[0]["challengeToken"], service._CHALLENGES)
        self.assertEqual(service._CHALLENGES[next_challenge["challengeToken"]]["expires"], 1660)

    def test_random_character_is_chosen_from_visible_candidates(self):
        with patch.object(service.secrets, "choice", side_effect=lambda rows: rows[-1]) as choose:
            challenge = service.start_adventure_challenge("테스트")
        self.assertEqual(challenge["characterName"], "둘째")
        self.assertEqual(len(choose.call_args_list[0].args[0]), 2)
        service.cancel_adventure_challenge(challenge["challengeToken"])

        with patch.object(service.secrets, "choice", side_effect=lambda rows: rows[-1]) as choose:
            with patch.object(service, "get_adventure_search_settings", return_value={"order": [], "hidden": ["cain:two"]}):
                challenge = service.start_adventure_challenge("테스트")
        self.assertEqual(challenge["characterName"], "첫째")
        self.assertEqual(len(choose.call_args_list[0].args[0]), 1)

    def test_empty_equipment_response_is_not_proof(self):
        challenge = service.start_adventure_challenge("테스트")
        self.live_equipment.return_value = []
        with self.assertRaises(service.AdventureManagementError):
            service.verify_adventure_challenge(challenge["challengeToken"])

    def test_missing_equipment_field_is_not_proof(self):
        with patch.object(service, "fetch_character_payload_from_api", return_value={}):
            with self.assertRaises(service.AdventureManagementError):
                REAL_LIVE_EQUIPMENT("cain", "one")


if __name__ == "__main__":
    unittest.main()
