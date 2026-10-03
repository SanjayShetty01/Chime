---
name: building-backend
description: Guides building the Chime FastAPI backend including PDF parsing, cashback calculation, transaction classification, card configuration, and API endpoints. Use when working on backend code, adding parsers, modifying classifier rules, or modifying API routes.
---

# Building the Backend

## Dependencies & Package Management (`pyproject.toml` & `uv`)

FastAPI backend dependencies are managed via **`uv`** (`pyproject.toml` and `uv.lock`):

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

Key dependencies: `fastapi`, `uvicorn`, `python-multipart`, `pydantic`, `pyyaml`, `pdfplumber`, `bcrypt`, `python-jose[cryptography]`, `sentence-transformers`, `scikit-learn`, `hatchling`.

---

## FastAPI App (`main.py`)

### Endpoints

| Method | Route | Input | Output |
|--------|-------|-------|--------|
| POST | `/api/auth/register` | JSON: `username`, `password`, `security_question`, `security_answer` | `TokenResponse` |
| POST | `/api/auth/login` | JSON: `username`, `password` | `TokenResponse` |
| GET | `/api/auth/security-question` | Query: `username` | `SecurityQuestionResponse` |
| POST | `/api/auth/reset-password` | JSON: `username`, `security_answer`, `new_password` | `{message: string}` |
| GET | `/api/auth/profile` | JWT | `UserProfileResponse` |
| POST | `/api/auth/change-password` | JSON: `current_password`, `new_password` + JWT | `{message: string}` |
| POST | `/api/auth/update-security-question` | JSON: `current_password`, `security_question`, `security_answer` + JWT | `{message: string}` |
| GET | `/api/cards` | - | `list[CardConfig]` from `cards.yaml` |
| POST | `/api/upload-statement` | Form: `cardId`, `password`, `file` (PDF) + JWT | `CashbackResult` |
| GET | `/api/history` | JWT | `list[UploadSummary]` |
| GET | `/api/uploads/{upload_id}` | JWT | `CashbackResult` |
| DELETE | `/api/uploads/{upload_id}` | JWT | `{ok: true}` |
| GET | `/api/analytics/summary` | JWT | Multi-Month Summary & Discrepancies |
| PUT | `/api/uploads/{upload_id}/reconciliation` | JSON: `actual_cashback_credited` + JWT | `{ok: true}` |

### Upload Flow (`/api/upload-statement`)

1. Load full card config from `cards.yaml` by `cardId` → 404 if not found
2. Build category lookup from YAML: `{name: {rate, cap}}` for each category
3. Save uploaded PDF to temp file
4. Get parser via `get_parser(card_id)` → 400 if no parser
5. Call `parser.parse(temp_path, password)` → returns raw transaction dicts
6. Classify error types (password/decrypt, corrupt PDF, generic)
7. If no transactions found → 400 with helpful message
8. **For each debit transaction:**
   - Call `classify_transaction(description, card_id, candidate_categories)` → assigns real category
   - Look up `cashbackRate` from `cards.yaml` category config
   - Calculate cashback respecting the monthly **cap** per category
   - Exclusions get `rate=0.0`, `cashback=0.0`
9. Credits → `category="Payment/Credit"`, `rate=0.0`
10. If no debits found → 400
11. Build `CashbackSummary` with multi-category `CategoryBreakdown`
12. Save to SQLite database
13. Return `CashbackResult`
14. Clean up temp file in `finally` block

---

## Transaction Classification (`classifier.py`)

Two-layer zero-shot classifier. Called from `main.py` on every debit transaction.

### Layer 1 - Keyword Rules (fast, no model)

Loaded from `keyword_rules.yaml`. Each card has:
- `default_category`: fallback if nothing matches (e.g. `"Offline Spends"` for SBI)
- `categories`: ordered dict of `category → [keyword list]`

Keywords are matched case-insensitively as substrings against the description. **First match wins** (order matters - put Excluded before other categories).

### Layer 2 - Sentence-Transformers (zero-shot NLP fallback)

Uses `all-MiniLM-L6-v2` (~90MB, CPU-only) to embed the transaction description and candidate category names into vector space, then picks the category with highest cosine similarity.

Model is **lazy-loaded** on first call and cached globally. First-time download happens once (~90MB from HuggingFace).

### Public API

```python
from classifier import classify_transaction

category = classify_transaction(
    description="AMAZON PAY INDIA PVT",
    card_id="sbi-cashback",
    candidate_categories=["Online Spends", "Offline Spends", "Excluded"]
)
# → "Online Spends"
```

### Adding Keywords for a New Card

Edit `keyword_rules.yaml`:

```yaml
rules:
  my-new-card:
    default_category: "Other"
    categories:
      Excluded:
        - petrol
        - fuel
        - rent payment
      SpecialCategory:
        - some merchant
        - another keyword
      # "Other" is the default - no keywords needed
```

Call `reload_rules()` (from `classifier.py`) to hot-reload without restart.

---

## Keyword Rules Configuration (`keyword_rules.yaml`)

Per-card keyword→category mapping. Structure:

```yaml
rules:
  <card-id>:
    default_category: "<fallback category name>"   # must match a name in cards.yaml
    categories:
      <CategoryName>:                              # must match a name in cards.yaml
        - keyword1
        - keyword2
      <AnotherCategory>:
        - keyword3
      # Default category needs no keywords
```

**Rules:**
- Keywords are **case-insensitive substrings** (not regex)
- Categories are evaluated **top-to-bottom** - first matching category wins
- Always put `Excluded` first so exclusions are never overridden
- The `default_category` is used when no keyword matches and the description is too short for semantic classification

---

## Remote Config Sync (`cards_sync.py`)

To ensure card benefits, caps, exclusions, and classifier rules stay up-to-date as banks change terms:

- **Automatic GitHub Fetching**: On app startup, `sync_remote_configs()` fetches the latest `cards.yaml` and `keyword_rules.yaml` from GitHub.
- **Local Cache & Fallback**: Fetched YAML files are cached locally in `CHIME_DATA_DIR/remote_cards.yaml` and `CHIME_DATA_DIR/remote_keyword_rules.yaml`.
- **Offline Reliability**: If offline or if GitHub is unreachable, Chime falls back gracefully to the bundled local `cards.yaml` and `keyword_rules.yaml`.
- **Environment Overrides**: Remote URLs can be customized via `CHIME_CARDS_REMOTE_URL` and `CHIME_RULES_REMOTE_URL`.

---

## Card Configuration (`cards.yaml`)

```yaml
cards:
  - id: "sbi-cashback"
    name: "SBI Cashback Card"
    bank: "SBI"
    color: "#0072BC"
    icon: "💳"
    categories:
      - name: "Online Spends"
        rate: 5.0
        cap: 5000          # ₹/month max cashback
      - name: "Offline Spends"
        rate: 1.0
        cap: null
      - name: "Excluded"
        rate: 0.0
        cap: null
    exclusions:
      - "Fuel"
      - "Utilities"
      # ... (Rent, Insurance, EMI, Wallet Load, Government Fees, Jewelry)
```

Each card has: `id`, `name`, `bank`, `color`, `icon`, `categories[]` (with `name`, `rate`, `cap`), and `exclusions[]`.

---

## Parser System

All parser implementations live in `backend/parsers/`. Each parser extends `BaseParser` and uses `pdfplumber` + regex to extract transactions from PDF text.

### Input → Output Contract

**Input**: PDF file path + optional password

**Output**: List of dicts with this shape:
```python
[
    {
        "date": "10 Dec 25",         # raw date string from PDF
        "description": "ZEPTO MARKETPLACE PRIV Bangalore IN",
        "amount": 1271.00,           # float, commas stripped
        "type": "Dr"                 # "Dr" (debit/spend) or "Cr" (credit/refund)
    },
    ...
]
```

### Existing Parsers

| Card ID | Parser Class | File | Date Format |
|---------|-------------|------|-------------|
| `sbi-cashback` | `SBICashbackParser` | `parsers/sbi_parser.py` | `DD MMM YY` |
| `hdfc-swiggy` | `SwiggyHDFCParser` | `parsers/hdfc_parser.py` | `DD/MM/YYYY` |
| `axis-airtel` | `AirtelAxisParser` | `parsers/axis_parser.py` | `DD/MM/YYYY` |

Registry in `parsers/__init__.py` maps `card_id` → parser class via `PARSER_REGISTRY` dict.

### Adding a New Card (Full Checklist)

1. Extract raw PDF text with `pdfplumber` to study the line format
2. Create `parsers/{bank}_parser.py` extending `BaseParser`
3. Write regex matching that bank's date/amount/type format
4. Register in `parsers/__init__.py` `PARSER_REGISTRY`
5. Add card entry in `cards.yaml` with categories, rates, and caps
6. Add keyword rules in `keyword_rules.yaml` under `rules.<card-id>`

---

## Error Handling Strategy

Errors are caught in the upload endpoint and classified:

| Condition | HTTP | Message |
|-----------|------|---------|
| Card not in YAML | 404 | "Card not found" |
| No parser registered | 400 | "No parser implemented for card: {id}" |
| PDF encrypted, no password | 400 | "This PDF is password-protected…" |
| PDF encrypted, wrong password | 400 | "Wrong password…" |
| Corrupt/invalid PDF | 400 | "Unable to read the PDF…" |
| No transactions found | 400 | Multi-line suggestion (wrong card? wrong format?) |
| Only credits, no debits | 400 | "Only contains credit/payment entries" |
| Unknown error | 500 | "Something went wrong: {error}" |

Detection uses `type(e).__name__`, `str(e)`, and `repr(e)` all lowercased, checking for keywords like "password", "decrypt", "encrypted", "pdf", "corrupt".
