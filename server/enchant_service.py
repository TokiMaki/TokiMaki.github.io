import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from .data_store import AURA_DB_PATH, CREATURE_DB_PATH, ENCHANT_DB_PATH, TITLE_DB_PATH
from .effects import normalize_enchant_status, order_effects
from .neople_client import (
    clean_item_display_name,
    clean_text,
    fetch_item_details,
    get_item_explain,
    get_item_icon_url,
    get_lowest_auction_price,
    resolve_exact_item_by_name,
    search_items_by_name,
)
from .price_cache import (
    AURA_PRICE_CACHE_PATH,
    CREATURE_PRICE_CACHE_PATH,
    ENCHANT_PRICE_CACHE_PATH,
    ENCHANT_PRICE_CACHE_SCHEMA_VERSION,
    PRICE_REFRESH_INTERVAL_SECONDS,
    TITLE_PRICE_CACHE_PATH,
    _AURA_PRICE_CACHE,
    _CACHE_LOCK,
    _CREATURE_PRICE_CACHE,
    _ENCHANT_PRICE_CACHE,
    _TITLE_PRICE_CACHE,
    add_cache_status,
    load_price_cache_from_disk,
    save_price_cache_to_disk,
    start_cache_refresh,
)
from .upgrade_payloads import (
    aura_item_matches,
    build_aura_payload,
    build_title_payload,
    creature_item_matches,
    get_title_variant,
    title_item_matches,
)


def get_enchant_bead_search_names(card: dict) -> list:
    names = []
    source_names = [source.get("searchName") for source in card.get("sources") or []]
    for name in [card.get("itemName"), card.get("searchName"), *source_names]:
        clean_name = clean_text(name)
        if clean_name.endswith("카드"):
            names.append(clean_name[:-2].strip() + " 보주")
    return list(dict.fromkeys(names))


def find_enchant_bead_item(card: dict):
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


def build_material_enchant_sources(item: dict, detail: dict) -> list:
    search_name = clean_text(item.get("searchName") or item.get("itemName") or detail.get("itemName"))
    fallback_sources = [
        {**source, "effects": order_effects(source.get("effects") or {})}
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
                "effects": effects,
                "searchName": search_name,
            })
    return sources or fallback_sources


def build_enchant_sources_from_detail(card: dict, detail: dict) -> list:
    fallback_sources = [
        {**source, "effects": order_effects(source.get("effects") or {})}
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
            "effects": effects,
            "searchName": search_name,
        })
    return sources or fallback_sources


def load_creature_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_CREATURE_PRICE_CACHE, CREATURE_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _CREATURE_PRICE_CACHE["payload"]
        expires_at = _CREATURE_PRICE_CACHE["expires_at"]

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _CREATURE_PRICE_CACHE)
        start_cache_refresh(
            _CREATURE_PRICE_CACHE,
            lambda: load_creature_upgrades_with_prices(force_refresh=True, allow_stale=False),
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
    for group in creature_db.get("groups") or []:
        target_fame = group.get("targetFame")
        group_payload = {key: group.get(key) for key in ("groupName", "searchName", "itemType", "targetFame")}
        candidates = []
        for candidate in group.get("candidates") or []:
            matched = {}
            candidate_target_fame = candidate.get("targetFame", target_fame)
            for search_name in candidate.get("searchNames") or [candidate.get("name")]:
                try:
                    for row in search_items_by_name(clean_text(search_name)):
                        if creature_item_matches(row, candidate, candidate_target_fame):
                            matched[row["itemId"]] = row
                except Exception as exc:
                    errors.append({"name": candidate.get("name"), "searchName": search_name, "error": str(exc)})

            detail_by_id = {
                row.get("itemId"): row
                for row in fetch_item_details(list(matched.keys()))
            }
            item_inputs = []
            for item_id, row in matched.items():
                detail = detail_by_id.get(item_id) or row
                fame = detail.get("fame", row.get("fame"))
                min_fame = candidate_target_fame if fame == candidate_target_fame else None
                item_inputs.append((item_id, min_fame, {
                    "itemId": item_id,
                    "itemName": clean_text(detail.get("itemName", row.get("itemName"))),
                    "itemRarity": clean_text(detail.get("itemRarity", row.get("itemRarity"))),
                    "fame": fame,
                    "iconUrl": get_item_icon_url(item_id),
                    "itemExplain": get_item_explain(detail),
                    "effects": normalize_enchant_status(detail.get("itemStatus") or []),
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
            effect_source = next((item for item in items if item.get("effects")), None)
            candidates.append({
                "name": clean_text(candidate.get("name")),
                "variant": clean_text(candidate.get("variant")),
                "targetFame": candidate_target_fame,
                "items": sorted(items, key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30),
                "itemId": lowest_item.get("itemId") if lowest_item else None,
                "itemName": lowest_item.get("itemName") if lowest_item else None,
                "iconUrl": lowest_item.get("iconUrl") if lowest_item else (effect_source or {}).get("iconUrl", ""),
                "itemExplain": (effect_source or {}).get("itemExplain", ""),
                "effects": (effect_source or {}).get("effects", {}),
                "auction": lowest_item.get("auction") if lowest_item else {
                    "listingCount": 0,
                    "minUnitPrice": None,
                    "averagePrice": None,
                    "auctionNo": None,
                },
            })
        group_payload["candidates"] = candidates
        groups.append(group_payload)

    payload = {
        "updatedAt": creature_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": creature_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _CREATURE_PRICE_CACHE["payload"] = payload
        _CREATURE_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(CREATURE_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _CREATURE_PRICE_CACHE)


def load_aura_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _AURA_PRICE_CACHE["payload"]
        expires_at = _AURA_PRICE_CACHE["expires_at"]

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _AURA_PRICE_CACHE)
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: load_aura_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status(payload, _AURA_PRICE_CACHE, stale=True)
    if allow_stale and payload is None and _AURA_PRICE_CACHE.get("refreshing"):
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)
    if allow_stale and payload is None:
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: load_aura_upgrades_with_prices(force_refresh=True, allow_stale=False),
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)

    with AURA_DB_PATH.open("r", encoding="utf-8") as fp:
        aura_db = json.load(fp)

    groups = []
    errors = []
    auction_cache = {}

    def get_cached_auction(item_id):
        if item_id not in auction_cache:
            auction_cache[item_id] = get_lowest_auction_price(item_id)
        return auction_cache[item_id]

    for keyword in aura_db.get("keywords") or []:
        keyword = clean_text(keyword)
        matched = {}
        try:
            for row in search_items_by_name(keyword):
                if aura_item_matches(row, keyword):
                    matched[row["itemId"]] = row
        except Exception as exc:
            errors.append({"keyword": keyword, "error": str(exc)})

        details = fetch_item_details(list(matched.keys()))
        aura_details = [
            detail for detail in details
            if keyword in clean_text(detail.get("itemName"))
            and "상자" not in clean_text(detail.get("itemName"))
        ]
        box_details = [
            detail for detail in details
            if "상자" in clean_text(detail.get("itemName"))
        ]

        price_items = []
        for detail in [*aura_details, *box_details]:
            item_id = detail.get("itemId")
            item = {
                "itemId": item_id,
                "itemName": clean_text(detail.get("itemName")),
                "iconUrl": get_item_icon_url(item_id),
                "itemExplain": get_item_explain(detail),
            }
            try:
                item["auction"] = get_cached_auction(item_id)
            except Exception as exc:
                item["auction"] = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                errors.append({"itemId": item_id, "itemName": item.get("itemName"), "error": str(exc)})
            price_items.append(item)

        candidates = []
        for detail in aura_details:
            item_id = detail.get("itemId")
            direct_price = next((item for item in price_items if item.get("itemId") == item_id), None)
            price_options = [
                item for item in price_items
                if item.get("itemId") == item_id or "상자" in clean_text(item.get("itemName"))
            ]
            priced_options = [
                item for item in price_options
                if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                and item["auction"]["minUnitPrice"] > 0
            ]
            price_item = min(priced_options, key=lambda item: item["auction"]["minUnitPrice"], default=None)
            candidates.append({
                **build_aura_payload(
                    item_id,
                    detail,
                    auction=(price_item or direct_price or {}).get("auction", {}),
                    price_item={
                        "itemId": (price_item or {}).get("itemId"),
                        "itemName": (price_item or {}).get("itemName"),
                        "iconUrl": (price_item or {}).get("iconUrl"),
                    } if price_item and price_item.get("itemId") != item_id else None,
                ),
                "name": clean_text(detail.get("itemName")),
                "variant": "일반",
            })

        candidates.sort(key=lambda item: item.get("auction", {}).get("minUnitPrice") or 10**30)
        groups.append({
            "groupName": keyword,
            "searchName": keyword,
            "itemType": "오라",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })

    payload = {
        "updatedAt": aura_db.get("updatedAt"),
        "pricedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
        "source": aura_db.get("source"),
        "groups": groups,
        "errors": errors,
    }
    expires_at = now + PRICE_REFRESH_INTERVAL_SECONDS
    with _CACHE_LOCK:
        _AURA_PRICE_CACHE["payload"] = payload
        _AURA_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(AURA_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _AURA_PRICE_CACHE)


def load_title_upgrades_with_prices(force_refresh: bool = False, allow_stale: bool = True) -> dict:
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_TITLE_PRICE_CACHE, TITLE_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _TITLE_PRICE_CACHE["payload"]
        expires_at = _TITLE_PRICE_CACHE["expires_at"]

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _TITLE_PRICE_CACHE)
        start_cache_refresh(
            _TITLE_PRICE_CACHE,
            lambda: load_title_upgrades_with_prices(force_refresh=True, allow_stale=False),
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

    for keyword in title_db.get("keywords") or []:
        keyword = clean_text(keyword)
        matched = {}
        try:
            for row in search_items_by_name(keyword):
                if title_item_matches(row, keyword):
                    matched[row["itemId"]] = row
        except Exception as exc:
            errors.append({"keyword": keyword, "error": str(exc)})

        details = fetch_item_details(list(matched.keys()))
        title_details = [
            detail for detail in details
            if detail.get("itemTypeDetail") == "칭호" and keyword in clean_text(detail.get("itemName"))
        ]
        box_details = [
            detail for detail in details
            if "칭호 선택 상자" in clean_text(detail.get("itemName"))
        ]

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
                price_options = [{
                    "auction": auction,
                    "itemId": item_id,
                    "itemName": clean_text(detail.get("itemName")),
                    "iconUrl": get_item_icon_url(item_id),
                }]
                price_options.extend(applicable_boxes)
                priced_options = [
                    item for item in price_options
                    if isinstance(item.get("auction", {}).get("minUnitPrice"), (int, float))
                    and item["auction"]["minUnitPrice"] > 0
                ]
                price_item = min(priced_options, key=lambda item: item["auction"]["minUnitPrice"], default=None)
                candidates.append({
                    **build_title_payload(
                        item_id,
                        detail,
                        auction=(price_item or {}).get("auction", auction),
                        price_item={
                            "itemId": (price_item or {}).get("itemId"),
                            "itemName": (price_item or {}).get("itemName"),
                            "iconUrl": (price_item or {}).get("iconUrl"),
                        } if price_item and price_item.get("itemId") != item_id else None,
                    ),
                    "name": clean_text(detail.get("itemName")),
                    "variant": variant,
                })

        candidates.sort(key=lambda item: (
            item.get("levelTag") or 0,
            1 if item.get("variant") == "플래티넘" else 0,
            item.get("auction", {}).get("minUnitPrice") or 10**30,
        ))
        groups.append({
            "groupName": keyword,
            "searchName": keyword,
            "itemType": "칭호",
            "candidates": candidates,
            "unresolved": not bool(candidates),
        })

    payload = {
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
    for card in card_db.get("cards") or []:
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

    for item in card_db.get("materialEnchantItems") or []:
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
        if material_search_name:
            resolved_material = resolve_exact_item_by_name(material_search_name, "재료")
            if resolved_material:
                acquisition["materialItemId"] = resolved_material.get("itemId")
                acquisition["materialItemName"] = resolved_material.get("itemName")
                acquisition["materialIconUrl"] = resolved_material.get("iconUrl")
            else:
                errors.append({"itemName": material_search_name, "error": "재료 itemId를 찾지 못했습니다."})
        elif acquisition.get("materialItemId") and not acquisition.get("materialIconUrl"):
            acquisition["materialIconUrl"] = get_item_icon_url(acquisition.get("materialItemId"))
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


