"""
standard.py - Standard calculation engine for cards with fixed monthly caps and rates.

Supports cards like:
- SBI Cashback (5% online capped at 5000 INR/month, 1% offline, exclusions)
- HDFC Swiggy (10% Swiggy capped at 1500 INR, 5% online capped at 1500 INR, 1% other)
"""
from __future__ import annotations
import uuid
from typing import List, Dict, Tuple
from models import Transaction, CashbackSummary
from classifier import classify_transaction_with_confidence
from .base import create_credit_transaction, build_cashback_summary


def calculate_standard_cashback(
    raw_txns: list[dict],
    card_id: str,
    card_yaml: dict,
) -> tuple[list[Transaction], CashbackSummary, bool]:
    """
    Standard cashback calculation applying fixed monthly caps and rates from YAML.
    """
    category_config: dict[str, dict] = {}
    for cat in card_yaml.get("categories", []):
        category_config[cat["name"]] = {
            "rate": float(cat.get("rate", 0.0)),
            "cap": float(cat["cap"]) if cat.get("cap") is not None else None,
        }
    candidate_categories = list(category_config.keys())

    transactions: list[Transaction] = []
    total_spend = 0.0
    total_cb = 0.0
    category_earned: dict[str, float] = {name: 0.0 for name in category_config}
    has_debits = False

    for raw in raw_txns:
        amount = float(raw.get("amount", 0.0))
        if raw.get("type") == "Dr":
            has_debits = True
            category, conf_score, match_type = classify_transaction_with_confidence(
                description=raw.get("description", ""),
                card_id=card_id,
                candidate_categories=candidate_categories,
            )
            cat_cfg = category_config.get(category, {"rate": 0.0, "cap": None})
            rate = cat_cfg["rate"] if category != "Excluded" else 0.0
            raw_cb = round(amount * rate / 100, 2) if rate > 0 else 0.0

            cap = cat_cfg.get("cap")
            earned_so_far = category_earned.get(category, 0.0)

            if rate > 0 and category != "Excluded":
                if cap is not None:
                    remaining_cap = max(0.0, cap - earned_so_far)
                    cb_amount = round(min(raw_cb, remaining_cap), 2)
                else:
                    cb_amount = raw_cb
                category_earned[category] = earned_so_far + cb_amount
            else:
                cb_amount = 0.0

            total_spend += amount
            total_cb += cb_amount

            transactions.append(Transaction(
                id=str(uuid.uuid4())[:8],
                date=raw.get("date", ""),
                description=raw.get("description", ""),
                category=category,
                amount=amount,
                cashbackRate=rate,
                cashbackAmount=cb_amount,
                confidence=conf_score,
                matchType=match_type,
            ))
        else:
            transactions.append(create_credit_transaction(raw))

    summary = build_cashback_summary(transactions, total_spend, total_cb)
    return transactions, summary, has_debits
