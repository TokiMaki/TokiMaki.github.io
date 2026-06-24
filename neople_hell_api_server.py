#!/usr/bin/env python3

import argparse
import errno
import json
import os
import sys
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import BoundedSemaphore, Lock
from urllib.parse import parse_qs, quote, urlparse

from server.character_equipment_service import (
    load_character_aura,
    load_character_avatar,
    load_character_creature,
    load_character_enchants,
    load_character_loadout,
    load_character_preview,
    load_character_title,
)
from server.character_search_service import search_character_response
from server.character_summary_service import summarize_character_response
from server.avatar_skill_optimizer import load_avatar_skill_efficiency_response
from server.enchant_service import (
    load_aura_upgrades_with_prices,
    load_creature_upgrades_with_prices,
    load_enchant_cards_with_prices,
    load_title_upgrades_with_prices,
)
from server.data_store import (
    ROOT,
)
from server.neople_client import (
    clean_text,
)
from server.ops_log import write_ops_log
from server.price_cache import (
    AURA_PRICE_CACHE_PATH,
    CREATURE_PRICE_CACHE_PATH,
    ENCHANT_PRICE_CACHE_PATH,
    TITLE_PRICE_CACHE_PATH,
    _AURA_PRICE_CACHE,
    _CREATURE_PRICE_CACHE,
    _ENCHANT_PRICE_CACHE,
    _TITLE_PRICE_CACHE,
    load_price_cache_from_disk,
    start_periodic_price_refresh,
)

DEFAULT_HTML = "dnf_hell_vs_craft_percentile_tool_fixed.html"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8787)
API_SERVER_MODE = os.environ.get("API_SERVER_MODE", "prod").strip() or "prod"
HEAVY_REQUEST_LIMIT = int(os.environ.get("HEAVY_REQUEST_LIMIT") or 8)
HEAVY_REQUEST_WAIT_SECONDS = int(os.environ.get("HEAVY_REQUEST_WAIT_SECONDS") or 15)
PUBLIC_RESPONSE_CACHE_SECONDS = 60
MAX_PUBLIC_RESPONSE_CACHE_ENTRIES = 256
_HEAVY_REQUEST_SEMAPHORE = BoundedSemaphore(HEAVY_REQUEST_LIMIT)
_PUBLIC_RESPONSE_CACHE = {}
_PUBLIC_RESPONSE_LOCKS = {}
_PUBLIC_RESPONSE_CACHE_LOCK = Lock()


def json_response(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def get_public_response_cache_key(name: str, query: dict, include_character: bool = False) -> tuple:
    if not include_character:
        return (name,)
    server_id = clean_text((query.get("serverId") or [""])[0]).lower()
    character_id = clean_text((query.get("characterId") or [""])[0])
    return (name, server_id, character_id)


def should_cache_public_payload(payload: dict) -> bool:
    if not isinstance(payload, dict):
        return True
    cache_status = payload.get("cache") or {}
    if not cache_status.get("stale"):
        return True
    if payload.get("cards") or payload.get("groups"):
        return True
    return False


def prune_public_response_cache(now: float):
    expired_keys = [
        key
        for key, cached in _PUBLIC_RESPONSE_CACHE.items()
        if cached["expires_at"] <= now
    ]
    for key in expired_keys:
        _PUBLIC_RESPONSE_CACHE.pop(key, None)
    overflow = len(_PUBLIC_RESPONSE_CACHE) - MAX_PUBLIC_RESPONSE_CACHE_ENTRIES
    if overflow <= 0:
        return
    oldest_keys = [
        key
        for key, _ in sorted(
            _PUBLIC_RESPONSE_CACHE.items(),
            key=lambda item: item[1]["expires_at"],
        )[:overflow]
    ]
    for key in oldest_keys:
        _PUBLIC_RESPONSE_CACHE.pop(key, None)


def load_public_response_body(cache_key: tuple, loader, force_refresh: bool = False) -> tuple[bytes, bool]:
    now = time.time()
    if not force_refresh:
        with _PUBLIC_RESPONSE_CACHE_LOCK:
            prune_public_response_cache(now)
            cached = _PUBLIC_RESPONSE_CACHE.get(cache_key)
            if cached and cached["expires_at"] > now:
                return cached["body"], True
            cache_lock = _PUBLIC_RESPONSE_LOCKS.setdefault(cache_key, Lock())
    else:
        with _PUBLIC_RESPONSE_CACHE_LOCK:
            cache_lock = _PUBLIC_RESPONSE_LOCKS.setdefault(cache_key, Lock())

    with cache_lock:
        now = time.time()
        if not force_refresh:
            with _PUBLIC_RESPONSE_CACHE_LOCK:
                prune_public_response_cache(now)
                cached = _PUBLIC_RESPONSE_CACHE.get(cache_key)
                if cached and cached["expires_at"] > now:
                    return cached["body"], True

        payload = loader()
        body = json_response(payload)
        if should_cache_public_payload(payload):
            with _PUBLIC_RESPONSE_CACHE_LOCK:
                prune_public_response_cache(time.time())
                _PUBLIC_RESPONSE_CACHE[cache_key] = {
                    "body": body,
                    "expires_at": time.time() + PUBLIC_RESPONSE_CACHE_SECONDS,
                }
        return body, False


class HellApiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", getattr(self, "_cache_control", "no-store"))
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_HEAD(self):
        self.send_response(HTTPStatus.NOT_FOUND)
        self.end_headers()

    def run_limited_api_request(self, parsed, callback):
        started_at = time.time()
        acquired = _HEAVY_REQUEST_SEMAPHORE.acquire(timeout=HEAVY_REQUEST_WAIT_SECONDS)
        wait_ms = round((time.time() - started_at) * 1000)
        if not acquired:
            write_ops_log(
                "api_throttle_reject",
                route=parsed.path,
                limit=HEAVY_REQUEST_LIMIT,
                waitMs=wait_ms,
            )
            return self.send_json(
                {"error": "요청이 많아 잠시 후 다시 시도해 주세요."},
                status=HTTPStatus.SERVICE_UNAVAILABLE,
            )
        try:
            if wait_ms >= 1000:
                write_ops_log(
                    "api_throttle_wait",
                    route=parsed.path,
                    limit=HEAVY_REQUEST_LIMIT,
                    waitMs=wait_ms,
                )
            return callback()
        finally:
            _HEAVY_REQUEST_SEMAPHORE.release()

    def do_GET(self):
        self._request_started_at = time.time()
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            write_ops_log("api_request_start", route=parsed.path)

        if parsed.path in {"/", "/index.html"}:
            return self.send_json({
                "ok": True,
                "service": "dnf-hell-api",
                "mode": API_SERVER_MODE,
                "port": getattr(self.server, "server_port", PORT),
            })

        if parsed.path == "/api/health":
            return self.send_json({
                "ok": True,
                "service": "dnf-hell-api",
                "mode": API_SERVER_MODE,
                "port": getattr(self.server, "server_port", PORT),
            })

        if parsed.path == "/api/search":
            return self.run_limited_api_request(parsed, lambda: self.handle_search(parsed))

        if parsed.path == "/api/summarize":
            return self.run_limited_api_request(parsed, lambda: self.handle_summarize(parsed))

        if parsed.path == "/api/enchant-cards":
            return self.run_limited_api_request(parsed, lambda: self.handle_enchant_cards(parsed))

        if parsed.path == "/api/character-enchants":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_enchants(parsed))

        if parsed.path == "/api/character-loadout":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_loadout(parsed))

        if parsed.path == "/api/character-preview":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_preview(parsed))

        if parsed.path == "/api/creature-upgrades":
            return self.run_limited_api_request(parsed, lambda: self.handle_creature_upgrades(parsed))

        if parsed.path == "/api/character-creature":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_creature(parsed))

        if parsed.path == "/api/title-upgrades":
            return self.run_limited_api_request(parsed, lambda: self.handle_title_upgrades(parsed))

        if parsed.path == "/api/character-title":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_title(parsed))

        if parsed.path == "/api/aura-upgrades":
            return self.run_limited_api_request(parsed, lambda: self.handle_aura_upgrades(parsed))

        if parsed.path == "/api/character-aura":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_aura(parsed))

        if parsed.path == "/api/character-avatar":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_avatar(parsed))

        if parsed.path == "/api/avatar-skill-efficiency":
            return self.run_limited_api_request(parsed, lambda: self.handle_avatar_skill_efficiency(parsed))

        return self.send_json({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def send_json_body(
        self,
        body: bytes,
        status: int = HTTPStatus.OK,
        cache_control: str | None = None,
        cache_hit: bool | None = None,
        error_message: str | None = None,
    ):
        client_aborted = False
        if cache_control:
            self._cache_control = cache_control
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            client_aborted = True
        finally:
            if hasattr(self, "_cache_control"):
                delattr(self, "_cache_control")
            started_at = getattr(self, "_request_started_at", None)
            elapsed_ms = round((time.time() - started_at) * 1000) if started_at else None
            route = urlparse(self.path).path
            write_ops_log(
                "api_response",
                route=route,
                status=int(status),
                elapsedMs=elapsed_ms,
                error=error_message,
                clientAborted=client_aborted,
                cacheHit=cache_hit,
            )

    def send_json(self, payload: dict, status: int = HTTPStatus.OK):
        body = json_response(payload)
        error_message = payload.get("error") if isinstance(payload, dict) else None
        self.send_json_body(body, status=status, error_message=error_message)

    def handle_search(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_name = clean_text((query.get("characterName") or [""])[0])
        if not server_id or not character_name:
            return self.send_json(
                {"error": "serverId와 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(search_character_response(server_id, character_name))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_avatar_skill_efficiency(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        character_name = clean_text((query.get("characterName") or [""])[0])
        skill_levels_text = (query.get("skillLevels") or [""])[0]
        if not server_id or not (character_id or character_name):
            return self.send_json(
                {"error": "serverId와 characterId 또는 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_avatar_skill_efficiency_response(
                server_id,
                character_id,
                character_name,
                skill_levels_text=skill_levels_text,
            ))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_enchant_cards(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            body, cache_hit = load_public_response_body(
                get_public_response_cache_key("enchant-cards", query),
                lambda: load_enchant_cards_with_prices(force_refresh=force_refresh),
                force_refresh=force_refresh,
            )
            self.send_json_body(body, cache_control="public, max-age=60", cache_hit=cache_hit)
        except FileNotFoundError:
            self.send_json({"error": "마법부여 카드 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_enchants(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_enchants(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_loadout(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_loadout(server_id, character_id))
        except FileNotFoundError:
            self.send_json({"error": "캐릭터 세팅 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_preview(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_preview(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_creature_upgrades(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        try:
            body, cache_hit = load_public_response_body(
                get_public_response_cache_key("creature-upgrades", query, include_character=True),
                lambda: load_creature_upgrades_with_prices(
                    force_refresh=force_refresh,
                    server_id=server_id,
                    character_id=character_id,
                ),
                force_refresh=force_refresh,
            )
            self.send_json_body(body, cache_control="public, max-age=60", cache_hit=cache_hit)
        except FileNotFoundError:
            self.send_json({"error": "크리쳐 후보 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_creature(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_creature(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_title_upgrades(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            body, cache_hit = load_public_response_body(
                get_public_response_cache_key("title-upgrades", query),
                lambda: load_title_upgrades_with_prices(force_refresh=force_refresh),
                force_refresh=force_refresh,
            )
            self.send_json_body(body, cache_control="public, max-age=60", cache_hit=cache_hit)
        except FileNotFoundError:
            self.send_json({"error": "칭호 후보 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_title(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_title(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_aura_upgrades(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        try:
            body, cache_hit = load_public_response_body(
                get_public_response_cache_key("aura-upgrades", query, include_character=True),
                lambda: load_aura_upgrades_with_prices(
                    force_refresh=force_refresh,
                    server_id=server_id,
                    character_id=character_id,
                ),
                force_refresh=force_refresh,
            )
            self.send_json_body(body, cache_control="public, max-age=60", cache_hit=cache_hit)
        except FileNotFoundError:
            self.send_json({"error": "오라 후보 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_aura(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_aura(server_id, character_id))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_character_avatar(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        if not server_id or not character_id:
            return self.send_json(
                {"error": "serverId와 characterId를 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_avatar(server_id, character_id))
        except FileNotFoundError:
            self.send_json({"error": "아바타 옵션 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_summarize(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_name = clean_text((query.get("characterName") or [""])[0])
        if not server_id or not character_name:
            return self.send_json(
                {"error": "serverId와 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(summarize_character_response(server_id, character_name))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)


def main():
    parser = argparse.ArgumentParser(description="던파 헬 계산기용 Neople API proxy")
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()

    try:
        server = ThreadingHTTPServer((args.host, args.port), HellApiHandler)
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE or getattr(exc, "winerror", None) == 10048:
            print(f"Port {args.port} is already in use.")
            print(f"이미 서버가 실행 중이면 http://{args.host}:{args.port}/ 를 그대로 사용하세요.")
            print(f"다른 포트로 열려면: python3 neople_hell_api_server.py --port {args.port + 1}")
            return 1
        raise
    print(f"Serving on http://{args.host}:{args.port}/ ({API_SERVER_MODE})")
    print(f"Open {DEFAULT_HTML} via the server root or file:// with the local API proxy.")
    load_price_cache_from_disk(_ENCHANT_PRICE_CACHE, ENCHANT_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_CREATURE_PRICE_CACHE, CREATURE_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_TITLE_PRICE_CACHE, TITLE_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    start_periodic_price_refresh([
        (_ENCHANT_PRICE_CACHE, lambda: load_enchant_cards_with_prices(force_refresh=True, allow_stale=False), "enchant"),
        (_CREATURE_PRICE_CACHE, lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False), "creature"),
        (_TITLE_PRICE_CACHE, lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False), "title"),
        (_AURA_PRICE_CACHE, lambda: load_aura_upgrades_with_prices(force_refresh=True, allow_stale=False), "aura"),
    ], run_immediately=False)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
