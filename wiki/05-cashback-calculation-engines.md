# 05 - Cashback Calculation Engines

The cashback calculation engine in `backend/cashback_calculation/` handles category rates, fixed caps, dynamic multiplier caps, exclusions, and multi-pass statement attribution.

---

## 1. Package Structure

```text
backend/cashback_calculation/
├── __init__.py         # Dispatcher routing statements to card-specific engines
├── airtel_axis.py      # Dedicated calculation engine for Airtel Axis Bank Credit Card
├── standard.py         # Standard calculation engine for flat-rate and fixed-cap cards (SBI, HDFC)
├── base.py             # Shared Transaction & CashbackSummary builder utilities
└── calculator.py       # Backward-compatible wrapper
```

---

## 2. Dedicated Airtel Axis Calculation Engine (`airtel_axis.py`)

The Airtel Axis Bank Credit Card features a unique reward model based on dynamic base-multiplier caps.

### The Rules
1. **Airtel Services (25%)**:
   - Covers recharges, broadband, DTH, and mobile bills via Airtel Thanks.
   - Dynamic cap: **2x base (1%) cashback earned** on other spends in that billing cycle.
2. **Utilities (10%)**:
   - Covers electricity, piped gas, and water bills paid via Airtel Thanks.
   - Dynamic cap: **1x base (1%) cashback earned** on other spends in that billing cycle.
3. **Partner Spends (10%)**:
   - Covers food and grocery platforms (Zomato, Blinkit, and District Movies).
   - Fixed cap: **200 INR per month**.
4. **Other Spends (1%)**:
   - Unlimited 1% base cashback on all other non-excluded retail and online transactions.
   - This base cashback fuels the 2x and 1x dynamic caps for the categories above.
5. **Excluded Spends (0%)**:
   - Fuel, Rent, Wallet Load, Insurance, Government payments, and EMI fees earn 0%.

### Three-Pass Execution Strategy

Because high-tier category caps depend on how much base 1% cashback was earned across the entire statement, `airtel_axis.py` processes transactions in three distinct passes:

- **Pass 1 (Classify & Accumulate Base)**:
  Classifies every debit transaction and aggregates the total base 1% cashback generated from the `Other` category.
- **Pass 2 (Compute Dynamic Caps)**:
  Derives the statement's effective caps:
  - `Airtel Services Cap = round(base_cb_earned * 2.0, 2)`
  - `Utilities Cap = round(base_cb_earned * 1.0, 2)`
  - `Food & Grocery Cap = 200.0`
- **Pass 3 (Enforce Caps & Build Records)**:
  Processes each transaction in sequence, decrementing available caps for that category and creating `Transaction` records. Builds the `CashbackSummary` with exact spend and reward breakdowns.

---

## 3. Standard Calculation Engine (`standard.py`)

Used for cards with straightforward fixed caps and flat rates:
- **SBI Cashback Card**:
  - `Online Spends`: 5% (capped at 5,000 INR per month).
  - `Offline Spends`: 1% (unlimited).
  - `Excluded`: 0%.
- **HDFC Swiggy Card**:
  - `Swiggy`: 10% on Food, Instamart, and Dineout (capped at 1,500 INR per month).
  - `Online Spends`: 5% on selected online shopping (capped at 1,500 INR per month).
  - `Other`: 1% (unlimited).

---

## 4. Shared Helpers (`base.py`)

- **`create_credit_transaction(raw)`**: Generates standardized non-spend payment records (`category="Payment/Credit"`, `cashbackRate=0.0`, `confidence=1.0`, `matchType="rule"`).
- **`build_cashback_summary(transactions, total_spend, total_cb)`**: Aggregates spend, cashback, and transaction counts per category and computes the overall statement effective return rate.
