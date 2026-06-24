def build_character_avatar_payload(
    payload: dict,
    avatar_payload: dict,
    recommendations: list,
    steps: list,
    timing_details: dict,
) -> dict:
    return {
        "serverId": payload.get("serverId"),
        "characterId": payload.get("characterId"),
        "characterName": payload.get("characterName"),
        "jobName": payload.get("jobName"),
        "jobGrowName": payload.get("jobGrowName"),
        "fame": payload.get("fame"),
        "avatar": avatar_payload,
        "recommendations": recommendations,
        "debugTimings": {
            "steps": steps,
            "details": timing_details,
        },
    }
