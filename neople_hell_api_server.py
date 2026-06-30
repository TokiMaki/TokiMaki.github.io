#!/usr/bin/env python3

import argparse
import errno
import json
import logging
import os
import sys
import time
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import BoundedSemaphore, Event, Lock
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
from server.repositories.equipment_score_repository import load_official_equipment_score
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
    NeopleMaintenanceError,
    clean_text,
)
from server.ops_log import write_ops_log
from server.api_fanout_trace import finish_request_stats, start_request_stats
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
LOADOUT_RESPONSE_CACHE_SECONDS = 15
MAX_LOADOUT_RESPONSE_CACHE_ENTRIES = 64
LOADOUT_RESPONSE_INFLIGHT_WAIT_SECONDS = 60
_HEAVY_REQUEST_SEMAPHORE = BoundedSemaphore(HEAVY_REQUEST_LIMIT)
_PUBLIC_RESPONSE_CACHE = {}
_PUBLIC_RESPONSE_LOCKS = {}
_PUBLIC_RESPONSE_CACHE_LOCK = Lock()
_LOADOUT_RESPONSE_CACHE = {}
_LOADOUT_RESPONSE_INFLIGHT = {}
_LOADOUT_RESPONSE_CACHE_LOCK = Lock()
logging.basicConfig(level=logging.INFO, format="%(message)s")
logging.getLogger("werkzeug").setLevel(logging.WARNING)
REQUEST_LOGGER = logging.getLogger("dunpilot.request")


class HeavyRequestRejected(Exception):
    pass


def json_response(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def truncate_log_text(value: str, limit: int = 24) -> str:
    text = clean_text(value)
    return text if len(text) <= limit else f"{text[:limit]}..."


def load_json_log_payload(body: bytes) -> dict:
    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def count_response_recommendations(payload: dict) -> int:
    if not isinstance(payload, dict):
        return 0
    total = 0
    for key, value in payload.items():
        if key == "recommendations" or key.endswith("Recommendations"):
            if isinstance(value, list):
                total += len(value)
    return total


def count_search_results(payload: dict) -> int:
    if not isinstance(payload, dict):
        return 0
    for key in ("rows", "characters", "results"):
        value = payload.get(key)
        if isinstance(value, list):
            return len(value)
    return 1 if payload.get("characterId") else 0


def get_auction_api_call_count(api_calls: dict) -> int:
    return sum(
        int(count or 0)
        for name, count in (api_calls or {}).items()
        if str(name).startswith("auction_")
    )


def format_route_cache_hit(cache_hit: bool | None) -> str:
    if cache_hit is True:
        return "hit"
    if cache_hit is False:
        return "miss"
    return "-"


def get_request_route_name(route: str) -> str:
    route_names = {
        "/api/character-loadout": "loadout",
        "/api/search": "search",
        "/api/aura-upgrades": "aura",
        "/api/creature-upgrades": "creature",
        "/api/title-upgrades": "title",
        "/api/enchant-cards": "enchant",
        "/api/equipment-score": "equip-score",
    }
    return route_names.get(route, route.removeprefix("/api/") or route or "-")


def format_short_character_cache(char_cache: dict) -> str:
    parts = []
    for key, suffix in (("mem", "mem"), ("sqlite", "sql"), ("api", "api")):
        count = int((char_cache or {}).get(key) or 0)
        if count > 0:
            parts.append(f"{count}{suffix}")
    return "+".join(parts)


def should_log_request_summary(stats: dict, status: int, duration_ms: int | None, cache_hit: bool | None, neople_api_count: int, auction_api_count: int) -> tuple[bool, str]:
    duration = int(duration_ms or 0)
    if int(status) >= 400 or duration >= 1500:
        return True, "[SLOW]" if int(status) < 400 else "[WARN]"
    route = clean_text(stats.get("route"))
    if cache_hit is True and duration < 200:
        return False, "[REQ]"
    character_id = clean_text(stats.get("characterId"))
    if route in {"/api/search", "/api/character-loadout"}:
        return True, "[REQ]"
    if character_id and cache_hit is False:
        return True, "[REQ]"
    if neople_api_count > 0 or auction_api_count > 0:
        return True, "[REQ]"
    if duration >= 200:
        return True, "[REQ]"
    return False, "[REQ]"


def format_request_summary_log(
    stats: dict,
    status: int,
    duration_ms: int | None,
    request_id: str,
    cache_hit: bool | None,
    recommendation_count: int,
    search_result_count: int = 0,
    response_character_name: str = "",
) -> tuple[str, bool]:
    api_calls = stats.get("apiCalls") or {}
    char_cache = stats.get("charCache") or {}
    neople_api_count = sum(int(count or 0) for count in api_calls.values())
    auction_api_count = get_auction_api_call_count(api_calls)
    should_log, prefix = should_log_request_summary(
        stats,
        status,
        duration_ms,
        cache_hit,
        neople_api_count,
        auction_api_count,
    )
    if not should_log:
        return "", False
    route = clean_text(stats.get("route"))
    route_name = get_request_route_name(route)
    parts = [
        prefix,
        route_name,
        str(int(status)),
        f"{int(duration_ms or 0)}ms",
    ]
    server_id = clean_text(stats.get("serverId"))
    character_id = clean_text(stats.get("characterId"))
    character_name = clean_text(stats.get("characterName")) or clean_text(response_character_name)
    if server_id and character_id:
        parts.append(f"{server_id}/{character_id[:8]}")
    elif server_id:
        parts.append(server_id)
    if character_name:
        parts.append(f"name={truncate_log_text(character_name)}")
    if cache_hit is not None:
        parts.append(f"route={format_route_cache_hit(cache_hit)}")
    char_cache_text = format_short_character_cache(char_cache)
    if char_cache_text:
        parts.append(f"char={char_cache_text}")
    if neople_api_count > 0:
        parts.append(f"api={neople_api_count}")
    if auction_api_count > 0:
        parts.append(f"auction={auction_api_count}")
    if recommendation_count > 0:
        parts.append(f"recommend={int(recommendation_count)}")
    if route == "/api/search" and search_result_count > 0:
        parts.append(f"results={int(search_result_count)}")
    if prefix != "[REQ]":
        parts.append(f"rid={request_id}")
    return " ".join(parts), prefix != "[REQ]"


def get_payload_character_name(payload: dict) -> str:
    if not isinstance(payload, dict):
        return ""
    for key in ("characterName", "name"):
        value = clean_text(payload.get(key))
        if value:
            return value
    character = payload.get("character")
    if isinstance(character, dict):
        return clean_text(character.get("characterName") or character.get("name"))
    return ""


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


def prune_loadout_response_cache(now: float):
    expired_keys = [
        key
        for key, cached in _LOADOUT_RESPONSE_CACHE.items()
        if cached["expires_at"] <= now
    ]
    for key in expired_keys:
        _LOADOUT_RESPONSE_CACHE.pop(key, None)
    overflow = len(_LOADOUT_RESPONSE_CACHE) - MAX_LOADOUT_RESPONSE_CACHE_ENTRIES
    if overflow <= 0:
        return
    oldest_keys = [
        key
        for key, _ in sorted(
            _LOADOUT_RESPONSE_CACHE.items(),
            key=lambda item: item[1]["expires_at"],
        )[:overflow]
    ]
    for key in oldest_keys:
        _LOADOUT_RESPONSE_CACHE.pop(key, None)


def load_character_loadout_response_body(cache_key: tuple, loader) -> tuple[bytes, bool]:
    now = time.time()
    with _LOADOUT_RESPONSE_CACHE_LOCK:
        prune_loadout_response_cache(now)
        cached = _LOADOUT_RESPONSE_CACHE.get(cache_key)
        if cached and cached["expires_at"] > now:
            return cached["body"], True

        inflight = _LOADOUT_RESPONSE_INFLIGHT.get(cache_key)
        if not inflight:
            inflight = {"event": Event(), "body": None, "error": None}
            _LOADOUT_RESPONSE_INFLIGHT[cache_key] = inflight
            is_owner = True
        else:
            is_owner = False

    if not is_owner:
        if not inflight["event"].wait(LOADOUT_RESPONSE_INFLIGHT_WAIT_SECONDS):
            raise TimeoutError("캐릭터 세팅 계산 대기 시간이 초과되었습니다.")
        if inflight.get("error") is not None:
            raise inflight["error"]
        return inflight.get("body") or b"{}", True

    try:
        payload = loader()
        body = json_response(payload)
        with _LOADOUT_RESPONSE_CACHE_LOCK:
            prune_loadout_response_cache(time.time())
            _LOADOUT_RESPONSE_CACHE[cache_key] = {
                "body": body,
                "expires_at": time.time() + LOADOUT_RESPONSE_CACHE_SECONDS,
            }
            inflight["body"] = body
        return body, False
    except Exception as exc:
        with _LOADOUT_RESPONSE_CACHE_LOCK:
            inflight["error"] = exc
        raise
    finally:
        with _LOADOUT_RESPONSE_CACHE_LOCK:
            inflight["event"].set()
            _LOADOUT_RESPONSE_INFLIGHT.pop(cache_key, None)


class HellApiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        status = 0
        if len(args) >= 2:
            try:
                status = int(args[1])
            except Exception:
                status = 0
        if 200 <= status < 400:
            return
        super().log_message(format, *args)

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

    def run_heavy_api_operation(self, parsed, operation):
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
            raise HeavyRequestRejected("요청이 많아 잠시 후 다시 시도해 주세요.")
        try:
            if wait_ms >= 1000:
                write_ops_log(
                    "api_throttle_wait",
                    route=parsed.path,
                    limit=HEAVY_REQUEST_LIMIT,
                    waitMs=wait_ms,
                )
            return operation()
        finally:
            _HEAVY_REQUEST_SEMAPHORE.release()

    def do_GET(self):
        self._request_started_at = time.time()
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        self._request_id = uuid.uuid4().hex[:8]
        self._request_stats_token = None
        if parsed.path.startswith("/api/"):
            server_id = clean_text((query.get("serverId") or [""])[0]).lower()
            character_id = clean_text((query.get("characterId") or [""])[0])
            character_name = clean_text((query.get("characterName") or [""])[0])
            self._request_stats_token = start_request_stats(
                parsed.path,
                method="GET",
                server_id=server_id,
                character_id=character_id,
                character_name=character_name,
            )
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
            return self.handle_character_loadout(parsed)

        if parsed.path == "/api/character-preview":
            return self.run_limited_api_request(parsed, lambda: self.handle_character_preview(parsed))

        if parsed.path == "/api/equipment-score":
            return self.run_limited_api_request(parsed, lambda: self.handle_equipment_score(parsed))

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
            request_stats = {}
            request_token = getattr(self, "_request_stats_token", None)
            if request_token is not None:
                try:
                    request_stats = finish_request_stats(request_token)
                except Exception:
                    request_stats = {}
                finally:
                    self._request_stats_token = None
            log_payload = load_json_log_payload(body)
            recommendation_count = count_response_recommendations(log_payload)
            search_result_count = count_search_results(log_payload) if route == "/api/search" else 0
            write_ops_log(
                "api_response",
                route=route,
                status=int(status),
                elapsedMs=elapsed_ms,
                error=error_message,
                clientAborted=client_aborted,
                cacheHit=cache_hit,
            )
            if request_stats:
                request_id = clean_text(getattr(self, "_request_id", "")) or uuid.uuid4().hex[:8]
                line, warn = format_request_summary_log(
                    request_stats,
                    int(status),
                    elapsed_ms,
                    request_id,
                    cache_hit,
                    recommendation_count,
                    search_result_count,
                    get_payload_character_name(log_payload),
                )
                if line:
                    if warn:
                        REQUEST_LOGGER.warning(line)
                    else:
                        REQUEST_LOGGER.info(line)

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
        except NeopleMaintenanceError as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.SERVICE_UNAVAILABLE)
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
            body, cache_hit = load_character_loadout_response_body(
                ("character-loadout", server_id, character_id),
                lambda: self.run_heavy_api_operation(
                    parsed,
                    lambda: load_character_loadout(server_id, character_id),
                ),
            )
            self.send_json_body(body, cache_hit=cache_hit)
        except FileNotFoundError:
            self.send_json({"error": "캐릭터 세팅 DB를 찾을 수 없습니다."}, status=HTTPStatus.NOT_FOUND)
        except HeavyRequestRejected as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.SERVICE_UNAVAILABLE)
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

    def handle_equipment_score(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_name = clean_text((query.get("characterName") or [""])[0])
        if not server_id or not character_name:
            return self.send_json(
                {"error": "serverId와 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_official_equipment_score(server_id, character_name))
        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        except Exception:
            self.send_json({
                "equipmentScore": None,
                "officialCharacterKey": None,
                "officialProfileUrl": None,
                "source": "df.nexon.com",
                "cached": False,
                "stale": False,
            })

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
