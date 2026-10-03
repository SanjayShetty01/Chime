# ==============================================================================
# Chime Tauri Desktop Development Launcher
# ==============================================================================
# Builds the sidecar if not present, then launches the Tauri desktop app in dev mode.

Write-Host "Starting Chime Tauri Desktop (Dev Mode)..." -ForegroundColor Cyan

$BasePath = $PSScriptRoot
$FrontendPath = Resolve-Path "$BasePath\..\frontend"
$BackendPath = Resolve-Path "$BasePath\..\backend"
$BinaryTarget = "$FrontendPath\src-tauri\binaries\chime-backend-x86_64-pc-windows-msvc.exe"
$DebugTarget = "$FrontendPath\src-tauri\target\debug\chime-backend.exe"

# Stop any previously running chime-backend sidecar holding file locks
Get-Process -Name "chime-backend*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 1. Check if sidecar binary needs to be built
$NeedsBuild = -not (Test-Path $BinaryTarget)
if (-not $NeedsBuild) {
    $BinaryTime = (Get-Item $BinaryTarget).LastWriteTime
    $LatestSource = Get-ChildItem -Path $BackendPath -Recurse -Include *.py,*.yaml | Where-Object { $_.FullName -notmatch "dist|\.venv|build|__pycache__" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($LatestSource -and $LatestSource.LastWriteTime -gt $BinaryTime) {
        Write-Host "-> Backend source ($($LatestSource.Name)) updated at $($LatestSource.LastWriteTime). Rebuilding sidecar..." -ForegroundColor Yellow
        $NeedsBuild = $true
    }
}

if ($NeedsBuild) {
    Write-Host "-> Building sidecar binary..." -ForegroundColor Yellow
    Push-Location $BackendPath
    uv run pyinstaller --noconfirm chime-backend.spec
    Pop-Location

    New-Item -ItemType Directory -Force -Path "$FrontendPath\src-tauri\binaries" | Out-Null
    Copy-Item "$BackendPath\dist\chime-backend.exe" $BinaryTarget -Force
    if (Test-Path $DebugTarget) {
        Copy-Item "$BackendPath\dist\chime-backend.exe" $DebugTarget -Force
    }
    Write-Host "-> Sidecar binary ready!" -ForegroundColor Green
}

# 2. Launch Tauri Dev
Write-Host "-> Launching Tauri desktop application..." -ForegroundColor Green
Push-Location $FrontendPath
npm run tauri dev
Pop-Location
