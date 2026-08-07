import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError
from urllib.parse import urlencode

import neople_hell_api_server
from server import neople_client, ops_log


class NeopleApiKeyRedactionTest(unittest.TestCase):
    def test_production_response_omits_internal_metadata(self):
        payload = {
            "equipmentScore": 349578,
            "source": "df.nexon.com",
            "debug": {"request": "internal"},
            "debugTimings": {"steps": []},
            "rawStatus": [{"name": "힘", "value": 1}],
            "cache": {
                "stale": True,
                "refreshing": True,
                "expiresAt": 123,
            },
            "errors": [{"error": "upstream detail"}],
        }

        with patch.object(neople_hell_api_server, "API_SERVER_MODE", "prod"):
            public_payload = json.loads(
                neople_hell_api_server.json_response(payload).decode("utf-8")
            )

        self.assertEqual(public_payload["equipmentScore"], 349578)
        self.assertEqual(public_payload["cache"], {"refreshing": True})
        self.assertEqual(public_payload["errorCount"], 1)
        for field in ("source", "debug", "debugTimings", "rawStatus", "errors"):
            self.assertNotIn(field, public_payload)

    def test_credential_is_redacted_from_exception_public_payload_and_logs(self):
        credential = "fake-" + "credential-for-redaction-test"
        request_url = "https://api.neople.co.kr/df/auction?" + urlencode({
            "itemId": "test",
            "apikey": credential,
        })
        upstream_error = URLError("forced failure " + urlencode({"apikey": credential}))

        with tempfile.TemporaryDirectory() as temp_dir, \
                patch.dict(os.environ, {"NEOPLE_API_KEY": credential}), \
                patch.object(neople_client, "API_KEY", credential), \
                patch.object(neople_client, "MAX_RETRIES", 1), \
                patch.object(neople_client, "urlopen", side_effect=upstream_error), \
                patch.object(ops_log, "LOG_DIR", Path(temp_dir)):
            with self.assertRaises(RuntimeError) as raised:
                neople_client.request_json(request_url)

            exception_text = str(raised.exception)
            public_error_body = neople_hell_api_server.json_response({"error": exception_text}).decode("utf-8")
            success_payload_with_errors = json.dumps(
                {"groups": [], "errors": [{"error": exception_text}]},
                ensure_ascii=False,
            )
            ops_log.write_ops_log(
                "redaction_regression",
                url=request_url,
                error=upstream_error,
                body="upstream echoed " + urlencode({"apikey": credential}),
            )
            log_text = "\n".join(
                path.read_text(encoding="utf-8")
                for path in Path(temp_dir).glob("*.log")
            )

        for output in (exception_text, public_error_body, success_payload_with_errors, log_text):
            self.assertNotIn(credential, output)

        self.assertIn("apikey=%2A%2A%2A", exception_text)
        self.assertIn("apikey=***", log_text)


if __name__ == "__main__":
    unittest.main()
