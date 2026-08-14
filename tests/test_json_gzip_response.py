import gzip
import io
import time
import unittest
from unittest.mock import patch

import neople_hell_api_server as api_server


class JsonGzipResponseTest(unittest.TestCase):
    def setUp(self):
        with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
            api_server._PUBLIC_RESPONSE_CACHE.clear()
            api_server._PUBLIC_RESPONSE_INFLIGHT.clear()

    def tearDown(self):
        with api_server._PUBLIC_RESPONSE_CACHE_LOCK:
            api_server._PUBLIC_RESPONSE_CACHE.clear()
            api_server._PUBLIC_RESPONSE_INFLIGHT.clear()

    def make_handler(self, accept_encoding=""):
        handler = object.__new__(api_server.HellApiHandler)
        handler.headers = {"Accept-Encoding": accept_encoding}
        handler.path = "/api/test"
        handler.wfile = io.BytesIO()
        handler.request_version = "HTTP/1.1"
        handler.requestline = "GET /api/test HTTP/1.1"
        handler.command = "GET"
        handler._request_started_at = time.time()
        handler._request_stats_token = None
        return handler

    def send_body(self, body, accept_encoding="", **kwargs):
        handler = self.make_handler(accept_encoding)
        with patch.object(api_server, "write_ops_log"):
            handler.send_json_body(body, **kwargs)
        header_bytes, response_body = handler.wfile.getvalue().split(b"\r\n\r\n", 1)
        headers = {}
        for line in header_bytes.decode("iso-8859-1").split("\r\n")[1:]:
            if ":" not in line:
                continue
            name, value = line.split(":", 1)
            headers[name.strip().lower()] = value.strip()
        return headers, response_body

    def test_accept_encoding_gzip_variants(self):
        self.assertTrue(api_server.accepts_gzip_encoding("gzip"))
        self.assertTrue(api_server.accepts_gzip_encoding("gzip, deflate, br"))
        self.assertTrue(api_server.accepts_gzip_encoding("gzip;q=1"))
        self.assertFalse(api_server.accepts_gzip_encoding("gzip;q=0"))

    def test_large_json_is_gzipped_and_preserves_common_headers(self):
        original_body = api_server.json_response({"data": "x" * 5000})

        headers, response_body = self.send_body(
            original_body,
            "br, GZip;Q=1, deflate",
            cache_control="public, max-age=60",
        )

        self.assertEqual("gzip", headers.get("content-encoding"))
        self.assertEqual("Accept-Encoding", headers.get("vary"))
        self.assertEqual(str(len(response_body)), headers.get("content-length"))
        self.assertEqual(original_body, gzip.decompress(response_body))
        self.assertEqual("application/json; charset=utf-8", headers.get("content-type"))
        self.assertEqual("public, max-age=60", headers.get("cache-control"))
        self.assertEqual("*", headers.get("access-control-allow-origin"))
        self.assertEqual("GET, POST, OPTIONS", headers.get("access-control-allow-methods"))

    def test_large_json_without_gzip_support_is_sent_raw(self):
        original_body = api_server.json_response({"data": "x" * 5000})

        headers, response_body = self.send_body(original_body, "br, deflate")

        self.assertNotIn("content-encoding", headers)
        self.assertEqual("Accept-Encoding", headers.get("vary"))
        self.assertEqual(str(len(original_body)), headers.get("content-length"))
        self.assertEqual(original_body, response_body)

    def test_gzip_q_zero_is_not_compressed(self):
        original_body = api_server.json_response({"data": "x" * 5000})

        headers, response_body = self.send_body(original_body, "gzip;q=0, br")

        self.assertNotIn("content-encoding", headers)
        self.assertEqual(original_body, response_body)

    def test_small_json_is_not_compressed(self):
        original_body = api_server.json_response({"ok": True})

        headers, response_body = self.send_body(original_body, "gzip")

        self.assertNotIn("content-encoding", headers)
        self.assertNotIn("vary", headers)
        self.assertEqual(original_body, response_body)

    def test_existing_content_encoding_is_not_gzipped_again(self):
        encoded_body = b"already-encoded" * 400

        headers, response_body = self.send_body(
            encoded_body,
            "gzip",
            content_encoding="br",
        )

        self.assertEqual("br", headers.get("content-encoding"))
        self.assertNotIn("vary", headers)
        self.assertEqual(encoded_body, response_body)

    def test_public_cache_hit_and_miss_keep_identical_json_body(self):
        cache_key = ("gzip-response-cache",)
        loader_calls = 0

        def loader():
            nonlocal loader_calls
            loader_calls += 1
            return {"data": "x" * 5000}

        miss_body, miss_hit = api_server.load_public_response_body(cache_key, loader)
        hit_body, hit_hit = api_server.load_public_response_body(cache_key, loader)

        self.assertFalse(miss_hit)
        self.assertTrue(hit_hit)
        self.assertEqual(1, loader_calls)
        self.assertEqual(miss_body, hit_body)

        _, miss_response = self.send_body(miss_body, "gzip")
        _, hit_response = self.send_body(hit_body, "gzip")
        self.assertEqual(miss_response, hit_response)
        self.assertEqual(miss_body, gzip.decompress(hit_response))


if __name__ == "__main__":
    unittest.main()
