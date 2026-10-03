---
name: project-overview
description: Provides high-level architecture, tech stack, and design philosophy for the Chime cashback tracker app. Use when onboarding, asking about the project structure, or understanding how backend and frontend connect.
---

# Chime - Project Overview

A web app that helps Indian credit card users verify cashback by parsing PDF bank statements.

## Architecture

```
Chime/
├── backend/                    # FastAPI (Python 3.10+)
│   ├── main.py                 # App entry: CORS, all routes, SPA serving
│   ├── models.py               # Pydantic models
│   ├── classifier.py           # Two-layer zero-shot transaction classifier
│   ├── cards.yaml              # Card configs: id, bank, categories (rate + cap), exclusions
│   ├── keyword_rules.yaml      # Per-card keyword→category mapping for classifier
│   ├── cards_sync.py           # GitHub remote sync for cards.yaml & keyword_rules.yaml
│   ├── requirements.txt        # All Python deps
│   ├── auth.py                 # JWT auth helpers
│   ├── database.py             # SQLite persistence
│   ├── parsers/
│   │   ├── __init__.py         # PARSER_REGISTRY dict + get_parser() factory
│   │   ├── base_parser.py      # BaseParser ABC → parse(pdf_path, password) → List[dict]
│   │   ├── sbi_parser.py       # SBI Cashback: "DD MMM YY DESC AMOUNT D/C"
│   │   ├── hdfc_parser.py      # HDFC Swiggy: "DD/MM/YYYY| HH:MM DESC [+] C AMOUNT"
│   │   └── axis_parser.py      # Axis Airtel: "DD/MM/YYYY DESC AMOUNT Dr/Cr"
│   ├── test_api.py
│   └── test_classifier.py      # 35 keyword classification tests
├── frontend/                   # Vite + React 18 + TypeScript
│   ├── vite.config.ts          # Port 8080, /api proxy → localhost:8000, @/ alias
│   ├── package.json            # All deps pinned
│   └── src/
│       ├── main.tsx            # React root mount
│       ├── App.tsx             # Providers, BrowserRouter, ProtectedRoute, 4 routes
│       ├── index.css           # Tailwind + HSL design tokens (light + dark)
│       ├── pages/
│       │   ├── LoginPage.tsx   # Name-only auth → navigate to /upload
│       │   ├── UploadPage.tsx  # Card selector, PDF drag-drop, optional password, API call
│       │   ├── ResultsPage.tsx # Card banner, Tabs (Transactions/Dashboard/AI)
│       │   ├── Index.tsx       # Fallback placeholder
│       │   └── NotFound.tsx    # 404 page
│       ├── components/
│       │   ├── TransactionTable.tsx  # Sortable, filterable, CSV/XLSX/TXT export via xlsx
│       │   ├── CategoryCharts.tsx    # Recharts BarChart + PieChart by category
│       │   ├── SummaryCards.tsx      # 4-column grid: Txns, Spend, Cashback, Rate
│       │   ├── AIChat.tsx           # Mock chat with generateInsights + mockAnswer
│       │   ├── AiSuggestions.tsx    # Rule-based spending recommendations
│       │   ├── ChimeLogo.tsx        # SVG credit card icon (primary color)
│       │   ├── ThemeToggle.tsx      # Dark/light via .dark class toggle
│       │   ├── NavLink.tsx          # Wrapper around react-router NavLink with cn()
│       │   └── ui/                  # Shadcn UI primitives (auto-generated)
│       ├── services/api.ts          # fetchCards(), uploadStatement() - uses /api/ proxy
│       ├── types/index.ts           # CardConfig, Transaction, CashbackResult, CashbackSummary, CategoryBreakdown, UploadRequest, ChatMessage
│       ├── config/cards.ts          # getCardsByBank() - groups CardConfig[] by bank
│       ├── contexts/AuthContext.tsx  # JWT auth with token persistence
│       └── hooks/                   # use-toast, etc.
└── Scripts/
    ├── dev.ps1 / dev.sh        # Launch both servers in dev mode
    └── prod.ps1 / prod.sh      # Build frontend, serve via backend
```

## Features

1. **Authentication & Security Questions**:
   - User Sign-Up & Login via JWT Tokens.
   - Database Persistence with SQLite (`chime.db`) using `bcrypt` password hashing.
   - **Secret Question Password Recovery**: Pre-configured security questions (*"What year you passed 10th?"*, *"What's your crush name?"*, *"Name of your first love"*) with case-insensitive hashed answer verification and password reset capability.

2. **Statement Parsing Engine**:
   - Automated parsing for SBI Cashback Card, HDFC Swiggy Card, and Axis Airtel Card using `pdfplumber`.
   - Supports encrypted/password-protected PDF statements.

3. **Smart Transaction Classifier & Confidence Scores**:
   - Two-layer zero-shot classifier: Keyword rules (`keyword_rules.yaml`) + Sentence-Transformers (`all-MiniLM-L6-v2`) cosine similarity.
   - Returns **Match Confidence Scores** (e.g. `100% Rule`, `88% AI`, `50% Default`).
   - **User Custom % Override**: Users can enter a custom cashback rate % directly in `TransactionTable.tsx`, dynamically recalculating statement cashback totals and charts in real-time.

4. **Remote Card Config Sync (`cards_sync.py`)**:
   - Auto-fetches latest `cards.yaml` and `keyword_rules.yaml` from GitHub on startup so card benefits, caps, and exclusions stay up-to-date as banks change terms.
   - Falls back to bundled local files when offline.

5. **Multi-Month Analytics Dashboard (`/analytics`)**:
   - Lifetime Spend, Lifetime Cashback, Overall Effective Cashback Rate (%), Total Uploads.
   - Monthly trend bar charts and card performance comparison charts (Recharts).

6. **Cashback Discrepancy & Reconciliation Detector**:
   - Compares expected cashback calculated by Chime against actual cashback credited by banks.
   - Flags statements as `UNDERPAID` when a bank undercredits cashback, showing exact difference (₹) and reconciliation editing tools.

7. **User Settings & Security Management (`/settings`)**:
   - Account overview, password updates, and secret recovery question updates.

8. **Desktop Packaging (Tauri v2)**:
   - Can be packaged as a standalone local-first desktop app via Tauri v2 with a PyInstaller Python sidecar. See the `tauri-packaging` skill for the full guide.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | FastAPI, `uv` package manager, pdfplumber, PyYAML, Pydantic, uvicorn |
| Classification | sentence-transformers (`all-MiniLM-L6-v2`), scikit-learn, keyword_rules.yaml |
| Auth & Security | bcrypt, python-jose (JWT), Secret Recovery Questions |
| DB | SQLite (via database.py with auto-migrations) |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS 3, Shadcn UI (Radix) |
| Navigation | React Router v6, Unified Top Navbar |
| Charts | Recharts (Bar, Pie, Area) |
| Export | xlsx package (CSV, XLSX, TXT) |
| Icons | lucide-react |
| Theme | Manual .dark class toggle |

---

## Connection Between Frontend & Backend

- **Dev**: `uv run uvicorn main:app --reload --port 8000` + Vite dev server on port 8080 proxying `/api/*`
- **Prod**: Backend serves built frontend from `frontend/dist/` as a SPA with catchall route
- **CORS**: Backend allows origins `localhost:5173` and `localhost:8080`
