# ==============================================================================
# Chime Development Environment Launcher
# ==============================================================================
# This script launches both the React Frontend and FastAPI Backend
# in separate, dedicated terminal windows for easy development.

Write-Host "Starting Chime Development Environment..." -ForegroundColor Cyan

# Ensure we're executing from the project root
cd ..

# 1. Start the Vite Frontend Development Server
Write-Host "-> Launching React Frontend (Vite) on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

# 2. Start the FastAPI Backend Server
Write-Host "-> Launching FastAPI Backend (Uvicorn) on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000"

Write-Host "All services started!" -ForegroundColor Cyan
Write-Host "You can close this window at any time without killing the servers." -ForegroundColor Gray
