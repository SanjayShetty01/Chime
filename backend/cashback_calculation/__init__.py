"""
cashback_calculation package - Card-specific cashback calculation engines.

Separations:
- airtel_axis.py: Dedicated calculation for Airtel Axis Bank Credit Card (2x/1x dynamic base caps).
- standard.py: Standard fixed-cap and flat-rate calculation for SBI, HDFC, etc.
- base.py: Shared transaction mapping and summary generation helpers.
"""
from __future__ import annotations
from typing import List, Dict, Tuple
from models import Transaction, CashbackSummary
from .airtel_axis import calculate_airtel_axis_cashback
from .standard import calculate_standard_cashback
from .base import create_credit_transaction, build_cashback_summary


def calculate_statement_cashback(
    raw_txns: list[dict],
    card_id: str,
    card_yaml: dict,
) -> tuple[list[Transaction], CashbackSummary, bool]:
    """
    Unified entrypoint routing calculation to card-specific engines.
    """
    if card_id == "axis-airtel":
        return calculate_airtel_axis_cashback(raw_txns, card_yaml)
    return calculate_standard_cashback(raw_txns, card_id, card_yaml)


__all__ = [
    "calculate_statement_cashback",
    "calculate_airtel_axis_cashback",
    "calculate_standard_cashback",
    "create_credit_transaction",
    "build_cashback_summary",
]
