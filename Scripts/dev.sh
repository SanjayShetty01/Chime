#!/bin/bash
# ==============================================================================
# Chime Development Environment Launcher (Linux / macOS)
# ==============================================================================
# This script launches both the React Frontend and FastAPI Backend
# in separate background processes.

echo -e "\033[1;36mStarting Chime Development Environment...\033[0m"

# Ensure we're executing from the project root
cd "$(dirname "$0")/.."

# 1. Start the Vite Frontend Development Server
echo -e "\033[1;32m-> Launching React Frontend (Vite) on port 5173...\033[0m"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# 2. Start the FastAPI Backend Server
echo -e "\033[1;32m-> Launching FastAPI Backend (Uvicorn) on port 8000...\033[0m"
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

echo -e "\033[1;36mAll services started in the background!\033[0m"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID: $BACKEND_PID"
echo -e "\033[1;30mPress Ctrl+C to stop both servers.\033[0m"

# Trap Ctrl+C to kill both background processes gracefully
trap 'kill $FRONTEND_PID $BACKEND_PID; exit' INT

# Keep script running to maintain the trap
wait
