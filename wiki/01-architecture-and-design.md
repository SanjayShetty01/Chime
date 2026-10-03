# 01 - System Architecture and Design Philosophy

Chime is a local-first desktop and web application designed to track, calculate, and audit credit card cashback from Indian bank statements.

---

## 1. Why Chime Exists

Indian banks frequently alter reward structures, introduce category caps, exclude common spending avenues (such as fuel, utility bill payments, rent, wallet reloads, and jewelry), or fail to post reward credits accurately. Calculating whether you received the advertised 5% or 10% rate across multiple pages of bank statements is tedious.

Chime automates this audit:
1. It ingests password-protected PDF bank statements.
2. It parses and normalizes raw transaction entries.
3. It classifies each transaction using a two-layer zero-shot classification system.
4. It computes expected cashback using card-specific reward rules and monthly caps.
5. It allows users to compare calculated cashback against the bank's actual credit.

---

## 2. Core Architectural Philosophy

### Local-First and Zero-Cloud
Credit card statements contain sensitive financial records, account numbers, and complete residential billing addresses. Chime is built with a strict local-first design:
- All PDF parsing happens on the user's computer via `pdfplumber`.
- Natural language classification runs locally on CPU using `sentence-transformers`.
- The SQLite database is stored locally in the user's OS application data folder.
- No statement data, passwords, or transaction records are ever sent to remote cloud servers.

### The Sidecar Architecture
Chime marries a modern web frontend with a fast native desktop shell and a Python calculation engine:

```text
+-------------------------------------------------------------+
|                     Tauri v2 Desktop App                    |
|                                                             |
|  +------------------------+      +-----------------------+  |
|  |   Frontend (WebView)   |      |  Rust Core (Tauri)    |  |
|  |   React 18 + Vite + TS | <--> |  Window management,   |  |
|  |   Tailwind + Shadcn UI |      |  Process lifecycle    |  |
|  +------------------------+      +-----------+-----------+  |
|              |                               |              |
|              | HTTP / REST                   | Spawns as    |
|              | (localhost:8000)              | Sidecar      |
|              v                               v              |
|  +-------------------------------------------------------+  |
|  |           Backend Sidecar (Python / FastAPI)          |  |
|  |   - PDF Parsers (pdfplumber)                          |  |
|  |   - Classifier (Rule-based + Sentence-Transformers)   |  |
|  |   - Card-Specific Engines (cashback_calculation/)     |  |
|  |   - Local Database (SQLite: %APPDATA%/Chime/data)     |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

---

## 3. The Three Layers

### 1. The Presentation Layer (Frontend)
- **Framework**: React 18 with TypeScript, packaged by Vite.
- **Styling**: Tailwind CSS with Shadcn UI component primitives.
- **State & Data Fetching**: React Hooks, React Query, and LocalStorage for authentication tokens.
- **Visualizations**: Recharts for category spend and reward breakdown graphs.

### 2. The Application & Engine Layer (Backend)
- **Framework**: FastAPI running on Uvicorn.
- **Packaging**: In development, executed via Python virtual environment managed by `uv`. In production desktop builds, frozen by PyInstaller into a standalone executable (`chime-backend.exe`).
- **Endpoints**: Clean RESTful routes for authentication, card rules, statement upload, historical query, and transaction overrides.

### 3. The Desktop Container (Tauri v2)
- **Technology**: Rust 1.90+ with Tauri v2.
- **Role**: Launches the OS native webview (Microsoft Edge WebView2 on Windows, WebKit on macOS/Linux), spawns the Python backend sidecar on startup, monitors health, and cleanly terminates the backend on window close.
- **Installer size**: ~5 MB shell, avoiding the heavy 300+ MB footprint of Electron.

---

## 4. Security & Privacy Model

- **Statement Storage**: Raw PDF files are stored temporarily during ingestion and deleted immediately upon parsing completion. Only structured transaction rows are retained in SQLite.
- **Passwords**: Statement passwords provided by the user are used purely in memory to decrypt the PDF and are never written to disk or database tables.
- **User Authentication**: Account passwords for the local app are hashed using `bcrypt`. API routes require a JSON Web Token (JWT) signed with a local secret key.
