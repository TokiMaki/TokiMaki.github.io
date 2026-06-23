from ..neople_client import clean_text
from ..upgrade_payloads import title_item_matches


def build_title_upgrade_groups(title_db: dict) -> list[dict]:
    return title_db.get("groups") or [
        {
            "groupName": keyword,
            "searchName": keyword,
            "itemType": "칭호",
        }
        for keyword in title_db.get("keywords") or []
    ]


def get_title_group_item_ids(title_group: dict, key: str) -> list[str]:
    return [
        clean_text(item.get("itemId"))
        for item in title_group.get(key) or []
        if isinstance(item, dict) and clean_text(item.get("itemId"))
    ]


def normalize_title_price_search_config(search_config) -> dict:
    if isinstance(search_config, str):
        search_config = {"query": search_config}
    if not isinstance(search_config, dict):
        return {}
    search_query = clean_text(search_config.get("query"))
    return {**search_config, "query": search_query} if search_query else {}


def title_box_search_row_matches(row: dict, search_config: dict) -> bool:
    item_name = clean_text(row.get("itemName"))
    exact_names = {clean_text(name) for name in search_config.get("includeItemNames") or []}
    prefixes = [clean_text(prefix) for prefix in search_config.get("includeNamePrefixes") or []]
    return (
        ("칭호 선택 상자" in item_name)
        and (
            not exact_names and not prefixes
            or item_name in exact_names
            or any(item_name.startswith(prefix) for prefix in prefixes)
        )
    )


def resolve_title_group_sources(title_group: dict, fetch_item_details, search_items_by_name) -> dict:
    keyword = clean_text(title_group.get("searchName") or title_group.get("groupName"))
    errors = []
    title_details = []
    box_details = []
    if not keyword:
        return {"keyword": "", "titleDetails": [], "boxDetails": [], "errors": errors}

    title_item_ids = get_title_group_item_ids(title_group, "titleItems")
    price_item_ids = get_title_group_item_ids(title_group, "priceItems")
    if title_item_ids:
        details = fetch_item_details(title_item_ids)
        title_details = [
            detail for detail in details
            if detail.get("itemTypeDetail") == "칭호"
        ]
        box_details = [
            detail for detail in fetch_item_details(price_item_ids)
            if "칭호 선택 상자" in clean_text(detail.get("itemName"))
        ] if price_item_ids else []
    else:
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

    for raw_search_config in title_group.get("priceSearches") or []:
        search_config = normalize_title_price_search_config(raw_search_config)
        search_query = clean_text(search_config.get("query"))
        if not search_query:
            continue
        try:
            for row in search_items_by_name(search_query):
                if title_box_search_row_matches(row, search_config):
                    box_details.extend(fetch_item_details([row.get("itemId")]))
        except Exception as exc:
            errors.append({"keyword": search_query, "error": str(exc)})

    return {
        "keyword": keyword,
        "titleDetails": title_details,
        "boxDetails": box_details,
        "errors": errors,
    }
