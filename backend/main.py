from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from models import CashbackResult, CardConfig, CashbackSummary, Transaction

app = FastAPI(title="Chime API", description="Cashback Tracking API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"], # Vite defaults
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Chime API is running"}

@app.post("/api/upload-statement", response_model=CashbackResult)
async def upload_statement(
    cardId: str = Form(...),
    password: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Accepts a PDF statement, password, and cardId.
    Currently returns barebones mock data mirroring the frontend structure.
    """
    
    # TODO: Implement actual PDF parsing and cashback logic here
    
    # For now, returning barebones mock data to satisfy Pydantic structure
    mock_card = CardConfig(
        id=cardId,
        name="Selected Card",
        bank="Unknown Bank",
        color="37 94% 50%",
        icon="credit-card"
    )
    
    mock_summary = CashbackSummary(
        totalTransactions=0,
        totalSpend=0,
        totalCashback=0,
        effectiveCashbackPercent=0,
        categoryBreakdown=[]
    )
    
    return CashbackResult(
        card=mock_card,
        transactions=[],
        summary=mock_summary
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
