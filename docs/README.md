# Chime Documentation & Assets

This directory contains visual documentation assets, architectural references, and user interface screenshots for Chime.

---

## Technical Wiki

The complete in-depth documentation is organized in the [`wiki/`](../wiki/) directory:

* [01. System Architecture & Design Philosophy](../wiki/01-architecture-and-design.md)
* [02. Database Schema & Storage Engine](../wiki/02-database-schema-and-storage.md)
* [03. PDF Statement Parsing & Ingestion](../wiki/03-parsers-and-statement-ingestion.md)
* [04. Transaction Classification Engine](../wiki/04-transaction-classification-engine.md)
* [05. Cashback Calculation Engines](../wiki/05-cashback-calculation-engines.md)
* [06. Frontend UI Architecture & Components](../wiki/06-frontend-and-ui-architecture.md)
* [07. Desktop Packaging & Tauri Sidecar](../wiki/07-desktop-packaging-and-tauri.md)
* [08. Setup, Development & Troubleshooting](../wiki/08-setup-development-and-troubleshooting.md)

---

## UI Screenshots Gallery

High-resolution retina captures of all core workflows:

1. **Statement Transactions Table** (`screenshots/statement-table.png`)
   - Complete transaction audit table with classifier confidence tags, custom % override inputs, and Save Custom Rates action.
   ![Statement Transactions Table](screenshots/statement-table.png)

2. **Statement Cashback Dashboard** (`screenshots/statement-dashboard.png`)
   - Real-time monthly spend, cashback earnings, effective reward rate, and category distribution charts.
   ![Statement Cashback Dashboard](screenshots/statement-dashboard.png)

3. **Upload History** (`screenshots/upload-history.png`)
   - Monthly grouped cards with spend/cashback summaries and one-click "Load Statement" button.
   ![Upload History](screenshots/upload-history.png)

4. **Multi-Month Analytics** (`screenshots/analytics-dashboard.png`)
   - Lifetime statistics, cross-month spending trends, card reward comparisons, and bank reconciliation audit.
   ![Multi-Month Analytics](screenshots/analytics-dashboard.png)

5. **Statement Upload** (`screenshots/upload-page.png`)
   - Drag-and-drop PDF dropzone with card selector and password decryption.
   ![Statement Upload](screenshots/upload-page.png)
