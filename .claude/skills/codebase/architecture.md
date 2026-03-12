# Codebase Architecture
# Client Feedback Tracker — FastAPI + Next.js 15 monorepo

## Directory Structure

```
client-feedback-tracker/
├── app/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py              # FastAPI app entry point
│   │   │   ├── config.py            # Settings via pydantic-settings
│   │   │   ├── database.py          # SQLAlchemy engine + session
│   │   │   ├── models/              # SQLAlchemy ORM models
│   │   │   │   ├── __init__.py
│   │   │   │   ├── brief.py
│   │   │   │   ├── reporter.py
│   │   │   │   └── assignment.py
│   │   │   ├── schemas/             # Pydantic request/response schemas
│   │   │   │   ├── __init__.py
│   │   │   │   ├── brief.py
│   │   │   │   ├── reporter.py
│   │   │   │   └── assignment.py
│   │   │   ├── routers/             # FastAPI routers — one per domain
│   │   │   │   ├── __init__.py
│   │   │   │   ├── briefs.py
│   │   │   │   ├── reporters.py
│   │   │   │   └── assignments.py
│   │   │   ├── services/            # Business logic — no DB access here
│   │   │   │   ├── assignment_scorer.py
│   │   │   │   └── coverage_gap.py
│   │   │   └── dependencies.py      # FastAPI Depends() providers
│   │   ├── tests/
│   │   │   ├── conftest.py
│   │   │   ├── test_briefs.py
│   │   │   ├── test_reporters.py
│   │   │   └── test_assignments.py
│   │   ├── alembic/
│   │   ├── alembic.ini
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── frontend/
│       ├── src/
│       │   ├── app/                 # Next.js 15 app router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── briefs/
│       │   │   │   └── new/page.tsx
│       │   │   └── assignments/
│       │   │       └── [id]/page.tsx
│       │   ├── components/
│       │   │   ├── ui/              # shadcn primitives — do not modify
│       │   │   ├── board/
│       │   │   └── forms/
│       │   ├── lib/
│       │   │   ├── api.ts           # all API calls live here
│       │   │   └── utils.ts
│       │   └── types/
│       │       └── index.ts         # TypeScript types matching backend schemas
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── docker-compose.yml
├── .claude/
├── config/
├── api-contract.yaml
└── CLAUDE.md
```

## Architectural Decisions

1. **app/backend/ and app/frontend/ under app/** — different runtimes, different deploy targets, each with its own Dockerfile. Never import across the boundary — only communicate via HTTP.

2. **FastAPI routers map 1:1 to domain entities** — one router per resource. No god routers.

3. **Services contain business logic, routers contain HTTP logic** — never put SQL in a router. Never put HTTP logic in a service.

4. **Pydantic schemas are separate from SQLAlchemy models** — models describe storage, schemas describe the API contract. Never return a SQLAlchemy model directly from an endpoint.

5. **Next.js app router** — app/ directory only. No pages/ directory. Server components by default, client components only when you need interactivity or hooks.

6. **All API calls go through lib/api.ts** — no direct fetch() calls in components. One place to change base URL, auth headers, error handling.

7. **TypeScript types mirror Pydantic schemas** — the api-contract.yaml is the source of truth. Both sides must match it.

## Data Flow

```
HTTP Request
  → FastAPI router (validates with Pydantic schema)
  → Service layer (business logic)
  → SQLAlchemy model (DB via session)
  → Pydantic schema (serialise)
  → HTTP Response

Next.js component
  → lib/api.ts (typed fetch)
  → FastAPI endpoint
  → TypeScript type
  → React component render
```

## Module Boundaries

| Module | Responsibility |
|--------|---------------|
| app/backend/app/models/ | Database shape only |
| app/backend/app/schemas/ | API contract shapes |
| app/backend/app/routers/ | HTTP routing and validation |
| app/backend/app/services/ | Business logic and scoring |
| app/frontend/src/app/ | Pages and layouts |
| app/frontend/src/components/ | UI components |
| app/frontend/src/lib/api.ts | All API calls |

## Docker

The project is dockerized. Each service has its own Dockerfile:

- `app/backend/Dockerfile` — Python 3.12, installs from pyproject.toml, runs alembic + uvicorn
- `app/frontend/Dockerfile` — Node 20, installs from package.json, builds and serves Next.js
- `docker-compose.yml` at root — orchestrates backend, frontend, and PostgreSQL

Local development: `docker compose up` starts all services.
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432 (user: postgres, password: postgres, db: feedback_tracker)

The `DATABASE_URL` in docker-compose points to the `db` service. Local `.env` files can override for non-Docker development.

## What's Off-Limits

- `app/backend/alembic/` — never hand-write migrations, use `alembic revision --autogenerate`
- `app/frontend/src/components/ui/` — shadcn primitives, do not modify
- `.env` files — never commit, never hardcode
