# ============================================================================
# Chime — Production Dockerfile (multi-stage)
# ============================================================================
# Stage 1: Build the React frontend
# Stage 2: Python backend that serves the built SPA + API
# ============================================================================

# ── Stage 1: Frontend Build ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies first (layer caching)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Backend + Serve ────────────────────────────────────────────────
FROM python:3.11-slim AS production

# System deps for pdfplumber (uses pdfminer) and bcrypt
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (layer caching)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Pre-download the sentence-transformers model so it's baked into the image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy backend source
COPY backend/ ./

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend_dist

# Patch the frontend dist path to match the Docker layout
# The backend expects ../frontend/dist relative to main.py, but in Docker
# we place it at ./frontend_dist alongside main.py
ENV CHIME_FRONTEND_DIR=/app/frontend_dist

# Create data directory for SQLite (mount as volume for persistence)
RUN mkdir -p /app/data

# Environment
ENV PYTHONUNBUFFERED=1
ENV CHIME_SECRET_KEY=change-me-in-production

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/cards')" || exit 1

# Run with gunicorn + uvicorn workers
CMD ["gunicorn", "main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-"]
