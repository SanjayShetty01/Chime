# 08 - Developer Setup, Testing, and Troubleshooting

This guide explains how to set up the development environment, execute tests, and troubleshoot common issues when developing on Chime.

---

## 1. Prerequisites

Before running Chime locally, ensure you have the following installed:

1. **Python 3.10+**: With `uv` installed (`pip install uv` or `winget install astral-sh.uv`).
2. **Node.js v18+**: With `npm` (`node -v` should show v18+).
3. **Rust & Cargo** (for Tauri desktop app only): Install via [rustup.rs](https://rustup.rs).

---

## 2. Quick Start Commands

### Option A: Standard Web Development (Browser)

Runs the FastAPI backend on port 8000 and the Vite frontend dev server on port 8080:

```powershell
# Windows
.\Scripts\dev.ps1

# Linux / macOS
./Scripts/dev.sh
```

- Frontend: `http://localhost:8080`
- Backend API Docs: `http://localhost:8000/docs`

---

### Option B: Native Desktop Development (Tauri)

Launches the native desktop window and automatically starts the backend sidecar:

```powershell
.\Scripts\tauri-dev.ps1
```

---

## 3. Testing and Verification

### 1. Backend Classification Test Suite
Validates keyword rules, Sentence-Transformers classification, and edge cases across cards:

```powershell
cd backend
uv run python test_classifier.py
```
Expected output: `Results: 35 passed, 0 failed out of 35 tests`.

### 2. Frontend Build & Typecheck
Validates TypeScript compilation, React imports, and Vite bundling:

```powershell
cd frontend
npm run build
```

### 3. Rust & Tauri Validation
Verifies Rust crate dependencies and build configuration:

```powershell
cd frontend/src-tauri
cargo check
```

---

## 4. Common Troubleshooting Recipes

### 1. `PermissionDenied (Access is denied)` during PyInstaller build
- **Cause**: An active instance of `chime-backend.exe` is running and holding a Windows file lock.
- **Fix**: Run in PowerShell:
  ```powershell
  Get-Process -Name "chime-backend*" | Stop-Process -Force
  ```

### 2. Statement Upload Fails with "Wrong password"
- **Cause**: The PDF statement is encrypted and either no password or an incorrect password was entered.
- **Fix**: Most bank statement passwords follow bank-specific conventions (e.g. first 4 letters of name in lowercase + date and month of birth `DDMM`, or 16-digit card number last 4 digits). Verify password and re-enter in the upload modal.

### 3. "No spends were found" on Statement Upload
- **Cause**: The statement only contains credit/payment entries (e.g. paying off your credit card bill) without any debit transactions.
- **Fix**: Upload a monthly statement billing cycle that contains purchases/debits.

### 4. Port 8000 or 8080 already in use
- **Fix**: Check and terminate processes bound to port 8000:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

### 5. "Failed to save custom rates" (API 404 in Tauri)
- **Cause**: The compiled sidecar binary in `frontend/src-tauri/binaries/` was generated before a new backend endpoint was created.
- **Fix**: Launch with `.\Scripts\tauri-dev.ps1`. The script automatically compares timestamps between backend sources (`*.py`, `*.yaml`) and the binary, triggering an automated rebuild whenever changes are detected. Alternatively, rebuild manually via `cd backend && uv run pyinstaller --noconfirm chime-backend.spec`.
