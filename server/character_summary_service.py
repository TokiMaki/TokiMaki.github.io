from .character_summary import summarize_character_by_identity
from .character_search_service import search_character


def summarize_character_response(server_id: str, character_name: str) -> dict:
    resolved = search_character(server_id, character_name)
    summary = summarize_character_by_identity(
        resolved["server_id"],
        resolved["character_id"],
        resolved["character_name"],
    )
    return {
        "serverId": resolved["server_id"],
        "characterId": resolved["character_id"],
        "requestedCharacterName": character_name,
        "name": summary["name"],
        "fame": resolved.get("fame", 0),
        "jobId": resolved.get("job_id", ""),
        "jobName": resolved.get("job_name", ""),
        "jobGrowId": resolved.get("job_grow_id", ""),
        "jobGrowName": resolved.get("job_grow_name", ""),
        "sets": summary["sets"],
    }
