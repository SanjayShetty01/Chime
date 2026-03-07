from pydantic import BaseModel
from typing import List, Optional


# ── Auth Models ────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse


# ── Card & Transaction Models ──────────────────────────────

class CardConfig(BaseModel):
    id: str
    name: str
    bank: str
    color: str
    icon: str

class Transaction(BaseModel):
    id: str
    date: str
    description: str
    category: str
    amount: float
    cashbackRate: float
    cashbackAmount: float

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


# ── History Models ─────────────────────────────────────────

class UploadSummary(BaseModel):
    id: str
    cardId: str
    cardName: str
    cardBank: str
    cardColor: str
    cardIcon: str
    month: str
    uploadedAt: str
    totalSpend: float
    totalCashback: float
    effectiveRate: float
    totalTransactions: int
