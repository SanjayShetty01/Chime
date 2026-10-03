# 04 - Transaction Classification Engine

Chime uses a two-layer zero-shot classification system in `backend/classifier.py` to assign credit card statement descriptions to reward categories without requiring external APIs or paid API keys.

---

## 1. Classification Overview

When calculating cashback, each debit transaction must be assigned to one of the card reward categories declared in `cards.yaml` (e.g. `Online Spends`, `Airtel Services`, `Utilities`, `Food & Grocery`, `Other`, or `Excluded`).

```text
[Transaction Description]
          |
          v
  +-------------------------------------+
  | Layer 1: Keyword Rules Match        |  (Matches against keyword_rules.yaml)
  +-------------------------------------+
          |
          +---> MATCH FOUND? ---> YES ---> Return (Category, 1.0, "rule")
          |
          NO
          v
  +-------------------------------------+
  | Layer 2: Sentence-Transformers      |  (Offline all-MiniLM-L6-v2 cosine sim)
  +-------------------------------------+
          |
          +---> SIMILARITY >= 0.25? ---> YES ---> Return (Category, score, "semantic")
          |
          NO
          v
  +-------------------------------------+
  | Default Category Fallback           |  (Returns default from YAML, score 0.50)
  +-------------------------------------+
```

---

## 2. Layer 1: Deterministic Keyword Rules (`keyword_rules.yaml`)

- **Speed**: Instant (~0.01ms per transaction).
- **Rule Structure**:
  ```yaml
  cards:
    axis-airtel:
      default_category: "Other"
      categories:
        Excluded:
          - petrol
          - fuel
          - rent payment
          - lic premium
          - emi fee
          - gst
        Airtel Services:
          - airtel
          - airtelxstream
          - wynk music
          - airtel prepaid
        Food & Grocery:
          - swiggy
          - zomato
          - blinkit
          - zepto
          - bigbasket
        Utilities:
          - electricity bill
          - bescom
          - msedcl
          - mahanagar gas
        Other:
          - amazon
          - flipkart
          - myntra
          - retail
  ```
- **Matching Semantics**:
  - Normalized case-insensitive substring search.
  - Matches are evaluated in order of categories defined in the YAML file.
  - **Important**: Put `Excluded` categories first to intercept fuel surcharge waivers, taxes, and loan processing fees before general merchant names match.

---

## 3. Layer 2: Local Semantic Similarity (NLP Fallback)

When a transaction description does not match any keyword, Chime uses a local embedding model:
- **Model**: `all-MiniLM-L6-v2` (~90 MB) via `sentence-transformers`.
- **Offline & Local**: Runs entirely on CPU without connecting to HuggingFace after initial bundle caching.
- **Mechanism**:
  1. Computes vector embeddings of the transaction narrative.
  2. Computes embeddings of each candidate reward category name.
  3. Calculates cosine similarity scores between the transaction vector and category vectors.
  4. If the highest score is `>= 0.25`, the category is assigned with `match_type="semantic"`.
  5. If the score is `< 0.25`, it falls back to the card's `default_category` (with `match_type="fallback"`).

---

## 4. Confidence Scores and Match Types

Every classified transaction returns three values:
1. `category` (string): The assigned category name.
2. `confidence` (float from 0.0 to 1.0):
   - `1.0`: Exact keyword rule match.
   - `0.25 to 0.99`: Semantic similarity match score.
   - `0.50`: Default category fallback.
3. `matchType` (string): `"rule"`, `"semantic"`, or `"fallback"`.

The frontend displays these tags directly in the transaction table with color-coded badges, making the classification logic fully transparent to the user.

---

## 5. Verification Test Suite

Run the classifier test suite from the `backend/` directory:

```bash
uv run python test_classifier.py
```

This verifies 35 diverse test transactions across all supported cards, validating keyword matches, default categories, and edge cases (e.g. standalone GST and EMI processing fees).
