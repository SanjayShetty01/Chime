"""
calculator.py - Backward-compatible router for cashback_calculation package.
"""
from __future__ import annotations
from .airtel_axis import calculate_airtel_axis_cashback
from .standard import calculate_standard_cashback
from .base import create_credit_transaction, build_cashback_summary


def calculate_statement_cashback(
    raw_txns: list[dict],
    card_id: str,
    card_yaml: dict,
):
    if card_id == "axis-airtel":
        return calculate_airtel_axis_cashback(raw_txns, card_yaml)
    return calculate_standard_cashback(raw_txns, card_id, card_yaml)
