from .neople_client import search_character


def search_character_response(server_id: str, character_name: str) -> dict:
    try:
        resolved = search_character(server_id, character_name)
    except Exception as exc:
        if "캐릭터를 찾지 못했습니다" not in str(exc):
            raise
        return {
            "serverId": server_id,
            "characterName": character_name,
            "matchCount": 0,
            "resolved": {},
            "rows": [],
        }

    return {
        "serverId": server_id,
        "characterName": character_name,
        "matchCount": len(resolved["rows"]),
        "resolved": {
            "serverId": resolved["server_id"],
            "characterId": resolved["character_id"],
            "characterName": resolved["character_name"],
            "adventureName": resolved.get("adventure_name", ""),
            "fame": resolved.get("fame", 0),
            "jobId": resolved.get("job_id", ""),
            "jobName": resolved.get("job_name", ""),
            "jobGrowId": resolved.get("job_grow_id", ""),
            "jobGrowName": resolved.get("job_grow_name", ""),
        },
        "rows": resolved["rows"],
    }
