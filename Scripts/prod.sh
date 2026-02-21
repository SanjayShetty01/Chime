#!/bin/bash
# ==============================================================================
# Chime Production Deployment (Linux Example)
# ==============================================================================

echo "Simulating Chime Production Startup for Linux..."

# Navigate to project root
cd "$(dirname "$0")/.."

# 1. Build the Frontend
echo "-> Building React Frontend (Vite Build)..."
cd frontend
npm run build
cd ..

# 2. Start the FastAPI Backend Server
# In a real Linux production environment, FastAPI is typically run behind Gunicorn
# which acts as a process manager for Uvicorn workers.
echo "-> Launching FastAPI Backend (Production Mode)..."
cd backend

# Activate the virtual environment
source venv/bin/activate

# Start Gunicorn with Uvicorn workers
# Wait to install gunicorn first: pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
