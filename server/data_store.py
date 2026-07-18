import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENCHANT_DB_PATH = ROOT / "Docs" / "enchant_card_db.json"
CREATURE_DB_PATH = ROOT / "Docs" / "creature_upgrade_db.json"
CREATURE_ARTIFACT_DB_PATH = ROOT / "Docs" / "creature_artifact_db.json"
TITLE_DB_PATH = ROOT / "Docs" / "title_upgrade_db.json"
DEALER_SWITCHING_BUFF_DB_PATH = ROOT / "Docs" / "dealer_switching_buff_db.json"
DEALER_SWITCHING_TITLE_DB_PATH = ROOT / "Docs" / "dealer_switching_title_db.json"
DEALER_SWITCHING_CREATURE_DB_PATH = ROOT / "Docs" / "dealer_switching_creature_db.json"
AURA_DB_PATH = ROOT / "Docs" / "aura_upgrade_db.json"
AVATAR_OPTION_DB_PATH = ROOT / "Docs" / "avatar_option_db.json"
SWITCHING_AVATAR_DB_PATH = ROOT / "Docs" / "switching_avatar_db.json"
OATH_TUNE_STAGE_DB_PATH = ROOT / "Docs" / "oath_tune_stage_db.json"
JOB_BASE_STAT_PATH = ROOT / "Docs" / "jobBaseStat.json"
AMPLIFICATION_EXPECTED_DB_PATH = ROOT / "Docs" / "amplification_expected_db.json"
REINFORCEMENT_EXPECTED_DB_PATH = ROOT / "Docs" / "reinforcement_expected_db.json"

_JOB_BASE_STAT_CACHE = None
_UPGRADE_EXPECTED_DB_CACHE = None
_AVATAR_OPTION_DB_CACHE = None
_SWITCHING_AVATAR_DB_CACHE = None
_DEALER_SWITCHING_BUFF_DB_CACHE = None
_DEALER_SWITCHING_TITLE_DB_CACHE = None
_DEALER_SWITCHING_CREATURE_DB_CACHE = None
_OATH_TUNE_STAGE_DB_CACHE = None

_JOB_BASE_STAT_LOOKUP_ALIASES = {
    ("프리스트(남)", "眞 크루세이더"): "眞 크루세이더(남)",
    ("프리스트(여)", "眞 크루세이더"): "眞 크루세이더(여)",
}


def load_upgrade_expected_db() -> dict:
    global _UPGRADE_EXPECTED_DB_CACHE
    if _UPGRADE_EXPECTED_DB_CACHE is None:
        with AMPLIFICATION_EXPECTED_DB_PATH.open("r", encoding="utf-8") as handle:
            amplification = json.load(handle)
        with REINFORCEMENT_EXPECTED_DB_PATH.open("r", encoding="utf-8") as handle:
            reinforcement = json.load(handle)
        _UPGRADE_EXPECTED_DB_CACHE = {
            "amplification": amplification,
            "reinforcement": reinforcement,
        }
    return _UPGRADE_EXPECTED_DB_CACHE


def load_avatar_option_db() -> dict:
    global _AVATAR_OPTION_DB_CACHE
    if _AVATAR_OPTION_DB_CACHE is None:
        with AVATAR_OPTION_DB_PATH.open("r", encoding="utf-8") as handle:
            _AVATAR_OPTION_DB_CACHE = json.load(handle)
    return _AVATAR_OPTION_DB_CACHE


def load_switching_avatar_db() -> dict:
    global _SWITCHING_AVATAR_DB_CACHE
    if _SWITCHING_AVATAR_DB_CACHE is None:
        try:
            with SWITCHING_AVATAR_DB_PATH.open("r", encoding="utf-8") as handle:
                _SWITCHING_AVATAR_DB_CACHE = json.load(handle)
        except FileNotFoundError:
            _SWITCHING_AVATAR_DB_CACHE = {}
    return _SWITCHING_AVATAR_DB_CACHE


def load_dealer_switching_buff_db() -> dict:
    global _DEALER_SWITCHING_BUFF_DB_CACHE
    if _DEALER_SWITCHING_BUFF_DB_CACHE is None:
        try:
            with DEALER_SWITCHING_BUFF_DB_PATH.open("r", encoding="utf-8") as handle:
                _DEALER_SWITCHING_BUFF_DB_CACHE = json.load(handle)
        except FileNotFoundError:
            _DEALER_SWITCHING_BUFF_DB_CACHE = {}
    return _DEALER_SWITCHING_BUFF_DB_CACHE


def load_dealer_switching_title_db() -> dict:
    global _DEALER_SWITCHING_TITLE_DB_CACHE
    if _DEALER_SWITCHING_TITLE_DB_CACHE is None:
        try:
            with DEALER_SWITCHING_TITLE_DB_PATH.open("r", encoding="utf-8") as handle:
                _DEALER_SWITCHING_TITLE_DB_CACHE = json.load(handle)
        except FileNotFoundError:
            _DEALER_SWITCHING_TITLE_DB_CACHE = {}
    return _DEALER_SWITCHING_TITLE_DB_CACHE


def load_dealer_switching_creature_db() -> dict:
    global _DEALER_SWITCHING_CREATURE_DB_CACHE
    if _DEALER_SWITCHING_CREATURE_DB_CACHE is None:
        try:
            with DEALER_SWITCHING_CREATURE_DB_PATH.open("r", encoding="utf-8") as handle:
                _DEALER_SWITCHING_CREATURE_DB_CACHE = json.load(handle)
        except FileNotFoundError:
            _DEALER_SWITCHING_CREATURE_DB_CACHE = {}
    return _DEALER_SWITCHING_CREATURE_DB_CACHE


def load_job_base_stats() -> dict:
    global _JOB_BASE_STAT_CACHE
    if _JOB_BASE_STAT_CACHE is None:
        try:
            with JOB_BASE_STAT_PATH.open("r", encoding="utf-8") as fp:
                _JOB_BASE_STAT_CACHE = json.load(fp)
        except FileNotFoundError:
            _JOB_BASE_STAT_CACHE = {}
    return _JOB_BASE_STAT_CACHE


def resolve_job_base_stat_row(job_name: str, job_grow_name: str) -> dict:
    lookup_key = _JOB_BASE_STAT_LOOKUP_ALIASES.get((job_name, job_grow_name), job_grow_name)
    return load_job_base_stats().get(lookup_key) or {}


def load_oath_tune_stage_db() -> dict:
    global _OATH_TUNE_STAGE_DB_CACHE
    if _OATH_TUNE_STAGE_DB_CACHE is None:
        try:
            with OATH_TUNE_STAGE_DB_PATH.open("r", encoding="utf-8") as handle:
                _OATH_TUNE_STAGE_DB_CACHE = json.load(handle)
        except FileNotFoundError:
            _OATH_TUNE_STAGE_DB_CACHE = {}
    return _OATH_TUNE_STAGE_DB_CACHE
