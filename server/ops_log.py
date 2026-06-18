import json
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


def write_ops_log(event: str, **fields):
    now = time.localtime()
    payload = {
        "ts": time.strftime("%Y-%m-%d %H:%M:%S", now),
        "event": event,
        **fields,
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
