---
name: tauri-packaging
description: Guides packaging the Chime React frontend and FastAPI Python backend into a standalone, local-first Tauri desktop executable (Windows .exe, macOS .dmg, Linux .AppImage). Use when bundling for desktop distribution or configuring PyInstaller sidecars.
---

# Tauri v2 Desktop Packaging Guide

Step-by-step guide for bundling Chime into a lightweight, local-first desktop app using **Tauri v2** with a **PyInstaller Python Sidecar**.

---

## Architecture

```
 ┌──────────────────────────────────────────────────────────┐
 │                 Tauri v2 Desktop Window                  │
 │              (WebView2 / WebKit - ~5 MB)                 │
 │                                                          │
 │   ┌──────────────────────────────────────────────────┐   │
 │   │       React 18 + Vite + Tailwind + Shadcn        │   │
 │   │          (static HTML/CSS/JS from dist/)          │   │
 │   └──────────────────────┬───────────────────────────┘   │
 │                          │ fetch("/api/...")              │
 └──────────────────────────┼───────────────────────────────┘
                            │
                            ▼  http://localhost:8000/api
 ┌──────────────────────────────────────────────────────────┐
 │              PyInstaller Sidecar Binary                  │
 │                                                          │
 │   chime-backend(.exe)                                    │
 │   ├── FastAPI + Uvicorn                                  │
 │   ├── pdfplumber (PDF parsing)                           │
 │   ├── sentence-transformers (classification)             │
 │   ├── cards_sync.py (GitHub remote config sync)          │
 │   └── SQLite DB → %APPDATA%/Chime/data/chime.db         │
 └──────────────────────────────────────────────────────────┘
```

**Lifecycle**: The frontend spawns the sidecar on app start via `@tauri-apps/plugin-shell`. When the user closes the window, the sidecar process is killed automatically.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18+ | https://nodejs.org |
| Rust | stable | `winget install Rustlang.Rustup` or https://rustup.rs |
| Python | 3.10+ | Managed via `uv` |
| uv | latest | `pip install uv` |

**Windows-specific**: Tauri v2 requires the **Microsoft C++ Build Tools** and **WebView2** runtime (pre-installed on Windows 10/11 22H2+).

---

## Step 1: Freeze Python Backend with PyInstaller

Compile the FastAPI backend into a standalone executable. This bundles Python, all dependencies, and data files into a single binary.

```powershell
# From the project root
cd backend

# Install PyInstaller in the uv environment
uv pip install pyinstaller

# Build the sidecar binary
uv run pyinstaller --onefile --name chime-backend `
  --add-data "cards.yaml;." `
  --add-data "keyword_rules.yaml;." `
  --add-data "parsers;parsers" `
  --hidden-import "uvicorn.logging" `
  --hidden-import "uvicorn.loops" `
  --hidden-import "uvicorn.loops.auto" `
  --hidden-import "uvicorn.protocols" `
  --hidden-import "uvicorn.protocols.http" `
  --hidden-import "uvicorn.protocols.http.auto" `
  --hidden-import "uvicorn.protocols.websockets" `
  --hidden-import "uvicorn.protocols.websockets.auto" `
  --hidden-import "uvicorn.lifespan" `
  --hidden-import "uvicorn.lifespan.on" `
  --hidden-import "pdfplumber" `
  --hidden-import "sklearn.metrics.pairwise" `
  main.py
```

macOS / Linux use `:` instead of `;` for `--add-data` separators:
```bash
uv run pyinstaller --onefile --name chime-backend \
  --add-data "cards.yaml:." \
  --add-data "keyword_rules.yaml:." \
  --add-data "parsers:parsers" \
  main.py
```

Output: `backend/dist/chime-backend` (or `chime-backend.exe` on Windows).

---

## Step 2: Initialize Tauri v2 in Frontend

```bash
cd frontend

# Install Tauri CLI and API
npm install -D @tauri-apps/cli@latest
npm install @tauri-apps/api@latest
npm install @tauri-apps/plugin-shell

# Initialize Tauri scaffolding
npx tauri init
```

Setup prompts:
- **App name**: `Chime`
- **Window title**: `Chime - Credit Card Cashback Tracker`
- **Frontend dist dir**: `../dist`
- **Dev URL**: `http://localhost:8080`
- **Frontend dev command**: `npm run dev`
- **Frontend build command**: `npm run build`

This creates `frontend/src-tauri/` containing `tauri.conf.json`, `Cargo.toml`, and `src/main.rs`.

---

## Step 3: Place Sidecar Binary

Tauri requires sidecar binaries to be named with **target-triple suffixes**. Find your host triple with:

```bash
rustc -Vv | grep host
# e.g. host: x86_64-pc-windows-msvc
```

Copy and rename the PyInstaller output:

```powershell
mkdir frontend/src-tauri/binaries
cp backend/dist/chime-backend.exe frontend/src-tauri/binaries/chime-backend-x86_64-pc-windows-msvc.exe
```

For cross-platform builds, you need a binary per target:

| Platform | Binary Name |
|----------|-------------|
| Windows x64 | `chime-backend-x86_64-pc-windows-msvc.exe` |
| macOS Intel | `chime-backend-x86_64-apple-darwin` |
| macOS ARM | `chime-backend-aarch64-apple-darwin` |
| Linux x64 | `chime-backend-x86_64-unknown-linux-gnu` |

---

## Step 4: Configure `tauri.conf.json`

Edit `frontend/src-tauri/tauri.conf.json` - use the **Tauri v2** schema:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Chime",
  "version": "1.0.0",
  "identifier": "com.chime.cashback",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:8080",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Chime - Cashback Tracker",
        "width": 1280,
        "height": 830,
        "resizable": true,
        "center": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "category": "Finance",
    "targets": "all",
    "externalBin": [
      "binaries/chime-backend"
    ],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

> **Key Tauri v2 differences from v1**: `devUrl` (not `devPath`), `frontendDist` (not `distDir`), `app.windows` (not `tauri.windows`), `bundle` is top-level (not inside `tauri`), no `allowlist` (replaced by capabilities).

---

## Step 5: Configure Sidecar Permissions (Capabilities)

Tauri v2 uses a **capabilities** system instead of the old `allowlist`. Create the file `frontend/src-tauri/capabilities/default.json`:

```json
{
  "identifier": "default",
  "description": "Default app capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    {
      "identifier": "shell:allow-spawn",
      "allow": [
        {
          "name": "binaries/chime-backend",
          "sidecar": true
        }
      ]
    },
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "binaries/chime-backend",
          "sidecar": true
        }
      ]
    }
  ]
}
```

Also register the shell plugin in `frontend/src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
```

And initialize the plugin in `frontend/src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Step 6: Launch Sidecar from Frontend JavaScript

In your React app (e.g., `App.tsx` or `AuthContext.tsx`), spawn the sidecar on application mount:

```typescript
import { Command, Child } from "@tauri-apps/plugin-shell";

let backendProcess: Child | null = null;

async function startBackend() {
  // Only run inside Tauri desktop, not in browser dev mode
  if (!("__TAURI__" in window)) return;

  const command = Command.sidecar("binaries/chime-backend");

  command.stdout.on("data", (line: string) => {
    console.log("[backend]", line);
  });

  command.stderr.on("data", (line: string) => {
    console.error("[backend]", line);
  });

  backendProcess = await command.spawn();
  console.log("Backend sidecar started, PID:", backendProcess.pid);
}

async function stopBackend() {
  if (backendProcess) {
    await backendProcess.kill();
    backendProcess = null;
  }
}

// Call on app mount
startBackend();

// Call on app unmount / window close
window.addEventListener("beforeunload", stopBackend);
```

> **Important**: The `"__TAURI__" in window` check ensures the sidecar code only runs inside the packaged Tauri desktop app, not during regular browser development (`npm run dev`).

---

## Step 7: AppData Directory for SQLite

When running as a desktop app, `database.py` should store data in the OS-standard user data directory instead of `backend/data/`:

```python
import os, sys

def get_data_dir() -> str:
    """Resolve the user-local data directory for Chime."""
    if "CHIME_DATA_DIR" in os.environ:
        return os.environ["CHIME_DATA_DIR"]

    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    elif sys.platform == "darwin":
        base = os.path.expanduser("~/Library/Application Support")
    else:
        base = os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share"))

    data_dir = os.path.join(base, "Chime", "data")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir
```

This function is already compatible with the existing `CHIME_DATA_DIR` environment variable override used in `database.py` and `cards_sync.py`.

---

## Build & Ship

### Development
```bash
cd frontend
npx tauri dev
```

### Production Build
```bash
cd frontend
npx tauri build
```

### Output Installers

| Platform | Installer Path |
|----------|----------------|
| Windows MSI | `src-tauri/target/release/bundle/msi/Chime_1.0.0_x64_en-US.msi` |
| Windows NSIS | `src-tauri/target/release/bundle/nsis/Chime_1.0.0_x64-setup.exe` |
| macOS DMG | `src-tauri/target/release/bundle/dmg/Chime_1.0.0_x64.dmg` |
| Linux AppImage | `src-tauri/target/release/bundle/appimage/chime_1.0.0_amd64.AppImage` |
| Linux DEB | `src-tauri/target/release/bundle/deb/chime_1.0.0_amd64.deb` |

---

## Gotchas & Troubleshooting

| Issue | Fix |
|-------|-----|
| `chime-backend` not found at runtime | Verify the binary name matches your `rustc -Vv` host triple exactly |
| `PermissionDenied / Access is denied` during build | An orphaned `chime-backend.exe` is still running from a previous launch and holding a file lock. Run: `Stop-Process -Name "chime-backend*" -Force` |
| Port 8000 already in use | Kill any existing `uvicorn` / `chime-backend` processes before launching |
| PyInstaller missing hidden imports | Add `--hidden-import "module.name"` for any `ModuleNotFoundError` at runtime |
| `sentence-transformers` model download on first run | The model cache (`~/.cache/huggingface`) persists across launches - first startup is slower |
| Frontend fetch fails in Tauri | Ensure `localhost:8000` is not blocked by firewall; the Tauri webview makes real HTTP requests |
| `__TAURI__` not defined | You're running in the browser, not in Tauri - sidecar code is skipped automatically |

---

## App Size Estimate

| Component | Size |
|-----------|------|
| Tauri shell (Rust + WebView2) | ~5 MB |
| React frontend (dist/) | ~1.2 MB |
| PyInstaller backend binary | ~80-120 MB (includes Python runtime, pdfplumber, sentence-transformers) |
| **Total installer** | **~90-130 MB** |

> Compare: An equivalent Electron app would be 250-400 MB.
