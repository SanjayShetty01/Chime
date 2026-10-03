"""
base.py - Shared data models and helpers for cashback calculation.
"""
from __future__ import annotations
import uuid
from models import Transaction, CashbackSummary, CategoryBreakdown


def create_credit_transaction(raw: dict) -> Transaction:
    """Create a non-spend payment or credit transaction record."""
    return Transaction(
        id=str(uuid.uuid4())[:8],
        date=raw.get("date", ""),
        description=raw.get("description", ""),
        category="Payment/Credit",
        amount=raw.get("amount", 0.0),
        cashbackRate=0.0,
        cashbackAmount=0.0,
        confidence=1.0,
        matchType="rule",
    )


def build_cashback_summary(
    transactions: list[Transaction],
    total_spend: float,
    total_cb: float,
) -> CashbackSummary:
    """
    Build a CashbackSummary with category breakdowns from processed transactions.
    """
    effective_rate = round((total_cb / total_spend * 100) if total_spend > 0 else 0.0, 2)

    cat_map: dict[str, dict] = {}
    for t in transactions:
        cat = t.category
        if cat not in cat_map:
            cat_map[cat] = {"spend": 0.0, "cashback": 0.0, "count": 0}
        cat_map[cat]["spend"] += t.amount
        cat_map[cat]["cashback"] += t.cashbackAmount
        cat_map[cat]["count"] += 1

    return CashbackSummary(
        totalTransactions=len(transactions),
        totalSpend=round(total_spend, 2),
        totalCashback=round(total_cb, 2),
        effectiveCashbackPercent=effective_rate,
        categoryBreakdown=[
            CategoryBreakdown(
                category=cat,
                spend=round(vals["spend"], 2),
                cashback=round(vals["cashback"], 2),
                transactionCount=vals["count"],
            )
            for cat, vals in cat_map.items()
        ],
    )
