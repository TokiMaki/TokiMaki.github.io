from __future__ import annotations

import time
from contextvars import ContextVar
from copy import deepcopy
from urllib.parse import parse_qs, urlparse


_ACTIVE_TRACE: ContextVar[dict | None] = ContextVar("neople_api_fanout_trace", default=None)


def start_api_fanout_trace(route: str, server_id: str = "", character_id: str = ""):
    payload = {
        "route": route,
        "serverId": server_id,
        "characterId": character_id,
        "startedAt": time.perf_counter(),
        "apiCalls": {},
        "cache": {},
        "resolvedPrice": {},
        "multiItems": {
            "calls": 0,
            "requestedIds": 0,
            "uniqueIds": 0,
        },
    }
    return _ACTIVE_TRACE.set(payload)


def finish_api_fanout_trace(token) -> dict:
    trace = _ACTIVE_TRACE.get() or {}
    elapsed_ms = round((time.perf_counter() - float(trace.get("startedAt") or time.perf_counter())) * 1000)
    summary = {
        "route": trace.get("route"),
        "serverId": trace.get("serverId"),
        "characterId": trace.get("characterId"),
        "elapsedMs": elapsed_ms,
        "apiCalls": deepcopy(trace.get("apiCalls") or {}),
        "cache": deepcopy(trace.get("cache") or {}),
        "resolvedPrice": deepcopy(trace.get("resolvedPrice") or {}),
        "multiItems": deepcopy(trace.get("multiItems") or {}),
    }
    _ACTIVE_TRACE.reset(token)
    return summary


def record_neople_api_call(url: str):
    trace = _ACTIVE_TRACE.get()
    if trace is None:
        return
    category = categorize_neople_api_url(url)
    api_calls = trace.setdefault("apiCalls", {})
    api_calls[category] = int(api_calls.get(category) or 0) + 1
    if category == "multi_items":
        query = parse_qs(urlparse(url).query)
        item_ids = [
            item_id
            for item_id in ",".join(query.get("itemIds") or []).split(",")
            if item_id
        ]
        multi_items = trace.setdefault("multiItems", {})
        multi_items["calls"] = int(multi_items.get("calls") or 0) + 1
        multi_items["requestedIds"] = int(multi_items.get("requestedIds") or 0) + len(item_ids)
        multi_items["uniqueIds"] = int(multi_items.get("uniqueIds") or 0) + len(set(item_ids))


def record_cache_event(name: str, result: str, count: int = 1):
    trace = _ACTIVE_TRACE.get()
    if trace is None or int(count or 0) <= 0:
        return
    cache = trace.setdefault("cache", {})
    bucket = cache.setdefault(name, {})
    bucket[result] = int(bucket.get(result) or 0) + int(count or 0)


def record_resolved_price_cache_event(domain: str, result: str, count: int = 1):
    trace = _ACTIVE_TRACE.get()
    if trace is None or int(count or 0) <= 0:
        return
    domain = str(domain or "unknown")
    result = str(result or "")
    if not result:
        return
    resolved_price = trace.setdefault("resolvedPrice", {})
    total = resolved_price.setdefault("total", {})
    total[result] = int(total.get(result) or 0) + int(count or 0)
    by_domain = resolved_price.setdefault("byDomain", {})
    bucket = by_domain.setdefault(domain, {})
    bucket[result] = int(bucket.get(result) or 0) + int(count or 0)


def categorize_neople_api_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    query = parse_qs(parsed.query)
    if path == "/df/multi/items":
        return "multi_items"
    if path == "/df/items":
        return "item_search"
    if path == "/df/auction":
        if query.get("itemIds"):
            return "auction_item_ids"
        if query.get("itemName"):
            return "auction_item_name"
        return "auction_item_id"
    if path.endswith("/skill/style"):
        return "skill_style"
    if path.startswith("/df/skills/"):
        parts = [part for part in path.split("/") if part]
        return "skill_detail" if len(parts) >= 4 else "skill_list"
    if "/characters/" in path:
        if path.endswith("/timeline"):
            return "timeline"
        if path.count("/") <= 5:
            return "character_detail"
        return "character_payload"
    if path.endswith("/characters"):
        return "character_search"
    return "other"
