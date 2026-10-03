# ==============================================================================
# Chime Tauri Desktop Production Builder
# ==============================================================================
# Freezes backend with PyInstaller and packages full native desktop installer.

Write-Host "Building Chime Tauri Desktop Application (Production)..." -ForegroundColor Cyan

$BasePath = $PSScriptRoot
$FrontendPath = Resolve-Path "$BasePath\..\frontend"
$BackendPath = Resolve-Path "$BasePath\..\backend"
$BinaryTarget = "$FrontendPath\src-tauri\binaries\chime-backend-x86_64-pc-windows-msvc.exe"

# Stop any running chime-backend sidecar holding file locks
Get-Process -Name "chime-backend*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 1. Freeze Python backend
Write-Host "-> Freezing Python backend into sidecar binary..." -ForegroundColor Yellow
Push-Location $BackendPath
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
Pop-Location

# 2. Stage binary into src-tauri/binaries/
New-Item -ItemType Directory -Force -Path "$FrontendPath\src-tauri\binaries" | Out-Null
Copy-Item "$BackendPath\dist\chime-backend.exe" $BinaryTarget -Force
Write-Host "-> Sidecar binary staged." -ForegroundColor Green

# 3. Build Tauri production bundle
Write-Host "-> Packaging Tauri desktop installer..." -ForegroundColor Yellow
Push-Location $FrontendPath
npm run tauri build
Pop-Location

Write-Host "Build complete! Check frontend/src-tauri/target/release/bundle/ for installer." -ForegroundColor Cyan
