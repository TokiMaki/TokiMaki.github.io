import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENCHANT_DB_PATH = ROOT / "Docs" / "enchant_card_db.json"
CREATURE_DB_PATH = ROOT / "Docs" / "creature_upgrade_db.json"
TITLE_DB_PATH = ROOT / "Docs" / "title_upgrade_db.json"
AURA_DB_PATH = ROOT / "Docs" / "aura_upgrade_db.json"
AVATAR_OPTION_DB_PATH = ROOT / "Docs" / "avatar_option_db.json"
JOB_BASE_STAT_PATH = ROOT / "Docs" / "jobBaseStat.json"
AMPLIFICATION_EXPECTED_DB_PATH = ROOT / "Docs" / "amplification_expected_db.json"
REINFORCEMENT_EXPECTED_DB_PATH = ROOT / "Docs" / "reinforcement_expected_db.json"

_JOB_BASE_STAT_CACHE = None
_UPGRADE_EXPECTED_DB_CACHE = None
_AVATAR_OPTION_DB_CACHE = None


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


def load_job_base_stats() -> dict:
    global _JOB_BASE_STAT_CACHE
    if _JOB_BASE_STAT_CACHE is None:
        try:
            with JOB_BASE_STAT_PATH.open("r", encoding="utf-8") as fp:
                _JOB_BASE_STAT_CACHE = json.load(fp)
        except FileNotFoundError:
            _JOB_BASE_STAT_CACHE = {}
    return _JOB_BASE_STAT_CACHE
