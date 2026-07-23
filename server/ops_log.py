import json
import os
import re
import time
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / "Logs"
_LOG_LOCK = Lock()


def sanitize_url(url: str) -> str:
    try:
        parts = urlsplit(str(url or ""))
        query = urlencode([
            (key, "***" if key.lower() == "apikey" else value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
        ])
        return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))
    except Exception:
        return str(url or "").replace("apikey=", "apikey=***")


def redact_text(value) -> str:
    text = str(value or "")
    api_key = os.environ.get("NEOPLE_API_KEY", "").strip()
    if api_key:
        text = text.replace(api_key, "***")
    return re.sub(r"(?i)(apikey=)[^&\s]+", r"\1***", text)


def redact_log_value(value):
    if isinstance(value, str) or isinstance(value, Exception):
        return redact_text(value)
    if isinstance(value, dict):
        return {key: redact_log_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_log_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact_log_value(item) for item in value)
    return value


def write_ops_log(event: str, **fields):
    now = time.localtime()
    payload = {
        "ts": time.strftime("%Y-%m-%d %H:%M:%S", now),
        "event": event,
        **{key: redact_log_value(value) for key, value in fields.items()},
    }
    log_path = LOG_DIR / f"{time.strftime('%Y-%m-%d', now)}.log"
    line = json.dumps(payload, ensure_ascii=False, default=str)
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with _LOG_LOCK:
            with log_path.open("a", encoding="utf-8") as fp:
                fp.write(line + "\n")
    except Exception:
        pass
