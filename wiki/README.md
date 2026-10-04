# Chime Knowledge Wiki

Welcome to the Chime technical documentation and developer wiki. This directory contains comprehensive documentation covering every subsystem of Chime, designed so that any engineer or user can understand, run, develop, debug, and extend the project without requiring external AI assistance.

---

## Table of Contents

1. [System Architecture and Design Philosophy](01-architecture-and-design.md)
   - Core design goals and local-first architecture
   - The Tauri v2 desktop shell and Python FastAPI sidecar model
   - Data privacy and isolation guarantees
   - Process lifecycle and inter-process communication

2. [Database Schema and Storage Engine](02-database-schema-and-storage.md)
   - SQLite tables: `users`, `uploads`, `transactions`
   - Foreign key cascading, unique constraints, and performance indexes
   - Automatic migrations and schema evolution
   - Transaction custom rate override persistence and statement total recalculation
   - OS-specific standard data directories

3. [PDF Statement Parsing and Ingestion](03-parsers-and-statement-ingestion.md)
   - The PDF statement parsing lifecycle
   - Password decryption and error handling
   - Card parsers: SBI Cashback, Axis Airtel, HDFC Swiggy
   - Step-by-step guide to writing a new bank parser

4. [Transaction Classification Engine](04-transaction-classification-engine.md)
   - Layer 1: Deterministic keyword matching (`keyword_rules.yaml`)
   - Layer 2: Offline semantic embeddings with Sentence-Transformers (`all-MiniLM-L6-v2`)
   - Confidence scoring, match tagging, and fallbacks
   - Guide to adding and tuning merchant rules

5. [Cashback Calculation Engines](05-cashback-calculation-engines.md)
   - The modular `cashback_calculation/` architecture
   - Dedicated Airtel Axis calculation engine (dynamic 2x/1x base spend caps)
   - Standard card calculation engine (fixed monthly caps and flat rates)
   - Multi-pass attribution and user rate override enforcement

6. [Frontend UI Architecture and Components](06-frontend-and-ui-architecture.md)
   - React 18, Vite, TypeScript, and Tailwind CSS design system
   - Routing, page structure, and protected authentication flows
   - Interactive transaction table with debounced SQLite syncing
   - Interactive AI Assistant and clickable prompt chips

7. [Desktop Packaging and Distribution](07-desktop-packaging-and-tauri.md)
   - Tauri v2 architecture and configuration (`tauri.conf.json`)
   - PyInstaller sidecar binary freeze process
   - Windows installers (`.exe`, `.msi`), Linux (`.deb`, `.rpm` [Coming Soon]), macOS (`.dmg`)
   - Preventing Windows file lock errors during packaging

8. [Developer Setup, Testing, and Troubleshooting](08-setup-development-and-troubleshooting.md)
   - Prerequisites (`uv`, `npm`, `rustc`, `cargo`)
   - One-command launcher scripts (`dev.ps1`, `dev.sh`, `tauri-dev.ps1`)
   - Running test suites (`test_classifier.py`, frontend builds)
   - Common gotchas, FAQs, and debugging recipes
