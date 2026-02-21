# ==============================================================================
# Chime Production Deployment (Example)
# ==============================================================================
# In a true production environment (like AWS, Render, or a VPS), you typically
# wouldn't use a PowerShell script. Instead, you would use Docker, systemd, 
# or a PaaS provider's native build steps. 
# 
# However, here is what the production equivalents of your dev commands look like:

Write-Host "Simulating Chime Production Startup..." -ForegroundColor Cyan

# Ensure we're executing from the project root
$BasePath = $PSScriptRoot
Set-Location -Path "$BasePath\.."

# 1. Build the Frontend
# In production, you do NOT run a Vite dev server (`npm run dev`). 
# Instead, you build the raw static HTML/CSS/JS files once.
Write-Host "-> Building React Frontend (Vite Build)..." -ForegroundColor Yellow
Set-Location -Path "frontend"
npm run build
Set-Location -Path ".."

# After building, these static files (in /frontend/dist) are usually served 
# by a fast web server like Nginx, or directly by FastAPI itself.

# 2. Start the FastAPI Backend Server
# In production, you do NOT use the `--reload` flag (it hurts performance).
# You also bind to `0.0.0.0` so the server is exposed to the public internet,
# and you often run multiple "workers" to handle high traffic.
Write-Host "-> Launching FastAPI Backend (Production Mode)..." -ForegroundColor Green
Set-Location -Path "backend"

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Start Uvicorn (In a real Linux production environment, you would use Gunicorn 
# to manage multiple Uvicorn worker processes).
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
