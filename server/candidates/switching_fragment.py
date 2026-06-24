import re

from ..calculators.switching_calculator import normalize_switching_skill_name, switching_skill_name_matches
from ..neople_client import clean_text
from ..repositories.auction_repository import get_auction_rows_by_name
from ..repositories.item_repository import search_items_by_name


SWITCHING_FRAGMENT_AUCTION_PAGE_LIMIT = 100
SWITCHING_FRAGMENT_AUCTION_MAX_PAGES = 5
SWITCHING_FRAGMENT_CANDIDATES_PER_SLOT = 3
SWITCHING_FRAGMENT_SLOT_LABELS = {
    "WEAPON": "무기",
    "JACKET": "상의",
    "PANTS": "하의",
    "SHOULDER": "머리어깨",
    "WAIST": "벨트",
    "SHOES": "신발",
    "WRIST": "팔찌",
    "AMULET": "목걸이",
    "RING": "반지",
    "SUPPORT": "보조장비",
    "MAGIC_STON": "마법석",
    "EARRING": "귀걸이",
}
SWITCHING_FRAGMENT_SLOT_ALIASES = {
    "어깨": "머리어깨",
    "완장": "보조장비",
}
SWITCHING_FRAGMENT_TARGET_SLOTS = set(SWITCHING_FRAGMENT_SLOT_LABELS.values())


def normalize_switching_fragment_slot(value: str) -> str:
    text = clean_text(value)
    return SWITCHING_FRAGMENT_SLOT_ALIASES.get(text, text)


def get_switching_fragment_slot(row: dict) -> str:
    slot_id = clean_text(row.get("slotId"))
    if slot_id in SWITCHING_FRAGMENT_SLOT_LABELS:
        return SWITCHING_FRAGMENT_SLOT_LABELS[slot_id]
    if clean_text(row.get("itemType")) == "무기":
        return "무기"
    return normalize_switching_fragment_slot(row.get("itemTypeDetail") or row.get("slotName"))


def switching_fragment_suffix_matches(item_name: str, buff_skill_name: str) -> bool:
    item_name = clean_text(item_name)
    if ":" not in item_name:
        return False
    suffix = item_name.rsplit(":", 1)[-1].strip()
    return normalize_switching_skill_name(suffix) == normalize_switching_skill_name(buff_skill_name)


def is_switching_fragment_item_name(item_name: str, buff_skill_name: str) -> bool:
    item_name = clean_text(item_name)
    if not (
        item_name.startswith("짙은 심연의 편린 ")
        or item_name.startswith("짙은 뒤틀린 심연의 ")
    ):
        return False
    if "제작 레시피" in item_name or "[결투장]" in item_name:
        return False
    return switching_fragment_suffix_matches(item_name, buff_skill_name)


def get_switching_fragment_search_terms(buff_skill_name: str) -> list[str]:
    terms = []
    for term in [
        clean_text(buff_skill_name),
        re.sub(r"\s+", "", clean_text(buff_skill_name)),
    ]:
        if term and term not in terms:
            terms.append(term)
    return terms


def item_detail_matches_job(detail: dict, job_name: str) -> bool:
    jobs = detail.get("jobs") or []
    if not jobs:
        return True
    return any(clean_text(job.get("jobName")) == clean_text(job_name) for job in jobs)


def _auction_row_to_switching_fragment_price(row: dict) -> dict:
    return {
        "listingCount": int(row.get("regCount") or 1),
        "minUnitPrice": row.get("unitPrice") or row.get("currentPrice"),
        "averagePrice": row.get("averagePrice") if row.get("averagePrice", 0) > 0 else None,
        "auctionNo": row.get("auctionNo"),
        "expireDate": row.get("expireDate"),
    }


def get_switching_fragment_auction_candidate_groups(buff_skill_name: str, job_name: str, dense_slots: set[str]) -> dict:
    needed_slots = SWITCHING_FRAGMENT_TARGET_SLOTS - set(dense_slots or [])
    if not needed_slots:
        return {}
    groups = {slot: [] for slot in needed_slots}
    seen_item_ids = set()
    for search_term in get_switching_fragment_search_terms(buff_skill_name):
        for page in range(SWITCHING_FRAGMENT_AUCTION_MAX_PAGES):
            rows = get_auction_rows_by_name(
                search_term,
                word_type="full",
                limit=SWITCHING_FRAGMENT_AUCTION_PAGE_LIMIT,
                offset=page * SWITCHING_FRAGMENT_AUCTION_PAGE_LIMIT,
            )
            if not rows:
                break
            for row in rows:
                item_id = clean_text(row.get("itemId"))
                item_name = clean_text(row.get("itemName"))
                unit_price = row.get("unitPrice") or row.get("currentPrice")
                if not item_id or item_id in seen_item_ids:
                    continue
                if not isinstance(unit_price, (int, float)) or unit_price <= 0:
                    continue
                if clean_text(row.get("itemRarity")) != "유니크":
                    continue
                if not item_detail_matches_job(row, job_name):
                    continue
                if not is_switching_fragment_item_name(item_name, buff_skill_name):
                    continue
                slot = get_switching_fragment_slot(row)
                if slot not in needed_slots or len(groups.get(slot) or []) >= SWITCHING_FRAGMENT_CANDIDATES_PER_SLOT:
                    continue
                seen_item_ids.add(item_id)
                groups[slot].append({
                    **row,
                    "itemId": item_id,
                    "itemName": item_name,
                    "auction": _auction_row_to_switching_fragment_price(row),
                })
            if all(groups.get(slot) for slot in needed_slots):
                break
        if all(groups.get(slot) for slot in needed_slots):
            break
    return {slot: rows for slot, rows in groups.items() if rows}


def get_switching_fragment_candidate_items(buff_skill_name: str, job_name: str) -> list:
    search_names = [
        f"짙은 심연의 편린 {buff_skill_name}",
        f"짙은 뒤틀린 심연 {buff_skill_name}",
    ]
    seen_ids = set()
    candidates = []
    for search_name in search_names:
        for row in search_items_by_name(search_name):
            item_id = clean_text(row.get("itemId"))
            item_name = clean_text(row.get("itemName"))
            if not item_id or item_id in seen_ids:
                continue
            if "짙은" not in item_name or "심연" not in item_name or not switching_skill_name_matches(item_name, buff_skill_name):
                continue
            if "제작 레시피" in item_name or "[결투장]" in item_name:
                continue
            if not any(clean_text(job.get("jobName")) == job_name for job in row.get("jobs") or []):
                continue
            seen_ids.add(item_id)
            candidates.append(row)
    return candidates
