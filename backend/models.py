from pydantic import BaseModel
from typing import List, Optional


# -- Auth Models --------------------------------------------

class UserCreate(BaseModel):
    """
    Payload for user registration and authentication.
    Contains username, plaintext password, and security question credentials.
    """
    username: str
    password: str
    security_question: Optional[str] = None
    security_answer: Optional[str] = None

class SecurityQuestionResponse(BaseModel):
    """
    Response returned when requesting a user's chosen security question.
    Used during the password recovery flow.
    """
    username: str
    security_question: str

class ResetPasswordRequest(BaseModel):
    """
    Payload for resetting a forgotten password using the security question answer.
    """
    username: str
    security_answer: str
    new_password: str

class UserResponse(BaseModel):
    """
    Public user entity representation without sensitive password or answer hashes.
    """
    id: str
    username: str

class TokenResponse(BaseModel):
    """
    Response containing an authentication token and user information.
    """
    token: str
    user: UserResponse

class UserProfileResponse(BaseModel):
    """
    User profile details displayed on the account settings page.
    """
    username: str
    security_question: Optional[str] = None
    created_at: str

class ChangePasswordRequest(BaseModel):
    """
    Payload for an authenticated user to change their account password.
    """
    current_password: str
    new_password: str

class UpdateSecurityQuestionRequest(BaseModel):
    """
    Payload for an authenticated user to update their security question and answer.
    """
    current_password: str
    security_question: str
    security_answer: str

class UpdateReconciliationRequest(BaseModel):
    """
    Payload for updating the actual cashback credited by the bank for a statement.
    """
    actual_cashback_credited: float

class UpdateTransactionOverrideRequest(BaseModel):
    """
    Payload for overriding or resetting the cashback rate for a single transaction.
    """
    user_override_rate: Optional[float] = None

class TransactionOverrideItem(BaseModel):
    """
    Override entry for an individual transaction with optional custom rate.
    """
    transaction_id: str
    user_override_rate: Optional[float] = None

class BatchTransactionOverrideRequest(BaseModel):
    """
    Payload for batch saving custom percentage overrides for multiple transactions.
    """
    overrides: List[TransactionOverrideItem]

class BatchTransactionOverrideResponse(BaseModel):
    """
    Response returned after batch saving overrides with updated statement totals.
    """
    upload_id: str
    total_spend: float
    total_cashback: float
    effective_rate: float


# -- Card & Transaction Models ------------------------------

class CardConfig(BaseModel):
    """
    Basic card configuration details used across frontend pickers and statement headers.
    """
    id: str
    name: str
    bank: str
    color: str
    icon: str

class Transaction(BaseModel):
    """
    Normalized transaction record including classification, cashback rate, and manual overrides.
    """
    id: str
    date: str
    description: str
    category: str
    amount: float
    cashbackRate: float
    cashbackAmount: float
    confidence: Optional[float] = 1.0
    matchType: Optional[str] = "rule"
    userOverrideRate: Optional[float] = None

class CategoryBreakdown(BaseModel):
    """
    Aggregated spend and earned cashback totals for a single category in a statement.
    """
    category: str
    spend: float
    cashback: float
    transactionCount: int

class CashbackSummary(BaseModel):
    """
    High-level financial summary for a parsed statement.
    """
    totalTransactions: int
    totalSpend: float
    totalCashback: float
    effectiveCashbackPercent: float
    categoryBreakdown: List[CategoryBreakdown]

class CashbackResult(BaseModel):
    """
    Complete response returned when parsing a statement or loading historical statement details.
    """
    uploadId: Optional[str] = None
    month: Optional[str] = None
    card: CardConfig
    transactions: List[Transaction]
    summary: CashbackSummary


# -- History Models -----------------------------------------

class UploadSummary(BaseModel):
    """
    Summary row representation for historical uploads list.
    """
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
