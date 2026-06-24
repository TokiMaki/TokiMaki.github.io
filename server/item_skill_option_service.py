import time
from threading import Lock
from urllib.parse import quote

from .avatar_skill_optimizer import flatten_skill_rows, get_skill_attack_ratio, normalize_skill_key
from .neople_client import API_KEY, clean_text, fetch_skill_detail_from_api, request_json

_CHARACTER_SKILL_CONTEXT_TTL_SECONDS = 60
_CHARACTER_SKILL_CONTEXT_LOCK = Lock()
_CHARACTER_SKILL_CONTEXT_CACHE = {}


def _build_character_skill_context(server_id: str, character_id: str) -> dict:
    detail_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}?apikey={API_KEY}"
    detail = request_json(detail_url)
    job_id = clean_text(detail.get("jobId"))
    job_grow_id = clean_text(detail.get("jobGrowId"))

    style_url = f"https://api.neople.co.kr/df/servers/{server_id}/characters/{character_id}/skill/style?apikey={API_KEY}"
    style = request_json(style_url)
    style_rows = flatten_skill_rows(style)
    style_by_name = {
        normalize_skill_key(row.get("name")): row
        for row in style_rows
        if clean_text(row.get("name"))
    }

    skill_list_url = (
        f"https://api.neople.co.kr/df/skills/{job_id}"
        f"?jobGrowId={quote(job_grow_id)}&apikey={API_KEY}"
    )
    skill_list = request_json(skill_list_url)
    skill_rows = flatten_skill_rows(skill_list)
    skill_by_name = {
        normalize_skill_key(row.get("name")): row
        for row in skill_rows
        if clean_text(row.get("name"))
    }
    return {
        "jobId": job_id,
        "jobGrowId": job_grow_id,
        "styleByName": style_by_name,
        "skillByName": skill_by_name,
        "skillDetailById": {},
    }


def get_character_skill_context(server_id: str, character_id: str) -> dict:
    cache_key = (clean_text(server_id).lower(), clean_text(character_id))
    now = time.time()
    with _CHARACTER_SKILL_CONTEXT_LOCK:
        cached = _CHARACTER_SKILL_CONTEXT_CACHE.get(cache_key)
        if cached and float(cached.get("expires_at") or 0) > now:
            return cached.get("context") or {}

    context = _build_character_skill_context(cache_key[0], cache_key[1])
    with _CHARACTER_SKILL_CONTEXT_LOCK:
        _CHARACTER_SKILL_CONTEXT_CACHE[cache_key] = {
            "context": context,
            "expires_at": now + _CHARACTER_SKILL_CONTEXT_TTL_SECONDS,
        }
    return context


def get_item_reinforce_skill_effect(detail: dict, skill_context: dict) -> dict:
    entries = detail.get("itemReinforceSkill") or []
    if not entries or not skill_context:
        return {
            "skillDamageMultiplier": 1,
            "skillDamagePercent": 0,
            "reinforceSkillName": "",
            "reinforceSkillLevel": 0,
        }

    job_id = clean_text(skill_context.get("jobId"))
    style_by_name = skill_context.get("styleByName") or {}
    skill_by_name = skill_context.get("skillByName") or {}
    skill_detail_by_id = skill_context.get("skillDetailById") or {}

    candidate_skills = []
    for entry in entries:
        entry_job_id = clean_text(entry.get("jobId"))
        if entry_job_id and job_id and entry_job_id != job_id:
            continue
        for skill in entry.get("skills") or []:
            skill_name = clean_text(skill.get("name"))
            added_level = int(skill.get("value") or 0)
            if skill_name and added_level > 0:
                candidate_skills.append((skill_name, added_level))

    best = {
        "skillDamageMultiplier": 1,
        "skillDamagePercent": 0,
        "reinforceSkillName": "",
        "reinforceSkillLevel": 0,
    }
    for skill_name, added_level in candidate_skills:
        key = normalize_skill_key(skill_name)
        style_row = style_by_name.get(key) or {}
        skill_row = skill_by_name.get(key) or style_row
        skill_id = clean_text(skill_row.get("skillId") or style_row.get("skillId"))
        current_level = int(style_row.get("level") or style_row.get("skillLevel") or 0)
        if not skill_id or current_level <= 0:
            continue
        if skill_id not in skill_detail_by_id:
            skill_detail_by_id[skill_id] = fetch_skill_detail_from_api(job_id, skill_id)
        ratio = get_skill_attack_ratio(skill_detail_by_id[skill_id], current_level, added_level)
        if not ratio.get("calculable"):
            continue
        if float(ratio.get("multiplier") or 1) <= float(best.get("skillDamageMultiplier") or 1):
            continue
        best = {
            "skillDamageMultiplier": float(ratio.get("multiplier") or 1),
            "skillDamagePercent": float(ratio.get("incrementalDamagePercent") or 0),
            "reinforceSkillName": skill_name,
            "reinforceSkillLevel": added_level,
        }
    return best


def get_item_reinforce_skill_matches(detail: dict, skill_context: dict) -> list:
    entries = detail.get("itemReinforceSkill") or []
    job_id = clean_text(skill_context.get("jobId"))
    skill_by_name = skill_context.get("skillByName") or {}
    matches = []
    for entry in entries:
        entry_job_id = clean_text(entry.get("jobId"))
        if entry_job_id and job_id and entry_job_id != job_id:
            continue
        for skill in entry.get("skills") or []:
            name = clean_text(skill.get("name"))
            value = int(skill.get("value") or 0)
            if name and value > 0 and normalize_skill_key(name) in skill_by_name:
                matches.append({"name": name, "value": value})
    return matches
