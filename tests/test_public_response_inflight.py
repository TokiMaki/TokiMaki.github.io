import threading
import time
import unittest

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


if __name__ == "__main__":
    unittest.main()
