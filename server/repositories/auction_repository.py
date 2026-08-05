import time

from ..neople_client import (
    clean_item_display_name,
    clean_text,
    get_auction_rows_by_item_ids_from_api,
    get_auction_rows_by_name_from_api,
    get_auction_rows_from_api,
    get_item_icon_url,
)
from ..price_cache import (
    AURA_PRICE_CACHE_PATH,
    _AURA_PRICE_CACHE,
    _CACHE_LOCK,
    add_cache_status,
    get_price_cache_ttl_seconds,
    load_price_cache_from_disk,
    merge_last_known_auction_prices,
    save_price_cache_to_disk,
    start_cache_refresh,
)
from .auction_last_known_repository import (
    get_last_known_auction_item,
    get_last_known_auction_item_by_name,
    remember_last_known_auction_item,
)
from .resolved_price_repository import (
    get_cached_resolved_price,
    get_fresh_cached_resolved_price,
    remember_cached_resolved_price,
    seed_last_known_resolved_price,
)

AUCTION_PRICE_STATUS_PRICED = "priced"
AUCTION_PRICE_STATUS_UNLISTED = "unlisted"
AUCTION_PRICE_STATUS_UNAVAILABLE = "unavailable"
AUCTION_ITEM_RESOLVED_PRICE_CACHE_VERSION = 1
AUCTION_EXACT_NAME_RESOLVED_PRICE_CACHE_VERSION = 1


def build_unlisted_auction_price() -> dict:
    return {
        "priceStatus": AUCTION_PRICE_STATUS_UNLISTED,
        "listingCount": 0,
        "minUnitPrice": None,
        "averagePrice": None,
        "auctionNo": None,
    }


def build_unavailable_auction_price() -> dict:
    return {
        "priceStatus": AUCTION_PRICE_STATUS_UNAVAILABLE,
        "listingCount": 0,
        "minUnitPrice": None,
        "averagePrice": None,
        "auctionNo": None,
    }


def get_auction_rows(item_id: str, min_fame=None, max_fame=None, limit: int = 100, offset: int = 0) -> list:
    return get_auction_rows_from_api(item_id, min_fame=min_fame, max_fame=max_fame, limit=limit, offset=offset)


def get_auction_rows_by_name(item_name: str, word_type: str = "full", limit: int = 100, offset: int = 0) -> list:
    return get_auction_rows_by_name_from_api(item_name, word_type=word_type, limit=limit, offset=offset)


def get_auction_rows_by_item_ids(item_ids: list[str], limit: int = 100, offset: int = 0) -> list:
    return get_auction_rows_by_item_ids_from_api(item_ids, limit=limit, offset=offset)


def _auction_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _lowest_auction_price_from_rows(rows: list, require_max_upgrade: bool = False) -> dict:
    priced_rows = [
        row for row in rows
        if isinstance(row.get("unitPrice"), (int, float)) and row.get("unitPrice") > 0
    ]
    if require_max_upgrade:
        candidate_rows = [
            row for row in priced_rows
            if _auction_int(row.get("upgradeMax")) > 0
            and _auction_int(row.get("upgrade")) == _auction_int(row.get("upgradeMax"))
        ]
    else:
        completed_rows = [
            row for row in priced_rows
            if _auction_int(row.get("upgrade")) == _auction_int(row.get("upgradeMax"))
        ]
        if completed_rows:
            candidate_rows = completed_rows
        else:
            max_upgrade = max((_auction_int(row.get("upgrade")) for row in priced_rows), default=0)
            candidate_rows = [
                row for row in priced_rows
                if _auction_int(row.get("upgrade")) == max_upgrade
            ]

    lowest = min(candidate_rows, key=lambda row: row.get("unitPrice"), default=None)
    return {
        "priceStatus": AUCTION_PRICE_STATUS_PRICED if lowest else AUCTION_PRICE_STATUS_UNLISTED,
        "listingCount": sum(int(row.get("regCount") or 0) for row in candidate_rows),
        "minUnitPrice": lowest.get("unitPrice") if lowest else None,
        "averagePrice": lowest.get("averagePrice") if lowest and lowest.get("averagePrice", 0) > 0 else None,
        "auctionNo": lowest.get("auctionNo") if lowest else None,
        "upgrade": lowest.get("upgrade") if lowest else None,
        "upgradeMax": lowest.get("upgradeMax") if lowest else None,
        "isMaxUpgrade": bool(lowest) and _auction_int(lowest.get("upgrade")) == _auction_int(lowest.get("upgradeMax")),
    }


def _is_priced_auction(auction: dict) -> bool:
    status = clean_text((auction or {}).get("priceStatus"))
    return (
        status not in {AUCTION_PRICE_STATUS_UNLISTED, AUCTION_PRICE_STATUS_UNAVAILABLE}
        and isinstance((auction or {}).get("minUnitPrice"), (int, float))
        and (auction or {}).get("minUnitPrice") > 0
    )


def _get_auction_item_cache_key(
    item_id: str,
    min_fame=None,
    max_fame=None,
    require_max_upgrade: bool = False,
) -> tuple:
    return (
        "auction_item",
        AUCTION_ITEM_RESOLVED_PRICE_CACHE_VERSION,
        clean_text(item_id),
        int(min_fame) if min_fame is not None else None,
        int(max_fame) if max_fame is not None else None,
        bool(require_max_upgrade),
    )


def _seed_persisted_item_price(cache_key: tuple, item_id: str):
    persisted = get_last_known_auction_item(item_id)
    auction = persisted.get("auction") or {}
    if _is_priced_auction(auction):
        seed_last_known_resolved_price(
            cache_key,
            auction,
            updated_at_ms=persisted.get("updatedAtMs"),
        )


def _get_exact_name_cache_key(
    item_name: str,
    item_type_detail: str = "",
    word_type: str = "match",
) -> tuple:
    return (
        "auction_exact_name",
        AUCTION_EXACT_NAME_RESOLVED_PRICE_CACHE_VERSION,
        clean_item_display_name(item_name),
        clean_text(item_type_detail),
        clean_text(word_type) or "match",
    )


def _seed_persisted_name_price(
    cache_key: tuple,
    item_name: str,
    item_type_detail: str = "",
):
    persisted = get_last_known_auction_item_by_name(item_name, item_type_detail)
    if _is_priced_auction(persisted.get("auction") or {}):
        seed_last_known_resolved_price(
            cache_key,
            persisted,
            updated_at_ms=persisted.get("updatedAtMs"),
        )


def get_lowest_auction_price(item_id: str, min_fame=None, max_fame=None, require_max_upgrade: bool = False) -> dict:
    item_id = clean_text(item_id)
    if not item_id:
        return build_unavailable_auction_price()
    cache_key = _get_auction_item_cache_key(
        item_id,
        min_fame=min_fame,
        max_fame=max_fame,
        require_max_upgrade=require_max_upgrade,
    )
    can_use_generic_last_known = (
        min_fame is None
        and max_fame is None
        and not require_max_upgrade
    )
    if can_use_generic_last_known:
        _seed_persisted_item_price(cache_key, item_id)
    result = get_cached_resolved_price(
        cache_key,
        lambda: _lowest_auction_price_from_rows(
            get_auction_rows_from_api(
                item_id,
                min_fame=min_fame,
                max_fame=max_fame,
                limit=100,
                offset=0,
            ),
            require_max_upgrade=require_max_upgrade,
        ),
        should_cache=_is_priced_auction,
    )
    if (
        can_use_generic_last_known
        and _is_priced_auction(result)
        and not result.get("isLastKnownPrice")
    ):
        remember_last_known_auction_item({
            "itemId": item_id,
            "auction": result,
        })
    return result


def get_lowest_auction_prices(
    item_ids: list[str],
    fame_by_item_id: dict[str, int] | None = None,
    limit: int = 100,
) -> dict[str, dict]:
    unique_ids = []
    seen = set()
    for item_id in item_ids:
        item_id = clean_text(item_id)
        if item_id and item_id not in seen:
            unique_ids.append(item_id)
            seen.add(item_id)
    if not unique_ids:
        return {}

    prices = {}
    missing_ids = []
    cache_keys = {}
    for item_id in unique_ids:
        target_fame = (fame_by_item_id or {}).get(item_id)
        cache_key = _get_auction_item_cache_key(
            item_id,
            min_fame=target_fame,
            max_fame=target_fame,
        )
        cache_keys[item_id] = cache_key
        if target_fame is None:
            _seed_persisted_item_price(cache_key, item_id)
        cached = get_fresh_cached_resolved_price(cache_key)
        if cached is None:
            missing_ids.append(item_id)
        else:
            prices[item_id] = cached

    rows_by_id = {item_id: [] for item_id in missing_ids}
    failed_ids = set()
    for index in range(0, len(missing_ids), 10):
        chunk = missing_ids[index:index + 10]
        try:
            rows = get_auction_rows_by_item_ids_from_api(chunk, limit=limit)
        except Exception:
            failed_ids.update(chunk)
            continue
        for row in rows:
            item_id = clean_text(row.get("itemId"))
            if item_id in rows_by_id:
                rows_by_id[item_id].append(row)

    for item_id in missing_ids:
        target_fame = (fame_by_item_id or {}).get(item_id)
        rows = rows_by_id.get(item_id) or []
        if target_fame is not None:
            rows = [
                row for row in rows
                if int(row.get("fame") or 0) == int(target_fame)
            ]
        lookup = (
            build_unavailable_auction_price()
            if item_id in failed_ids
            else _lowest_auction_price_from_rows(rows)
        )
        result = get_cached_resolved_price(
            cache_keys[item_id],
            lambda lookup=lookup: lookup,
            should_cache=_is_priced_auction,
        )
        prices[item_id] = result
        if (
            target_fame is None
            and _is_priced_auction(result)
            and not result.get("isLastKnownPrice")
        ):
            remember_last_known_auction_item({
                "itemId": item_id,
                "auction": result,
            })
    return prices


def remember_auction_item_price(item: dict) -> bool:
    auction = dict((item or {}).get("auction") or {})
    if not _is_priced_auction(auction):
        return False
    auction["priceStatus"] = AUCTION_PRICE_STATUS_PRICED
    item_id = clean_text((item or {}).get("itemId"))
    item_name = clean_item_display_name((item or {}).get("itemName"))
    item_type_detail = clean_text((item or {}).get("itemTypeDetail"))
    normalized_item = {
        **(item or {}),
        "itemId": item_id,
        "itemName": item_name,
        "itemTypeDetail": item_type_detail,
        "auction": auction,
    }
    stored = False
    if item_id:
        stored = remember_cached_resolved_price(
            _get_auction_item_cache_key(item_id),
            auction,
            should_cache=_is_priced_auction,
        ) or stored
    if item_name:
        name_cache_keys = {
            (
                "auction_exact_name",
                AUCTION_EXACT_NAME_RESOLVED_PRICE_CACHE_VERSION,
                item_name,
                item_type_detail,
                "match",
            ),
            (
                "auction_exact_name",
                AUCTION_EXACT_NAME_RESOLVED_PRICE_CACHE_VERSION,
                item_name,
                "",
                "match",
            ),
        }
        for name_cache_key in name_cache_keys:
            stored = remember_cached_resolved_price(
                name_cache_key,
                normalized_item,
                should_cache=lambda row: _is_priced_auction(row.get("auction") or {}),
            ) or stored
    if not auction.get("isLastKnownPrice"):
        stored = remember_last_known_auction_item(normalized_item) or stored
    return stored


def _auction_row_to_item_price(row: dict) -> dict:
    item_id = clean_text(row.get("itemId"))
    item = {
        "itemId": item_id,
        "itemName": clean_item_display_name(row.get("itemName")),
        "itemRarity": clean_text(row.get("itemRarity")),
        "itemTypeDetail": clean_text(row.get("itemTypeDetail")),
        "iconUrl": get_item_icon_url(item_id),
        "auction": {
            "priceStatus": AUCTION_PRICE_STATUS_PRICED,
            "listingCount": int(row.get("regCount") or 0),
            "minUnitPrice": row.get("unitPrice") or row.get("currentPrice"),
            "averagePrice": row.get("averagePrice") if row.get("averagePrice", 0) > 0 else None,
            "auctionNo": row.get("auctionNo"),
            "expireDate": row.get("expireDate"),
        },
    }
    remember_auction_item_price(item)
    return item


def get_lowest_auction_item_by_exact_name(
    item_name: str,
    item_type_detail: str = "",
    word_type: str = "match",
) -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    word_type = clean_text(word_type) or "match"
    if not item_name:
        return {}

    def resolve_uncached():
        rows = get_auction_rows_by_name_from_api(item_name, word_type=word_type, limit=100, offset=0)
        matched = [
            row for row in rows
            if clean_text(row.get("itemName")) == item_name
            and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
            and isinstance(row.get("unitPrice") or row.get("currentPrice"), (int, float))
            and (row.get("unitPrice") or row.get("currentPrice")) > 0
        ]
        lowest = min(
            matched,
            key=lambda row: row.get("unitPrice") or row.get("currentPrice") or 10**30,
            default=None,
        )
        if lowest:
            return _auction_row_to_item_price(lowest)
        return {
            "itemName": item_name,
            "itemTypeDetail": item_type_detail,
            "auction": build_unlisted_auction_price(),
        }

    cache_key = _get_exact_name_cache_key(
        item_name,
        item_type_detail,
        word_type,
    )
    _seed_persisted_name_price(cache_key, item_name, item_type_detail)
    result = get_cached_resolved_price(
        cache_key,
        resolve_uncached,
        should_cache=lambda item: _is_priced_auction(item.get("auction") or {}),
    )
    if (
        _is_priced_auction(result.get("auction") or {})
        and not result.get("isLastKnownPrice")
        and not (result.get("auction") or {}).get("isLastKnownPrice")
    ):
        remember_auction_item_price(result)
    return result


def _with_price_item_metadata(
    auction: dict,
    price_item: dict,
    price_source: str,
) -> dict:
    result = dict(auction or {})
    result["priceItemId"] = clean_text(price_item.get("itemId"))
    result["priceItemName"] = clean_item_display_name(price_item.get("itemName"))
    result["priceSource"] = clean_text(price_source)
    return result


def get_lowest_auction_prices_for_items(items: list[dict], limit: int = 100) -> dict[str, dict]:
    normalized_items = []
    seen_ids = set()
    for item in items or []:
        item_id = clean_text(item.get("itemId"))
        if not item_id or item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        normalized_items.append({
            "itemId": item_id,
            "itemName": clean_item_display_name(item.get("itemName")),
            "itemTypeDetail": clean_text(item.get("itemTypeDetail")),
        })
    if not normalized_items:
        return {}

    exact_prices = get_lowest_auction_prices(
        [item.get("itemId") for item in normalized_items],
        limit=limit,
    )
    resolved = {}
    priced_by_name = {}
    for item in normalized_items:
        item_id = item.get("itemId")
        auction = exact_prices.get(item_id) or build_unavailable_auction_price()
        if not _is_priced_auction(auction):
            continue
        if not auction.get("isLastKnownPrice"):
            remember_auction_item_price({
                **item,
                "auction": auction,
            })
        enriched = _with_price_item_metadata(auction, item, "exactItemId")
        resolved[item_id] = enriched
        name_key = (item.get("itemName"), item.get("itemTypeDetail"))
        if name_key[0]:
            previous = priced_by_name.get(name_key)
            if previous is None or enriched.get("minUnitPrice", 10**30) < previous.get("minUnitPrice", 10**30):
                priced_by_name[name_key] = enriched

    exact_name_cache = {}
    for item in normalized_items:
        item_id = item.get("itemId")
        if item_id in resolved:
            continue
        item_name = item.get("itemName")
        item_type_detail = item.get("itemTypeDetail")
        name_key = (item_name, item_type_detail)
        same_name_price = priced_by_name.get(name_key)
        if same_name_price is not None:
            resolved[item_id] = {
                **same_name_price,
                "priceSource": "sameNameCachedItem",
            }
            continue
        if item_name:
            if name_key not in exact_name_cache:
                exact_name_cache[name_key] = get_lowest_auction_item_by_exact_name(
                    item_name,
                    item_type_detail=item_type_detail,
                )
            price_item = exact_name_cache[name_key] or {}
            auction = price_item.get("auction") or {}
            if _is_priced_auction(auction):
                enriched = _with_price_item_metadata(auction, price_item, "exactItemName")
                resolved[item_id] = enriched
                priced_by_name[name_key] = enriched
                continue
        resolved[item_id] = _with_price_item_metadata(
            exact_prices.get(item_id) or build_unavailable_auction_price(),
            item,
            "exactItemId",
        )
    return resolved


def get_aura_price_cache_payload(force_refresh: bool, allow_stale: bool, schema_version: int, refresh_fn):
    now = time.time()
    if allow_stale:
        load_price_cache_from_disk(_AURA_PRICE_CACHE, AURA_PRICE_CACHE_PATH)
    with _CACHE_LOCK:
        payload = _AURA_PRICE_CACHE["payload"]
        expires_at = _AURA_PRICE_CACHE["expires_at"]
        if payload is not None and payload.get("schemaVersion") != schema_version:
            payload = None
            _AURA_PRICE_CACHE["payload"] = None
            _AURA_PRICE_CACHE["expires_at"] = 0

    if allow_stale and payload is not None:
        if not force_refresh and expires_at > now:
            return add_cache_status(payload, _AURA_PRICE_CACHE)
        start_cache_refresh(
            _AURA_PRICE_CACHE,
            lambda: refresh_fn(force_refresh=True, allow_stale=False),
            name="aura",
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
            lambda: refresh_fn(force_refresh=True, allow_stale=False),
            name="aura",
        )
        return add_cache_status({
            "updatedAt": None,
            "pricedAt": "",
            "source": None,
            "groups": [],
            "errors": [],
        }, _AURA_PRICE_CACHE, stale=True)
    return None


def save_aura_price_cache_payload(payload: dict, now: float) -> dict:
    with _CACHE_LOCK:
        previous_payload = _AURA_PRICE_CACHE["payload"]
    payload = merge_last_known_auction_prices(previous_payload, payload)
    expires_at = now + get_price_cache_ttl_seconds(payload)
    with _CACHE_LOCK:
        _AURA_PRICE_CACHE["payload"] = payload
        _AURA_PRICE_CACHE["expires_at"] = expires_at
    save_price_cache_to_disk(AURA_PRICE_CACHE_PATH, payload, expires_at)
    return add_cache_status(payload, _AURA_PRICE_CACHE)
