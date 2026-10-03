---
name: data-modeling
description: Documents the relational SQLite schema, Pydantic DTO models, entity relationships, index design, auto-migration mechanisms, and data access contracts for Chime. Use when adding new tables, modifying database fields, or extending API schemas.
---

# Data Modeling

Comprehensive reference for Chime's data architecture, SQLite relational schema, Pydantic API contracts, and YAML configuration schemas.

---

## Entity Relationship Overview

```
┌────────────────────────────────┐
│             users              │
├────────────────────────────────┤
│ id (PK)                        │
│ username (UNIQUE)              │
│ password_hash                  │
│ security_question              │
│ security_answer_hash           │
│ created_at                     │
└───────────────┬────────────────┘
                │ 1
                │
                │ N (ON DELETE CASCADE)
                ▼
┌────────────────────────────────┐
│            uploads             │
├────────────────────────────────┤
│ id (PK)                        │
│ user_id (FK -> users.id)       │
│ card_id                        │
│ card_name, card_bank, ...      │
│ month (e.g. "2025-12")         │
│ total_spend, total_cashback    │
│ actual_cashback_credited       │
│ uploaded_at                    │
└───────────────┬────────────────┘
                │ 1
                │
                │ N (ON DELETE CASCADE)
                ▼
┌────────────────────────────────┐
│          transactions          │
├────────────────────────────────┤
│ id (PK)                        │
│ upload_id (FK -> uploads.id)   │
│ date (raw string from PDF)     │
│ description                    │
│ category                       │
│ amount                         │
│ cashback_rate, cashback_amount │
│ confidence, match_type         │
└────────────────────────────────┘
```

---

## Database Schema (`backend/database.py`)

SQLite database file is located at `CHIME_DATA_DIR/chime.db` (defaults to `backend/data/chime.db`). Foreign keys are enforced per-connection via `PRAGMA foreign_keys = ON`.

### 1. `users` Table

Stores user credentials and hashed security recovery questions.

```sql
CREATE TABLE IF NOT EXISTS users (
    id                      TEXT PRIMARY KEY,
    username                TEXT NOT NULL UNIQUE,
    password_hash           TEXT NOT NULL,
    security_question       TEXT,
    security_answer_hash    TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2. `uploads` Table

Tracks processed PDF bank statements uploaded by users. Enforces a single statement per user per credit card per billing month.

```sql
CREATE TABLE IF NOT EXISTS uploads (
    id                          TEXT PRIMARY KEY,
    user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id                     TEXT NOT NULL,
    card_name                   TEXT NOT NULL,
    card_bank                   TEXT NOT NULL,
    card_color                  TEXT NOT NULL,
    card_icon                   TEXT NOT NULL,
    month                       TEXT NOT NULL,
    uploaded_at                 TEXT NOT NULL DEFAULT (datetime('now')),
    total_spend                 REAL NOT NULL,
    total_cashback              REAL NOT NULL,
    effective_rate              REAL NOT NULL,
    total_transactions          INTEGER NOT NULL,
    actual_cashback_credited    REAL
);

-- Unique index ensuring 1 upload per user per card per month (enables clean upserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_upload
    ON uploads(user_id, card_id, month);

CREATE INDEX IF NOT EXISTS idx_uploads_user
    ON uploads(user_id);
```

### 3. `transactions` Table

Individual parsed and classified debit/credit transactions linked to a statement upload.

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id              TEXT PRIMARY KEY,
    upload_id       TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    date            TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL,
    amount          REAL NOT NULL,
    cashback_rate   REAL NOT NULL,
    cashback_amount REAL NOT NULL,
    confidence      REAL DEFAULT 1.0,
    match_type      TEXT DEFAULT 'rule'
);

CREATE INDEX IF NOT EXISTS idx_transactions_upload
    ON transactions(upload_id);
```

---

## Schema Auto-Migrations

Migrations are handled in-app during startup inside `init_db()` in `database.py`. The function checks table columns via `PRAGMA table_info` and executes non-destructive `ALTER TABLE ADD COLUMN` queries if columns are missing:

```python
cursor.execute("PRAGMA table_info(users)")
user_cols = [row[1] for row in cursor.fetchall()]
if "security_question" not in user_cols:
    conn.execute("ALTER TABLE users ADD COLUMN security_question TEXT")
if "security_answer_hash" not in user_cols:
    conn.execute("ALTER TABLE users ADD COLUMN security_answer_hash TEXT")

cursor.execute("PRAGMA table_info(uploads)")
upload_cols = [row[1] for row in cursor.fetchall()]
if "actual_cashback_credited" not in upload_cols:
    conn.execute("ALTER TABLE uploads ADD COLUMN actual_cashback_credited REAL")

cursor.execute("PRAGMA table_info(transactions)")
txn_cols = [row[1] for row in cursor.fetchall()]
if "confidence" not in txn_cols:
    conn.execute("ALTER TABLE transactions ADD COLUMN confidence REAL DEFAULT 1.0")
if "match_type" not in txn_cols:
    conn.execute("ALTER TABLE transactions ADD COLUMN match_type TEXT DEFAULT 'rule'")
```

---

## Pydantic Data Models (`backend/models.py`)

Used for request validation, serialization, and OpenAPI documentation in FastAPI.

### Auth & User Management

```python
class UserCreate(BaseModel):
    username: str
    password: str
    security_question: Optional[str] = None
    security_answer: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    username: str
    security_answer: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    username: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class UserProfileResponse(BaseModel):
    username: str
    security_question: Optional[str] = None
    created_at: str
```

### Statement Processing & Analytics

```python
class Transaction(BaseModel):
    id: str
    date: str
    description: str
    category: str
    amount: float
    cashbackRate: float
    cashbackAmount: float
    confidence: Optional[float] = 1.0
    matchType: Optional[str] = "rule"

class CategoryBreakdown(BaseModel):
    category: str
    spend: float
    cashback: float
    transactionCount: int

class CashbackSummary(BaseModel):
    totalTransactions: int
    totalSpend: float
    totalCashback: float
    effectiveCashbackPercent: float
    categoryBreakdown: List[CategoryBreakdown]

class CashbackResult(BaseModel):
    uploadId: Optional[str] = None
    month: Optional[str] = None
    card: CardConfig
    transactions: List[Transaction]
    summary: CashbackSummary
    actualCashbackCredited: Optional[float] = None
```

---

## Declarative YAML Config Schemas

### 1. Card Config Schema (`cards.yaml`)

Defines eligible spend categories, cashback percentage rates, monthly cashback capping limits (in ₹), and excluded categories.

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
        cap: 5000          # Max ₹5,000 cashback per month across online spends
      - name: "Offline Spends"
        rate: 1.0
        cap: null
      - name: "Excluded"
        rate: 0.0
        cap: null
    exclusions:
      - "Fuel"
      - "Utilities"
      - "Rent"
      - "Wallet Load"
```

### 2. Keyword Rules Schema (`keyword_rules.yaml`)

Per-card substring keyword rules for Layer 1 classification.

```yaml
rules:
  sbi-cashback:
    default_category: "Offline Spends"
    categories:
      Excluded:
        - hp petrol
        - nayara fuel
        - lic premium
        - emi processing fee
      Online Spends:
        - amazon pay
        - flipkart
        - zepto
        - swiggy
```
