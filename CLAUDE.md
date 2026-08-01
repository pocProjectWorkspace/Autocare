# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoCare is a multi-platform automobile service center management system (UAE market). It has three independently runnable components: a FastAPI backend, an Expo React Native mobile app, and a vanilla JS web admin dashboard.

## Development Commands

### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
python -m app.seed             # Seed test data
```

Database migrations (Alembic):
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

Run tests:
```bash
cd backend
pytest                         # all tests
pytest tests/test_auth.py      # single test file
pytest -k "test_name"          # single test by name
```

### Mobile (Expo/React Native)
```bash
cd mobile
npm install
npx expo start
npx expo start --android       # Android
npx expo start --ios           # iOS
npm run lint                   # ESLint
```

### Web Dashboard (Vite)
```bash
cd web
npm install
npm run dev                    # dev server on http://localhost:3000
npm run build                  # production build
```

### Docker (infrastructure services)
```bash
docker-compose up -d postgres redis minio   # start DB, cache, storage
docker-compose up -d                        # start everything including backend
```

## Architecture

### Three-Package Monorepo (no shared root package.json)

- **`backend/`** — FastAPI Python 3.11 REST API
- **`mobile/`** — Expo 52 / React Native 0.76 app (TypeScript)
- **`web/`** — Vanilla JS admin dashboard with Vite

### Backend Structure (`backend/app/`)

Follows a layered architecture: **Routes → Services → Models**

- `api/` — FastAPI route modules, consolidated in `api/__init__.py` under `/api` prefix
- `services/` — Business logic (one service per domain: jobs, RFQ, payments, vehicle lookup, etc.)
- `models/` — SQLAlchemy ORM models (all inherit from `core.database.Base`)
- `schemas/` — Pydantic request/response validation schemas
- `core/config.py` — Pydantic Settings pulling from `.env`
- `core/database.py` — Custom `GUID` type for cross-DB UUID support (PostgreSQL native UUID / SQLite CHAR(36))
- `core/security.py` — JWT token creation/verification, password hashing, OTP generation
- `core/deps.py` — FastAPI dependency injection (get_db, get_current_user)

Database: PostgreSQL in production, SQLite (`autocare.db`) for local dev. The `GUID` type in `core/database.py` handles UUID portability between both.

### Mobile Structure (`mobile/`)

- `app/` — Expo Router file-based routing with route groups: `(auth)`, `(tabs)`, `(driver)`, `(vendor)`
- `services/api.ts` — Central Axios client with Bearer token injection and automatic 401 refresh
- `stores/authStore.ts` — Zustand store for auth state with expo-secure-store persistence
- `components/ui/` — Base UI components (Button, Card, Input, Loading, StatusBadge)
- `constants/config.ts` — API_URL and storage key constants

### Web Structure (`web/`)

Single-page app: `index.html` loads `js/app.js` (~32KB). No framework — vanilla JS with DOM manipulation. Vite proxies `/api` to `http://localhost:8000`.

## Key Domain Concepts

### Roles (6 types)
`customer`, `service_advisor`, `technician`, `driver`, `vendor`, `admin` — controls route access in both mobile (route groups) and backend (dependency checks).

### Job Card Lifecycle (23 states)
The central workflow entity. Status progression:
```
requested → scheduled → vehicle_picked → in_intake → diagnosed →
awaiting_estimate_approval → estimate_approved → rfq_sent →
quotes_received → awaiting_parts_approval → parts_approved →
awaiting_payment → paid → parts_ordered → parts_received →
in_service → testing → ready → out_for_delivery → delivered → closed
```

### Authentication
OTP-based (no passwords for customers). In dev mode, the OTP is returned in the API response. JWT access + refresh tokens. Mobile stores tokens in expo-secure-store.

### External Integrations
- **Vehicle lookup**: UAE Mulkiya/plate number API via `services/vehicle_lookup_service.py`
- **Payments**: Stripe + PayPal (mock provider in dev) via `services/payment_gateway.py`
- **Notifications**: WhatsApp (Twilio), Firebase push, in-app
- **Storage**: S3/MinIO via boto3 for file uploads
- **Background tasks**: Celery + Redis

## API Conventions

All routes prefixed with `/api`. Swagger at `/docs`, ReDoc at `/redoc`, health check at `/health`.

CORS allows: `localhost:19006` (Expo web), `localhost:8081` (Expo dev), `localhost:3000` (web dashboard), and `FRONTEND_URL` from env.

## Test Credentials (after `python -m app.seed`)

| Role | Mobile |
|------|--------|
| Admin | +971500000001 |
| Service Advisor | +971500000002 |
| Technician | +971500000003 |
| Driver | +971500000004 |
| Vendor | +971500000010 |
| Customer | +971501234599 |

## Environment

Backend config is in `backend/.env` (see `.env.example`). Key settings: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, S3/MinIO creds, payment gateway keys. Default dev DB is SQLite at `backend/autocare.db` (may be switched to a hosted Postgres like Neon / Supabase via `DATABASE_URL`).

---

## Autonomous Mode

This repo is set up for supervised and unattended agentic runs. See `.claude/autonomy/README.md` for the full spec.

### Key files
- `.claude/settings.json` — hooks + minimal permission allow/deny lists
- `.claude/agents/{planner,implementer,verifier}.md` — the three subagents
- `.claude/commands/build-module.md` — `/build-module <package> "<task>"` for interactive one-shot cycles
- `.claude/autonomy/orchestrator.sh` — headless loop over `tasks/modules.md`
- `.claude/autonomy/verify.sh` — the validation gate (pytest / tsc+lint / vite build)
- `tasks/modules.md` — the work manifest the orchestrator reads

### Rules that apply to every autonomous invocation
- **Never** use `--dangerously-skip-permissions`
- **Never** use `--no-verify`, `--no-gpg-sign`, `--force`, or `git reset --hard main`
- Every subagent call gets an explicit `--allowedTools` scoped to what it needs
- Every task runs on a checkpoint branch (`autonomy/YYYY-MM-DD-HHMMSS`) — never on `main`
- Failing tasks are rolled back to the last passing commit; the run continues
- Per-task retry cap: `MAX_TRIES=3`. Wall-clock cap: `MAX_WALL_SECONDS=1800`
- Stay inside one package per implementer invocation (`backend`, `mobile`, or `web`)
- The PostToolUse hook runs a fast syntax check after every Edit/Write; the verifier subagent runs the full gate before commit

### Package validation gates (used by `verify.sh`)
- `backend`: `pytest -x --tb=short` if tests exist, else `python -c "from app.main import app"` smoke import
- `mobile`: `npx tsc --noEmit` + `npm run lint`
- `web`: `npm run build`

### When to use MCP
Not for the core planner/implementer/verifier loop. Add an MCP server only for external integrations (GitHub PRs, Jira, external DBs). See `.claude/autonomy/README.md` for the reasoning.
