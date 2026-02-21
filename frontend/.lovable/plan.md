

# Cashback Calculator – Frontend Plan

## Overview
A clean, minimal web app that helps Indian credit card users verify their cashback by uploading card statements. The app parses transactions (via your backend) and shows detailed cashback breakdowns per transaction, category-wise analytics, and summary stats.

---

## Pages & Flow

### 1. Login Page (Mock)
- Simple email/password form with a mock login (no real auth)
- Stores a fake user session in state so the rest of the app works
- Clean card-centered layout

### 2. Upload Page (Home after login)
- **Card selector** – Dropdown to pick a card (e.g., HDFC Millennia, SBI CashBack, Axis ACE, Amazon Pay ICICI)
- **PDF upload** – Drag-and-drop or file picker for the statement PDF
- **Password field** – For the encrypted PDF
- **Submit button** – Triggers upload (will call your backend API later; for now shows mock results)
- Modular card config: each card defined as a simple config object (name, bank, logo/icon, color) so adding a new card is just adding one entry

### 3. Results Page – Transaction Details
- **Card name & info banner** at the top
- **Transactions table** with columns:
  - Date
  - Description
  - Category (e.g., Groceries, Dining, Online Shopping)
  - Transaction Amount
  - Cashback Rate (%)
  - Cashback Amount
- Sortable & filterable by category
- Summary row at the bottom with totals
- Uses mock sample data (10-15 transactions) to demonstrate the UI

### 4. Results Page – Dashboard / Analytics
- Accessible via tabs alongside the transaction table
- **Summary cards** at the top:
  - Total Transactions
  - Total Spend
  - Total Expected Cashback
  - Effective Cashback %
- **Category-wise spend** – Bar chart showing spend per category
- **Category-wise cashback** – Pie chart showing cashback distribution by category
- Built with Recharts (already installed)

---

## Architecture – Modular & Extensible

- **Card configurations** stored in a single `src/config/cards.ts` file – adding a new card = adding one object to an array
- **API service layer** in `src/services/api.ts` – all backend calls in one place with typed interfaces, easy for you to replace mock responses with real API calls
- **Types** in `src/types/` – shared TypeScript interfaces for Transaction, CardConfig, CashbackResult, etc.
- **Reusable components** – TransactionTable, SummaryCards, CategoryChart are standalone components usable across different views

---

## Mock Data
- A set of realistic sample transactions with categories and cashback amounts pre-filled
- Displayed when the user submits a statement (simulating a backend response)
- Clearly separated in a `src/mocks/` folder so it's easy to remove later

---

## Design
- Clean & minimal with plenty of white space
- Shadcn/UI components throughout (cards, tables, tabs, badges)
- Bank/card accent colors used subtly in the card selector and results banner
- Responsive layout (works on desktop and mobile)

