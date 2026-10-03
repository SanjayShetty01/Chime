"""
airtel_axis.py - Dedicated cashback calculation engine for Airtel Axis Bank Credit Card.

Airtel Axis Rules:
1. Airtel Services: 25% cashback, capped dynamically at 2x base (1%) cashback earned.
2. Utilities: 10% cashback, capped dynamically at 1x base (1%) cashback earned.
3. Partner Spends (Food & Grocery: Zomato, Blinkit, District): 10% cashback, capped at 200 INR/month.
4. Other Spends: 1% base cashback, unlimited (no cap).
5. Excluded Spends: Fuel, Rent, Wallet Load, Insurance, Government, EMI, Cash (0%).
"""
from __future__ import annotations
import uuid
from typing import List, Dict, Tuple
from models import Transaction, CashbackSummary
from classifier import classify_transaction_with_confidence
from .base import create_credit_transaction, build_cashback_summary

CARD_ID = "axis-airtel"
DEFAULT_CANDIDATES = [
    "Airtel Services",
    "Food & Grocery",
    "Utilities",
    "Other",
    "Excluded",
]


def calculate_airtel_axis_cashback(
    raw_txns: list[dict],
    card_yaml: dict,
) -> tuple[list[Transaction], CashbackSummary, bool]:
    """
    Dedicated calculation for Airtel Axis card statements.
    Resolves dynamic 2x / 1x multiplier caps against base 1% spend cashback.
    """
    # Parse rates and parameters from card YAML with robust defaults
    rates = {
        "Airtel Services": 25.0,
        "Food & Grocery": 10.0,
        "Utilities": 10.0,
        "Other": 1.0,
        "Excluded": 0.0,
    }
    caps = {
        "Food & Grocery": 200.0,
    }
    multipliers = {
        "Airtel Services": 2.0,
        "Utilities": 1.0,
    }

    # If card_yaml provides category settings, extract them
    if card_yaml and "categories" in card_yaml:
        for cat in card_yaml["categories"]:
            name = cat.get("name")
            if not name:
                continue
            if "rate" in cat:
                rates[name] = float(cat["rate"])
            if "cap" in cat and cat["cap"] is not None:
                caps[name] = float(cat["cap"])
            if "cap_multiplier" in cat and cat["cap_multiplier"] is not None:
                multipliers[name] = float(cat["cap_multiplier"])

    candidate_categories = list(rates.keys())
    classified_items = []
    has_debits = False
    base_cb_earned = 0.0

    # Pass 1: Classify transactions and accumulate base 1% cashback from Other spends
    for raw in raw_txns:
        amount = float(raw.get("amount", 0.0))
        if raw.get("type") == "Dr":
            has_debits = True
            category, conf_score, match_type = classify_transaction_with_confidence(
                description=raw.get("description", ""),
                card_id=CARD_ID,
                candidate_categories=candidate_categories,
            )
            rate = rates.get(category, 0.0) if category != "Excluded" else 0.0
            raw_cb = round(amount * rate / 100, 2) if rate > 0 else 0.0

            if category == "Other" and rate > 0:
                base_cb_earned += raw_cb

            classified_items.append({
                "raw": raw,
                "is_debit": True,
                "category": category,
                "confidence": conf_score,
                "match_type": match_type,
                "rate": rate,
                "raw_cb": raw_cb,
                "amount": amount,
            })
        else:
            classified_items.append({
                "raw": raw,
                "is_debit": False,
                "amount": amount,
            })

    # Pass 2: Derive dynamic caps from base 1% spend cashback
    effective_caps: dict[str, float | None] = {}

    # Airtel Services: 2x base cashback
    airtel_mult = multipliers.get("Airtel Services", 2.0)
    effective_caps["Airtel Services"] = round(base_cb_earned * airtel_mult, 2)

    # Utilities: 1x base cashback
    util_mult = multipliers.get("Utilities", 1.0)
    effective_caps["Utilities"] = round(base_cb_earned * util_mult, 2)

    # Food & Grocery: fixed cap (e.g. 200 INR)
    effective_caps["Food & Grocery"] = caps.get("Food & Grocery", 200.0)

    # Other spends: unlimited
    effective_caps["Other"] = None

    # Pass 3: Enforce caps and generate transaction objects
    transactions: list[Transaction] = []
    total_spend = 0.0
    total_cb = 0.0
    category_earned: dict[str, float] = {name: 0.0 for name in candidate_categories}

    for item in classified_items:
        if item["is_debit"]:
            cat = item["category"]
            cap = effective_caps.get(cat)
            earned_so_far = category_earned.get(cat, 0.0)

            if item["rate"] > 0 and cat != "Excluded":
                if cap is not None:
                    remaining_cap = max(0.0, cap - earned_so_far)
                    cb_amount = round(min(item["raw_cb"], remaining_cap), 2)
                else:
                    cb_amount = item["raw_cb"]
                category_earned[cat] = earned_so_far + cb_amount
            else:
                cb_amount = 0.0

            total_spend += item["amount"]
            total_cb += cb_amount

            transactions.append(Transaction(
                id=str(uuid.uuid4())[:8],
                date=item["raw"].get("date", ""),
                description=item["raw"].get("description", ""),
                category=cat,
                amount=item["amount"],
                cashbackRate=item["rate"],
                cashbackAmount=cb_amount,
                confidence=item["confidence"],
                matchType=item["match_type"],
            ))
        else:
            transactions.append(create_credit_transaction(item["raw"]))

    summary = build_cashback_summary(transactions, total_spend, total_cb)
    return transactions, summary, has_debits
