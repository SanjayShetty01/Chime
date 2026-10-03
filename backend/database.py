import sqlite3
import os
import uuid
from typing import Optional

import sys

def get_data_dir() -> str:
    """Resolve the user-local data directory for Chime."""
    if "CHIME_DATA_DIR" in os.environ:
        return os.environ["CHIME_DATA_DIR"]

    if getattr(sys, "frozen", False):
        if sys.platform == "win32":
            base = os.environ.get("APPDATA", os.path.expanduser("~"))
        elif sys.platform == "darwin":
            base = os.path.expanduser("~/Library/Application Support")
        else:
            base = os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share"))
        data_dir = os.path.join(base, "Chime", "data")
        os.makedirs(data_dir, exist_ok=True)
        return data_dir

    return os.path.join(os.path.dirname(__file__), "data")

DB_DIR = get_data_dir()
DB_PATH = os.path.join(DB_DIR, "chime.db")


def get_connection() -> sqlite3.Connection:
    """Get a database connection with foreign keys enabled."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables and indexes if they don't exist."""
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id                      TEXT PRIMARY KEY,
                username                TEXT NOT NULL UNIQUE,
                password_hash           TEXT NOT NULL,
                security_question       TEXT,
                security_answer_hash    TEXT,
                created_at              TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS uploads (
                id                  TEXT PRIMARY KEY,
                user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                card_id             TEXT NOT NULL,
                card_name           TEXT NOT NULL,
                card_bank           TEXT NOT NULL,
                card_color          TEXT NOT NULL,
                card_icon           TEXT NOT NULL,
                month               TEXT NOT NULL,
                uploaded_at         TEXT NOT NULL DEFAULT (datetime('now')),
                total_spend         REAL NOT NULL,
                total_cashback      REAL NOT NULL,
                effective_rate      REAL NOT NULL,
                total_transactions  INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id              TEXT PRIMARY KEY,
                upload_id       TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
                date            TEXT NOT NULL,
                description     TEXT NOT NULL,
                category        TEXT NOT NULL,
                amount          REAL NOT NULL,
                cashback_rate   REAL NOT NULL,
                cashback_amount REAL NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_upload
                ON uploads(user_id, card_id, month);
            CREATE INDEX IF NOT EXISTS idx_uploads_user
                ON uploads(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_upload
                ON transactions(upload_id);
        """)

        # Migration: ensure security columns exist on existing DBs
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        if "security_question" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN security_question TEXT")
        if "security_answer_hash" not in columns:
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
        if "user_override_rate" not in txn_cols:
            conn.execute("ALTER TABLE transactions ADD COLUMN user_override_rate REAL")

        conn.commit()
    finally:
        conn.close()


# ── User CRUD ──────────────────────────────────────────────

def create_user(
    username: str,
    password_hash: str,
    security_question: Optional[str] = None,
    security_answer_hash: Optional[str] = None,
) -> str:
    """Create a new user. Returns user id."""
    user_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO users (id, username, password_hash, security_question, security_answer_hash)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, username, password_hash, security_question, security_answer_hash),
        )
        conn.commit()
        return user_id
    finally:
        conn.close()


def update_user_password(username: str, new_password_hash: str) -> bool:
    """Update password for a user. Returns True if updated."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (new_password_hash, username),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def update_user_security_question(
    username: str,
    security_question: str,
    security_answer_hash: str,
) -> bool:
    """Update security question and answer hash for a user. Returns True if updated."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """UPDATE users
               SET security_question = ?, security_answer_hash = ?
               WHERE username = ?""",
            (security_question, security_answer_hash, username),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_user_by_username(username: str) -> Optional[dict]:
    """Fetch user by username. Returns dict or None."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, security_question, security_answer_hash, created_at FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Fetch user by id. Returns dict or None."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, security_question, security_answer_hash, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


# ── Upload CRUD ────────────────────────────────────────────

def save_upload(
    user_id: str,
    upload_id: str,
    card_id: str,
    card_name: str,
    card_bank: str,
    card_color: str,
    card_icon: str,
    month: str,
    total_spend: float,
    total_cashback: float,
    effective_rate: float,
    total_transactions: int,
    transactions: list[dict],
    actual_cashback_credited: Optional[float] = None,
):
    """
    Save an upload and its transactions. If an upload already exists for
    the same user + card + month, delete the old one first (upsert).
    """
    conn = get_connection()
    try:
        # Delete existing upload for this user/card/month (cascade deletes transactions)
        conn.execute(
            "DELETE FROM uploads WHERE user_id = ? AND card_id = ? AND month = ?",
            (user_id, card_id, month),
        )

        # Insert the new upload
        conn.execute(
            """INSERT INTO uploads
               (id, user_id, card_id, card_name, card_bank, card_color, card_icon,
                month, total_spend, total_cashback, effective_rate, total_transactions, actual_cashback_credited)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (upload_id, user_id, card_id, card_name, card_bank, card_color, card_icon,
             month, total_spend, total_cashback, effective_rate, total_transactions, actual_cashback_credited),
        )

        # Insert all transactions
        for txn in transactions:
            conn.execute(
                """INSERT INTO transactions
                   (id, upload_id, date, description, category, amount, cashback_rate, cashback_amount, confidence, match_type, user_override_rate)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (txn["id"], upload_id, txn["date"], txn["description"], txn["category"],
                 txn["amount"], txn["cashback_rate"], txn["cashback_amount"],
                 txn.get("confidence", 1.0), txn.get("match_type", "rule"), txn.get("user_override_rate")),
            )

        conn.commit()
    finally:
        conn.close()


def update_upload_actual_cashback(upload_id: str, user_id: str, actual_cashback: float) -> bool:
    """Update actual cashback credited for a specific upload."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "UPDATE uploads SET actual_cashback_credited = ? WHERE id = ? AND user_id = ?",
            (actual_cashback, upload_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def update_transaction_override(
    user_id: str,
    upload_id: str,
    txn_id: str,
    override_rate: Optional[float],
) -> Optional[dict]:
    """
    Update user_override_rate on a specific transaction and recompute upload totals.
    If override_rate is None, reset to default cashback_rate.
    """
    conn = get_connection()
    try:
        up = conn.execute(
            "SELECT id, total_spend FROM uploads WHERE id = ? AND user_id = ?",
            (upload_id, user_id),
        ).fetchone()
        if not up:
            return None

        row = conn.execute(
            "SELECT id, amount, cashback_rate, user_override_rate FROM transactions WHERE id = ? AND upload_id = ?",
            (txn_id, upload_id),
        ).fetchone()
        if not row:
            return None

        amount = float(row["amount"])
        base_rate = float(row["cashback_rate"])

        if override_rate is not None:
            eff_rate = float(override_rate)
            eff_cb = round(amount * eff_rate / 100, 2)
            conn.execute(
                """UPDATE transactions
                   SET user_override_rate = ?, cashback_amount = ?
                   WHERE id = ? AND upload_id = ?""",
                (eff_rate, eff_cb, txn_id, upload_id),
            )
        else:
            eff_rate = base_rate
            eff_cb = round(amount * base_rate / 100, 2)
            conn.execute(
                """UPDATE transactions
                   SET user_override_rate = NULL, cashback_amount = ?
                   WHERE id = ? AND upload_id = ?""",
                (eff_cb, txn_id, upload_id),
            )

        cb_row = conn.execute(
            "SELECT COALESCE(SUM(cashback_amount), 0) as total_cb FROM transactions WHERE upload_id = ?",
            (upload_id,),
        ).fetchone()
        new_total_cb = round(float(cb_row["total_cb"]), 2)
        total_spend = float(up["total_spend"])
        new_effective_rate = round((new_total_cb / total_spend * 100) if total_spend > 0 else 0.0, 2)

        conn.execute(
            "UPDATE uploads SET total_cashback = ?, effective_rate = ? WHERE id = ?",
            (new_total_cb, new_effective_rate, upload_id),
        )

        conn.commit()

        return {
            "transaction_id": txn_id,
            "user_override_rate": override_rate,
            "cashback_rate": eff_rate,
            "cashback_amount": eff_cb,
            "total_cashback": new_total_cb,
            "effective_rate": new_effective_rate,
        }
    finally:
        conn.close()


def save_transaction_overrides(
    user_id: str,
    upload_id: str,
    overrides: list[dict],
) -> Optional[dict]:
    """
    Batch update user_override_rate on multiple transactions for an upload.
    Each item in overrides: {"transaction_id": str, "user_override_rate": Optional[float]}.
    Recalculates total_cashback and effective_rate for the parent upload record.
    Returns dict with upload summary and list of updated transactions.
    """
    conn = get_connection()
    try:
        up = conn.execute(
            "SELECT id, total_spend FROM uploads WHERE id = ? AND user_id = ?",
            (upload_id, user_id),
        ).fetchone()
        if not up:
            return None

        total_spend = float(up["total_spend"])

        for item in overrides:
            txn_id = item.get("transaction_id")
            if not txn_id:
                continue
            override_rate = item.get("user_override_rate")

            row = conn.execute(
                "SELECT id, amount, cashback_rate FROM transactions WHERE id = ? AND upload_id = ?",
                (txn_id, upload_id),
            ).fetchone()
            if not row:
                continue

            amount = float(row["amount"])
            base_rate = float(row["cashback_rate"])

            if override_rate is not None and override_rate != "":
                eff_rate = float(override_rate)
                eff_cb = round(amount * eff_rate / 100, 2)
                conn.execute(
                    """UPDATE transactions
                       SET user_override_rate = ?, cashback_amount = ?
                       WHERE id = ? AND upload_id = ?""",
                    (eff_rate, eff_cb, txn_id, upload_id),
                )
            else:
                eff_cb = round(amount * base_rate / 100, 2)
                conn.execute(
                    """UPDATE transactions
                       SET user_override_rate = NULL, cashback_amount = ?
                       WHERE id = ? AND upload_id = ?""",
                    (eff_cb, txn_id, upload_id),
                )

        cb_row = conn.execute(
            "SELECT COALESCE(SUM(cashback_amount), 0) as total_cb FROM transactions WHERE upload_id = ?",
            (upload_id,),
        ).fetchone()
        new_total_cb = round(float(cb_row["total_cb"]), 2)
        new_effective_rate = round((new_total_cb / total_spend * 100) if total_spend > 0 else 0.0, 2)

        conn.execute(
            "UPDATE uploads SET total_cashback = ?, effective_rate = ? WHERE id = ?",
            (new_total_cb, new_effective_rate, upload_id),
        )

        conn.commit()

        txns = conn.execute(
            """SELECT id, date, description, category, amount, cashback_rate, cashback_amount,
                      COALESCE(confidence, 1.0) as confidence, COALESCE(match_type, 'rule') as match_type,
                      user_override_rate
               FROM transactions WHERE upload_id = ?
               ORDER BY date""",
            (upload_id,),
        ).fetchall()

        return {
            "upload_id": upload_id,
            "total_spend": total_spend,
            "total_cashback": new_total_cb,
            "effective_rate": new_effective_rate,
            "transactions": [dict(t) for t in txns],
        }
    finally:
        conn.close()


def get_uploads_for_user(user_id: str) -> list[dict]:
    """Get all uploads for a user (summary only, no transactions)."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT id, card_id, card_name, card_bank, card_color, card_icon,
                      month, uploaded_at, total_spend, total_cashback,
                      effective_rate, total_transactions, actual_cashback_credited
               FROM uploads WHERE user_id = ?
               ORDER BY month DESC, uploaded_at DESC""",
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_upload_detail(upload_id: str) -> Optional[dict]:
    """Get a single upload with its transactions."""
    conn = get_connection()
    try:
        upload_row = conn.execute(
            """SELECT id, user_id, card_id, card_name, card_bank, card_color, card_icon,
                      month, uploaded_at, total_spend, total_cashback,
                      effective_rate, total_transactions, actual_cashback_credited
               FROM uploads WHERE id = ?""",
            (upload_id,),
        ).fetchone()
        if not upload_row:
            return None

        txn_rows = conn.execute(
            """SELECT id, date, description, category, amount, cashback_rate, cashback_amount,
                      COALESCE(confidence, 1.0) as confidence, COALESCE(match_type, 'rule') as match_type,
                      user_override_rate
               FROM transactions WHERE upload_id = ?
               ORDER BY date""",
            (upload_id,),
        ).fetchall()

        return {
            "upload": dict(upload_row),
            "transactions": [dict(row) for row in txn_rows],
        }
    finally:
        conn.close()


def delete_upload(upload_id: str, user_id: str) -> bool:
    """Delete an upload (only if owned by user). Returns True if deleted."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM uploads WHERE id = ? AND user_id = ?",
            (upload_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_analytics_summary(user_id: str) -> dict:
    """Compute multi-month analytics & trends across all uploads for a user."""
    conn = get_connection()
    try:
        total_row = conn.execute(
            """SELECT COUNT(*) as upload_count,
                      COALESCE(SUM(total_spend), 0) as total_spend,
                      COALESCE(SUM(total_cashback), 0) as total_cashback,
                      COALESCE(SUM(total_transactions), 0) as total_transactions
               FROM uploads WHERE user_id = ?""",
            (user_id,),
        ).fetchone()

        total_spend = float(total_row["total_spend"])
        total_cashback = float(total_row["total_cashback"])
        effective_rate = (total_cashback / total_spend * 100) if total_spend > 0 else 0.0

        monthly_rows = conn.execute(
            """SELECT month,
                      SUM(total_spend) as spend,
                      SUM(total_cashback) as cashback,
                      SUM(total_transactions) as transactions,
                      COUNT(id) as uploads_count
               FROM uploads WHERE user_id = ?
               GROUP BY month
               ORDER BY month ASC""",
            (user_id,),
        ).fetchall()

        monthly_trends = [
            {
                "month": r["month"],
                "spend": float(r["spend"]),
                "cashback": float(r["cashback"]),
                "transactions": int(r["transactions"]),
                "effectiveRate": round((float(r["cashback"]) / float(r["spend"]) * 100), 2) if float(r["spend"]) > 0 else 0.0,
            }
            for r in monthly_rows
        ]

        card_rows = conn.execute(
            """SELECT card_id, card_name, card_bank, card_color, card_icon,
                      SUM(total_spend) as spend,
                      SUM(total_cashback) as cashback,
                      COUNT(id) as statement_count
               FROM uploads WHERE user_id = ?
               GROUP BY card_id, card_name, card_bank, card_color, card_icon
               ORDER BY spend DESC""",
            (user_id,),
        ).fetchall()

        card_breakdown = [
            {
                "cardId": r["card_id"],
                "cardName": r["card_name"],
                "cardBank": r["card_bank"],
                "cardColor": r["card_color"],
                "cardIcon": r["card_icon"],
                "spend": float(r["spend"]),
                "cashback": float(r["cashback"]),
                "statementCount": int(r["statement_count"]),
                "effectiveRate": round((float(r["cashback"]) / float(r["spend"]) * 100), 2) if float(r["spend"]) > 0 else 0.0,
            }
            for r in card_rows
        ]

        category_rows = conn.execute(
            """SELECT t.category,
                      SUM(t.amount) as spend,
                      SUM(t.cashback_amount) as cashback,
                      COUNT(t.id) as count
               FROM transactions t
               JOIN uploads u ON t.upload_id = u.id
               WHERE u.user_id = ?
               GROUP BY t.category
               ORDER BY spend DESC""",
            (user_id,),
        ).fetchall()

        category_breakdown = [
            {
                "category": r["category"],
                "spend": float(r["spend"]),
                "cashback": float(r["cashback"]),
                "transactionCount": int(r["count"]),
            }
            for r in category_rows
        ]

        discrepancy_rows = conn.execute(
            """SELECT id, card_name, month, total_cashback, actual_cashback_credited
               FROM uploads
               WHERE user_id = ? AND actual_cashback_credited IS NOT NULL""",
            (user_id,),
        ).fetchall()

        discrepancies = []
        total_undercredited = 0.0
        for r in discrepancy_rows:
            expected = float(r["total_cashback"])
            actual = float(r["actual_cashback_credited"])
            diff = expected - actual
            status = "MATCHED"
            if diff > 0.01:
                status = "UNDERPAID"
                total_undercredited += diff
            elif diff < -0.01:
                status = "OVERPAID"
            discrepancies.append({
                "uploadId": r["id"],
                "cardName": r["card_name"],
                "month": r["month"],
                "expectedCashback": expected,
                "actualCashback": actual,
                "difference": round(diff, 2),
                "status": status,
            })

        return {
            "summary": {
                "totalSpend": total_spend,
                "totalCashback": total_cashback,
                "effectiveRate": round(effective_rate, 2),
                "totalTransactions": int(total_row["total_transactions"]),
                "uploadCount": int(total_row["upload_count"]),
                "totalUndercredited": round(total_undercredited, 2),
            },
            "monthlyTrends": monthly_trends,
            "cardBreakdown": card_breakdown,
            "categoryBreakdown": category_breakdown,
            "discrepancies": discrepancies,
        }
    finally:
        conn.close()
