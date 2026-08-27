import json
import threading
import time
import unittest
from unittest.mock import patch

import neople_hell_api_server as api_server


class PublicResponseInflightTest(unittest.TestCase):
    def setUp(self):
        with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
            api_server._PUBLIC_RESPONSE_CACHE.clear()
            api_server._PUBLIC_RESPONSE_INFLIGHT.clear()

    def tearDown(self):
        with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
            api_server._PUBLIC_RESPONSE_CACHE.clear()
            api_server._PUBLIC_RESPONSE_INFLIGHT.clear()

    def wait_for_waiter(self, cache_key):
        deadline = time.time() + 2
        while time.time() < deadline:
            with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
                inflight = api_server._PUBLIC_RESPONSE_INFLIGHT.get(cache_key)
            if inflight is not None:
                time.sleep(0.02)
                return
            time.sleep(0.005)
        self.fail("공개 응답 waiter가 in-flight entry에 합류하지 못했습니다.")

    def test_concurrent_same_request_computes_once_and_cleans_up_after_success(self):
        cache_key = ("public-success",)
        loader_started = threading.Event()
        release_loader = threading.Event()
        loader_calls = 0
        results = []
        errors = []
        result_lock = threading.Lock()

        def loader():
            nonlocal loader_calls
            with result_lock:
                loader_calls += 1
            loader_started.set()
            self.assertTrue(release_loader.wait(2))
            return {"value": 123}

        def worker():
            try:
                result = api_server.load_public_response_body(cache_key, loader)
                with result_lock:
                    results.append(result)
            except Exception as exc:
                with result_lock:
                    errors.append(exc)

        owner = threading.Thread(target=worker)
        waiter = threading.Thread(target=worker)
        owner.start()
        self.assertTrue(loader_started.wait(2))
        waiter.start()
        self.wait_for_waiter(cache_key)
        release_loader.set()
        owner.join(2)
        waiter.join(2)

        self.assertFalse(owner.is_alive())
        self.assertFalse(waiter.is_alive())
        self.assertEqual([], errors)
        self.assertEqual(1, loader_calls)
        self.assertEqual(2, len(results))
        self.assertEqual(results[0][0], results[1][0])
        self.assertEqual({False, True}, {results[0][1], results[1][1]})
        with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
            self.assertNotIn(cache_key, api_server._PUBLIC_RESPONSE_INFLIGHT)

    def test_concurrent_same_request_shares_error_and_cleans_up_after_failure(self):
        cache_key = ("public-failure",)
        loader_started = threading.Event()
        release_loader = threading.Event()
        loader_calls = 0
        errors = []
        result_lock = threading.Lock()
        expected_error = RuntimeError("public loader failed")

        def loader():
            nonlocal loader_calls
            with result_lock:
                loader_calls += 1
            loader_started.set()
            self.assertTrue(release_loader.wait(2))
            raise expected_error

        def worker():
            try:
                api_server.load_public_response_body(cache_key, loader)
            except Exception as exc:
                with result_lock:
                    errors.append(exc)

        owner = threading.Thread(target=worker)
        waiter = threading.Thread(target=worker)
        owner.start()
        self.assertTrue(loader_started.wait(2))
        waiter.start()
        self.wait_for_waiter(cache_key)
        release_loader.set()
        owner.join(2)
        waiter.join(2)

        self.assertFalse(owner.is_alive())
        self.assertFalse(waiter.is_alive())
        self.assertEqual(1, loader_calls)
        self.assertEqual(2, len(errors))
        self.assertIs(expected_error, errors[0])
        self.assertIs(expected_error, errors[1])
        with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
            self.assertNotIn(cache_key, api_server._PUBLIC_RESPONSE_INFLIGHT)
            self.assertNotIn(cache_key, api_server._PUBLIC_RESPONSE_CACHE)


class LoadoutResponseInflightTest(unittest.TestCase):
    def setUp(self):
        with api_server._LOADOUT_RESPONSE_CACHE_LOCK:
            api_server._LOADOUT_RESPONSE_CACHE.clear()
            api_server._LOADOUT_RESPONSE_INFLIGHT.clear()

    def tearDown(self):
        with api_server._LOADOUT_RESPONSE_CACHE_LOCK:
            api_server._LOADOUT_RESPONSE_CACHE.clear()
            api_server._LOADOUT_RESPONSE_INFLIGHT.clear()

    def test_stale_owner_is_replaced_without_late_cleanup_removing_new_result(self):
        cache_key = ("character-loadout", "cain", "character-id")
        old_loader_started = threading.Event()
        release_old_loader = threading.Event()
        old_result = []

        def old_loader():
            old_loader_started.set()
            self.assertTrue(release_old_loader.wait(2))
            return {"owner": "old"}

        def run_old_owner():
            old_result.append(api_server.load_character_loadout_response_body(cache_key, old_loader))

        with patch.object(api_server, "write_ops_log"):
            old_owner = threading.Thread(target=run_old_owner)
            old_owner.start()
            self.assertTrue(old_loader_started.wait(2))
            with api_server._LOADOUT_RESPONSE_CACHE_LOCK:
                old_inflight = api_server._LOADOUT_RESPONSE_INFLIGHT[cache_key]
                old_inflight["started_at"] = (
                    time.time() - api_server.LOADOUT_RESPONSE_INFLIGHT_STALE_SECONDS - 1
                )

            replacement_body, replacement_cache_hit, replacement_payload = api_server.load_character_loadout_response_body(
                cache_key,
                lambda: {"owner": "replacement"},
            )
            release_old_loader.set()
            old_owner.join(2)

        self.assertFalse(old_owner.is_alive())
        self.assertFalse(replacement_cache_hit)
        self.assertIn(b'"replacement"', replacement_body)
        self.assertEqual({"owner": "replacement"}, replacement_payload)
        self.assertEqual(1, len(old_result))
        self.assertIn(b'"old"', old_result[0][0])
        self.assertTrue(old_inflight["event"].is_set())
        self.assertIsInstance(old_inflight["error"], TimeoutError)
        with api_server._LOADOUT_RESPONSE_CACHE_LOCK:
            self.assertNotIn(cache_key, api_server._LOADOUT_RESPONSE_INFLIGHT)
            self.assertEqual(replacement_body, api_server._LOADOUT_RESPONSE_CACHE[cache_key]["body"])

    def test_internal_payload_is_preserved_after_public_field_filtering(self):
        cache_key = ("character-loadout", "cain", "character-id")
        payload = {
            "characterId": "character-id",
            "settingValueInputs": {
                "schemaVersion": 1,
                "status": "pending",
            },
        }

        with patch.object(api_server, "API_SERVER_MODE", "prod"):
            body, cache_hit, internal_payload = api_server.load_character_loadout_response_body(
                cache_key,
                lambda: payload,
            )
            cached_body, cached_hit, cached_payload = api_server.load_character_loadout_response_body(
                cache_key,
                lambda: {"unused": True},
            )

        self.assertFalse(cache_hit)
        self.assertTrue(cached_hit)
        self.assertNotIn("schemaVersion", json.loads(body)["settingValueInputs"])
        self.assertEqual(1, internal_payload["settingValueInputs"]["schemaVersion"])
        self.assertEqual(body, cached_body)
        self.assertEqual(payload, cached_payload)

    def test_wait_timeout_evicts_the_stuck_flight(self):
        cache_key = ("character-loadout", "cain", "character-id")
        stuck_inflight = {
            "event": threading.Event(),
            "body": None,
            "error": None,
            "started_at": time.time(),
        }
        with api_server._LOADOUT_RESPONSE_CACHE_LOCK:
            api_server._LOADOUT_RESPONSE_INFLIGHT[cache_key] = stuck_inflight

        with (
            patch.object(api_server, "LOADOUT_RESPONSE_INFLIGHT_WAIT_SECONDS", 0.01),
            patch.object(api_server, "write_ops_log"),
        ):
            with self.assertRaisesRegex(TimeoutError, "대기 시간이 초과"):
                api_server.load_character_loadout_response_body(cache_key, lambda: {"unused": True})

        self.assertTrue(stuck_inflight["event"].is_set())
        self.assertIsInstance(stuck_inflight["error"], TimeoutError)
        with api_server._LOADOUT_RESPONSE_CACHE_LOCK:
            self.assertNotIn(cache_key, api_server._LOADOUT_RESPONSE_INFLIGHT)


if __name__ == "__main__":
    unittest.main()
