import threading
import time

from ..neople_client import clean_text, get_item_icon_url
from .auction_repository import build_unavailable_auction_price, get_lowest_auction_price
from .item_repository import search_items_by_name


UPGRADE_MATERIAL_PRICE_CACHE_TTL_SECONDS = 300
UPGRADE_MATERIAL_PRICE_ERROR_CACHE_TTL_SECONDS = 60
_UPGRADE_MATERIAL_PRICE_CACHE_LOCK = threading.Lock()
_UPGRADE_MATERIAL_PRICE_CACHE = {}
UPGRADE_MATERIAL_PRICE_ITEMS = {
    "harmonyCrystal": {"label": "무결점 조화의 결정체", "itemId": "1f575027600618cabf8a3516601dfd29"},
    "contradictionCrystal": {"label": "모순의 결정체", "itemId": "f1afc13118b2b07ec1e3b8c2f1958b03"},
    "colorlessCube": {"label": "무색 큐브 조각", "itemId": "785e56a0ed4e3efd573da1f56a45217d"},
    "lionCore": {"label": "무결점 라이언 코어", "itemId": "01a0ba48b5af060379a11fe43cc2b517"},
    "amplificationProtectionTicket": {"label": "증폭 보호권", "itemId": "55be75a1c024aac3ef84ed3bed5b8db9"},
    "reinforcementProtectionTicket": {"label": "장비 보호권", "itemId": "8bc063c2b80179bc002f7dfb8203c4ab"},
    "epicSoul": {"label": "에픽 소울 결정", "itemId": "c7d845c65ab9dbcff6e55dc910fbea87"},
    "legendarySoul": {"label": "레전더리 소울 결정", "itemId": "c6947ff630cc59aebdcbabfb449258d1"},
    "radiantSoul": {"label": "광휘의 소울 결정", "itemId": "27a5877768a40a3a0eccc493d0a53b9b"},
    "highElementalCrystal": {"label": "상급 원소결정", "itemId": "b682af8902d22554c7b90386abd18762"},
    "primordialSoul": {"label": "태초 소울 결정", "itemId": "d288ebf406a65f4ec23d1f9c33227888"},
    "behemothTear": {"label": "베히모스의 눈물(1회 교환 가능)", "itemId": "cbeb05e1c979e159f6a7501d6a294378"},
    "ignoranceDream": {"label": "무지의 꿈(1회 교환 가능)", "itemId": "56b00a8dfeda29398997e7b378effcb6"},
    "historiaQuartz": {"label": "히스토리아 쿼츠", "itemId": "c1e1dd70d4dbdf410fe715b339000821"},
    "pilgrimSeal": {"label": "순례의 인장(1회 교환 가능)", "itemId": "d7e9443a19fe81a9cc8364c201f6ab55"},
}
UPGRADE_MATERIAL_DISPLAY_ITEMS = {
    "radiantSoul": {"label": "광휘의 소울", "itemId": "6307b8165444a9bd5c4c4aa2d7eae41d"},
    "solidSoul": {"label": "솔리드 소울", "iconUrl": "/asset/soul/solidSoul.png"},
    "oathCrystalFragment": {"label": "서약 결정 조각", "iconUrl": "/asset/oath/oathCrystalFragment.png"},
    "plagueSeed": {"label": "역병의 씨앗", "itemId": "f4404a61f4522fa0a2a280366104033b"},
    "dawnLightBud": {"label": "여명의 빛망울", "iconUrl": "/asset/enchant/dawnLightOrb.png"},
    "blackCalamity": {
        "label": "검은 재앙",
        "iconUrl": "/asset/enchant/blackCalamity.png",
    },
    "lightClue": {"label": "빛의 실마리", "iconUrl": "/asset/enchant/lightClue.png"},
    "lightGuidance": {"label": "빛의 전도", "iconUrl": "/asset/enchant/lightGuidance.png"},
}


def get_upgrade_material_config(key: str) -> dict:
    key = clean_text(key)
    if key in UPGRADE_MATERIAL_PRICE_ITEMS:
        return {**UPGRADE_MATERIAL_PRICE_ITEMS[key], "priceSource": "materialResolver"}
    if key in UPGRADE_MATERIAL_DISPLAY_ITEMS:
        return {**UPGRADE_MATERIAL_DISPLAY_ITEMS[key], "priceSource": "displayOnly"}
    return {}


def find_upgrade_material_price_config_by_label(label: str) -> dict:
    label = clean_text(label)
    return next(
        (
            config
            for config in UPGRADE_MATERIAL_PRICE_ITEMS.values()
            if clean_text(config.get("label")) == label
        ),
        {},
    )


def _find_exact_item_by_name(item_name: str) -> dict:
    item_name = clean_text(item_name)
    rows = search_items_by_name(item_name)
    matched = [
        row for row in rows
        if clean_text(row.get("itemName")) == item_name
    ]
    return matched[0] if matched else {}


def load_upgrade_material_prices() -> dict:
    now = time.time()
    with _UPGRADE_MATERIAL_PRICE_CACHE_LOCK:
        cached = _UPGRADE_MATERIAL_PRICE_CACHE.get("payload")
        if cached and float(cached.get("expires_at") or 0) > now:
            return cached.get("payload") or {}
        previous_payload = (cached or {}).get("payload") or {}

    payload = {}
    has_missing_current_price = False
    for key, config in UPGRADE_MATERIAL_PRICE_ITEMS.items():
        item_name = clean_text(config.get("label"))
        item_id = clean_text(config.get("itemId"))
        item = {}
        try:
            item = {} if item_id else (_find_exact_item_by_name(item_name) if item_name else {})
            item_id = clean_text(item_id or item.get("itemId"))
            auction = (
                get_lowest_auction_price(item_id)
                if item_id
                else build_unavailable_auction_price()
            )
        except Exception:
            auction = build_unavailable_auction_price()
        current_price_status = clean_text(auction.get("priceStatus"))
        if current_price_status != "priced":
            has_missing_current_price = True
            previous_row = previous_payload.get(key) or {}
            previous_item_id = clean_text(previous_row.get("itemId"))
            previous_label = clean_text(previous_row.get("label"))
            previous_auction = previous_row.get("auction") or {}
            is_same_item = (
                bool(item_id and previous_item_id == item_id)
                or bool(not item_id and item_name and previous_label == item_name)
            )
            if (
                is_same_item
                and previous_auction.get("priceStatus") == "priced"
                and isinstance(previous_auction.get("minUnitPrice"), (int, float))
                and previous_auction.get("minUnitPrice") > 0
            ):
                auction = {
                    **previous_auction,
                    "isLastKnownPrice": True,
                    "lookupPriceStatus": current_price_status or "unavailable",
                }
                item_id = item_id or previous_item_id
        payload[key] = {
            "label": clean_text(item.get("itemName")) or item_name,
            "itemId": item_id,
            "iconUrl": get_item_icon_url(item_id) if item_id else "",
            "auction": auction,
        }

    for key, config in UPGRADE_MATERIAL_DISPLAY_ITEMS.items():
        if key in payload:
            continue
        item_id = clean_text(config.get("itemId"))
        payload[key] = {
            "label": clean_text(config.get("label")),
            "itemId": item_id,
            "iconUrl": clean_text(config.get("iconUrl"))
            or (get_item_icon_url(item_id) if item_id else ""),
            "auction": {},
        }

    with _UPGRADE_MATERIAL_PRICE_CACHE_LOCK:
        ttl_seconds = (
            UPGRADE_MATERIAL_PRICE_ERROR_CACHE_TTL_SECONDS
            if has_missing_current_price
            else UPGRADE_MATERIAL_PRICE_CACHE_TTL_SECONDS
        )
        _UPGRADE_MATERIAL_PRICE_CACHE["payload"] = {
            "payload": payload,
            "expires_at": now + ttl_seconds,
        }
    return payload


def build_upgrade_material_display_rows(materials: list) -> list:
    result = []
    for material in materials or []:
        row = dict(material)
        key = clean_text(row.get("key"))
        config = get_upgrade_material_config(key)
        label = clean_text(row.get("label") or config.get("label"))
        item_id = clean_text(row.get("itemId") or config.get("itemId"))
        icon_url = clean_text(row.get("iconUrl") or config.get("iconUrl"))
        if label:
            row["label"] = label
        if icon_url:
            row["iconUrl"] = icon_url
        if item_id:
            row["itemId"] = item_id
            row["iconUrl"] = row.get("iconUrl") or get_item_icon_url(item_id)
        result.append(row)
    return result
