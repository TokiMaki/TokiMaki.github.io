import threading
import time

from ..neople_client import clean_text, get_item_icon_url, get_lowest_auction_price
from .item_repository import search_items_by_name


UPGRADE_MATERIAL_PRICE_CACHE_TTL_SECONDS = 300
_UPGRADE_MATERIAL_PRICE_CACHE_LOCK = threading.Lock()
_UPGRADE_MATERIAL_PRICE_CACHE = {}
UPGRADE_MATERIAL_PRICE_ITEMS = {
    "harmonyCrystal": {"label": "무결점 조화의 결정체", "itemId": "ab8eab6848ed81b8bdd65d1c5a6ae8b2"},
    "contradictionCrystal": {"label": "모순의 결정체", "itemId": "f1afc13118b2b07ec1e3b8c2f1958b03"},
    "colorlessCube": {"label": "무색 큐브 조각", "itemId": "785e56a0ed4e3efd573da1f56a45217d"},
    "lionCore": {"label": "무결점 라이언 코어", "itemId": "3840051cf487429c5a757c8bdb00e33b"},
    "amplificationProtectionTicket": {"label": "증폭 보호권", "itemId": "55be75a1c024aac3ef84ed3bed5b8db9"},
    "reinforcementProtectionTicket": {"label": "강화 보호권", "itemId": "8bc063c2b80179bc002f7dfb8203c4ab"},
    "epicSoul": {"label": "에픽 소울 결정", "itemId": "c7d845c65ab9dbcff6e55dc910fbea87"},
    "legendarySoul": {"label": "레전더리 소울 결정", "itemId": "c6947ff630cc59aebdcbabfb449258d1"},
    "radiantSoul": {"label": "광휘의 소울 결정", "itemId": "27a5877768a40a3a0eccc493d0a53b9b"},
    "primordialSoul": {"label": "태초 소울 결정", "itemId": "d288ebf406a65f4ec23d1f9c33227888"},
    "pilgrimSeal": {"label": "순례의 인장(1회 교환 가능)", "itemId": "d7e9443a19fe81a9cc8364c201f6ab55"},
}


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

    payload = {}
    for key, config in UPGRADE_MATERIAL_PRICE_ITEMS.items():
        item_name = clean_text(config.get("label"))
        item_id = clean_text(config.get("itemId"))
        item = {} if item_id else (_find_exact_item_by_name(item_name) if item_name else {})
        item_id = clean_text(item_id or item.get("itemId"))
        try:
            auction = get_lowest_auction_price(item_id) if item_id else {}
        except Exception:
            auction = {"listingCount": 0, "minUnitPrice": None, "averagePrice": None, "auctionNo": None}
        payload[key] = {
            "label": clean_text(item.get("itemName")) or item_name,
            "itemId": item_id,
            "iconUrl": get_item_icon_url(item_id) if item_id else "",
            "auction": auction,
        }

    with _UPGRADE_MATERIAL_PRICE_CACHE_LOCK:
        _UPGRADE_MATERIAL_PRICE_CACHE["payload"] = {
            "payload": payload,
            "expires_at": now + UPGRADE_MATERIAL_PRICE_CACHE_TTL_SECONDS,
        }
    return payload
