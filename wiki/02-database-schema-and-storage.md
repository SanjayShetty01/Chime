# 02 - Database Schema and Storage Engine

Chime uses a local relational SQLite database (`chime.db`) to store user accounts, uploaded statements, normalized transactions, and manual overrides.

---

## 1. Storage Location & Resolution

The database path is resolved dynamically via `get_data_dir()` in `backend/database.py`:

| Environment | Platform | Directory Path |
|---|---|---|
| **Packaged Desktop App** | Windows | `%APPDATA%\Chime\data\chime.db` |
| **Packaged Desktop App** | macOS | `~/Library/Application Support/Chime/data/chime.db` |
| **Packaged Desktop App** | Linux | `~/.local/share/Chime/data/chime.db` |
| **Local Development** | Any | `backend/data/chime.db` (or overridden via `CHIME_DATA_DIR`) |

Storing the database in standard OS user directories ensures that upgrading or reinstalling the desktop executable never wipes out saved user history or transaction overrides.

---

## 2. Table Schemas

### 1. `users` Table
Stores authenticated local users, hashed passwords, and security recovery questions.

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
Stores statement summaries and metadata. Each record represents one statement billing cycle for a specific card.

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_upload
    ON uploads(user_id, card_id, month);

CREATE INDEX IF NOT EXISTS idx_uploads_user
    ON uploads(user_id);
```

- **Upsert Rule**: The unique index `(user_id, card_id, month)` ensures that re-uploading an updated statement for the same month replaces the old upload and cascades deletions down to its previous transaction rows.

### 3. `transactions` Table
Stores individual line items extracted from the statement.

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id                  TEXT PRIMARY KEY,
    upload_id           TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    date                TEXT NOT NULL,
    description         TEXT NOT NULL,
    category            TEXT NOT NULL,
    amount              REAL NOT NULL,
    cashback_rate       REAL NOT NULL,
    cashback_amount     REAL NOT NULL,
    confidence          REAL DEFAULT 1.0,
    match_type          TEXT DEFAULT 'rule',
    user_override_rate  REAL
);

CREATE INDEX IF NOT EXISTS idx_transactions_upload
    ON transactions(upload_id);
```

---

## 3. Schema Migrations

Chime uses a safe, non-destructive migration pattern in `init_db()`:
1. It queries `PRAGMA table_info(table_name)` to inspect existing column names.
2. If newly introduced columns (such as `user_override_rate`, `actual_cashback_credited`, `confidence`, or `match_type`) are missing on an existing database file, it executes `ALTER TABLE ... ADD COLUMN ...`.
3. Existing user databases from previous releases migrate automatically on application launch with zero data loss.

---

## 4. Custom Override Persistence & History Synchronization

When a user edits the **User Custom % Override** field in the transaction table:
1. Rows with pending modifications are tracked locally and highlighted with amber status rings.
2. The user clicks **Save Custom Rates** (or presses Enter inside an input field).
3. `PUT /api/uploads/{upload_id}/overrides` is invoked with the modified transactions array.
4. `save_transaction_overrides(user_id, upload_id, overrides)` in `database.py`:
   - Validates upload ownership by `user_id`.
   - Iterates through the overrides:
     - If `user_override_rate` is provided, sets `user_override_rate = override_rate` and `cashback_amount = round(amount * override_rate / 100, 2)`.
     - If `user_override_rate` is `None` (reset), sets `user_override_rate = NULL` and recalculates `cashback_amount = round(amount * base_cashback_rate / 100, 2)`.
   - Recalculates `uploads.total_cashback` as `SUM(cashback_amount)` across all transactions.
   - Recomputes `uploads.effective_rate = round(new_total / total_spend * 100, 2)`.
   - Updates the parent `uploads` table row and commits atomically.
5. Because `uploads` is updated in SQLite:
   - Returning to the **History** page immediately displays the user's custom cashback and effective rate.
   - Clicking **Load Statement** retrieves the updated transactions with their stored `user_override_rate` prefilled.
   - Multi-month analytics dashboards immediately reflect the custom rates.
