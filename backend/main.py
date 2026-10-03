from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import yaml
import os
import tempfile
import uuid
from parsers import get_parser
from classifier import classify_transaction, classify_transaction_with_confidence
from cashback_calculation import calculate_statement_cashback
from models import (
    CashbackResult, CardConfig, CashbackSummary, Transaction,
    CategoryBreakdown, UserCreate, UserResponse, TokenResponse, UploadSummary,
    SecurityQuestionResponse, ResetPasswordRequest, UserProfileResponse,
    ChangePasswordRequest, UpdateSecurityQuestionRequest, UpdateReconciliationRequest,
    UpdateTransactionOverrideRequest, BatchTransactionOverrideRequest,
    BatchTransactionOverrideResponse,
)
from database import (
    init_db, create_user, get_user_by_username, save_upload,
    get_uploads_for_user, get_upload_detail, delete_upload, update_user_password,
    update_user_security_question, update_upload_actual_cashback, get_analytics_summary,
    update_transaction_override, save_transaction_overrides,
)
from auth import hash_password, verify_password, create_token, get_current_user

ALLOWED_SECURITY_QUESTIONS = [
    "What's your crush name?",
    "What year you passed 10th?",
    "Name of your first love",
]

app = FastAPI(title="Chime API", description="Cashback Tracking API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from cards_sync import sync_remote_configs, load_cards_yaml

# Initialize database and sync remote card configs on startup
@app.on_event("startup")
def startup():
    """
    Application startup event handler.
    Initializes the local SQLite database schema and syncs remote card definitions if available.
    """
    init_db()
    try:
        sync_remote_configs()
    except Exception:
        pass


# -- Auth Endpoints -----------------------------------------

@app.post("/api/auth/register", response_model=TokenResponse)
def register(body: UserCreate):
    """
    Registers a new local user account.
    Validates password strength, security question, hashes credentials, and returns a session token.
    """
    if not body.username or not body.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if not body.security_question or not body.security_answer:
        raise HTTPException(status_code=400, detail="Security question and answer are required")
    if body.security_question not in ALLOWED_SECURITY_QUESTIONS:
        raise HTTPException(status_code=400, detail="Invalid security question selected")

    existing = get_user_by_username(body.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    hashed = hash_password(body.password)
    normalized_answer = body.security_answer.strip().lower()
    hashed_answer = hash_password(normalized_answer)

    user_id = create_user(body.username, hashed, body.security_question, hashed_answer)
    token = create_token(user_id, body.username)

    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, username=body.username),
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(body: UserCreate):
    """
    Authenticates an existing user via username and password.
    Returns a signed session token on success.
    """
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(user["id"], user["username"])

    return TokenResponse(
        token=token,
        user=UserResponse(id=user["id"], username=user["username"]),
    )


@app.get("/api/auth/security-question", response_model=SecurityQuestionResponse)
def get_security_question(username: str):
    """
    Retrieves the security question configured for a given username during password recovery.
    """
    user = get_user_by_username(username.strip())
    if not user or not user.get("security_question"):
        raise HTTPException(status_code=404, detail="User or security question not found")
    return SecurityQuestionResponse(
        username=user["username"],
        security_question=user["security_question"]
    )


@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordRequest):
    """
    Resets a user password by validating the case-insensitive answer to their security question.
    """
    if not body.username or not body.security_answer or not body.new_password:
        raise HTTPException(status_code=400, detail="All fields are required")
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    user = get_user_by_username(body.username.strip())
    if not user or not user.get("security_answer_hash"):
        raise HTTPException(status_code=400, detail="Invalid user or security question not set")

    normalized_answer = body.security_answer.strip().lower()
    if not verify_password(normalized_answer, user["security_answer_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect answer to security question")

    new_hashed_pw = hash_password(body.new_password)
    update_user_password(user["username"], new_hashed_pw)

    return {"message": "Password reset successfully"}


# -- Card Endpoint ------------------------------------------

@app.get("/api/cards", response_model=list[CardConfig])
def get_cards():
    """
    Returns the list of supported credit cards configured in cards.yml.
    Used by frontend drop-downs and selection cards.
    """
    cards_list = []
    data = load_cards_yaml()
    for c in data.get("cards", []):
        cards_list.append(CardConfig(
            id=c.get("id", ""),
            name=c.get("name", ""),
            bank=c.get("bank", ""),
            color=c.get("color", ""),
            icon=c.get("icon", "💳")
        ))
    return cards_list


# -- Upload Endpoint ----------------------------------------

@app.post("/api/upload-statement", response_model=CashbackResult)
async def upload_statement(
    cardId: str = Form(...),
    password: str = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Uploads and parses a bank credit card PDF statement.
    Validates card configuration, decrypts password-protected PDFs if needed, extracts transactions,
    applies two-layer classification and card calculation rules, and persists results to SQLite.
    """
    # Load full card config including categories and exclusions (remote sync / cached / local fallback)
    card_config = None
    card_yaml = None  # full raw yaml entry for this card
    data = load_cards_yaml()
    for c in data.get("cards", []):
        if c.get("id") == cardId:
            card_config = CardConfig(
                id=c.get("id", ""),
                name=c.get("name", ""),
                bank=c.get("bank", ""),
                color=c.get("color", ""),
                icon=c.get("icon", "💳")
            )
            card_yaml = c
            break

    if not card_config:
        raise HTTPException(status_code=404, detail="Card not found")

    # Save uploaded file temporarily
    fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(fd, 'wb') as tfile:
            tfile.write(await file.read())

        # Get parser
        try:
            parser = get_parser(card_config.id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Parse the PDF
        try:
            parse_result = parser.parse(temp_pdf_path, password)
        except Exception as e:
            error_info = f"{type(e).__name__} {str(e)} {repr(e)}".lower()
            if "password" in error_info or "decrypt" in error_info or "encrypted" in error_info:
                if password:
                    raise HTTPException(
                        status_code=400,
                        detail="Wrong password. The PDF is encrypted and the password you entered didn't work. Please double-check and try again."
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="This PDF is password-protected. Please enter the statement password and try again."
                    )
            elif "pdf" in error_info or "corrupt" in error_info:
                raise HTTPException(
                    status_code=400,
                    detail="Unable to read the PDF. The file may be corrupted or not a valid PDF document."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Something went wrong while parsing: {str(e) or repr(e)}"
                )

        # Handle both old (list) and new (dict with month) parser return formats
        if isinstance(parse_result, dict):
            raw_txns = parse_result.get("transactions", [])
            statement_month = parse_result.get("month", None)
        else:
            raw_txns = parse_result
            statement_month = None

        if not raw_txns:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No transactions found. This could mean:\n"
                    f"• You selected \"{card_config.name}\" but uploaded a statement from a different card.\n"
                    f"• The PDF format is different from what we expect.\n"
                    f"Please verify you picked the correct card and try again."
                )
            )

    finally:
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

    # Calculate statement cashback with category rate extraction and dynamic caps
    transactions, summary, has_debits = calculate_statement_cashback(
        raw_txns=raw_txns,
        card_id=card_config.id,
        card_yaml=card_yaml,
    )

    if not has_debits:
        raise HTTPException(
            status_code=400,
            detail="The statement was parsed but only contains credit/payment entries; no spends were found."
        )

    # Determine month (from parser or fallback to current month)
    if not statement_month:
        from datetime import datetime
        statement_month = datetime.now().strftime("%Y-%m")

    # Save to database
    upload_id = str(uuid.uuid4())
    save_upload(
        user_id=current_user["id"],
        upload_id=upload_id,
        card_id=card_config.id,
        card_name=card_config.name,
        card_bank=card_config.bank,
        card_color=card_config.color,
        card_icon=card_config.icon,
        month=statement_month,
        total_spend=summary.totalSpend,
        total_cashback=summary.totalCashback,
        effective_rate=summary.effectiveCashbackPercent,
        total_transactions=len(transactions),
        transactions=[
            {
                "id": t.id,
                "date": t.date,
                "description": t.description,
                "category": t.category,
                "amount": t.amount,
                "cashback_rate": t.cashbackRate,
                "cashback_amount": t.cashbackAmount,
                "confidence": t.confidence,
                "match_type": t.matchType,
            }
            for t in transactions
        ],
    )

    return CashbackResult(
        uploadId=upload_id,
        month=statement_month,
        card=card_config,
        transactions=transactions,
        summary=summary,
    )


# -- History Endpoints --------------------------------------

@app.get("/api/history", response_model=list[UploadSummary])
def get_history(current_user: dict = Depends(get_current_user)):
    """
    Retrieves summary records for all statements uploaded by the authenticated user.
    """
    uploads = get_uploads_for_user(current_user["id"])
    return [
        UploadSummary(
            id=u["id"],
            cardId=u["card_id"],
            cardName=u["card_name"],
            cardBank=u["card_bank"],
            cardColor=u["card_color"],
            cardIcon=u["card_icon"],
            month=u["month"],
            uploadedAt=u["uploaded_at"],
            totalSpend=u["total_spend"],
            totalCashback=u["total_cashback"],
            effectiveRate=u["effective_rate"],
            totalTransactions=u["total_transactions"],
        )
        for u in uploads
    ]


@app.get("/api/uploads/{upload_id}", response_model=CashbackResult)
def get_upload(upload_id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves full details of a specific uploaded statement, including transactions and breakdown.
    Enforces user data isolation.
    """
    detail = get_upload_detail(upload_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Upload not found")

    upload = detail["upload"]
    if upload["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your upload")

    txns = detail["transactions"]

    # Rebuild category breakdown from transactions
    cat_map: dict[str, dict] = {}
    for t in txns:
        cat = t["category"]
        if cat not in cat_map:
            cat_map[cat] = {"spend": 0.0, "cashback": 0.0, "count": 0}
        cat_map[cat]["spend"] += t["amount"]
        cat_map[cat]["cashback"] += t["cashback_amount"]
        cat_map[cat]["count"] += 1

    return CashbackResult(
        uploadId=upload["id"],
        month=upload["month"],
        card=CardConfig(
            id=upload["card_id"],
            name=upload["card_name"],
            bank=upload["card_bank"],
            color=upload["card_color"],
            icon=upload["card_icon"],
        ),
        transactions=[
            Transaction(
                id=t["id"],
                date=t["date"],
                description=t["description"],
                category=t["category"],
                amount=t["amount"],
                cashbackRate=t["cashback_rate"],
                cashbackAmount=t["cashback_amount"],
                confidence=t.get("confidence", 1.0),
                matchType=t.get("match_type", "rule"),
                userOverrideRate=t.get("user_override_rate"),
            )
            for t in txns
        ],
        summary=CashbackSummary(
            totalTransactions=upload["total_transactions"],
            totalSpend=upload["total_spend"],
            totalCashback=upload["total_cashback"],
            effectiveCashbackPercent=upload["effective_rate"],
            categoryBreakdown=[
                CategoryBreakdown(
                    category=cat,
                    spend=round(vals["spend"], 2),
                    cashback=round(vals["cashback"], 2),
                    transactionCount=vals["count"],
                )
                for cat, vals in cat_map.items()
            ],
        ),
    )


@app.delete("/api/uploads/{upload_id}")
def remove_upload(upload_id: str, current_user: dict = Depends(get_current_user)):
    """
    Deletes an uploaded statement and its child transactions for the authenticated user.
    """
    deleted = delete_upload(upload_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Upload not found or not yours")
    return {"ok": True}


# -- Analytics Endpoint (Multi-Month Dashboard) -------------

@app.get("/api/analytics/summary")
def get_analytics(current_user: dict = Depends(get_current_user)):
    """
    Calculates multi-month lifetime spend, cashback earnings, top categories, and monthly trends.
    """
    return get_analytics_summary(current_user["id"])


# -- Reconciliation Endpoint --------------------------------

@app.put("/api/uploads/{upload_id}/reconciliation")
def update_reconciliation(
    upload_id: str,
    body: UpdateReconciliationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates the actual cashback amount credited by the bank on the user statement for variance tracking.
    """
    updated = update_upload_actual_cashback(upload_id, current_user["id"], body.actual_cashback_credited)
    if not updated:
        raise HTTPException(status_code=404, detail="Upload not found or not yours")
    return {"ok": True, "actual_cashback_credited": body.actual_cashback_credited}


# -- Transaction Override Endpoint --------------------------

@app.put("/api/uploads/{upload_id}/transactions/{txn_id}/override")
def set_transaction_override(
    upload_id: str,
    txn_id: str,
    body: UpdateTransactionOverrideRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Overrides or clears the user custom cashback rate on a single transaction and updates statement totals.
    """
    result = update_transaction_override(
        user_id=current_user["id"],
        upload_id=upload_id,
        txn_id=txn_id,
        override_rate=body.user_override_rate,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Transaction or upload not found")
    return result


@app.put("/api/uploads/{upload_id}/overrides", response_model=BatchTransactionOverrideResponse)
def set_batch_transaction_overrides(
    upload_id: str,
    body: BatchTransactionOverrideRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Saves custom cashback percentage overrides for multiple transactions in a statement.
    Updates database records, recalculates total cashback and effective rate, and updates upload summary.
    """
    result = save_transaction_overrides(
        user_id=current_user["id"],
        upload_id=upload_id,
        overrides=[item.dict() for item in body.overrides],
    )
    if not result:
        raise HTTPException(status_code=404, detail="Upload not found or not yours")
    return BatchTransactionOverrideResponse(
        upload_id=result["upload_id"],
        total_spend=result["total_spend"],
        total_cashback=result["total_cashback"],
        effective_rate=result["effective_rate"],
    )


# -- Profile & Settings Endpoints ---------------------------

@app.get("/api/auth/profile", response_model=UserProfileResponse)
def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the authenticated user profile information and configured security question.
    """
    user = get_user_by_username(current_user["username"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfileResponse(
        username=user["username"],
        security_question=user.get("security_question"),
        created_at=user.get("created_at", ""),
    )


@app.post("/api/auth/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates the account password after verifying the user current password.
    """
    if not body.current_password or not body.new_password:
        raise HTTPException(status_code=400, detail="Current password and new password are required")
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    user = get_user_by_username(current_user["username"])
    if not user or not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect current password")

    new_hash = hash_password(body.new_password)
    update_user_password(user["username"], new_hash)
    return {"message": "Password updated successfully"}


@app.post("/api/auth/update-security-question")
def update_security_q(
    body: UpdateSecurityQuestionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates the user security question and answer hash after verifying their current password.
    """
    if not body.current_password or not body.security_question or not body.security_answer:
        raise HTTPException(status_code=400, detail="All fields are required")
    if body.security_question not in ALLOWED_SECURITY_QUESTIONS:
        raise HTTPException(status_code=400, detail="Invalid security question selected")

    user = get_user_by_username(current_user["username"])
    if not user or not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect current password")

    normalized_answer = body.security_answer.strip().lower()
    answer_hash = hash_password(normalized_answer)

    update_user_security_question(user["username"], body.security_question, answer_hash)
    return {"message": "Security question updated successfully"}


# -- Frontend Serving (SPA configuration) -------------------

frontend_dir = os.environ.get(
    "CHIME_FRONTEND_DIR",
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"),
)

if os.path.exists(os.path.join(frontend_dir, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")

@app.get("/{catchall:path}")
def serve_spa(catchall: str):
    """
    Serves static single-page frontend assets or routes unknown non-API URLs to index.html.
    """
    if catchall.startswith("api/"):
        return {"error": "API route not found"}

    file_path = os.path.join(frontend_dir, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {"status": "ok", "message": "Chime API is running (Frontend not built)"}

if __name__ == "__main__":
    is_frozen = getattr(sys, "frozen", False)
    if is_frozen:
        uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
