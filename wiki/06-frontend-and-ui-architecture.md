# 06 - Frontend and UI Architecture

The Chime frontend is a Single Page Application (SPA) located in `frontend/`, built with React 18, Vite, TypeScript, and Tailwind CSS.

---

## 1. Directory Layout

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                 # Shadcn UI primitives (button, card, dialog, table, tabs, etc.)
│   │   ├── AIChat.tsx          # Offline AI statement assistant with prompt chips
│   │   ├── AiSuggestions.tsx   # Category optimization recommendations
│   │   ├── CategoryCharts.tsx  # Recharts graphs for spend and reward distribution
│   │   ├── Navbar.tsx          # Top navigation bar with user profile and theme switch
│   │   ├── SummaryCards.tsx    # Header metric cards (Total Spend, Cashback, Rate, Count)
│   │   ├── ThemeToggle.tsx     # Dark / light mode toggle
│   │   └── TransactionTable.tsx# Interactive sortable, filterable table with rate overrides
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state, login/logout, and JWT token storage
│   ├── pages/
│   │   ├── AnalyticsPage.tsx   # Multi-month dashboard, trends, and reconciliation audit
│   │   ├── HistoryPage.tsx     # Past uploads grouped by billing month with Load buttons
│   │   ├── LoginPage.tsx       # User sign-in and security question password reset
│   │   ├── ResultsPage.tsx     # Statement analysis dashboard and transaction viewer
│   │   ├── SettingsPage.tsx    # Password and security question management
│   │   ├── SignUpPage.tsx      # User registration with security question setup
│   │   └── UploadPage.tsx      # Card selector, password input, and drag-and-drop PDF zone
│   ├── services/
│   │   ├── api.ts              # Typed HTTP client communicating with backend localhost:8000
│   │   └── sidecar.ts          # Tauri sidecar lifecycle manager
│   ├── types/
│   │   └── index.ts            # Core TypeScript interfaces (Transaction, CashbackResult, etc.)
│   ├── App.tsx                 # Route declarations and ProtectedRoute wrapper
│   └── main.tsx                # Application root entrypoint
├── package.json
└── vite.config.ts
```

---

## 2. Key Pages and User Flows

### 1. Statement Upload (`UploadPage.tsx`)
- Allows users to select an available card (cards are fetched dynamically from `/api/cards` with fallback to bundled definitions).
- Accepts statement password if encrypted.
- Provides a drag-and-drop PDF dropzone.
- On successful upload, transitions directly to `ResultsPage.tsx`.

![Statement Upload](../docs/screenshots/upload-page.png)

### 2. Statement Results & Audit (`ResultsPage.tsx`)
- Can be viewed immediately after a fresh upload or loaded by statement ID (`/results/:id`) from History.
- Displays:
  - Header Card Banner with bank color and billing month.
  - Summary metric cards (Total Spend, Total Expected Cashback, Effective Rate, Transaction Count).
  - Three interactive tabs:
    1. **Transactions Tab**: Full audit table with search, sorting, category filtering, classifier confidence badges, and live custom % override inputs.
    2. **Dashboard Tab**: Spend and reward distribution graphs via Recharts.
    3. **AI Suggestions Tab**: Automatic optimization advice and offline interactive AI chat.

![Statement Transactions Table](../docs/screenshots/statement-table.png)

![Statement Dashboard and Charts](../docs/screenshots/statement-dashboard.png)

### 3. Upload History (`HistoryPage.tsx`)
- Groups past uploads by statement month.
- Shows total transactions, monthly spend, expected cashback, and effective rate.
- Features a **"Load Statement"** action button on each card that immediately opens the statement in `ResultsPage.tsx`.
- Includes a **Delete** button with confirmation to remove unwanted statement records.

![Upload History](../docs/screenshots/upload-history.png)

### 4. Multi-Month Analytics (`AnalyticsPage.tsx`)
- Aggregates spend and rewards across multiple months.
- Tracks discrepancy between expected cashback and actual bank-credited cashback (reconciliation).

![Multi-Month Analytics](../docs/screenshots/analytics-dashboard.png)

---

## 3. Real-Time Overrides & SQLite Syncing

In `TransactionTable.tsx`, users can type a custom % into the **User Custom % Override** cell:
1. Local React state updates in real time so summary cards and table totals update without delay.
2. Modified rows are flagged with amber highlight rings and added to an unsaved queue.
3. A prominent **Save Custom Rates** button appears in the toolbar showing the count of modified rows.
4. Clicking the **Save Custom Rates** button (or pressing Enter inside any override field) calls `saveBatchOverrides(uploadId, items)` via `api.ts`.
5. The backend updates all transaction rows, recalculates the parent statement's total cashback and effective percentage, and commits atomically to SQLite.
6. A toast confirmation confirms success, and the button transitions to a "Saved" status.
7. Clicking the **Reset** button restores the default rule-based category rate.
8. When opening **History** or clicking **Load Statement**, the saved custom % rates and updated summary values are preserved and displayed.

---

## 4. Interactive AI Assistant & Prompt Chips

In `AIChat.tsx`, users can interact with an offline natural language assistant:
- Pre-configured clickable prompt chips:
  - *"What is my total spend?"*
  - *"What is my total cashback?"*
  - *"What was my biggest purchase?"*
  - *"Category breakdown"*
  - *"How can I maximize my cashback?"*
- One-click submission into the chat interface for instant statement breakdown.
