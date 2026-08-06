import json
import math

from .calculators.setting_value_calculator import (
    build_setting_value_payload,
    calculate_current_tune_details,
    calculate_equipment_upgrade_details,
    get_priced_row_gold,
    price_cost_row,
)
from .neople_client import clean_item_display_name, clean_text


def _number(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


_EFFECT_LABELS = {
    "str": "힘",
    "int": "지능",
    "vit": "체력",
    "spr": "정신력",
    "allStat": "모든 스탯",
    "attack": "공격력",
    "attackIncrease": "공격력 증가",
    "attackAmplification": "공격력 증폭",
    "finalDamage": "최종 데미지",
    "buffPower": "버프력",
    "buffAmplification": "버프력 증폭",
    "elementAll": "모든 속성 강화",
    "elementFire": "화속성 강화",
    "elementWater": "수속성 강화",
    "elementLight": "명속성 강화",
    "elementDark": "암속성 강화",
    "critical": "크리티컬 확률",
}


def _format_number(value) -> str:
    number = _number(value)
    rounded = round(number)
    return str(rounded) if abs(number - rounded) < 0.000001 else f"{number:.3f}".rstrip("0").rstrip(".")


def _format_effect_text(effects: dict | None) -> str:
    parts = []
    for key, value in (effects or {}).items():
        number = _number(value)
        if abs(number) <= 0.000001:
            continue
        sign = "+" if number > 0 else ""
        suffix = "%" if key in {"finalDamage", "attackIncrease", "attackAmplification", "buffAmplification", "critical"} else ""
        parts.append(f"{_EFFECT_LABELS.get(key, clean_text(key))} {sign}{_format_number(number)}{suffix}")
    return " / ".join(parts)


def _format_reinforce_skill_text(reinforce_skill) -> str:
    parts = []
    for job in reinforce_skill or []:
        for skill in job.get("skills") or []:
            name = clean_text(skill.get("name"))
            value = _number(skill.get("value"))
            if name and value:
                parts.append(f"{name} +{_format_number(value)}Lv")
    return " / ".join(parts)


def _build_detail(
    label: str,
    gold,
    *,
    slot: str = "",
    item_name: str = "",
    price_item_name: str = "",
    effect_text: str = "",
    route: str = "",
    level=None,
    kind: str = "",
    note: str = "",
    extra: dict | None = None,
) -> dict:
    resolved_gold = None
    if isinstance(gold, (int, float)) and math.isfinite(gold) and gold >= 0:
        resolved_gold = int(round(gold))
    detail = {
        "label": clean_text(label),
        "slot": clean_text(slot),
        "itemName": clean_item_display_name(item_name),
        "priceItemName": clean_item_display_name(price_item_name),
        "effectText": clean_text(effect_text),
        "route": clean_text(route),
        "kind": clean_text(kind),
        "note": clean_text(note),
        "gold": resolved_gold,
        "priceStatus": "priced" if resolved_gold is not None else "unpriced",
    }
    if level is not None:
        detail["level"] = int(_number(level))
    if extra:
        detail.update(extra)
    return detail


def _sum_detail_gold(details: list) -> float:
    return sum(
        _number(detail.get("gold"))
        for detail in details or []
        if detail.get("gold") is not None
    )


def _get_candidate_price_item_name(candidate: dict) -> str:
    price_item = candidate.get("priceItem") or {}
    return clean_item_display_name(
        price_item.get("itemName")
        or candidate.get("displayName")
        or candidate.get("itemName")
        or candidate.get("name")
    )


def _flatten_group_candidates(groups: list) -> list:
    return [
        candidate
        for group in groups or []
        for candidate in group.get("candidates") or []
        if isinstance(candidate, dict)
    ]


def _normalize_effects(effects: dict | None) -> tuple:
    return tuple(sorted(
        (clean_text(key), round(_number(value), 6))
        for key, value in (effects or {}).items()
        if clean_text(key) and abs(_number(value)) > 0.000001
    ))


def _normalize_nested(value):
    if isinstance(value, dict):
        return {
            clean_text(key): _normalize_nested(item)
            for key, item in sorted(value.items(), key=lambda pair: clean_text(pair[0]))
            if clean_text(key)
        }
    if isinstance(value, list):
        return [_normalize_nested(item) for item in value]
    if isinstance(value, (int, float)):
        return round(_number(value), 6)
    return clean_text(value)


def _normalize_reinforce_skill(value) -> str:
    normalized = _normalize_nested(value or [])
    return json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _is_same_enchant_source(current: dict, source: dict) -> bool:
    if clean_text(current.get("slot")) != clean_text(source.get("slot")):
        return False
    if _normalize_effects(current.get("effects")) != _normalize_effects(source.get("effects")):
        return False
    current_skill = _normalize_reinforce_skill(current.get("reinforceSkill"))
    source_skill = _normalize_reinforce_skill(source.get("reinforceSkill"))
    return current_skill == source_skill


_ENCHANT_TIER_SLOT_GROUP = {
    "상의": "상의/하의",
    "하의": "상의/하의",
    "머리어깨": "어깨/벨트/신발",
    "벨트": "어깨/벨트/신발",
    "신발": "어깨/벨트/신발",
    "팔찌": "악세서리",
    "목걸이": "악세서리",
    "반지": "악세서리",
}


def _normalize_enchant_tier_effects(effects: dict | None, role: str = "") -> tuple:
    normalized = {
        clean_text(key): round(_number(value), 6)
        for key, value in (effects or {}).items()
        if clean_text(key) and abs(_number(value)) > 0.000001
    }
    if clean_text(role).lower() == "dealer":
        all_stat = normalized.pop("allStat", None)
        if all_stat is not None:
            normalized.setdefault("str", all_stat)
            normalized.setdefault("int", all_stat)
        normalized.pop("vit", None)
        normalized.pop("spr", None)
    return tuple(sorted(normalized.items()))


def _is_same_enchant_tier_source(current: dict, source: dict) -> bool:
    current_slot = clean_text(current.get("slot"))
    source_slot = clean_text(source.get("slot"))
    current_group = _ENCHANT_TIER_SLOT_GROUP.get(current_slot, current_slot)
    source_group = _ENCHANT_TIER_SLOT_GROUP.get(source_slot, source_slot)
    if not current_group or current_group != source_group:
        return False
    role = clean_text(source.get("role"))
    if _normalize_enchant_tier_effects(current.get("effects"), role) \
            != _normalize_enchant_tier_effects(source.get("effects"), role):
        return False
    current_skill = _normalize_reinforce_skill(current.get("reinforceSkill"))
    source_skill = _normalize_reinforce_skill(source.get("reinforceSkill"))
    return current_skill == source_skill


def _get_current_enchant_tier(current: dict, cards: list) -> str:
    tier_priority = {"종결": 3, "준종결": 2, "가성비": 1}
    matched_tiers = [
        clean_text(source.get("tier") or card.get("tier"))
        for card in cards or []
        for source in card.get("sources") or []
        if _is_same_enchant_tier_source(current, source)
        and clean_text(source.get("tier") or card.get("tier"))
    ]
    return max(
        matched_tiers,
        key=lambda tier: tier_priority.get(tier, 0),
        default=clean_text(current.get("tier")),
    )


def annotate_current_enchant_tiers(current_rows: list, cards: list) -> list:
    annotated = []
    for current in current_rows or []:
        tier = _get_current_enchant_tier(current, cards)
        annotated.append({
            **current,
            "tier": tier,
            "isEnd": tier == "종결",
        })
    return annotated


def _get_current_enchant_details(current_rows: list, cards: list) -> list:
    details = []
    for current in current_rows or []:
        slot = clean_text(current.get("slot"))
        if slot == "칭호":
            continue
        if not current.get("effects") and not current.get("reinforceSkill"):
            continue
        matched = [
            (card, source)
            for card in cards or []
            for source in card.get("sources") or []
            if _is_same_enchant_source(current, source)
        ]
        matched_tier = _get_current_enchant_tier(current, cards)
        is_end = matched_tier == "종결"
        priced = []
        for card, source in matched:
            if card.get("acquisition"):
                priced.append((0.0, card, source, "재료 획득"))
                continue
            price = get_priced_row_gold(card)
            if price is not None:
                priced.append((price, card, source, "경매장"))
        effect_text = " / ".join(filter(None, [
            _format_effect_text(current.get("effects")),
            _format_reinforce_skill_text(current.get("reinforceSkill")),
        ]))
        if not priced:
            details.append(_build_detail(
                f"{slot or '장비'} 마법부여",
                None,
                slot=slot,
                item_name=current.get("itemName"),
                effect_text=effect_text,
                kind="enchant",
                note="동일한 스펙업 순서 가격 후보를 찾지 못함",
                extra={
                    "equipmentItemName": current.get("itemName"),
                    "effects": current.get("effects") or {},
                    "reinforceSkill": current.get("reinforceSkill") or [],
                    "tier": matched_tier,
                    "isEnd": is_end,
                },
            ))
            continue
        gold, card, source, route = min(priced, key=lambda row: row[0])
        acquisition = card.get("acquisition") or {}
        price_item_name = _get_candidate_price_item_name(card)
        if not price_item_name:
            price_item_name = clean_item_display_name(
                acquisition.get("materialLabel")
                or acquisition.get("materialItemName")
                or acquisition.get("label")
                or "마법부여"
            )
        details.append(_build_detail(
            f"{slot or '장비'} 마법부여",
            gold,
            slot=slot,
            item_name=current.get("itemName"),
            price_item_name=price_item_name,
            effect_text=effect_text,
            route=route,
            kind="enchant",
            extra={
                "equipmentItemName": current.get("itemName"),
                "effects": current.get("effects") or {},
                "reinforceSkill": current.get("reinforceSkill") or [],
                "tier": matched_tier or clean_text(source.get("tier") or card.get("tier")),
                "isEnd": is_end,
            },
        ))
    return details


def _get_current_enchant_gold(current_rows: list, cards: list) -> float:
    return _sum_detail_gold(_get_current_enchant_details(current_rows, cards))


def _get_title_candidate_match(title: dict, candidates: list) -> tuple[dict | None, float | None]:
    current_tier = clean_text(title.get("variant") or title.get("tier") or "일반")
    current_effects = _normalize_effects(title.get("effects"))
    if not current_effects:
        return None, None

    priced = [
        (candidate, price)
        for candidate in candidates or []
        if clean_text(candidate.get("variant") or candidate.get("tier") or "일반") == current_tier
        and _normalize_effects(candidate.get("effects")) == current_effects
        if (price := get_priced_row_gold(candidate)) is not None
    ]
    return min(priced, key=lambda row: row[1]) if priced else (None, None)


def _get_title_candidate_gold(title: dict, candidates: list) -> float | None:
    return _get_title_candidate_match(title, candidates)[1]


def _get_aura_stage_signature(aura: dict) -> tuple:
    return (
        _normalize_effects(aura.get("effects")),
        _normalize_reinforce_skill(aura.get("itemReinforceSkill")),
        _normalize_reinforce_skill(aura.get("itemBuff")),
        round(_number(aura.get("skillDamageMultiplier") or 1), 6),
        round(_number(aura.get("skillDamagePercent")), 6),
    )


def _get_aura_candidate_match(aura: dict, candidates: list) -> tuple[dict | None, float | None]:
    item_id = clean_text(aura.get("itemId"))
    exact_prices = [
        (candidate, price)
        for candidate in candidates or []
        if item_id
        and clean_text(candidate.get("itemId")) == item_id
        and (price := get_priced_row_gold(candidate)) is not None
    ]
    if exact_prices:
        return min(exact_prices, key=lambda row: row[1])

    current_signature = _get_aura_stage_signature(aura)
    has_stage_signal = bool(
        current_signature[0]
        or current_signature[1] != "[]"
        or current_signature[2] != "[]"
        or abs(current_signature[3] - 1) > 0.000001
        or abs(current_signature[4]) > 0.000001
    )
    if not has_stage_signal:
        return None, None
    stage_prices = [
        (candidate, price)
        for candidate in candidates or []
        if _get_aura_stage_signature(candidate) == current_signature
        and (price := get_priced_row_gold(candidate)) is not None
    ]
    return min(stage_prices, key=lambda row: row[1]) if stage_prices else (None, None)


def _get_aura_candidate_gold(aura: dict, candidates: list) -> float | None:
    return _get_aura_candidate_match(aura, candidates)[1]


def _creature_candidate_contains_item(candidate: dict, item_id: str) -> bool:
    if clean_text(candidate.get("itemId")) == item_id:
        return True
    return any(
        clean_text(item.get("itemId")) == item_id
        for item in candidate.get("items") or []
    )


def _get_creature_candidate_match(creature: dict, candidates: list) -> tuple[dict | None, float | None]:
    item_id = clean_text(creature.get("itemId"))
    exact_prices = [
        (candidate, price)
        for candidate in candidates or []
        if _creature_candidate_contains_item(candidate, item_id)
        and (price := get_priced_row_gold(candidate)) is not None
    ]
    if exact_prices:
        return min(exact_prices, key=lambda row: row[1])

    current_tier = clean_text(creature.get("variant"))
    if not current_tier:
        return None, None
    tier_prices = [
        (candidate, price)
        for candidate in candidates or []
        if clean_text(candidate.get("variant") or "일반") == current_tier
        and (price := get_priced_row_gold(candidate)) is not None
    ]
    return min(tier_prices, key=lambda row: row[1]) if tier_prices else (None, None)


def _get_creature_candidate_gold(creature: dict, candidates: list) -> float | None:
    return _get_creature_candidate_match(creature, candidates)[1]


def _get_artifact_stage_signature(artifact: dict) -> tuple:
    return (
        clean_text(artifact.get("slotColor")).upper(),
        _normalize_effects(artifact.get("effects")),
        clean_text(artifact.get("element")).lower(),
        round(_number(artifact.get("artifactAllElement")), 6),
        round(_number(artifact.get("artifactSingleElement")), 6),
    )


def _get_artifact_candidate_match(artifact: dict, groups: list) -> tuple[dict | None, float | None]:
    item_id = clean_text(artifact.get("itemId"))
    candidates = _flatten_group_candidates(groups)
    exact_prices = [
        (candidate, price)
        for candidate in candidates
        if clean_text(candidate.get("itemId")) == item_id
        and (price := get_priced_row_gold(candidate)) is not None
    ]
    if exact_prices:
        return min(exact_prices, key=lambda row: row[1])

    current_signature = _get_artifact_stage_signature(artifact)
    if not current_signature[0] or not current_signature[1]:
        return None, None
    stage_prices = [
        (candidate, price)
        for candidate in candidates
        if _get_artifact_stage_signature(candidate) == current_signature
        and (price := get_priced_row_gold(candidate)) is not None
    ]
    return min(stage_prices, key=lambda row: row[1]) if stage_prices else (None, None)


def _get_artifact_candidate_gold(artifact: dict, groups: list) -> float | None:
    return _get_artifact_candidate_match(artifact, groups)[1]


def _get_direct_auction(item_id: str, direct_prices: dict) -> dict:
    item_id = clean_text(item_id)
    if not item_id:
        return {}
    return direct_prices.get(item_id) or {}


def _get_direct_gold(item_id: str, direct_prices: dict) -> float | None:
    return get_priced_row_gold({
        "auction": _get_direct_auction(item_id, direct_prices),
    })


def _get_direct_price_metadata(
    item: dict,
    direct_prices: dict,
    *,
    missing_note: str,
) -> tuple[float | None, str, str]:
    auction = _get_direct_auction(item.get("itemId"), direct_prices)
    price = get_priced_row_gold({"auction": auction})
    item_name = clean_item_display_name(item.get("itemName"))
    price_item_name = clean_item_display_name(auction.get("priceItemName")) or item_name
    price_source = clean_text(auction.get("priceSource"))
    if auction.get("isLastKnownPrice"):
        note = "현재 매물 없음 · 마지막 확인 가격"
    elif price_source == "sameNameCachedItem":
        note = "동일 이름 거래품의 캐시 가격"
    elif price_source == "exactItemName":
        note = "동일 이름 거래품의 경매장 가격"
    elif price is not None:
        note = "현재 아이템 직접 거래 가격"
    else:
        note = missing_note
    return price, price_item_name, note


def _get_item_gold_with_fallback(
    item: dict,
    preferred_gold,
    direct_prices: dict,
) -> float | None:
    if isinstance(preferred_gold, (int, float)) and math.isfinite(preferred_gold) and preferred_gold >= 0:
        return float(preferred_gold)
    return _get_direct_gold(item.get("itemId"), direct_prices)


def _split_avatar_emblems(avatar_slots: list) -> tuple[list, list]:
    normal = []
    platinum = []
    for row in avatar_slots or []:
        avatar_slot = clean_text(row.get("slotName") or row.get("slot") or row.get("slotId"))
        raw_emblems = [
            *(row.get("emblems") or []),
            *((row.get("avatar") or {}).get("emblems") or []),
        ]
        raw_platinum = list(row.get("platinumEmblems") or [])
        for emblem in raw_emblems:
            item_name = clean_item_display_name(emblem.get("itemName"))
            slot_color = clean_text(emblem.get("slotColor"))
            normalized = {
                "itemId": clean_text(emblem.get("itemId")),
                "itemName": item_name,
                "slotColor": slot_color,
                "avatarSlot": avatar_slot,
            }
            if "플래티넘" in item_name or "플래티넘" in slot_color:
                platinum.append(normalized)
            else:
                normal.append(normalized)
        platinum.extend({
            "itemId": clean_text(emblem.get("itemId")),
            "itemName": clean_item_display_name(emblem.get("itemName")),
            "slotColor": clean_text(emblem.get("slotColor")),
            "avatarSlot": avatar_slot,
        } for emblem in raw_platinum)
    return normal, platinum


def _get_platinum_gold(
    emblem: dict,
    platinum_price_by_name: dict,
    direct_prices: dict,
) -> float | None:
    item_name = clean_item_display_name(emblem.get("itemName"))
    resolved = platinum_price_by_name.get(item_name) or {}
    resolved_price = get_priced_row_gold(resolved)
    if resolved_price is not None:
        return resolved_price
    return _get_direct_gold(emblem.get("itemId"), direct_prices)


def _sum_direct_items(items: list, direct_prices: dict) -> float:
    return sum(
        price
        for item in items or []
        if (price := _get_direct_gold(item.get("itemId"), direct_prices)) is not None
    )


def _get_direct_item_details(items: list, direct_prices: dict, *, kind: str) -> list:
    details = []
    for item in items or []:
        item_name = clean_item_display_name(item.get("itemName"))
        if not clean_text(item.get("itemId")) and not item_name:
            continue
        slot = clean_text(
            item.get("avatarSlot")
            or item.get("slotName")
            or item.get("slot")
            or item.get("slotId")
        )
        price, price_item_name, note = _get_direct_price_metadata(
            item,
            direct_prices,
            missing_note="현재 아이템과 동일 이름 거래품 가격을 찾지 못함",
        )
        details.append(_build_detail(
            " / ".join(filter(None, [slot, item_name or kind])),
            price,
            slot=slot,
            item_name=item_name,
            price_item_name=price_item_name,
            kind=kind,
            note=note,
        ))
    return details


def _get_platinum_item_details(
    items: list,
    platinum_price_by_name: dict,
    direct_prices: dict,
    *,
    kind: str,
) -> list:
    details = []
    for item in items or []:
        item_name = clean_item_display_name(item.get("itemName"))
        slot = clean_text(
            item.get("avatarSlot")
            or item.get("slotName")
            or item.get("slot")
            or item.get("slotId")
        )
        resolved = platinum_price_by_name.get(item_name) or {}
        price = _get_platinum_gold(item, platinum_price_by_name, direct_prices)
        price_item_name = _get_candidate_price_item_name(resolved) or item_name
        details.append(_build_detail(
            " / ".join(filter(None, [slot, item_name or kind])),
            price,
            slot=slot,
            item_name=item_name,
            price_item_name=price_item_name,
            kind=kind,
            note="스펙업 순서 플래티넘 가격" if resolved else "현재 아이템 직접 가격",
        ))
    return details


def _get_cost_row_details(rows: list, *, kind: str) -> list:
    details = []
    for row in rows or []:
        gold = price_cost_row(row)
        slot = clean_text(row.get("slot"))
        item_name = clean_item_display_name(row.get("itemName"))
        fixed_gold = _number(row.get("fixedGold"))
        auction_gold = get_priced_row_gold(row)
        cost_parts = []
        if auction_gold is not None:
            cost_parts.append(f"본체/스크롤 {_format_number(auction_gold)}골드")
        if fixed_gold > 0:
            cost_parts.append(f"고정 {_format_number(fixed_gold)}골드")
        material_rows = []
        for material in row.get("materials") or []:
            amount = _number(material.get("amount"))
            if amount <= 0:
                continue
            material_name = clean_item_display_name(
                material.get("itemName") or material.get("label") or material.get("key")
            )
            auction = material.get("auction") or {}
            is_display_only = clean_text(auction.get("priceSource")) == "displayOnly"
            unit_price = get_priced_row_gold({"auction": auction})
            material_gold = (
                0.0
                if is_display_only
                else amount * unit_price if unit_price is not None else None
            )
            material_rows.append({
                "itemName": material_name,
                "amount": amount,
                "unitGold": int(round(unit_price)) if unit_price is not None else None,
                "gold": int(round(material_gold)) if material_gold is not None else None,
                "included": not is_display_only,
            })
            if is_display_only:
                cost_parts.append(f"{material_name} {_format_number(amount)}개 · 가치 합산 제외")
            elif material_gold is not None:
                cost_parts.append(
                    f"{material_name} {_format_number(amount)}개 × {_format_number(unit_price)}골드"
                )
            else:
                cost_parts.append(f"{material_name} {_format_number(amount)}개 × 가격 확인 불가")
        precision = row.get("precisionPercent")
        details.append(_build_detail(
            " / ".join(filter(None, [slot, item_name or kind])),
            gold,
            slot=slot,
            item_name=item_name,
            price_item_name=item_name,
            effect_text=" + ".join(cost_parts),
            kind=kind,
            note=(
                f"정밀도 {precision}% 기준"
                if precision is not None
                else ""
            ),
            extra={
                "fixedGold": int(round(fixed_gold)),
                "auctionGold": int(round(auction_gold)) if auction_gold is not None else None,
                "materials": material_rows,
            },
        ))
    return details


def _build_equivalent_item_detail(
    current: dict,
    candidate: dict | None,
    gold,
    *,
    label: str,
    slot: str,
    kind: str,
    direct_fallback: bool = False,
) -> dict:
    current_name = clean_item_display_name(current.get("itemName"))
    candidate = candidate or {}
    price_item_name = _get_candidate_price_item_name(candidate) or current_name
    route = clean_text(candidate.get("purchaseRouteLabel") or candidate.get("purchaseRoute"))
    effect_text = _format_effect_text(current.get("effects"))
    note = "현재 아이템 직접 가격" if direct_fallback else "스펙업 순서의 동급 가격 후보"
    if gold is None:
        note = "동급 가격 후보와 현재 아이템 가격을 모두 찾지 못함"
    return _build_detail(
        label,
        gold,
        slot=slot,
        item_name=current_name,
        price_item_name=price_item_name,
        effect_text=effect_text,
        route=route,
        kind=kind,
        note=note,
    )


def collect_setting_value_direct_items(
    title: dict,
    aura: dict,
    creature: dict,
    avatar_slots: list,
    buff_loadout: dict,
) -> list[dict]:
    normal_emblems, platinum_emblems = _split_avatar_emblems(avatar_slots)
    items = [
        title,
        aura,
        creature,
        *(creature.get("artifacts") or []),
        *normal_emblems,
        *platinum_emblems,
    ]
    for equipment in buff_loadout.get("equipment") or []:
        if clean_text(equipment.get("slotId")) == "TITLE" or (equipment.get("buffContribution") or {}).get("isDenseFragment"):
            items.append(equipment)
    for avatar in buff_loadout.get("avatar") or []:
        if clean_text(avatar.get("buffAvatarSource")) != "actual":
            continue
        items.append(avatar)
        items.extend(avatar.get("emblems") or [])
        items.extend(avatar.get("platinumEmblems") or [])
    items.extend(buff_loadout.get("creature") or [])

    result = []
    seen_ids = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        item_id = clean_text(item.get("itemId"))
        if not item_id or item_id in seen_ids:
            continue
        seen_ids.add(item_id)
        result.append({
            "itemId": item_id,
            "itemName": clean_item_display_name(item.get("itemName")),
            "itemTypeDetail": clean_text(item.get("itemTypeDetail")),
        })
    return result


def collect_setting_value_direct_item_ids(
    title: dict,
    aura: dict,
    creature: dict,
    avatar_slots: list,
    buff_loadout: dict,
) -> list[str]:
    return [
        item.get("itemId")
        for item in collect_setting_value_direct_items(
            title,
            aura,
            creature,
            avatar_slots,
            buff_loadout,
        )
    ]


def _get_buff_enhancement_details(
    buff_loadout: dict,
    title: dict,
    creature: dict,
    title_candidates: list,
    creature_candidates: list,
    platinum_price_by_name: dict,
    direct_prices: dict,
    buff_title_price_candidate: dict | None = None,
    buff_creature_price_candidate: dict | None = None,
) -> list:
    details = []
    main_title_id = clean_text(title.get("itemId"))
    main_creature_id = clean_text(creature.get("itemId"))

    for equipment in buff_loadout.get("equipment") or []:
        item_id = clean_text(equipment.get("itemId"))
        slot = clean_text(equipment.get("slotName") or equipment.get("slot") or equipment.get("slotId"))
        if clean_text(equipment.get("slotId")) == "TITLE":
            if not item_id or item_id == main_title_id:
                continue
            candidate = buff_title_price_candidate or {}
            price = get_priced_row_gold(candidate)
            details.append(_build_equivalent_item_detail(
                equipment,
                candidate,
                price,
                label="버프강화 칭호",
                slot="버프강화 칭호",
                kind="buffTitle",
                direct_fallback=False,
            ))
            continue
        if not (equipment.get("buffContribution") or {}).get("isDenseFragment"):
            continue
        item_name = clean_item_display_name(equipment.get("itemName"))
        price, price_item_name, note = _get_direct_price_metadata(
            equipment,
            direct_prices,
            missing_note="현재 장비와 동일 이름 거래품 가격을 찾지 못함",
        )
        details.append(_build_detail(
            " / ".join(filter(None, [slot, item_name or "짙은 편린 장비"])),
            price,
            slot=slot,
            item_name=item_name,
            price_item_name=price_item_name,
            kind="buffDenseFragment",
            note=note,
        ))

    for avatar in buff_loadout.get("avatar") or []:
        if clean_text(avatar.get("buffAvatarSource")) != "actual":
            continue
        avatar_slot = clean_text(avatar.get("slotName") or avatar.get("slot") or avatar.get("slotId"))
        avatar_name = clean_item_display_name(avatar.get("itemName"))
        body_price, price_item_name, note = _get_direct_price_metadata(
            avatar,
            direct_prices,
            missing_note="현재 아바타와 동일 이름 거래품 가격을 찾지 못함",
        )
        details.append(_build_detail(
            " / ".join(filter(None, [avatar_slot, avatar_name or "버프강화 아바타"])),
            body_price,
            slot=avatar_slot,
            item_name=avatar_name,
            price_item_name=price_item_name,
            kind="buffAvatar",
            note=note,
        ))
        avatar_emblems = [
            {
                **emblem,
                "avatarSlot": avatar_slot,
            }
            for emblem in avatar.get("emblems") or []
        ]
        details.extend(_get_direct_item_details(
            avatar_emblems,
            direct_prices,
            kind="buffEmblem",
        ))
        avatar_platinum = [
            {
                **emblem,
                "avatarSlot": avatar_slot,
            }
            for emblem in avatar.get("platinumEmblems") or []
        ]
        details.extend(_get_platinum_item_details(
            avatar_platinum,
            platinum_price_by_name,
            direct_prices,
            kind="buffPlatinumEmblem",
        ))

    for buff_creature in buff_loadout.get("creature") or []:
        item_id = clean_text(buff_creature.get("itemId"))
        if not item_id or item_id == main_creature_id:
            continue
        candidate = buff_creature_price_candidate or {}
        preferred = get_priced_row_gold(candidate)
        if preferred is None:
            candidate, preferred = _get_creature_candidate_match(buff_creature, creature_candidates)
        direct_fallback = preferred is None
        price = _get_item_gold_with_fallback(buff_creature, preferred, direct_prices)
        details.append(_build_equivalent_item_detail(
            buff_creature,
            candidate,
            price,
            label="버프강화 크리쳐",
            slot="버프강화 크리쳐",
            kind="buffCreature",
            direct_fallback=direct_fallback,
        ))
    return details


def _get_buff_enhancement_gold(
    buff_loadout: dict,
    title: dict,
    creature: dict,
    title_candidates: list,
    creature_candidates: list,
    platinum_price_by_name: dict,
    direct_prices: dict,
    buff_title_price_candidate: dict | None = None,
    buff_creature_price_candidate: dict | None = None,
) -> float:
    return _sum_detail_gold(_get_buff_enhancement_details(
        buff_loadout,
        title,
        creature,
        title_candidates,
        creature_candidates,
        platinum_price_by_name,
        direct_prices,
        buff_title_price_candidate,
        buff_creature_price_candidate,
    ))


def build_character_setting_value(
    *,
    enchant_rows: list,
    equipment_upgrades: list,
    title: dict,
    aura: dict,
    creature: dict,
    avatar_slots: list,
    buff_loadout: dict,
    upgrade_expected_db: dict,
    material_prices: dict,
    black_fang_rows: list,
    unique_equipment_rows: list,
    direct_prices: dict,
    enchant_catalog: dict,
    title_catalog: dict,
    aura_catalog: dict,
    creature_catalog: dict,
    platinum_price_by_name: dict | None = None,
    buff_title_price_candidate: dict | None = None,
    buff_creature_price_candidate: dict | None = None,
    oath_upgrades: dict | None = None,
    oath_tune_stage_db: dict | None = None,
) -> dict:
    upgrade_details = calculate_equipment_upgrade_details(
        equipment_upgrades,
        upgrade_expected_db,
        material_prices,
    )
    tune_details = calculate_current_tune_details(
        equipment_upgrades,
        oath_upgrades,
        oath_tune_stage_db,
        material_prices,
    )

    enchant_cards = enchant_catalog.get("cards") or []
    title_candidates = _flatten_group_candidates(title_catalog.get("groups") or [])
    aura_candidates = _flatten_group_candidates(aura_catalog.get("groups") or [])
    creature_candidates = _flatten_group_candidates(creature_catalog.get("groups") or [])
    artifact_groups = creature_catalog.get("artifactGroups") or []

    normal_emblems, platinum_emblems = _split_avatar_emblems(avatar_slots)
    platinum_price_by_name = platinum_price_by_name or {}

    enchant_details = _get_current_enchant_details(enchant_rows, enchant_cards)
    black_fang_details = _get_cost_row_details(black_fang_rows, kind="blackFang")

    title_details = []
    if title.get("itemId") or title.get("effects"):
        title_candidate, title_preferred = _get_title_candidate_match(title, title_candidates)
        title_direct_fallback = title_preferred is None
        title_gold = _get_item_gold_with_fallback(title, title_preferred, direct_prices)
        title_details.append(_build_equivalent_item_detail(
            title,
            title_candidate,
            title_gold,
            label="칭호·칭호 보주",
            slot="칭호",
            kind="title",
            direct_fallback=title_direct_fallback,
        ))

    aura_details = []
    if aura.get("itemId") or aura.get("effects"):
        aura_candidate, aura_gold = _get_aura_candidate_match(aura, aura_candidates)
        aura_details.append(_build_equivalent_item_detail(
            aura,
            aura_candidate,
            aura_gold,
            label="오라",
            slot="오라",
            kind="aura",
        ))

    creature_details = []
    if creature.get("itemId") or creature.get("effects"):
        creature_candidate, creature_preferred = _get_creature_candidate_match(
            creature,
            creature_candidates,
        )
        creature_direct_fallback = creature_preferred is None
        creature_gold = _get_item_gold_with_fallback(
            creature,
            creature_preferred,
            direct_prices,
        )
        creature_details.append(_build_equivalent_item_detail(
            creature,
            creature_candidate,
            creature_gold,
            label="크리쳐 본체",
            slot="크리쳐",
            kind="creature",
            direct_fallback=creature_direct_fallback,
        ))
    for artifact in creature.get("artifacts") or []:
        artifact_candidate, artifact_preferred = _get_artifact_candidate_match(
            artifact,
            artifact_groups,
        )
        artifact_direct_fallback = artifact_preferred is None
        artifact_gold = _get_item_gold_with_fallback(
            artifact,
            artifact_preferred,
            direct_prices,
        )
        artifact_type = clean_text(artifact.get("slotColor")).upper()
        creature_details.append(_build_equivalent_item_detail(
            artifact,
            artifact_candidate,
            artifact_gold,
            label=f"{artifact_type or '크리쳐'} 아티팩트",
            slot=f"{artifact_type or '크리쳐'} 아티팩트",
            kind="creatureArtifact",
            direct_fallback=artifact_direct_fallback,
        ))

    normal_emblem_details = _get_direct_item_details(
        normal_emblems,
        direct_prices,
        kind="emblem",
    )
    platinum_emblem_details = _get_platinum_item_details(
        platinum_emblems,
        platinum_price_by_name,
        direct_prices,
        kind="platinumEmblem",
    )
    buff_enhancement_details = _get_buff_enhancement_details(
        buff_loadout,
        title,
        creature,
        title_candidates,
        creature_candidates,
        platinum_price_by_name,
        direct_prices,
        buff_title_price_candidate,
        buff_creature_price_candidate,
    )

    complete_unique_rows = [
        row for row in unique_equipment_rows or []
        if row.get("priceComplete")
    ]
    unique_equipment_details = _get_cost_row_details(
        complete_unique_rows,
        kind="uniqueEquipment",
    )
    for row in unique_equipment_rows or []:
        if row.get("priceComplete"):
            continue
        slot = clean_text(row.get("slot"))
        item_name = clean_item_display_name(row.get("itemName"))
        unique_equipment_details.append(_build_detail(
            " / ".join(filter(None, [slot, item_name or "유일 장비"])),
            None,
            slot=slot,
            item_name=item_name,
            kind="uniqueEquipment",
            note="필요 재료 가격이 모두 준비되지 않음",
        ))

    category_details = {
        "amplification": upgrade_details.get("amplification") or [],
        "weaponReinforcement": upgrade_details.get("weaponReinforcement") or [],
        "equipmentTune": tune_details.get("equipmentTune") or [],
        "oathTune": tune_details.get("oathTune") or [],
        "blackFang": black_fang_details,
        "enchant": enchant_details,
        "title": title_details,
        "aura": aura_details,
        "creature": creature_details,
        "emblem": normal_emblem_details,
        "platinumEmblem": platinum_emblem_details,
        "buffEnhancement": buff_enhancement_details,
        "uniqueEquipment": unique_equipment_details,
    }
    category_values = {
        key: _sum_detail_gold(details)
        for key, details in category_details.items()
    }
    return build_setting_value_payload(category_values, category_details)
