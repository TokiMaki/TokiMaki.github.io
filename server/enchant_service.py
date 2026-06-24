import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from .candidates.aura import build_aura_upgrade_groups
from .candidates.creature import resolve_creature_upgrade_sources
from .candidates.title import build_title_upgrade_groups, resolve_title_group_sources
from .data_store import AURA_DB_PATH, CREATURE_ARTIFACT_DB_PATH, CREATURE_DB_PATH, ENCHANT_DB_PATH, TITLE_DB_PATH
from .effects import get_creature_artifact_status_summary, get_title_enchant_status_summary, normalize_enchant_status, order_effects
from .item_skill_option_service import get_character_skill_context, get_item_reinforce_skill_effect
from .neople_client import (
    clean_item_display_name,
    clean_text,
    get_item_explain,
    get_item_icon_url,
)
from .price_cache import (
    CREATURE_PRICE_CACHE_PATH,
    ENCHANT_PRICE_CACHE_PATH,
    ENCHANT_PRICE_CACHE_SCHEMA_VERSION,
    PRICE_REFRESH_INTERVAL_SECONDS,
    TITLE_PRICE_CACHE_PATH,
    _CACHE_LOCK,
    _CREATURE_PRICE_CACHE,
    _ENCHANT_PRICE_CACHE,
    _TITLE_PRICE_CACHE,
    add_cache_status,
    load_price_cache_from_disk,
    save_price_cache_to_disk,
    start_cache_refresh,
)
from .repositories.auction_repository import get_auction_rows, get_aura_price_cache_payload, get_lowest_auction_price, save_aura_price_cache_payload
from .repositories.item_repository import fetch_item_details, resolve_exact_item_by_name, search_items_by_name
from .upgrade_payloads import (
    build_title_payload,
    get_title_variant,
    parse_skill_damage_percent,
    parse_title_level_tag,
)

CREATURE_PRICE_CACHE_SCHEMA_VERSION = 6
AURA_PRICE_CACHE_SCHEMA_VERSION = 2
TITLE_PRICE_CACHE_SCHEMA_VERSION = 10


def get_enchant_bead_search_names(card: dict) -> list:
    names = []
    source_names = [source.get("searchName") for source in card.get("sources") or []]
    for name in [card.get("itemName"), card.get("searchName"), *source_names]:
        clean_name = clean_text(name)
        if clean_name.endswith("카드"):
            names.append(clean_name[:-2].strip() + " 보주")
    return list(dict.fromkeys(names))


def find_enchant_bead_item(card: dict):
    bead_item_id = clean_text(card.get("beadItemId"))
    if bead_item_id:
        return {
            "itemId": bead_item_id,
            "itemName": clean_item_display_name(card.get("beadItemName")) or "",
            "iconUrl": get_item_icon_url(bead_item_id),
        }
    for bead_name in get_enchant_bead_search_names(card):
        try:
            for row in search_items_by_name(bead_name):
                if clean_text(row.get("itemName")) == bead_name:
                    item_id = row.get("itemId")
                    return {
                        "itemId": item_id,
                        "itemName": clean_item_display_name(row.get("itemName")),
                        "iconUrl": get_item_icon_url(item_id),
                    }
        except Exception:
            continue
    return None


def combine_effects(*effect_rows: dict) -> dict:
    result = {}
    for effects in effect_rows:
        for key, value in (effects or {}).items():
            result[key] = result.get(key, 0) + value
    return order_effects(result)


def auction_row_to_price(row: dict) -> dict:
    return {
        "listingCount": int(row.get("regCount") or row.get("count") or 1),
        "minUnitPrice": row.get("unitPrice"),
        "averagePrice": row.get("averagePrice") if row.get("averagePrice", 0) > 0 else None,
        "auctionNo": row.get("auctionNo"),
        "fame": row.get("fame"),
    }


def add_auction_prices(*auctions: dict) -> dict:
    valid_auctions = [auction for auction in auctions if auction is not None]
    prices = [
        auction.get("minUnitPrice")
        for auction in valid_auctions
        if isinstance(auction.get("minUnitPrice"), (int, float)) and auction.get("minUnitPrice") > 0
    ]
    if len(prices) != len(valid_auctions):
        return {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
    return {
        "listingCount": sum(int(auction.get("listingCount") or 0) for auction in valid_auctions),
        "minUnitPrice": sum(prices),
        "averagePrice": None,
        "auctionNo": None,
    }


def lowest_auction_from_rows(rows: list) -> dict:
    priced_rows = [
        row for row in rows or []
        if isinstance(row.get("unitPrice"), (int, float)) and row.get("unitPrice") > 0
    ]
    lowest = min(priced_rows, key=lambda row: row.get("unitPrice"), default=None)
    return auction_row_to_price(lowest) if lowest else {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}


def enrich_aura_groups_for_character(groups: list, server_id: str, character_id: str) -> list:
    skill_context = get_character_skill_context(server_id, character_id)
    candidate_ids = [
        clean_text(candidate.get("itemId"))
        for group in groups or []
        for candidate in group.get("candidates") or []
        if clean_text(candidate.get("itemId"))
    ]
    detail_map = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(candidate_ids)
        if clean_text(detail.get("itemId"))
    }
    enriched_groups = []
    for group in groups or []:
        candidates = []
        for candidate in group.get("candidates") or []:
            detail = detail_map.get(clean_text(candidate.get("itemId"))) or {}
            candidates.append({
                **candidate,
                **get_item_reinforce_skill_effect(detail, skill_context),
            })
        enriched_groups.append({
            **group,
            "candidates": candidates,
        })
    return enriched_groups


def enrich_creature_groups_for_character(groups: list, server_id: str, character_id: str) -> list:
    skill_context = get_character_skill_context(server_id, character_id)
    candidate_ids = [
        clean_text(candidate.get("itemId"))
        for group in groups or []
        for candidate in group.get("candidates") or []
        if clean_text(candidate.get("itemId"))
    ]
    detail_map = {
        clean_text(detail.get("itemId")): detail
        for detail in fetch_item_details(candidate_ids)
        if clean_text(detail.get("itemId"))
    }
    return [{
        **group,
        "candidates": [{
            **candidate,
            **get_item_reinforce_skill_effect(
                detail_map.get(clean_text(candidate.get("itemId"))) or {},
                skill_context,
            ),
        } for candidate in group.get("candidates") or []],
    } for group in groups or []]


def load_title_bead_options(get_cached_auction, errors: list) -> list:
    element_keywords = {
        "fire": "화속성",
        "water": "수속성",
        "light": "명속성",
        "dark": "암속성",
    }
    options = []
    for element, label in element_keywords.items():
        try:
            matched_rows = [
                row for row in search_items_by_name(f"칭호 보주[{label} & 모든스탯]")
                if clean_text(row.get("itemTypeDetail")) == "보주"
                and "칭호 보주" in clean_text(row.get("itemName"))
                and f"[{label} & 모든스탯]" in clean_text(row.get("itemName"))
            ]
        except Exception as exc:
            errors.append({"keyword": f"칭호 보주[{label} & 모든스탯]", "error": str(exc)})
            continue

        element_options = []
        for row in matched_rows:
            item_id = row.get("itemId")
            try:
                auction = get_cached_auction(item_id)
            except Exception as exc:
                auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                errors.append({"itemId": item_id, "itemName": row.get("itemName"), "error": str(exc)})
            element_options.append({
                "itemId": item_id,
                "itemName": clean_text(row.get("itemName")),
                "iconUrl": get_item_icon_url(item_id),
                "element": element,
                "effects": {"elementAll": 6, "allStat": 25},
                "auction": auction,
            })
        priced_options = [
            option for option in element_options
            if isinstance(option.get("auction", {}).get("minUnitPrice"), (int, float))
            and option["auction"]["minUnitPrice"] > 0
        ]
        if priced_options:
            options.append(min(priced_options, key=lambda option: option["auction"]["minUnitPrice"]))
    return options


def load_creature_artifact_groups_with_prices(errors: list) -> list:
    try:
        with CREATURE_ARTIFACT_DB_PATH.open("r", encoding="utf-8") as fp:
            artifact_db = json.load(fp)
    except FileNotFoundError:
        return []

    item_ids = [
        clean_text(candidate.get("itemId"))
        for group in artifact_db.get("groups") or []
        for candidate in group.get("candidates") or []
        if clean_text(candidate.get("itemId"))
    ]
    details_by_id = {
        detail.get("itemId"): detail
        for detail in fetch_item_details(item_ids)
    }

    auction_cache = {}

    def get_cached_auction(item_id):
        if item_id not in auction_cache:
            auction_cache[item_id] = get_lowest_auction_price(item_id)
        return auction_cache[item_id]

    groups = []
    for group in artifact_db.get("groups") or []:
        candidates = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(get_cached_auction, candidate.get("itemId")): candidate
                for candidate in group.get("candidates") or []
                if clean_text(candidate.get("itemId"))
            }
            for future in as_completed(futures):
                candidate = futures[future]
                item_id = clean_text(candidate.get("itemId"))
                detail = details_by_id.get(item_id) or {}
                try:
                    auction = future.result()
                except Exception as exc:
                    auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                    errors.append({"itemId": item_id, "itemName": candidate.get("itemName"), "error": str(exc)})
                artifact_summary = get_creature_artifact_status_summary(detail.get("itemStatus") or [])
                candidates.append({
                    "slotColor": clean_text(group.get("slotColor")),
                    "slot": clean_text(group.get("slot")) or "크리쳐 아티팩트",
                    "variant": clean_text(candidate.get("variant")) or "유니크",
                    "itemId": item_id,
                    "itemName": clean_item_display_name(detail.get("itemName") or candidate.get("itemName")),
                    "itemRarity": clean_text(detail.get("itemRarity") or candidate.get("itemRarity")),
                    "fame": detail.get("fame", candidate.get("fame")),
                    "iconUrl": get_item_icon_url(item_id),
                    "itemExplain": get_item_explain(detail),
                    **artifact_summary,
                    "auction": auction,
                })
        group_payload = {key: group.get(key) for key in ("groupName", "slotColor", "slot")}
        group_payload["candidates"] = sorted(
            candidates,
            key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30,
        )
        groups.append(group_payload)
    return groups


def build_material_enchant_sources(item: dict, detail: dict) -> list:
    search_name = clean_text(item.get("searchName") or item.get("itemName") or detail.get("itemName"))
    fallback_sources = [
        {
            **source,
            "role": clean_text(source.get("role") or item.get("role")) or "dealer",
            "effects": order_effects(source.get("effects") or {}),
        }
        for source in item.get("sources") or []
    ]
    card_info = detail.get("cardInfo") or {}
    slots = [
        clean_text(slot.get("slotName"))
        for slot in card_info.get("slots") or []
        if clean_text(slot.get("slotName"))
    ]
    enchant_rows = card_info.get("enchant") or []
    tier = clean_text(item.get("tier")) or clean_text(item.get("acquisition", {}).get("materialLabel")) or "재료"
    sources = []
    for enchant in enchant_rows:
        effects = order_effects(normalize_enchant_status(enchant.get("status") or []))
        if not effects:
            continue
        fallback_slot = clean_text(fallback_sources[0].get("slot")) if fallback_sources else ""
        for slot in slots or [fallback_slot]:
            if not slot:
                continue
            sources.append({
                "slot": slot,
                "tier": tier,
                "role": clean_text(item.get("role")) or "dealer",
                "effects": effects,
                "reinforceSkill": enchant.get("reinforceSkill") or [],
                "searchName": search_name,
            })
    return sources or fallback_sources


def build_enchant_sources_from_detail(card: dict, detail: dict) -> list:
    fallback_sources = [
        {
            **source,
            "role": clean_text(source.get("role") or card.get("role")) or "dealer",
            "effects": order_effects(source.get("effects") or {}),
        }
        for source in card.get("sources") or []
    ]
    card_info = detail.get("cardInfo") or {}
    slots = [
        clean_text(slot.get("slotName"))
        for slot in card_info.get("slots") or []
        if clean_text(slot.get("slotName"))
    ]
    enchant_rows = card_info.get("enchant") or []
    if not enchant_rows:
        return fallback_sources
    max_enchant = max(enchant_rows, key=lambda enchant: int(enchant.get("upgrade") or 0))
    effects = order_effects(normalize_enchant_status(max_enchant.get("status") or []))
    if not effects:
        return fallback_sources
    tier = clean_text(card.get("tier")) or clean_text((fallback_sources[0] or {}).get("tier")) or "일반"
    search_name = clean_text(card.get("searchName") or card.get("itemName") or detail.get("itemName"))
    sources = []
    for slot in slots:
        sources.append({
            "slot": slot,
            "tier": tier,
            "role": clean_text(card.get("role")) or "dealer",
            "effects": effects,
            "reinforceSkill": max_enchant.get("reinforceSkill") or [],
            "searchName": search_name,
        })
    return sources or fallback_sources


def load_creature_upgrades_with_prices(
    force_refresh: bool = False,
    allow_stale: bool = True,
    server_id: str = "",
    character_id: str = "",
) -> dict:
    if server_id and character_id:
        payload = load_creature_upgrades_with_prices(force_refresh=force_refresh, allow_stale=allow_stale)
        return {
            **payload,
            "groups": enrich_creature_groups_for_character(payload.get("groups") or [], server_id, character_id),
        }

    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_CREATURE_PRICE_CACHE, CREATURE_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _CREATURE_PRICE_CACHE["payload"]
        expires_at = _CREATURE_PRICE_CACHE["expires_at"]
        if payload is not None and payload.get("schemaVersion") != CREATURE_PRICE_CACHE_SCHEMA_VERSION:
            payload = None
            _CREATURE_PRICE_CACHE["payload"] = None
            _CREATURE_PRICE_CACHE["expires_at"] = 0

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _CREATURE_PRICE_CACHE)
        start_cache_refresh(
            _CREATURE_PRICE_CACHE,
            lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False),
            name="creature",
        )
        return add_cache_status(payload, _CREATURE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _CREATURE_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _CREATURE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _CREATURE_PRICE_CACHE,
            lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False),
            name="creature",
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _CREATURE_PRICE_CACHE, stale=True)

    with CREATURE_DB_PATH.open("r", encoding="utf-8") as fp:
        creature_db = json.load(fp)

    auction_cache = {}

    def get_cached_auction(item_id, min_fame=None):
        cache_key = (item_id, min_fame, min_fame)
        if cache_key not in auction_cache:
            auction_cache[cache_key] = get_lowest_auction_price(item_id, min_fame=min_fame, max_fame=min_fame)
        return auction_cache[cache_key]

    groups = []
    errors = []
    for group_source in resolve_creature_upgrade_sources(creature_db, search_items_by_name):
        group_payload = group_source.get("groupPayload") or {}
        candidates = []
        for candidate_source in group_source.get("candidateSources") or []:
            candidate = candidate_source.get("candidate") or {}
            matched = candidate_source.get("matched") or {}
            price_only_item_ids = set(candidate_source.get("priceOnlyItemIds") or [])
            candidate_target_fame = candidate_source.get("candidateTargetFame")
            errors.extend(candidate_source.get("errors") or [])

            detail_by_id = {
                row.get("itemId"): row
                for row in fetch_item_details(list(matched.keys()))
            }
            item_inputs = []
            for item_id, row in matched.items():
                detail = detail_by_id.get(item_id) or row
                fame = detail.get("fame", row.get("fame"))
                min_fame = candidate_target_fame if candidate_target_fame is not None and fame == candidate_target_fame else None
                item_inputs.append((item_id, min_fame, {
                    "itemId": item_id,
                    "itemName": clean_text(detail.get("itemName", row.get("itemName"))),
                    "itemRarity": clean_text(detail.get("itemRarity", row.get("itemRarity"))),
                    "fame": fame,
                    "iconUrl": get_item_icon_url(item_id),
                    "itemExplain": get_item_explain(detail),
                    "effects": normalize_enchant_status(detail.get("itemStatus") or []),
                    "itemReinforceSkill": detail.get("itemReinforceSkill") or [],
                    "itemBuff": detail.get("itemBuff") or {},
                    "levelTag": parse_title_level_tag(detail.get("itemName")),
                    "skillDamagePercent": parse_skill_damage_percent(get_item_explain(detail)),
                    "_priceOnly": item_id in price_only_item_ids,
                }))

            items = []
            with ThreadPoolExecutor(max_workers=8) as executor:
                future_by_item = {
                    executor.submit(get_cached_auction, item_id, min_fame): (item_id, item)
                    for item_id, min_fame, item in item_inputs
                }
                for future in as_completed(future_by_item):
                    item_id, item = future_by_item[future]
                    try:
                        item["auction"] = future.result()
                    except Exception as exc:
                        item["auction"] = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                        errors.append({"itemId": item_id, "itemName": item.get("itemName"), "error": str(exc)})
                    items.append(item)

            priced_items = [
                item for item in items
                if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                and item["auction"]["minUnitPrice"] > 0
            ]
            lowest_item = min(priced_items, key=lambda item: item["auction"]["minUnitPrice"], default=None)
            effect_items = [
                item for item in items
                if not item.get("_priceOnly") and item.get("effects")
            ]
            priced_effect_items = [
                item for item in effect_items
                if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                and item["auction"]["minUnitPrice"] > 0
            ]
            effect_source = min(
                priced_effect_items,
                key=lambda item: item["auction"]["minUnitPrice"],
                default=effect_items[0] if effect_items else None,
            )
            display_source = effect_source or lowest_item or {}
            public_items = [
                {key: value for key, value in item.items() if key != "_priceOnly"}
                for item in items
            ]
            candidates.append({
                "name": clean_text(candidate.get("name")),
                "variant": clean_text(candidate.get("variant")),
                "items": sorted(public_items, key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30),
                "itemId": display_source.get("itemId"),
                "itemName": display_source.get("itemName"),
                "iconUrl": display_source.get("iconUrl", ""),
                "itemExplain": display_source.get("itemExplain", ""),
                "effects": display_source.get("effects", {}),
                "itemReinforceSkill": display_source.get("itemReinforceSkill", []),
                "itemBuff": display_source.get("itemBuff", {}),
                "levelTag": display_source.get("levelTag"),
                "skillDamagePercent": display_source.get("skillDamagePercent", 0),
                "priceItem": {
                    "itemId": lowest_item.get("itemId"),
                    "itemName": lowest_item.get("itemName"),
                    "iconUrl": lowest_item.get("iconUrl"),
                } if lowest_item and lowest_item.get("itemId") != display_source.get("itemId") else None,
                "auction": lowest_item.get("auction") if lowest_item else {
                    "listingCount": 0,
                    "minUnitPrice": None,
                    "averagePrice": None,
                    "auctionNo": None,
                },
            })
        group_payload["candidates"] = candidates
        groups.append(group_payload)

    artifact_groups = load_creature_artifact_groups_with_prices(errors)
    payload = {
        "schemaVersion": CREATURE_PRICE_CACHE_SCHEMA_VERSION,
        "updatedAt": creature_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": creature_db.get("source"),
        "groups": groups,
        "artifactGroups": artifact_groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _CREATURE_PRICE_CACHE["payload"] = payload
        _CREATURE_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(CREATURE_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _CREATURE_PRICE_CACHE)


def load_aura_upgrades_with_prices(
    force_refresh: bool = False,
    allow_stale: bool = True,
    server_id: str = "",
    character_id: str = "",
) -> dict:
    if server_id and character_id:
        payload = load_aura_upgrades_with_prices(force_refresh=force_refresh, allow_stale=allow_stale)
        return {
            **payload,
            "groups": enrich_aura_groups_for_character(payload.get("groups") or [], server_id, character_id),
        }

    now = time.time()
    cached_payload = get_aura_price_cache_payload(
        force_refresh,
        allow_stale,
        AURA_PRICE_CACHE_SCHEMA_VERSION,
        load_aura_upgrades_with_prices,
    )
    if cached_payload is not None:
        return cached_payload

    with AURA_DB_PATH.open("r", encoding="utf-8") as fp:
        aura_db = json.load(fp)

    auction_cache = {}

    def get_cached_auction(item_id):
        if item_id not in auction_cache:
            auction_cache[item_id] = get_lowest_auction_price(item_id)
        return auction_cache[item_id]

    groups, errors = build_aura_upgrade_groups(aura_db, get_cached_auction)

    payload = {
        "schemaVersion": AURA_PRICE_CACHE_SCHEMA_VERSION,
        "updatedAt": aura_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": aura_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    return save_aura_price_cache_payload(payload, now)


def load_title_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_TITLE_PRICE_CACHE, TITLE_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _TITLE_PRICE_CACHE["payload"]
        expires_at = _TITLE_PRICE_CACHE["expires_at"]
        if payload is not None and payload.get("schemaVersion") != TITLE_PRICE_CACHE_SCHEMA_VERSION:
            payload = None
            _TITLE_PRICE_CACHE["payload"] = None
            _TITLE_PRICE_CACHE["expires_at"] = 0

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _TITLE_PRICE_CACHE)
        start_cache_refresh(
            _TITLE_PRICE_CACHE,
            lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False),
            name="title",
        )
        return add_cache_status(payload, _TITLE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _TITLE_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _TITLE_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _TITLE_PRICE_CACHE,
            lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False),
            name="title",
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _TITLE_PRICE_CACHE, stale=True)

    with TITLE_DB_PATH.open("r", encoding="utf-8") as fp:
        title_db = json.load(fp)

    groups = []
    errors = []
    auction_cache = {}

    def get_cached_auction(item_id):
        if item_id not in auction_cache:
            auction_cache[item_id] = get_lowest_auction_price(item_id)
        return auction_cache[item_id]

    title_bead_options = load_title_bead_options(get_cached_auction, errors)
    title_groups = build_title_upgrade_groups(title_db)
    for title_group in title_groups:
        resolved_sources = resolve_title_group_sources(title_group, fetch_item_details, search_items_by_name)
        keyword = resolved_sources.get("keyword")
        if not keyword:
            continue
        title_details = resolved_sources.get("titleDetails") or []
        box_details = resolved_sources.get("boxDetails") or []
        errors.extend(resolved_sources.get("errors") or [])

        box_prices = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(get_cached_auction, box.get("itemId")): box
                for box in box_details
            }
            for future in as_completed(futures):
                box = futures[future]
                item = {
                    "itemId": box.get("itemId"),
                    "itemName": clean_text(box.get("itemName")),
                    "iconUrl": get_item_icon_url(box.get("itemId")),
                    "itemExplain": get_item_explain(box),
                }
                try:
                    item["auction"] = future.result()
                except Exception as exc:
                    item["auction"] = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                    errors.append({"itemId": item.get("itemId"), "itemName": item.get("itemName"), "error": str(exc)})
                box_prices.append(item)

        candidates = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(get_cached_auction, detail.get("itemId")): detail
                for detail in title_details
            }
            for future in as_completed(futures):
                detail = futures[future]
                item_id = detail.get("itemId")
                try:
                    auction = future.result()
                except Exception as exc:
                    auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                    errors.append({"itemId": item_id, "itemName": detail.get("itemName"), "error": str(exc)})

                variant = get_title_variant(detail.get("itemName"))
                applicable_boxes = [
                    box for box in box_prices
                    if variant == get_title_variant(box.get("itemName"))
                    or (variant == "플래티넘" and "플래티넘" in box.get("itemName", ""))
                    or (variant == "플래티넘" and "액티브 스킬 공격력" in box.get("itemExplain", ""))
                    or (
                        variant == "일반"
                        and "플래티넘" not in box.get("itemName", "")
                        and "액티브 스킬 공격력" not in box.get("itemExplain", "")
                    )
                ]
                try:
                    auction_rows = get_auction_rows(item_id, limit=100)
                except Exception as exc:
                    auction_rows = []
                    errors.append({"itemId": item_id, "itemName": detail.get("itemName"), "error": str(exc)})
                clean_auction = lowest_auction_from_rows([
                    row for row in auction_rows
                    if not ((row.get("enchant") or {}).get("status") or [])
                ])
                has_direct_clean_price = isinstance(clean_auction.get("minUnitPrice"), (int, float)) and clean_auction.get("minUnitPrice") > 0
                direct_clean_price = clean_auction if has_direct_clean_price else auction
                direct_price_option = {
                    "auction": direct_clean_price,
                    "itemId": item_id,
                    "itemName": clean_text(detail.get("itemName")),
                    "iconUrl": get_item_icon_url(item_id),
                }
                clean_price_options = ([direct_price_option] if has_direct_clean_price else []) + applicable_boxes
                price_options = clean_price_options or [direct_price_option]
                priced_options = [
                    item for item in price_options
                    if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                    and item["auction"]["minUnitPrice"] > 0
                ]
                price_item = min(priced_options, key=lambda item: item["auction"]["minUnitPrice"], default=None)
                title_payload = build_title_payload(
                    item_id,
                    detail,
                    auction=(price_item or {}).get("auction", auction),
                    price_item={
                        "itemId": (price_item or {}).get("itemId"),
                        "itemName": (price_item or {}).get("itemName"),
                        "iconUrl": (price_item or {}).get("iconUrl"),
                    } if price_item and price_item.get("itemId") != item_id else None,
                )
                candidates.append({
                    **title_payload,
                    "name": clean_text(detail.get("itemName")),
                    "variant": variant,
                    "purchaseRoute": "cleanTitle",
                    "purchaseRouteLabel": "무보주 칭호",
                })
                clean_price_item = min(priced_options, key=lambda item: item["auction"]["minUnitPrice"], default=None)
                if clean_price_item:
                    for bead in title_bead_options:
                        total_auction = add_auction_prices(clean_price_item.get("auction"), bead.get("auction"))
                        if not isinstance(total_auction.get("minUnitPrice"), (int, float)) or total_auction.get("minUnitPrice") <= 0:
                            continue
                        bead_effects = bead.get("effects") or {}
                        candidates.append({
                            **title_payload,
                            "effects": combine_effects(title_payload.get("effects") or {}, bead_effects),
                            "enchantEffects": bead_effects,
                            "titleEnchantElement": bead.get("element") or "",
                            "auction": total_auction,
                            "priceItem": {
                                "itemId": bead.get("itemId"),
                                "itemName": f"{clean_price_item.get('itemName')} + {bead.get('itemName')}",
                                "iconUrl": bead.get("iconUrl"),
                            },
                            "titleBead": bead,
                            "name": clean_text(detail.get("itemName")),
                            "variant": variant,
                            "purchaseRoute": "cleanTitlePlusBead",
                            "purchaseRouteLabel": "무보주 칭호 + 칭호 보주",
                        })
                seen_title_enchants = set()
                for row in auction_rows:
                    if not isinstance(row.get("unitPrice"), (int, float)) or row.get("unitPrice") <= 0:
                        continue
                    enchant_summary = get_title_enchant_status_summary((row.get("enchant") or {}).get("status") or [])
                    enchant_effects = enchant_summary.get("effects") or {}
                    if not enchant_effects:
                        continue
                    if float(enchant_effects.get("elementAll") or 0) < 6:
                        continue
                    signature = json.dumps(enchant_effects, ensure_ascii=False, sort_keys=True)
                    if signature in seen_title_enchants:
                        continue
                    seen_title_enchants.add(signature)
                    candidates.append({
                        **title_payload,
                        "fame": row.get("fame", title_payload.get("fame")),
                        "effects": combine_effects(title_payload.get("effects") or {}, enchant_effects),
                        "enchantEffects": enchant_effects,
                        "titleEnchantElement": enchant_summary.get("element") or "",
                        "auction": auction_row_to_price(row),
                        "priceItem": None,
                        "name": clean_text(detail.get("itemName")),
                        "variant": variant,
                        "purchaseRoute": "attachedBead",
                        "purchaseRouteLabel": "보주 발린 칭호",
                    })

        candidates.sort(key=lambda item: (
            item.get("levelTag") or 0,
            1 if item.get("variant") == "플래티넘" else 0,
            item.get("auction", {}).get("minUnitPrice") or 10**30,
        ))
        groups.append({
            "groupName": clean_text(title_group.get("groupName")) or keyword,
            "searchName": keyword,
            "itemType": clean_text(title_group.get("itemType")) or "칭호",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })

    payload = {
        "schemaVersion": TITLE_PRICE_CACHE_SCHEMA_VERSION,
        "updatedAt": title_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": title_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _TITLE_PRICE_CACHE["payload"] = payload
        _TITLE_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(TITLE_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _TITLE_PRICE_CACHE)


def load_enchant_cards_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_ENCHANT_PRICE_CACHE, ENCHANT_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _ENCHANT_PRICE_CACHE["payload"]
        expires_at = _ENCHANT_PRICE_CACHE["expires_at"]
        if payload is not None and payload.get("schemaVersion") != ENCHANT_PRICE_CACHE_SCHEMA_VERSION:
            payload = None
            _ENCHANT_PRICE_CACHE["payload"] = None
            _ENCHANT_PRICE_CACHE["expires_at"] = 0

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _ENCHANT_PRICE_CACHE)
        start_cache_refresh(
            _ENCHANT_PRICE_CACHE,
            lambda: load_enchant_cards_with_prices(force_refresh=True, allow_stale=False),
            name="enchant",
        )
        return add_cache_status(payload, _ENCHANT_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _ENCHANT_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "cards": [],
            "errors": [],
        }, _ENCHANT_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _ENCHANT_PRICE_CACHE,
            lambda: load_enchant_cards_with_prices(force_refresh=True, allow_stale=False),
            name="enchant",
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "cards": [],
            "errors": [],
        }, _ENCHANT_PRICE_CACHE, stale=True)

    with ENCHANT_DB_PATH.open("r", encoding="utf-8") as fp:
        card_db = json.load(fp)

    cards = []
    errors = []
    card_rows = [
        {**card, "role": clean_text(card.get("role")) or "dealer"}
        for card in card_db.get("cards") or []
    ] + [
        {**card, "role": clean_text(card.get("role")) or "buffer"}
        for card in card_db.get("bufferCards") or []
    ]
    for card in card_rows:
        card_with_price = dict(card)
        search_name = clean_text(card.get("searchName") or card.get("itemName") or (card.get("sources") or [{}])[0].get("searchName"))
        resolved_card = {"itemId": card.get("itemId")} if card.get("itemId") else resolve_exact_item_by_name(search_name, "")
        detail = {}
        if resolved_card.get("itemId"):
            detail_rows = fetch_item_details([resolved_card.get("itemId")])
            detail = detail_rows[0] if detail_rows else {}
        else:
            errors.append({"itemName": search_name, "error": "마법부여 카드 itemId를 찾지 못했습니다."})
        if detail:
            item_id = detail.get("itemId")
            card_with_price.update({
                "itemId": item_id,
                "itemName": clean_item_display_name(detail.get("itemName", card.get("itemName"))),
                "itemRarity": clean_text(detail.get("itemRarity", card.get("itemRarity"))),
                "itemType": clean_text(detail.get("itemType", card.get("itemType"))),
                "itemTypeDetail": clean_text(detail.get("itemTypeDetail", card.get("itemTypeDetail"))),
                "itemAvailableLevel": detail.get("itemAvailableLevel", card.get("itemAvailableLevel")),
                "fame": detail.get("fame", card.get("fame")),
                "iconUrl": get_item_icon_url(item_id),
            })
            if card.get("displayName"):
                card_with_price["displayName"] = clean_item_display_name(card.get("displayName"))
            card_with_price["sources"] = build_enchant_sources_from_detail(card, detail)
        else:
            card_with_price["iconUrl"] = get_item_icon_url(card.get("itemId"))
            card_with_price["sources"] = [
                {**source, "effects": order_effects(source.get("effects") or {})}
                for source in card.get("sources") or []
            ]
        cards.append(card_with_price)

    material_enchant_rows = [
        {**item, "role": clean_text(item.get("role")) or "dealer"}
        for item in card_db.get("materialEnchantItems") or []
    ] + [
        {**item, "role": clean_text(item.get("role")) or "buffer"}
        for item in card_db.get("bufferMaterialEnchantItems") or []
    ]
    for item in material_enchant_rows:
        item_with_source = dict(item)
        search_name = clean_text(item.get("searchName") or item.get("itemName"))
        resolved_item = {"itemId": item.get("itemId")} if item.get("itemId") else resolve_exact_item_by_name(search_name, "보주")
        detail = {}
        if resolved_item:
            item_with_source.update(resolved_item)
            detail_rows = fetch_item_details([resolved_item.get("itemId")])
            detail = detail_rows[0] if detail_rows else {}
            if detail:
                item_with_source.update({
                    "itemName": clean_item_display_name(detail.get("itemName", item_with_source.get("itemName"))),
                    "itemRarity": clean_text(detail.get("itemRarity", item_with_source.get("itemRarity"))),
                    "itemType": clean_text(detail.get("itemType", item_with_source.get("itemType"))),
                    "itemTypeDetail": clean_text(detail.get("itemTypeDetail", item_with_source.get("itemTypeDetail"))),
                    "itemAvailableLevel": detail.get("itemAvailableLevel", item_with_source.get("itemAvailableLevel")),
                    "fame": detail.get("fame", item_with_source.get("fame")),
                })
                if item.get("displayName"):
                    item_with_source["displayName"] = clean_item_display_name(item.get("displayName"))
        else:
            errors.append({"itemName": search_name, "error": "재료 구매 보주 itemId를 찾지 못했습니다."})
            item_with_source["itemName"] = search_name
            item_with_source["iconUrl"] = ""
        acquisition = dict(item.get("acquisition") or {})
        material_search_name = clean_text(acquisition.get("materialSearchName") or acquisition.get("materialItemName"))
        if acquisition.get("materialItemId"):
            if not acquisition.get("materialIconUrl"):
                acquisition["materialIconUrl"] = get_item_icon_url(acquisition.get("materialItemId"))
        elif material_search_name:
            resolved_material = resolve_exact_item_by_name(material_search_name, "재료")
            if resolved_material:
                acquisition["materialItemId"] = resolved_material.get("itemId")
                acquisition["materialItemName"] = resolved_material.get("itemName")
                acquisition["materialIconUrl"] = resolved_material.get("iconUrl")
            else:
                errors.append({"itemName": material_search_name, "error": "재료 itemId를 찾지 못했습니다."})
        item_with_source["acquisition"] = acquisition
        item_with_source["sources"] = build_material_enchant_sources(item, detail)
        item_with_source["auction"] = {
            "listingCount": 0,
            "minUnitPrice": None,
            "averagePrice": None,
            "auctionNo": None,
        }
        item_with_source["priceOptions"] = []
        cards.append(item_with_source)

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_by_option = {}
        for card in cards:
            if card.get("acquisition"):
                continue
            price_options = [{
                "itemId": card.get("itemId"),
                "itemName": card.get("itemName"),
                "iconUrl": card.get("iconUrl"),
                "kind": "카드",
            }]
            bead_item = find_enchant_bead_item(card)
            if bead_item and bead_item.get("itemId") != card.get("itemId"):
                price_options.append({**bead_item, "kind": "보주"})
            card["priceOptions"] = price_options
            for option in price_options:
                future_by_option[executor.submit(get_lowest_auction_price, option["itemId"])] = (card, option)

        for future in as_completed(future_by_option):
            card, option = future_by_option[future]
            try:
                option["auction"] = future.result()
            except Exception as exc:
                option["auction"] = {
                    "listingCount": 0,
                    "minUnitPrice": None,
                    "averagePrice": None,
                    "auctionNo": None,
                }
                errors.append({"itemId": option.get("itemId"), "itemName": option.get("itemName"), "error": str(exc)})

    for card in cards:
        priced_options = [
            option for option in card.get("priceOptions") or []
            if isinstance(option.get("auction", {}).get("minUnitPrice"), (int, float))
            and option["auction"]["minUnitPrice"] > 0
        ]
        price_item = min(priced_options, key=lambda option: option["auction"]["minUnitPrice"], default=None)
        card["auction"] = (price_item or {}).get("auction") or {
            "listingCount": 0,
            "minUnitPrice": None,
            "averagePrice": None,
            "auctionNo": None,
        }
        card["priceItem"] = {
            "itemId": price_item.get("itemId"),
            "itemName": price_item.get("itemName"),
            "iconUrl": price_item.get("iconUrl"),
            "kind": price_item.get("kind"),
        } if price_item and price_item.get("itemId") != card.get("itemId") else None

    payload = {
        "schemaVersion": ENCHANT_PRICE_CACHE_SCHEMA_VERSION,
        "updatedAt": card_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": card_db.get("source"),
        "cards": cards,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _ENCHANT_PRICE_CACHE["payload"] = payload
        _ENCHANT_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(ENCHANT_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _ENCHANT_PRICE_CACHE)
