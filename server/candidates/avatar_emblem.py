import time

from ..neople_client import (
    clean_item_display_name,
    clean_text,
    get_auction_rows_by_name,
    get_item_icon_url,
)


AVATAR_BRILLIANT_RED_STAT = 25
AVATAR_BRILLIANT_YELLOW_STAT = 15
AVATAR_BRILLIANT_GREEN_STAT = 15
AVATAR_BRILLIANT_DUAL_STAT = 15
AVATAR_EMBLEM_AUCTION_PAGE_LIMIT = 100
AVATAR_EMBLEM_AUCTION_MAX_PAGES = 5
AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "HEADGEAR", "slot": "모자 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "HAIR", "slot": "머리 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "WEAPON", "slot": "무기 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "AURORA", "slot": "오라 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "SKIN", "slot": "피부 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT},
    {"slotId": "JACKET", "slot": "상의 아바타", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT},
    {"slotId": "PANTS", "slot": "하의 아바타", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT},
]
BUFFER_AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "HEADGEAR", "slot": "모자 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "HAIR", "slot": "머리 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "FACE", "slot": "얼굴 아바타", "color": "노란빛", "kind": "yellow", "targetStat": AVATAR_BRILLIANT_YELLOW_STAT, "bufferStatScope": "common"},
    {"slotId": "BREAST", "slot": "목가슴 아바타", "color": "노란빛", "kind": "yellow", "targetStat": AVATAR_BRILLIANT_YELLOW_STAT, "bufferStatScope": "common"},
    {"slotId": "WEAPON", "slot": "무기 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "AURORA", "slot": "오라 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "SKIN", "slot": "피부 아바타", "color": "붉은빛", "kind": "red", "targetStat": AVATAR_BRILLIANT_RED_STAT, "bufferStatScope": "common"},
    {"slotId": "JACKET", "slot": "상의 아바타", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "current"},
    {"slotId": "PANTS", "slot": "하의 아바타", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "current"},
]
BUFFER_SWITCHING_AVATAR_EMBLEM_RECOMMENDATIONS = [
    {"slotId": "JACKET", "slot": "벞강 상의", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "switching"},
    {"slotId": "PANTS", "slot": "벞강 하의", "color": "녹색빛", "kind": "green", "targetStat": AVATAR_BRILLIANT_GREEN_STAT, "bufferStatScope": "switching"},
]


def auction_row_to_item_price(row: dict) -> dict:
    item_id = clean_text(row.get("itemId"))
    return {
        "itemId": item_id,
        "itemName": clean_item_display_name(row.get("itemName")),
        "itemRarity": clean_text(row.get("itemRarity")),
        "iconUrl": get_item_icon_url(item_id),
        "auction": {
            "listingCount": int(row.get("regCount") or 0),
            "minUnitPrice": row.get("unitPrice") or row.get("currentPrice"),
            "averagePrice": row.get("averagePrice"),
            "auctionNo": row.get("auctionNo"),
            "expireDate": row.get("expireDate"),
        },
    }


def get_avatar_slot(avatar_rows: list, slot_id: str) -> dict:
    slot_id = clean_text(slot_id)
    return next((
        row for row in avatar_rows or []
        if clean_text(row.get("slotId")) == slot_id
    ), {}) or {}


def extract_emblem_option_text(item_name: str) -> str:
    item_name = clean_text(item_name)
    if "[" not in item_name or "]" not in item_name:
        return item_name
    return item_name.split("[", 1)[1].split("]", 1)[0]


def get_emblem_stat_value(item_name: str, stat_name: str, kind: str) -> float:
    item_name = clean_text(item_name)
    option_text = extract_emblem_option_text(item_name)
    if stat_name not in option_text:
        return 0
    if "찬란한" in item_name:
        if kind == "red":
            return AVATAR_BRILLIANT_RED_STAT
        if kind == "yellow":
            return AVATAR_BRILLIANT_YELLOW_STAT
        if kind == "green":
            return AVATAR_BRILLIANT_GREEN_STAT
        if kind == "dual":
            return AVATAR_BRILLIANT_DUAL_STAT
    if "화려한" in item_name:
        return 17 if kind == "red" else 10
    if "빛나는" in item_name:
        return 10 if kind == "red" else 6
    if "듀얼" in item_name:
        return 10
    return 0


def get_emblems_by_color(row: dict, color: str) -> list:
    color = clean_text(color)
    return [
        emblem for emblem in row.get("emblems") or []
        if color in clean_text(emblem.get("slotColor"))
    ]


def get_avatar_damage_emblems(row: dict, config: dict) -> list:
    if clean_text(config.get("slotId")) in {"WEAPON", "AURORA", "SKIN", "JACKET", "PANTS"}:
        return [
            emblem for emblem in row.get("emblems") or []
            if "플래티넘" not in clean_text(emblem.get("slotColor"))
            and "플래티넘" not in clean_text(emblem.get("itemName"))
        ]
    return get_emblems_by_color(row, config.get("color"))


def get_avatar_emblem_item_name(stat_name: str, kind: str) -> str:
    if kind == "red":
        return f"찬란한 붉은빛 엠블렘[{stat_name}]"
    if kind == "yellow":
        return f"찬란한 옐로우 엠블렘[{stat_name}]"
    if kind == "green":
        return f"찬란한 그린 엠블렘[{stat_name}]"
    critical_name = "마법크리티컬" if stat_name == "지능" else "물리크리티컬"
    return f"찬란한 듀얼 엠블렘[{stat_name} + {critical_name}]"


def get_avatar_emblem_search_prefixes(kind: str) -> list[str]:
    if kind == "red":
        return ["찬란한 붉은빛 엠블렘["]
    if kind == "yellow":
        return ["찬란한 옐로우 엠블렘["]
    if kind == "green":
        return ["찬란한 그린 엠블렘[", "찬란한 듀얼 엠블렘["]
    return ["찬란한 듀얼 엠블렘["]


def find_lowest_avatar_emblem_by_prefix(stat_name: str, kind: str, debug_steps: list | None = None) -> dict:
    stat_name = clean_text(stat_name)
    candidates = []
    seen_ids = set()
    for prefix in get_avatar_emblem_search_prefixes(kind):
        started_at = time.perf_counter()
        prefix_candidate = {}
        pages_checked = 0
        rows_checked = 0
        for page in range(AVATAR_EMBLEM_AUCTION_MAX_PAGES):
            try:
                rows = get_auction_rows_by_name(
                    prefix,
                    word_type="front",
                    limit=AVATAR_EMBLEM_AUCTION_PAGE_LIMIT,
                    offset=page * AVATAR_EMBLEM_AUCTION_PAGE_LIMIT,
                )
            except Exception:
                rows = []
            if not rows:
                break
            pages_checked += 1
            rows_checked += len(rows)
            for row in rows:
                item_name = clean_text(row.get("itemName"))
                item_id = clean_text(row.get("itemId"))
                unit_price = row.get("unitPrice") or row.get("currentPrice")
                if not item_id or item_id in seen_ids:
                    continue
                if clean_text(row.get("itemTypeDetail")) != "엠블렘":
                    continue
                if not item_name.startswith(prefix):
                    continue
                if f"[{stat_name}" not in item_name and f"+ {stat_name}" not in item_name:
                    continue
                if not isinstance(unit_price, (int, float)) or unit_price <= 0:
                    continue
                seen_ids.add(item_id)
                prefix_candidate = auction_row_to_item_price(row)
                break
            if prefix_candidate or len(rows) < AVATAR_EMBLEM_AUCTION_PAGE_LIMIT:
                break
        if debug_steps is not None:
            auction = prefix_candidate.get("auction") or {}
            debug_steps.append({
                "name": "find_avatar_emblem_prefix_candidate",
                "ms": round((time.perf_counter() - started_at) * 1000, 1),
                "prefix": prefix,
                "stat": stat_name,
                "kind": clean_text(kind),
                "pages": pages_checked,
                "rows": rows_checked,
                "matched": bool(prefix_candidate),
                "itemName": clean_text(prefix_candidate.get("itemName")),
                "minUnitPrice": auction.get("minUnitPrice"),
            })
        if prefix_candidate:
            candidates.append(prefix_candidate)
    return min(
        candidates,
        key=lambda item: (item.get("auction") or {}).get("minUnitPrice") or 10**30,
        default={},
    )


def build_avatar_emblem_recommendations_debug(
    avatar_rows: list,
    primary_stat_name: str,
    find_lowest_exact_item_by_name,
    configs: list | None = None,
    buffer_mode: bool = False,
) -> dict:
    steps = []
    recommendations = []
    item_cache = {}
    for config in configs or AVATAR_EMBLEM_RECOMMENDATIONS:
        row = get_avatar_slot(avatar_rows, config.get("slotId"))
        if not row:
            continue
        if (
            not buffer_mode
            and clean_text(row.get("itemRarity")) != "레어"
            and clean_text(config.get("slotId")) not in {"AURORA", "SKIN"}
        ):
            continue
        emblems = get_avatar_damage_emblems(row, config)
        socket_count = max(len(emblems), 2)
        current_values = [
            get_emblem_stat_value(emblem.get("itemName"), primary_stat_name, config.get("kind"))
            for emblem in emblems
        ]
        current_values += [0] * max(0, socket_count - len(current_values))
        need_count = sum(1 for value in current_values if value < config.get("targetStat", 0))
        if need_count <= 0:
            continue
        item_name = get_avatar_emblem_item_name(primary_stat_name, config.get("kind"))
        item_cache_key = (primary_stat_name, config.get("kind"))
        if item_cache_key not in item_cache:
            lookup_started_at = time.perf_counter()
            prefix_item = find_lowest_avatar_emblem_by_prefix(primary_stat_name, config.get("kind"), steps)
            item = prefix_item or find_lowest_exact_item_by_name(item_name)
            item_cache[item_cache_key] = item
            steps.append({
                "name": "find_avatar_emblem_price_item",
                "ms": round((time.perf_counter() - lookup_started_at) * 1000, 1),
                "stat": primary_stat_name,
                "kind": clean_text(config.get("kind")),
                "source": "prefixAuction" if prefix_item else "exactFallback",
                "itemName": clean_text(item.get("itemName")),
                "minUnitPrice": (item.get("auction") or {}).get("minUnitPrice"),
            })
        item = item_cache[item_cache_key]
        auction = dict(item.get("auction") or {})
        unit_price = auction.get("minUnitPrice")
        if isinstance(unit_price, (int, float)) and unit_price > 0:
            auction["minUnitPrice"] = unit_price * need_count
            auction["unitPrice"] = unit_price
        stat_gain = sum(config.get("targetStat", 0) - value for value in current_values if value < config.get("targetStat", 0))
        recommendations.append({
            "kind": "brilliantEmblem",
            "slot": config.get("slot"),
            "tier": "엠블렘",
            "itemId": item.get("itemId"),
            "itemName": item.get("itemName") or item_name,
            "itemRarity": item.get("itemRarity"),
            "iconUrl": item.get("iconUrl"),
            "itemExplain": (
                f"{clean_text(row.get('slotName')) or config.get('slot')} "
                f"{item.get('itemName') or item_name} 교체"
            ),
            "effects": (
                {"bufferStat": stat_gain}
                if buffer_mode
                else {"int" if primary_stat_name == "지능" else "str": stat_gain}
            ),
            "auction": auction,
            "needCount": need_count,
            "unitPrice": unit_price,
            "targetStat": primary_stat_name,
            "bufferStatScope": clean_text(config.get("bufferStatScope")),
            "recommendationPriority": 0,
        })
    return {"recommendations": recommendations, "steps": steps}


def build_avatar_emblem_recommendations(
    avatar_rows: list,
    primary_stat_name: str,
    find_lowest_exact_item_by_name,
    configs: list | None = None,
    buffer_mode: bool = False,
) -> list:
    return build_avatar_emblem_recommendations_debug(
        avatar_rows,
        primary_stat_name,
        find_lowest_exact_item_by_name,
        configs,
        buffer_mode,
    ).get("recommendations") or []
