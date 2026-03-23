import sqlite3
import os
import uuid
from typing import Optional

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
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
                id              TEXT PRIMARY KEY,
                username        TEXT NOT NULL UNIQUE,
                password_hash   TEXT NOT NULL,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
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
        conn.commit()
    finally:
        conn.close()


# ── User CRUD ──────────────────────────────────────────────

def create_user(username: str, password_hash: str) -> str:
    """Create a new user. Returns user id."""
    user_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
            (user_id, username, password_hash),
        )
        conn.commit()
        return user_id
    finally:
        conn.close()


def get_user_by_username(username: str) -> Optional[dict]:
    """Fetch user by username. Returns dict or None."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, created_at FROM users WHERE username = ?",
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
            "SELECT id, username, password_hash, created_at FROM users WHERE id = ?",
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
                month, total_spend, total_cashback, effective_rate, total_transactions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (upload_id, user_id, card_id, card_name, card_bank, card_color, card_icon,
             month, total_spend, total_cashback, effective_rate, total_transactions),
        )

        # Insert all transactions
        for txn in transactions:
            conn.execute(
                """INSERT INTO transactions
                   (id, upload_id, date, description, category, amount, cashback_rate, cashback_amount)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (txn["id"], upload_id, txn["date"], txn["description"], txn["category"],
                 txn["amount"], txn["cashback_rate"], txn["cashback_amount"]),
            )

        conn.commit()
    finally:
        conn.close()


def get_uploads_for_user(user_id: str) -> list[dict]:
    """Get all uploads for a user (summary only, no transactions)."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT id, card_id, card_name, card_bank, card_color, card_icon,
                      month, uploaded_at, total_spend, total_cashback,
                      effective_rate, total_transactions
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
                      effective_rate, total_transactions
               FROM uploads WHERE id = ?""",
            (upload_id,),
        ).fetchone()
        if not upload_row:
            return None

        txn_rows = conn.execute(
            """SELECT id, date, description, category, amount, cashback_rate, cashback_amount
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
