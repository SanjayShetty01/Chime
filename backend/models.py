from pydantic import BaseModel
from typing import List

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
    card: CardConfig
    transactions: List[Transaction]
    summary: CashbackSummary
