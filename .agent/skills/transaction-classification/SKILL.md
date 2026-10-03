---
name: transaction-classification
description: Documents the two-layer zero-shot transaction classifier used to assign categories to bank statement transactions. Use when modifying classifier logic, adding keyword rules for new cards/merchants, or debugging category assignment.
---

# Transaction Classification

Two-layer zero-shot classifier that assigns each debit transaction a category from `cards.yaml` so the correct cashback rate and monthly cap apply.

## How It Works

```
Transaction description
        │
        ▼
┌──────────────────────────┐
│  Layer 1: Keyword Rules  │  ← keyword_rules.yaml (fast substring match)
└────────┬─────────────────┘
         │ no match
         ▼
┌──────────────────────────────┐
│  Layer 2: Sentence-BERT      │  ← all-MiniLM-L6-v2 cosine similarity (zero-shot NLP)
└──────────────────────────────┘
         │
         ▼
    Category name (e.g. "Online Spends", "Excluded", "Food & Grocery")
```

- **Layer 1** handles most Indian merchants (Amazon, Swiggy, Airtel, petrol pumps, etc.) - fast, no model needed.
- **Layer 2** is a safety net for unknown merchants - embeds description + category names into vectors and picks the closest.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/classifier.py` | Classification engine - loads keyword_rules.yaml, lazy-loads ML model, exposes `classify_transaction()` |
| `backend/keyword_rules.yaml` | Per-card keyword → category mappings (editable without touching code) |
| `backend/cards.yaml` | Defines available categories per card (with `rate` and `cap`) |

---

## Public API (`classifier.py`)

```python
from classifier import classify_transaction, classify_transaction_with_confidence

# Basic classification:
category = classify_transaction(
    description="AMAZON PAY INDIA PVT",
    card_id="sbi-cashback",
    candidate_categories=["Online Spends", "Offline Spends", "Excluded"]
)
# → "Online Spends"

# Classification with Confidence Score & Match Method:
category, confidence, match_type = classify_transaction_with_confidence(
    description="AMAZON PAY INDIA PVT",
    card_id="sbi-cashback",
    candidate_categories=["Online Spends", "Offline Spends", "Excluded"]
)
# → ("Online Spends", 1.0, "rule")
```

Match types & confidence scores:
- `"rule"` (`1.0` / 100%): Exact keyword rule match from `keyword_rules.yaml`.
- `"semantic"` (`0.25`..`0.99`): Zero-shot cosine similarity match via `SentenceTransformer`.
- `"fallback"` (`0.50` / `0.60`): Fallback to card's configured default category.

Other functions:
- `reload_rules()` - hot-reload `keyword_rules.yaml` without restarting the server

---

## User Custom Rate (%) Override Feature

In the frontend UI (`TransactionTable.tsx`), users can inspect the **Match Confidence** pill for each transaction. If the classification is wrong or requires custom adjustment:
- Users can enter a custom rate % in the **"User Custom % Override"** column.
- Entering a custom rate (e.g., `5` or `10`) dynamically overrides `cashbackRate` and recalculates `cashbackAmount = amount * (customRate / 100)`.
- Total spend, total cashback, effective cashback %, summary cards, and charts recalculate in real-time.
- Users can click <kbd>↺</kbd> to reset any transaction back to the automated category default.

---

## Sentence-Transformers Model Details

- **Model**: `all-MiniLM-L6-v2` (~90MB)
- **Runs on CPU** - no GPU needed, ~1-2s for 100 transactions
- **Lazy-loaded** on first classification call; cached globally after that
- **First-time download**: ~10-30s from HuggingFace, stored in `~/.cache/huggingface`
- If `sentence-transformers` is not installed, Layer 2 is silently disabled and falls back to `default_category`

---

## Testing

```powershell
cd c:\Github\Chime\backend
uv run python test_classifier.py
```

29 test cases covering all 3 cards (SBI, Axis Airtel, HDFC Swiggy) across categories like Online Spends, Excluded, Food & Grocery, Airtel Services, Swiggy, Dining, etc.
