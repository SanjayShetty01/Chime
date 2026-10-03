---
name: building-frontend
description: Guides building the Chime React/TypeScript frontend including pages, components, Shadcn UI, and design system. Use when working on frontend code, UI components, or styling.
---

# Building the Frontend

## Foundation

- **Scaffold**: Vite + React 18 + TypeScript via `@vitejs/plugin-react-swc`
- **Styling**: Tailwind CSS 3 + Shadcn UI (Radix primitives)
- **Routing**: `react-router-dom` v6
- **State**: `@tanstack/react-query` (configured but primarily using direct API calls)
- **Charts**: `recharts` (BarChart, PieChart, AreaChart)
- **Export**: `xlsx` (for CSV/XLSX/TXT)
- **Icons**: `lucide-react`
- **Path alias**: `@/` → `src/` via `vite.config.ts` + `tsconfig.json`

### Vite Config (`vite.config.ts`)

```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
  },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
```

---

## Design System (`index.css`)

CSS variables in `@layer base` for both `:root` (light) and `.dark` mode.

| Token | Light (Hex) | Dark (Hex) |
|-------|-------------|------------|
| `--background` | `#ffffff` | `#020617` |
| `--foreground` | `#020617` | `#f8fafc` |
| `--primary` | `#f59e0b` (golden accent) | `#f59e0b` (golden accent) |
| `--primary-foreground` | `#ffffff` | `#ffffff` |
| `--card` | `#ffffff` | `#020617` |
| `--muted` | `#f1f5f9` | `#1e293b` |
| `--border` | `#e2e8f0` | `#1e293b` |
| `--ring` | `#f59e0b` | `#f59e0b` |

All main pages use `bg-muted/30` as background to make white/dark Shadcn cards pop.

---

## TypeScript Types (`types/index.ts`)

```typescript
interface CardConfig { id: string; name: string; bank: string; color: string; icon: string; }
interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  cashbackRate: number;
  cashbackAmount: number;
  confidence?: number;
  matchType?: string;
  customRate?: number;
}
interface CashbackSummary { totalTransactions: number; totalSpend: number; totalCashback: number; effectiveCashbackPercent: number; categoryBreakdown: CategoryBreakdown[]; }
interface CategoryBreakdown { category: string; spend: number; cashback: number; transactionCount: number; }
interface CashbackResult { id?: string; card: CardConfig; transactions: Transaction[]; summary: CashbackSummary; actualCashbackCredited?: number; }
interface UploadRequest { cardId: string; file: File; password: string; }
interface UserProfile { username: string; security_question?: string; createdAt?: string; }
```

---

## Auth & Session Management (`contexts/AuthContext.tsx`)

JWT Token Authentication with persistent `localStorage` storage (`chime_token` & `chime_user`).

- `login(token, user)` → saves token & user state
- `register(username, password, security_question, security_answer)` → registers user & auto-logs in
- `logout()` → clears token & user state, redirects to `/`
- Password recovery via secret questions:
  - Allowed questions: *"What year you passed 10th?"*, *"What's your crush name?"*, *"Name of your first love"*
  - Case-insensitive answer verification (default answer `"2014"` for test accounts)

---

## App Routes (`App.tsx`)

```
BrowserRouter → AuthProvider → Navbar (top navigation bar) →
  Routes:
    /           → LoginPage / SignUpPage
    /upload     → ProtectedRoute → UploadPage
    /results    → ProtectedRoute → ResultsPage
    /analytics  → ProtectedRoute → AnalyticsPage
    /history    → ProtectedRoute → HistoryPage
    /settings   → ProtectedRoute → SettingsPage
    *           → NotFound
```

---

## Navigation (`Navbar.tsx`)

Unified sticky header visible when authenticated:
- **Logo**: Chime credit card brand icon
- **Links**: Upload (`/upload`), Analytics (`/analytics`), History (`/history`), Settings (`/settings`)
- **Actions**: Theme Toggle (Dark/Light) + User Badge + Logout Button

---

## Core Pages

### 1. LoginPage & SignUpPage
- Card UI with ChimeLogo and password input
- **Forgot Password Dialog**: Select security question, enter answer (`2014`), set new password
- **Sign Up**: Register username, password, select security question, enter answer

### 2. UploadPage
- Card selection dropdown grouped by bank via `getCardsByBank()`
- Drag-and-drop PDF zone (shows file name, size, PDF icon)
- Optional password input for encrypted statements
- Submit button with spinner loading state → redirects to `/results` on success

### 3. ResultsPage
- Displays full-width colored Card Banner for chosen card
- 3 main tabs:
  1. **Transactions**: `<TransactionTable>`
  2. **Dashboard**: `<SummaryCards>` + `<CategoryCharts>`
  3. **AI Summary**: `<AIChat>`

### 4. AnalyticsPage (`/analytics`)
- Multi-Month & Multi-Card Dashboard:
  - **KPI Cards**: Lifetime Spend, Lifetime Cashback, Effective Cashback Rate, Total Uploads
  - **Charts**: Monthly Spend/Cashback Trends (BarChart) + Card Performance Breakdown (Pie/Bar)

### 5. HistoryPage (`/history`)
- Historical Statement Uploads list:
  - Date, Bank, Card Name, Spend, Cashback, Discrepancy Status badge (`UNDERPAID`, `MATCHED`, `OVERPAID`)
  - **Reconciliation Dialog**: Allows entering actual cashback credited by bank to compute discrepancies

### 6. SettingsPage (`/settings`)
- User Profile Overview
- Change Password Form
- Update Security Question & Answer Form

---

## Component Deep Dive

### `<TransactionTable>`
- **Sortable & Filterable Columns**: Date, Description, Category, Amount, Confidence, Custom Rate Override %, Cashback (₹)
- **Match Confidence Badges**:
  - `100% Rule` (Green): Keyword match from `keyword_rules.yaml`
  - `88% AI` (Purple): Semantic Sentence-BERT cosine similarity match
  - `50% Default` (Amber): Fallback category match
- **User Custom % Override Column**:
  - Editable number input column allowing user to enter a custom cashback rate %
  - Dynamically recalculates transaction cashback amount in real-time
  - Propagates updated transaction state to parent (`ResultsPage.tsx`) to recalculate `SummaryCards` and `CategoryCharts` on the fly
  - Reset button (<kbd>↺</kbd>) restores original rule/AI rate
- **Export Options**: Export to CSV, XLSX, and TXT using `xlsx` package

### `<SummaryCards>`
- 4-column responsive KPI grid: Total Transactions, Total Spend (₹), Total Cashback (₹), Effective Cashback Rate (%)
- Dynamically updates when transactions are filtered or custom rate overrides are applied

### `<CategoryCharts>`
- Recharts visualizations:
  - **BarChart**: Spend by Category
  - **PieChart**: Cashback Distribution by Category

