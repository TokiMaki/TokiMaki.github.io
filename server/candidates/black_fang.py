import re
import time

from ..effects import normalize_enchant_status, subtract_effects
from ..neople_client import (
    clean_item_display_name,
    clean_text,
    get_item_icon_url,
)
from ..repositories.auction_repository import get_auction_rows_by_name, get_lowest_auction_price
from ..repositories.item_repository import fetch_item_details, search_items_by_name
from ..presenters.black_fang_presenter import build_black_fang_recommendation_row


BLACK_FANG_ACCESSORY_SLOT_IDS = {"AMULET", "WRIST", "RING"}
BLACK_FANG_MATERIAL_AUCTION_NAME_MAP = {
    "조화의 결정체": "무결점 조화의 결정체",
    "태초 소울": "태초 소울 결정",
    "순례의 인장": "순례의 인장(1회 교환 가능)",
}
BLACK_FANG_MATERIAL_AUCTION_ITEM_ID_MAP = {
    "무결점 조화의 결정체": "ab8eab6848ed81b8bdd65d1c5a6ae8b2",
    "태초 소울 결정": "d288ebf406a65f4ec23d1f9c33227888",
    "순례의 인장(1회 교환 가능)": "d7e9443a19fe81a9cc8364c201f6ab55",
}


def _measure_step(steps: list, name: str, fn):
    started_at = time.perf_counter()
    result = fn()
    steps.append({
        "name": name,
        "ms": round((time.perf_counter() - started_at) * 1000, 1),
    })
    return result


def _auction_row_to_item_price(row: dict) -> dict:
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
        },
    }


def _find_lowest_exact_auction_item_by_name(item_name: str, item_type_detail: str = "", word_type: str = "full") -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    if not item_name:
        return {}
    rows = get_auction_rows_by_name(item_name, word_type=word_type, limit=100)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
        and isinstance(row.get("unitPrice") or row.get("currentPrice"), (int, float))
        and (row.get("unitPrice") or row.get("currentPrice")) > 0
    ]
    row = min(matched, key=lambda item: item.get("unitPrice") or item.get("currentPrice"), default=None)
    return _auction_row_to_item_price(row) if row else {}


def _find_exact_item_by_name(item_name: str, item_type_detail: str = "") -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    rows = search_items_by_name(item_name)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
    ]
    return matched[0] if matched else {}


def _find_exact_item_by_match_name(item_name: str, item_type_detail: str = "", limit: int = 5) -> dict:
    item_name = clean_text(item_name)
    item_type_detail = clean_text(item_type_detail)
    rows = search_items_by_name(item_name, word_type="match", limit=limit)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
        and (not item_type_detail or clean_text(row.get("itemTypeDetail")) == item_type_detail)
    ]
    return matched[0] if matched else {}


def parse_black_fang_scroll_cost(detail: dict) -> dict:
    text = str(detail.get("itemExplainDetail") or detail.get("itemExplain") or "")
    materials = []
    fixed_gold = 0
    in_materials = False
    for raw_line in text.splitlines():
        line = clean_text(raw_line)
        if not line:
            continue
        if line == "<소모 재료>":
            in_materials = True
            continue
        if line.startswith("<") and line.endswith(">") and line != "<소모 재료>":
            in_materials = False
        if not in_materials:
            continue
        if "악세서리" in line and line.endswith("1개"):
            continue
        gold_match = re.search(r"골드\s*([\d,]+)", line)
        if gold_match:
            fixed_gold += int(gold_match.group(1).replace(",", ""))
            continue
        material_match = re.match(r"(.+?)\s*([\d,]+)개$", line)
        if material_match:
            materials.append({
                "label": clean_text(material_match.group(1)),
                "amount": int(material_match.group(2).replace(",", "")),
            })
        else:
            materials.append({"label": line, "amount": None})
    return {"fixedGold": fixed_gold, "materials": materials}


def format_materials_text(materials: list) -> str:
    parts = []
    for material in materials or []:
        label = clean_text(material.get("label"))
        amount = material.get("amount")
        if not label:
            continue
        if isinstance(amount, (int, float)) and amount > 0:
            parts.append(f"{label} {int(amount):,}개")
        else:
            parts.append(label)
    return " / ".join(parts)


def find_material_price_by_label(material_prices: dict | None, label: str) -> dict:
    label = clean_text(label)
    for row in (material_prices or {}).values():
        if clean_text(row.get("label")) == label:
            return row
    return {}


def enrich_black_fang_materials(
    materials: list,
    material_price_cache: dict | None = None,
    material_prices: dict | None = None,
) -> list:
    material_price_cache = material_price_cache if material_price_cache is not None else {}
    enriched = []
    for material in materials or []:
        label = clean_text(material.get("label"))
        if not label:
            continue
        auction_name = BLACK_FANG_MATERIAL_AUCTION_NAME_MAP.get(label, label)
        cached = material_price_cache.get(auction_name)
        if cached:
            item_id = clean_text(cached.get("itemId"))
            item_name = clean_text(cached.get("itemName")) or auction_name
            auction = dict(cached.get("auction") or {})
        else:
            material_price = find_material_price_by_label(material_prices, auction_name)
            if material_price:
                item_id = clean_text(material_price.get("itemId"))
                item_name = clean_text(material_price.get("label")) or auction_name
                auction = dict(material_price.get("auction") or {})
            else:
                item_id = clean_text(BLACK_FANG_MATERIAL_AUCTION_ITEM_ID_MAP.get(auction_name))
                item = {} if item_id else _find_exact_item_by_name(auction_name)
                item_id = clean_text(item_id or item.get("itemId"))
                try:
                    auction = get_lowest_auction_price(item_id) if item_id else {}
                except Exception:
                    auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
                item_name = clean_text(item.get("itemName")) or auction_name
            material_price_cache[auction_name] = {
                "itemId": item_id,
                "itemName": item_name,
                "auction": dict(auction or {}),
            }
        enriched.append({
            "label": label,
            "amount": material.get("amount"),
            "itemId": item_id,
            "itemName": item_name,
            "auctionName": auction_name,
            "iconUrl": get_item_icon_url(item_id),
            "auction": auction,
        })
    return enriched


def get_black_fang_scroll_name(set_item_name: str) -> str:
    set_name = re.sub(r"\s*세트$", "", clean_text(set_item_name)).strip()
    return f"흑아 태초 변환서 - {set_name}" if set_name else ""


def build_black_fang_recommendations_debug(equipment_rows: list, material_prices: dict | None = None) -> dict:
    steps = []
    targets = [
        equipment for equipment in equipment_rows or []
        if clean_text(equipment.get("slotId")) in BLACK_FANG_ACCESSORY_SLOT_IDS
        and clean_text(equipment.get("itemRarity")) == "태초"
        and not clean_text(equipment.get("itemName")).startswith("흑아 :")
    ]
    if not targets:
        return {"recommendations": [], "steps": steps}

    item_ids = []
    target_pairs = []
    scroll_names = sorted({get_black_fang_scroll_name(equipment.get("setItemName")) for equipment in targets if get_black_fang_scroll_name(equipment.get("setItemName"))})
    scroll_items = {}
    scroll_auction_hits = 0
    scroll_fallback_hits = 0
    scroll_lookup_started_at = time.perf_counter()
    for scroll_name in scroll_names:
        scroll = _find_lowest_exact_auction_item_by_name(scroll_name, word_type="match")
        if scroll.get("itemId"):
            scroll_auction_hits += 1
        else:
            scroll = _find_exact_item_by_name(scroll_name)
            if scroll.get("itemId"):
                scroll_fallback_hits += 1
        if scroll.get("itemId"):
            scroll_items[scroll_name] = scroll
            item_ids.append(scroll.get("itemId"))
    steps.append({
        "name": "find_scroll_items",
        "ms": round((time.perf_counter() - scroll_lookup_started_at) * 1000, 1),
        "count": len(scroll_names),
        "auctionHitCount": scroll_auction_hits,
        "fallbackHitCount": scroll_fallback_hits,
    })
    black_item_lookup_started_at = time.perf_counter()
    black_match_hits = 0
    black_fallback_hits = 0
    for equipment in targets:
        black_name = f"흑아 : {clean_text(equipment.get('itemName'))}"
        black_item = _find_exact_item_by_match_name(black_name, clean_text(equipment.get("itemTypeDetail")))
        if black_item.get("itemId"):
            black_match_hits += 1
        else:
            black_item = _find_exact_item_by_name(black_name, clean_text(equipment.get("itemTypeDetail")))
            if black_item.get("itemId"):
                black_fallback_hits += 1
        if not black_item.get("itemId"):
            continue
        target_pairs.append((equipment, black_item))
        item_ids.extend([clean_text(equipment.get("itemId")), black_item.get("itemId")])
    steps.append({
        "name": "find_black_items",
        "ms": round((time.perf_counter() - black_item_lookup_started_at) * 1000, 1),
        "count": len(targets),
        "matchHitCount": black_match_hits,
        "fallbackHitCount": black_fallback_hits,
    })

    details_by_id = _measure_step(
        steps,
        "fetch_related_item_details",
        lambda: {
            detail.get("itemId"): detail
            for detail in fetch_item_details([item_id for item_id in item_ids if item_id])
        },
    )
    scroll_price_cache = {}
    recommendations = []
    auction_lookup_ms = 0.0
    material_enrich_ms = 0.0
    material_price_cache = {}
    for equipment, black_item in target_pairs:
        scroll_name = get_black_fang_scroll_name(equipment.get("setItemName"))
        scroll_item = scroll_items.get(scroll_name) or {}
        scroll_id = scroll_item.get("itemId")
        if scroll_id not in scroll_price_cache:
            auction_started_at = time.perf_counter()
            auction = dict(scroll_item.get("auction") or {})
            if not isinstance(auction.get("minUnitPrice"), (int, float)):
                try:
                    auction = get_lowest_auction_price(scroll_id) if scroll_id else {}
                except Exception:
                    auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
            scroll_price_cache[scroll_id] = auction
            auction_lookup_ms += (time.perf_counter() - auction_started_at) * 1000
        auction = dict(scroll_price_cache.get(scroll_id) or {})
        scroll_detail = details_by_id.get(scroll_id) or {}
        scroll_cost = parse_black_fang_scroll_cost(scroll_detail)
        scroll_price = auction.get("minUnitPrice")
        fixed_gold = scroll_cost.get("fixedGold") or 0
        if isinstance(scroll_price, (int, float)) and scroll_price > 0:
            auction["minUnitPrice"] = scroll_price + fixed_gold
            auction["scrollUnitPrice"] = scroll_price
            auction["fixedGold"] = fixed_gold

        current_detail = details_by_id.get(clean_text(equipment.get("itemId"))) or {}
        black_detail = details_by_id.get(black_item.get("itemId")) or {}
        current_effects = normalize_enchant_status(current_detail.get("itemStatus") or [])
        black_effects = normalize_enchant_status(black_detail.get("itemStatus") or [])
        effects = subtract_effects(
            black_effects,
            current_effects,
        )
        if not effects:
            continue
        material_started_at = time.perf_counter()
        materials = enrich_black_fang_materials(scroll_cost.get("materials") or [], material_price_cache, material_prices)
        material_enrich_ms += (time.perf_counter() - material_started_at) * 1000
        material_text = format_materials_text(materials)
        recommendations.append(build_black_fang_recommendation_row(
            slot=clean_text(equipment.get("slotName")),
            item_id=scroll_id,
            item_name=scroll_item.get("itemName") or scroll_name,
            item_rarity=scroll_item.get("itemRarity"),
            icon_url=get_item_icon_url(scroll_id),
            item_explain=f"{clean_text(equipment.get('itemName'))} -> {clean_text(black_item.get('itemName'))}",
            effects=effects,
            current_effects=current_effects,
            target_effects=black_effects,
            auction=auction,
            materials=materials,
            material_text=material_text,
            target_item_name=clean_text(black_item.get("itemName")),
        ))
    steps.extend([
        {
            "name": "get_scroll_auction_prices",
            "ms": round(auction_lookup_ms, 1),
            "uniqueCount": len(scroll_price_cache),
        },
        {
            "name": "enrich_material_items",
            "ms": round(material_enrich_ms, 1),
            "count": len(recommendations),
            "uniqueMaterialCount": len(material_price_cache),
        },
    ])
    return {"recommendations": recommendations, "steps": steps}
