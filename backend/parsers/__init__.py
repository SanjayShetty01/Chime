from .base_parser import BaseParser
from .sbi_parser import SBICashbackParser
from .axis_parser import AirtelAxisParser
from .hdfc_parser import SwiggyHDFCParser

# Registry mapping card IDs to parser classes
PARSER_REGISTRY = {
    "sbi-cashback": SBICashbackParser,
    "axis-airtel": AirtelAxisParser,
    "hdfc-swiggy": SwiggyHDFCParser,
}

def get_parser(card_id: str) -> BaseParser:
    """
    Factory function to retrieve the appropriate parser strategy for a given card id.
    """
    parser_class = PARSER_REGISTRY.get(card_id)
    if not parser_class:
        raise ValueError(f"No parser implemented for card: {card_id}")
    return parser_class()
