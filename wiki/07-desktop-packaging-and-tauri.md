# 07 - Desktop Packaging and Tauri

Chime uses Tauri v2 to package the React frontend and Python FastAPI backend into native standalone desktop installers for Windows, Linux, and macOS.

---

## 1. Tauri v2 Configuration (`frontend/src-tauri/tauri.conf.json`)

Key settings in `tauri.conf.json`:
- **App Identifier**: `com.chime.cashback`
- **Window Configuration**:
  - Title: `"Chime - Credit Card Cashback Tracker"`
  - Width: 1280, Height: 820, MinWidth: 900, MinHeight: 600
- **External Binaries (Sidecars)**:
  ```json
  "bundle": {
    "externalBinaries": [
      "binaries/chime-backend"
    ]
  }
  ```
- **Target Triple Naming**:
  Tauri requires external binaries to be postfixed with the target architecture triple.
  On Windows x64: `binaries/chime-backend-x86_64-pc-windows-msvc.exe`.

---

## 2. Freezing the Python Backend (`PyInstaller`)

Because end users do not have Python or machine learning libraries installed, PyInstaller bundles the backend, dependencies, and rule assets into a single executable:

```powershell
uv run pyinstaller --noconfirm --onefile --name chime-backend `
  --add-data "cards.yaml;." `
  --add-data "keyword_rules.yaml;." `
  --add-data "parsers;parsers" `
  --add-data "cashback_calculation;cashback_calculation" `
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

### Important Packaging Caveats
- **Data Files**: `cards.yaml`, `keyword_rules.yaml`, `parsers/`, and `cashback_calculation/` must be included via `--add-data`.
- **Uvicorn Hidden Imports**: Uvicorn dynamic protocol loaders must be explicitly included via `--hidden-import` to prevent startup errors in onefile binaries.
- **Windows File Lock**: If `chime-backend.exe` is currently running, attempting to rebuild or overwrite it will result in `PermissionDenied (Access is denied)`. Always stop existing processes via `Stop-Process -Name "chime-backend*"` before compiling or copying.

---

## 3. Build Scripts

### 1. Development Mode (`Scripts/tauri-dev.ps1`)
1. Terminates any running `chime-backend` instances to release Windows binary file locks.
2. Compares the file modification timestamps of all backend source files (`*.py`, `*.yaml`) against the compiled binary.
3. If the binary is missing OR any backend source file is newer than the binary, automatically invokes PyInstaller, compiles a fresh executable, and copies it to both `frontend/src-tauri/binaries/` and `frontend/src-tauri/target/debug/`.
4. Runs `npm run tauri dev` in `frontend/`, launching Vite and the Tauri desktop window with hot module reloading.

### 2. Production Installer Build (`Scripts/tauri-build.ps1`)
1. Kills any running sidecar instances.
2. Compiles a fresh `chime-backend.exe` using PyInstaller.
3. Stages the binary into `frontend/src-tauri/binaries/`.
4. Executes `npm run tauri build` to compile the native desktop installer.

---

## 4. Output Artifacts

Compiled installation packages are placed in `frontend/src-tauri/target/release/bundle/`:

| Platform | Format | Output Path | Description |
|---|---|---|---|
| **Windows** | `.exe` (NSIS) | `bundle/nsis/Chime_1.0.0_x64-setup.exe` | Standard Windows setup installer |
| **Windows** | `.msi` (MSI) | `bundle/msi/Chime_1.0.0_x64_en-US.msi` | Windows enterprise installer |
| **Linux (Debian/Ubuntu)** | `.deb` | `bundle/deb/chime_1.0.0_amd64.deb` | Debian package (`sudo dpkg -i ...`) |
| **Linux (Fedora/RHEL)** | `.rpm` | `bundle/rpm/chime-1.0.0-1.x86_64.rpm` | *Coming Soon* (packaging in progress) |
| **macOS** | `.dmg` | `bundle/dmg/Chime_1.0.0_aarch64.dmg` | macOS disk image installer (Apple Silicon) |

