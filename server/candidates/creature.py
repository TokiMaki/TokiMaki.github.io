from ..neople_client import clean_text
from ..upgrade_payloads import creature_item_matches


def iter_creature_upgrade_configs(creature_db: dict) -> list[dict]:
    groups = creature_db.get("groups") or []
    if groups:
        return groups

    direct_items = creature_db.get("items") or []
    if not direct_items:
        return []

    grouped = {}
    for item in direct_items:
        group_name = clean_text(item.get("groupName") or item.get("searchName") or item.get("name"))
        if not group_name:
            continue
        group = grouped.setdefault(group_name, {
            "groupName": group_name,
            "searchName": clean_text(item.get("searchName") or group_name),
            "itemType": clean_text(item.get("itemType")) or "크리쳐",
            "targetFame": item.get("targetFame"),
            "candidates": [],
        })
        if group.get("targetFame") is None and item.get("targetFame") is not None:
            group["targetFame"] = item.get("targetFame")
        group["candidates"].append(item)
    return list(grouped.values())


def normalize_creature_item_specs(candidate: dict, key: str) -> list[dict]:
    specs = []
    for item in candidate.get(key) or []:
        if isinstance(item, str):
            item_id = clean_text(item)
            if item_id:
                specs.append({"itemId": item_id})
            continue
        if not isinstance(item, dict):
            continue
        item_id = clean_text(item.get("itemId"))
        item_name = clean_text(item.get("itemName"))
        if item_id or item_name:
            specs.append({**item, "itemId": item_id, "itemName": item_name})
    return specs


def creature_search_row_matches(row: dict, search_config: dict) -> bool:
    item_name = clean_text(row.get("itemName"))
    if not item_name:
        return False
    exact_names = {clean_text(name) for name in search_config.get("includeItemNames") or []}
    prefixes = [clean_text(prefix) for prefix in search_config.get("includeNamePrefixes") or []]
    if exact_names and item_name in exact_names:
        return True
    if prefixes and any(item_name.startswith(prefix) for prefix in prefixes):
        return True
    query = clean_text(search_config.get("query"))
    return bool(query and query in item_name)


def iter_creature_search_configs(candidate: dict, key: str) -> list[dict]:
    configs = []
    for search_config in candidate.get(key) or []:
        if isinstance(search_config, str):
            query = clean_text(search_config)
            if query:
                configs.append({"query": query})
            continue
        if isinstance(search_config, dict):
            query = clean_text(search_config.get("query"))
            if query:
                configs.append({**search_config, "query": query})
    return configs


def resolve_creature_candidate_sources(candidate: dict, candidate_target_fame, search_items_by_name) -> dict:
    matched = {}
    price_only_item_ids = set()
    effect_item_ids = set()
    errors = []
    effect_item_specs = normalize_creature_item_specs(candidate, "effectItems")
    if not effect_item_specs:
        effect_item_specs = [
            {"itemId": clean_text(item_id)}
            for item_id in [
                candidate.get("itemId"),
                *(candidate.get("itemIds") or []),
            ]
            if clean_text(item_id)
        ]
    for item in effect_item_specs:
        item_id = clean_text(item.get("itemId"))
        if not item_id:
            continue
        matched[item_id] = item
        effect_item_ids.add(item_id)

    price_item_specs = normalize_creature_item_specs(candidate, "priceItems")
    if not price_item_specs:
        price_item_specs = [
            {"itemId": clean_text(item_id)}
            for item_id in candidate.get("priceItemIds") or []
            if clean_text(item_id)
        ]
    for item in price_item_specs:
        item_id = clean_text(item.get("itemId"))
        if not item_id:
            continue
        matched[item_id] = item
        if item_id not in effect_item_ids:
            price_only_item_ids.add(item_id)

    effect_searches = iter_creature_search_configs(candidate, "effectSearches")
    price_searches = iter_creature_search_configs(candidate, "priceSearches")
    if not effect_searches and not price_searches:
        effect_searches = [
            {
                "query": clean_text(search_name),
                "includeItemNames": candidate.get("includeItemNames") or [],
                "includeNamePrefixes": candidate.get("includeNamePrefixes") or [],
                "legacy": True,
            }
            for search_name in candidate.get("searchNames") or [candidate.get("name")]
            if clean_text(search_name)
        ]
    for search_config in effect_searches:
        try:
            for row in search_items_by_name(clean_text(search_config.get("query"))):
                if search_config.get("legacy"):
                    is_match = creature_item_matches(row, candidate, candidate_target_fame)
                else:
                    is_match = creature_search_row_matches(row, search_config)
                if is_match:
                    matched[row["itemId"]] = row
                    effect_item_ids.add(row["itemId"])
        except Exception as exc:
            errors.append({"name": candidate.get("name"), "searchName": search_config.get("query"), "error": str(exc)})
    for search_config in price_searches:
        try:
            for row in search_items_by_name(clean_text(search_config.get("query"))):
                if creature_search_row_matches(row, search_config):
                    matched[row["itemId"]] = row
                    if row["itemId"] not in effect_item_ids:
                        price_only_item_ids.add(row["itemId"])
        except Exception as exc:
            errors.append({"name": candidate.get("name"), "searchName": search_config.get("query"), "error": str(exc)})

    return {
        "candidate": candidate,
        "candidateTargetFame": candidate_target_fame,
        "matched": matched,
        "priceOnlyItemIds": price_only_item_ids,
        "errors": errors,
    }


def resolve_creature_upgrade_sources(creature_db: dict, search_items_by_name) -> list[dict]:
    groups = []
    for group in iter_creature_upgrade_configs(creature_db):
        target_fame = group.get("targetFame")
        candidate_sources = [
            resolve_creature_candidate_sources(
                candidate,
                candidate.get("targetFame", target_fame),
                search_items_by_name,
            )
            for candidate in group.get("candidates") or []
        ]
        groups.append({
            "groupPayload": {key: group.get(key) for key in ("groupName", "searchName", "itemType")},
            "candidateSources": candidate_sources,
        })
    return groups
