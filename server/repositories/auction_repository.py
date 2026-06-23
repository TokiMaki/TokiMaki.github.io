from ..neople_client import get_auction_rows_by_name_from_api


def get_auction_rows_by_name(item_name: str, word_type: str = "full", limit: int = 100, offset: int = 0) -> list:
    return get_auction_rows_by_name_from_api(item_name, word_type=word_type, limit=limit, offset=offset)
