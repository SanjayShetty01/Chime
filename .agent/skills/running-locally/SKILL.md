---
name: running-locally
description: Documents how to start the Chime dev and production servers using the scripts in the Scripts directory. Use when running, debugging, or deploying the application locally.
---

# Running Locally

## Development (Recommended)

Launches frontend (Vite) and backend (FastAPI) in separate terminal windows:

```powershell
# Windows
.\Scripts\dev.ps1
```

```bash
# Linux/macOS
./Scripts/dev.sh
```

This starts:
- **Frontend**: Vite at `http://localhost:8080` (proxies `/api/*` → `localhost:8000`)
- **Backend**: Uvicorn at `http://localhost:8000` with `--reload`

> Note: The Vite config uses port 8080 (not the default 5173). The proxy config in `vite.config.ts` makes frontend API calls work without CORS issues in dev.

## Production

Builds the frontend and serves everything from the backend:

```powershell
# Windows
.\Scripts\prod.ps1
```

```bash
# Linux/macOS
./Scripts/prod.sh
```

In prod, the backend serves the built `frontend/dist/` as a SPA. All non-API routes return `index.html` for client-side routing.

## Manual Setup

**Backend (using uv):**
```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
# Frontend type check
cd frontend
npm run build          # also validates TypeScript

# Backend classifier tests (35 test cases)
cd backend
uv run python test_classifier.py
```

## Tauri Desktop App

Run or build Chime as a native desktop application:

```powershell
# Desktop Dev Mode
.\Scripts\tauri-dev.ps1
# (or: cd frontend && npm run tauri dev)

# Desktop Production Installer (.exe / .msi)
.\Scripts\tauri-build.ps1
# (or: cd frontend && npm run tauri build)
```

See [tauri-packaging](file:///c:/Github/Chime/.agent/skills/tauri-packaging/SKILL.md) for full architecture and configuration details.

