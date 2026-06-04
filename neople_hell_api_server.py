#!/usr/bin/env python3

import argparse
import errno
import json
import os
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
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
from server.avatar_skill_optimizer import load_character_avatar_skill_efficiency
from server.character_summary import summarize_character_by_identity
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
    search_character,
)
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
)

DEFAULT_HTML = "dnf_hell_vs_craft_percentile_tool_fixed.html"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8787)


def json_response(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def parse_skill_level_overrides(raw_value: str) -> dict:
    result = {}
    for chunk in (raw_value or "").split(","):
        if ":" not in chunk:
            continue
        name, level = chunk.rsplit(":", 1)
        name = clean_text(name)
        try:
            parsed_level = int(clean_text(level))
        except ValueError:
            continue
        if name and parsed_level > 0:
            result[name] = parsed_level
    return result


class HellApiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path in {"/", "/index.html"}:
            return self.send_json({"ok": True, "service": "dnf-hell-api"})

        if parsed.path == "/api/health":
            return self.send_json({"ok": True})

        if parsed.path == "/api/search":
            return self.handle_search(parsed)

        if parsed.path == "/api/summarize":
            return self.handle_summarize(parsed)

        if parsed.path == "/api/enchant-cards":
            return self.handle_enchant_cards(parsed)

        if parsed.path == "/api/character-enchants":
            return self.handle_character_enchants(parsed)

        if parsed.path == "/api/character-loadout":
            return self.handle_character_loadout(parsed)

        if parsed.path == "/api/character-preview":
            return self.handle_character_preview(parsed)

        if parsed.path == "/api/creature-upgrades":
            return self.handle_creature_upgrades(parsed)

        if parsed.path == "/api/character-creature":
            return self.handle_character_creature(parsed)

        if parsed.path == "/api/title-upgrades":
            return self.handle_title_upgrades(parsed)

        if parsed.path == "/api/character-title":
            return self.handle_character_title(parsed)

        if parsed.path == "/api/aura-upgrades":
            return self.handle_aura_upgrades(parsed)

        if parsed.path == "/api/character-aura":
            return self.handle_character_aura(parsed)

        if parsed.path == "/api/character-avatar":
            return self.handle_character_avatar(parsed)

        if parsed.path == "/api/avatar-skill-efficiency":
            return self.handle_avatar_skill_efficiency(parsed)

        return super().do_GET()

    def send_json(self, payload: dict, status: int = HTTPStatus.OK):
        body = json_response(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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
            resolved = search_character(server_id, character_name)
            self.send_json(
                {
                    "serverId": server_id,
                    "characterName": character_name,
                    "matchCount": len(resolved["rows"]),
                    "resolved": {
                        "serverId": resolved["server_id"],
                        "characterId": resolved["character_id"],
                        "characterName": resolved["character_name"],
                        "adventureName": resolved.get("adventure_name", ""),
                        "fame": resolved.get("fame", 0),
                        "jobId": resolved.get("job_id", ""),
                        "jobName": resolved.get("job_name", ""),
                        "jobGrowId": resolved.get("job_grow_id", ""),
                        "jobGrowName": resolved.get("job_grow_name", ""),
                    },
                    "rows": resolved["rows"],
                }
            )
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_avatar_skill_efficiency(self, parsed):
        query = parse_qs(parsed.query)
        server_id = clean_text((query.get("serverId") or [""])[0]).lower()
        character_id = clean_text((query.get("characterId") or [""])[0])
        character_name = clean_text((query.get("characterName") or [""])[0])
        skill_level_overrides = parse_skill_level_overrides((query.get("skillLevels") or [""])[0])
        if not server_id or not (character_id or character_name):
            return self.send_json(
                {"error": "serverId와 characterId 또는 characterName을 입력해 주세요."},
                status=HTTPStatus.BAD_REQUEST,
            )

        try:
            self.send_json(load_character_avatar_skill_efficiency(
                server_id,
                character_id,
                character_name,
                skill_level_overrides=skill_level_overrides,
            ))
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.BAD_GATEWAY)

    def handle_enchant_cards(self, parsed):
        query = parse_qs(parsed.query)
        force_refresh = (query.get("refresh") or [""])[0] == "1"
        try:
            self.send_json(load_enchant_cards_with_prices(force_refresh=force_refresh))
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
        try:
            self.send_json(load_creature_upgrades_with_prices(force_refresh=force_refresh))
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
            self.send_json(load_title_upgrades_with_prices(force_refresh=force_refresh))
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
            self.send_json(load_aura_upgrades_with_prices(
                force_refresh=force_refresh,
                server_id=server_id,
                character_id=character_id,
            ))
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
            resolved = search_character(server_id, character_name)
            summary = summarize_character_by_identity(
                resolved["server_id"],
                resolved["character_id"],
                resolved["character_name"],
            )
            self.send_json(
                {
                    "serverId": resolved["server_id"],
                    "characterId": resolved["character_id"],
                    "requestedCharacterName": character_name,
                    "name": summary["name"],
                    "fame": resolved.get("fame", 0),
                    "jobId": resolved.get("job_id", ""),
                    "jobName": resolved.get("job_name", ""),
                    "jobGrowId": resolved.get("job_grow_id", ""),
                    "jobGrowName": resolved.get("job_grow_name", ""),
                    "sets": summary["sets"],
                }
            )
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
    print(f"Serving on http://{args.host}:{args.port}/")
    print(f"Open {DEFAULT_HTML} via the server root or file:// with the local API proxy.")
    load_price_cache_from_disk(_ENCHANT_PRICE_CACHE, ENCHANT_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_CREATURE_PRICE_CACHE, CREATURE_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_TITLE_PRICE_CACHE, TITLE_PRICE_CACHE_PATH)
    load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
