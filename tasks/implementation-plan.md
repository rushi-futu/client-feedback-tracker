# Implementation Plan: Client Feedback CRUD
Status: PENDING_APPROVAL
Contract: api-contract.yaml (APPROVED)
UI Spec: design/ui-spec.md (PM APPROVED)
Created: 2026-03-11

---

## Data Model

### New Tables

| Table | Column | Type | Constraints | Notes |
|-------|--------|------|-------------|-------|
| feedback_items | id | UUID | PK, NOT NULL | Python-side default: `uuid.uuid4` — see Decision 1 |
| feedback_items | client_name | VARCHAR(255) | NOT NULL | min length 1 enforced by Pydantic |
| feedback_items | summary | VARCHAR(500) | NOT NULL | min length 1 enforced by Pydantic |
| feedback_items | detail | TEXT | nullable | explicitly nullable, cleared if sent as null in PATCH |
| feedback_items | theme | SAEnum(FeedbackTheme) | NOT NULL | values: ux, performance, support, pricing, communication |
| feedback_items | status | SAEnum(FeedbackStatus) | NOT NULL, default='open' | values: open, in_progress, actioned |
| feedback_items | created_at | TIMESTAMPTZ | NOT NULL, server_default=func.now() | set once at creation, never updated |
| feedback_items | updated_at | TIMESTAMPTZ | NOT NULL, server_default=func.now(), onupdate=func.now() | updated by SQLAlchemy ORM on each commit |

### New Migrations

- `backend/alembic/versions/<hash>_create_feedback_items_table.py`
  - Generated via: `alembic revision --autogenerate -m "create_feedback_items_table"`
  - Run after `feedback_item.py` model is created and imported in `alembic/env.py`

### Existing Tables Modified

None — this is a standalone greenfield resource.

---

## Shared Types

These exact definitions must be used verbatim by both agents. No interpretation.

### Backend — Pydantic schemas (`backend/app/schemas/feedback_item.py`)

```python
from __future__ import annotations
from uuid import UUID
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class FeedbackTheme(str, Enum):
    ux = "ux"
    performance = "performance"
    support = "support"
    pricing = "pricing"
    communication = "communication"


class FeedbackStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    actioned = "actioned"


class FeedbackItemCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=1, max_length=500)
    detail: str | None = None
    theme: FeedbackTheme
    status: FeedbackStatus = FeedbackStatus.open


class FeedbackItemUpdate(BaseModel):
    client_name: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = Field(default=None, min_length=1, max_length=500)
    detail: str | None = None
    theme: FeedbackTheme | None = None
    status: FeedbackStatus | None = None


class FeedbackItemRead(BaseModel):
    id: UUID
    client_name: str
    summary: str
    detail: str | None
    theme: FeedbackTheme
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

### Frontend — TypeScript types (`frontend/src/types/index.ts`)

```typescript
// Enums as union types — values match backend enum values exactly
export type FeedbackTheme =
  | "ux"
  | "performance"
  | "support"
  | "pricing"
  | "communication"

export type FeedbackStatus = "open" | "in_progress" | "actioned"

// Read — matches FeedbackItemRead schema field-for-field
export interface FeedbackItemRead {
  id: string            // UUID serialised as string
  client_name: string
  summary: string
  detail: string | null
  theme: FeedbackTheme
  status: FeedbackStatus
  created_at: string    // ISO 8601 UTC datetime
  updated_at: string    // ISO 8601 UTC datetime
}

// Create — matches FeedbackItemCreate schema
export interface FeedbackItemCreate {
  client_name: string
  summary: string
  detail?: string | null
  theme: FeedbackTheme
  status: FeedbackStatus
}

// Update — matches FeedbackItemUpdate schema (all fields optional)
export interface FeedbackItemUpdate {
  client_name?: string | null
  summary?: string | null
  detail?: string | null
  theme?: FeedbackTheme | null
  status?: FeedbackStatus | null
}

// Display helpers — UI labels for enum values
export const THEME_LABELS: Record<FeedbackTheme, string> = {
  ux: "UX",
  performance: "Performance",
  support: "Support",
  pricing: "Pricing",
  communication: "Communication",
}

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  actioned: "Actioned",
}
```

---

## Delivery Slices

Slices are built in order. Backend agent builds Slice 1 in full. Frontend agent builds Slice 2 after Slice 1 is complete and can read the backend code.

### Slice 1: Backend CRUD

**What this delivers:** A fully working REST API for feedback items — all five endpoints live, validated, returning the correct shapes. Tester can run all T-01 through T-07 after this slice.

**Backend scope:**

| File | Purpose |
|------|---------|
| `backend/pyproject.toml` | Project config, dependencies (fastapi, uvicorn, sqlalchemy, alembic, pydantic-settings, psycopg2-binary) |
| `backend/.env.example` | Example env vars: `DATABASE_URL`, `ENVIRONMENT` |
| `backend/app/__init__.py` | Empty package marker |
| `backend/app/config.py` | `Settings` via pydantic-settings — reads `DATABASE_URL` from env |
| `backend/app/database.py` | SQLAlchemy engine, `SessionLocal`, `Base` (DeclarativeBase), `get_db()` dependency |
| `backend/app/models/__init__.py` | Empty package marker |
| `backend/app/models/feedback_item.py` | `FeedbackItem` SQLAlchemy model — see service logic below |
| `backend/app/schemas/__init__.py` | Empty package marker |
| `backend/app/schemas/feedback_item.py` | Pydantic schemas — verbatim from Shared Types above |
| `backend/app/routers/__init__.py` | Empty package marker |
| `backend/app/routers/feedback.py` | FastAPI router — 5 endpoints — see service logic below |
| `backend/app/main.py` | FastAPI app, CORS middleware, register feedback router at `/feedback` |
| `backend/alembic.ini` | Alembic config — `sqlalchemy.url` reads from env |
| `backend/alembic/env.py` | Alembic env — imports `FeedbackItem` model so autogenerate detects the table |
| `backend/alembic/versions/<hash>_create_feedback_items_table.py` | Generated migration — do not hand-write |
| `backend/tests/__init__.py` | Empty package marker |
| `backend/tests/conftest.py` | SQLite in-memory test DB — override `get_db`, `TestClient` fixture |

**Backend service logic (pseudocode — no real code):**

> This feature has no complex business logic. All logic lives in the router, following the CRUD pattern in `api-patterns.md`. There is no `services/` file for this feature.

**`FeedbackItem` model** (`backend/app/models/feedback_item.py`):
```
FeedbackItem(Base):
  __tablename__ = "feedback_items"
  id          = UUID column, PK, default=uuid.uuid4 (Python-side, NOT server_default SQL)
  client_name = String(255), NOT NULL
  summary     = String(500), NOT NULL
  detail      = Text, nullable
  theme       = SAEnum(FeedbackTheme), NOT NULL
                — import FeedbackTheme from schemas.feedback_item
  status      = SAEnum(FeedbackStatus), NOT NULL, default=FeedbackStatus.open
                — import FeedbackStatus from schemas.feedback_item
  created_at  = DateTime(timezone=True), server_default=func.now()
  updated_at  = DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
```

**`GET /feedback/`** — list all items:
```
query db for all FeedbackItem rows
order by created_at DESCENDING (newest first)
return list — FastAPI serialises via list[FeedbackItemRead]
```

**`POST /feedback/`** — create item:
```
instantiate FeedbackItem(**body.model_dump())
  — status defaults to FeedbackStatus.open if caller omits it (schema default handles this)
add to session → commit → refresh
return created item — 201 status
```

**`GET /feedback/{id}`** — get single item:
```
query db: FeedbackItem where id == path param (UUID type, FastAPI validates format)
if not found → raise 404 with detail="Feedback item not found"
return item
```

**`PATCH /feedback/{id}`** — partial update:
```
query db for existing item — 404 if not found (same as above)
iterate body.model_dump(exclude_unset=True).items()
  — for each (key, value) present in the request body: setattr(item, key, value)
  — fields not present in body are NOT touched (exclude_unset semantics)
  — detail=null explicitly sent WILL be applied, clearing the field
commit → refresh
return updated item — 200 status
```

**`DELETE /feedback/{id}`** — delete item:
```
query db for existing item — 404 if not found
db.delete(item) → commit
return — 204 No Content (no body)
```

**`main.py`** setup:
```
create FastAPI app with title="Client Feedback Tracker API"
add CORSMiddleware:
  allow_origins=["http://localhost:3000"]
  allow_methods=["*"]
  allow_headers=["*"]
include feedback.router with prefix="/feedback", tags=["feedback"]
add GET /health → {"status": "ok"}
```

**`alembic/env.py`** — critical import:
```
from app.database import Base
from app.models import feedback_item  # noqa: F401 — must import to register with metadata
target_metadata = Base.metadata
```

**Contract endpoints covered in Slice 1:** All five — GET /feedback/, POST /feedback/, GET /feedback/{id}, PATCH /feedback/{id}, DELETE /feedback/{id}

---

### Slice 2: Frontend CRUD

**What this delivers:** A fully working UI — users can view, filter, create, edit, and delete feedback items.

**Frontend scope:**

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `frontend/src/types/index.ts` | TypeScript types + display helpers | Shared Types above |
| `frontend/src/lib/api.ts` | All 5 API functions + base request helper | api-contract.yaml all endpoints |
| `frontend/src/app/layout.tsx` | Root layout with `<html>`, `<body>`, minimal global styles | — |
| `frontend/src/app/page.tsx` | Root redirect: `/` → `/feedback` | ui-spec.md § Routes |
| `frontend/src/app/feedback/page.tsx` | FeedbackListPage — server, fetches all items | ui-spec.md § `/feedback` |
| `frontend/src/components/feedback/FeedbackListClient.tsx` | Client wrapper — manages filter state | ui-spec.md § FeedbackListPage |
| `frontend/src/components/feedback/FilterBar.tsx` | Filter controls (client) | ui-spec.md § FilterBar |
| `frontend/src/components/feedback/FeedbackTable.tsx` | Table display with Edit links (client) | ui-spec.md § FeedbackTable |
| `frontend/src/app/feedback/new/page.tsx` | NewFeedbackPage — server shell | ui-spec.md § `/feedback/new` |
| `frontend/src/app/feedback/[id]/page.tsx` | FeedbackDetailPage — server, fetches item by id | ui-spec.md § `/feedback/[id]` |
| `frontend/src/components/feedback/FeedbackForm.tsx` | Shared form — create + edit modes (client) | ui-spec.md § FeedbackForm |

**Frontend component tree (Slice 2):**

```
app/page.tsx  [server — redirect only]
  → redirect("/feedback")

app/feedback/page.tsx  [server — fetches items on load]
  await listFeedback() → items: FeedbackItemRead[]
  └── <Link href="/feedback/new"> "Log Feedback" button  [static markup]
  └── FeedbackListClient  [client — "use client"]
        props: initialItems: FeedbackItemRead[]
        state: clientFilter (string), themeFilter (FeedbackTheme | ""), statusFilter (FeedbackStatus | "")
        derives: filteredItems = filter(initialItems) by all three filter values
        └── FilterBar  [client — "use client"]
              props: clientFilter, themeFilter, statusFilter, setters for each, onClear
              renders: text input, two <select> dropdowns, "Clear filters" link
        └── FeedbackTable  [client — "use client"]
              props: items: FeedbackItemRead[] (already filtered)
              renders: table with columns Client | Summary | Theme | Status | Date Logged | Actions
              each row Actions column: <Link href="/feedback/{item.id}"> "Edit"
              empty state (items.length === 0, no filters active):
                "No feedback logged yet. Log your first item →" (links to /feedback/new)
              filtered empty state (items.length === 0, at least one filter active):
                "No items match your filters."

app/feedback/new/page.tsx  [server — no data to fetch]
  renders: page title "Log Feedback"
  renders: <Link href="/feedback"> "Cancel" link
  └── FeedbackForm  [client — "use client"]
        props: mode="create"
        state: formFields, errors, loading, submitError
        on valid submit: calls createFeedback(body) → on success: router.push("/feedback")
        on error: displays submitError message
        submit button label: "Save Feedback"
        inline validation: client_name required, summary required

app/feedback/[id]/page.tsx  [server — fetches item by id]
  await getFeedback(params.id) → item: FeedbackItemRead
  (404 from API propagates as Next.js notFound())
  renders: page title "Edit Feedback"
  renders: <Link href="/feedback"> "Cancel" link
  └── FeedbackForm  [client — "use client"]
        props: mode="edit", initialData=item
        state: formFields (pre-populated from initialData), errors, loading, submitError, deleteLoading
        on valid submit: calls updateFeedback(item.id, body) → on success: router.push("/feedback")
        delete button (bottom of form, destructive style):
          calls window.confirm("Delete this feedback item?")
          if confirmed: calls deleteFeedback(item.id) → router.push("/feedback")
        submit button label: "Save Changes"
        inline validation: same as create mode
```

**`lib/api.ts` function signatures:**

```
BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

request<T>(path, options?) → Promise<T>
  — sets Content-Type: application/json
  — throws Error with detail message on non-ok response
  — for 204 responses (deleteFeedback): skip res.json(), return void

listFeedback() → Promise<FeedbackItemRead[]>
  GET /feedback/

getFeedback(id: string) → Promise<FeedbackItemRead>
  GET /feedback/{id}

createFeedback(body: FeedbackItemCreate) → Promise<FeedbackItemRead>
  POST /feedback/   body: JSON.stringify(body)

updateFeedback(id: string, body: FeedbackItemUpdate) → Promise<FeedbackItemRead>
  PATCH /feedback/{id}   body: JSON.stringify(body)

deleteFeedback(id: string) → Promise<void>
  DELETE /feedback/{id}   — expect 204, no body parsed
```

**Contract endpoints covered in Slice 2:** All five endpoints consumed by the frontend.

---

## Slice Dependency Order

1. **Slice 1 — Backend CRUD** (no dependencies — foundational)
   - All backend files, model, schemas, router, migration
   - Backend agent completes this before frontend agent starts

2. **Slice 2 — Frontend CRUD** (depends on Slice 1)
   - Frontend agent reads Slice 1 backend code before writing any files
   - Specifically: read `schemas/feedback_item.py` to confirm enum values before writing TS types
   - All pages and components

---

## Decisions Made

1. **UUID as Python-side default, not SQL `gen_random_uuid()`**
   Why: SQLite (used in tests via conftest.py pattern) does not support PostgreSQL UUID functions. Using `default=uuid.uuid4` in Python generates a UUID in Python before the INSERT, making it portable across PostgreSQL (production) and SQLite (tests).
   Alternative rejected: `server_default=text("gen_random_uuid()")` — works in PG 13+ but breaks SQLite test DB, requiring a separate test-only model or conditional logic.

2. **No service layer — router handles DB operations directly**
   Why: This feature has no business logic beyond CRUD — no scoring, no cross-resource computation, no side effects. The api-patterns.md example pattern shows SQL in the router for simple CRUD resources. Creating an empty service file would add files with no separation of concerns benefit.
   Alternative rejected: Thin service layer with `create_feedback_item(db, body)` etc. — adds indirection with zero benefit for a pure CRUD resource. If domain logic is added later (e.g. auto-tagging, client resolution), a service can be extracted at that point.

3. **Client-side filtering via `FeedbackListClient` wrapper**
   Why: ui-spec explicitly states "Filters on `/feedback` are client-side — no round trip needed if all items loaded." All items load on page mount (no pagination). This means the server component fetches everything once; filter changes don't trigger API calls.
   Alternative rejected: Server-side query params filtering — would round-trip on every filter change and contradicts the ui-spec's explicit decision.

4. **`FeedbackListClient` as a client wrapper component between the server page and FilterBar/FeedbackTable**
   Why: The filter state (`clientFilter`, `themeFilter`, `statusFilter`) is shared between FilterBar (sets it) and FeedbackTable (reads it). The server page cannot hold this state. A single client wrapper owns the state and passes props down to FilterBar and FeedbackTable, keeping those components simple and prop-driven.
   Alternative rejected: Moving all filtering logic into FeedbackTable with FilterBar as a sibling — requires prop-drilling through the page or a context provider, which is more complex than a single client wrapper.

5. **`FeedbackForm` is a shared component for both create and edit modes, distinguished by `mode` prop**
   Why: The two forms are identical in field layout, validation rules, and error handling. The only differences are: pre-populated vs blank fields, submit button label, and the presence of the delete button in edit mode. A `mode` prop cleanly handles all three differences without duplicating the form.
   Alternative rejected: Separate `CreateFeedbackForm` and `EditFeedbackForm` components — duplicates all field/validation/submit logic. ui-spec uses the same `FeedbackForm` name for both modes, signalling a shared implementation.

6. **Delete button lives inside `FeedbackForm` (edit mode only)**
   Why: ui-spec describes the delete button as part of the FeedbackDetailPage "bottom of form". FeedbackForm is already a client component with access to `useRouter`. Placing delete there avoids a separate client component for a single action and keeps all form-related mutations in one place.
   Alternative rejected: `DeleteButton` as a separate client component rendered by the (server) detail page — would require the server page to render two client components with separate API state, complicating error handling.

7. **Components in `frontend/src/components/feedback/` subdirectory**
   Why: The existing architecture uses domain-specific subdirectories (`board/`, `forms/`). `feedback/` is the domain for this feature. All three feedback-specific components (FilterBar, FeedbackTable, FeedbackListClient, FeedbackForm) belong together in this directory.
   Alternative rejected: Using the existing `forms/` directory for FeedbackForm — the `forms/` directory was used for a different domain (brief forms). Mixing domains in a shared directory degrades discoverability.

8. **`app/feedback/[id]/page.tsx` calls `notFound()` on 404 from the API**
   Why: Next.js app router's `notFound()` function renders the nearest `not-found.tsx` boundary, providing a correct 404 HTTP response. Throwing or returning without calling `notFound()` would render the page with no data.
   Alternative rejected: Try/catch and render an error message inline — worse UX and incorrect HTTP semantics for a missing resource.

---

## Testability Notes

1. **UUID primary key and SQLite**: The Python-side `default=uuid.uuid4` decision (Decision 1) makes all UUID generation testable without a PostgreSQL extension. The test conftest creates the table via `Base.metadata.create_all()` which respects Python-side defaults. Tests can assert `id` is a valid UUID string.

2. **`exclude_unset=True` PATCH semantics**: The tester should verify that fields absent from the PATCH request body are NOT overwritten. The router's `body.model_dump(exclude_unset=True)` only iterates fields the caller explicitly sent. Test case: PATCH with only `{"status": "actioned"}` — `client_name`, `summary`, `detail`, `theme` must remain unchanged.

3. **Clearing `detail` via `null`**: Sending `{"detail": null}` in a PATCH must clear the field (set to NULL in DB). Sending no `detail` key must NOT clear it. These are different cases — test both.

4. **Empty string validation**: `client_name=""` and `summary=""` in POST/PATCH should return 422 (Pydantic `min_length=1` on `FeedbackItemCreate` and `FeedbackItemUpdate`). These are caught before hitting the DB.

5. **`updated_at` behaviour**: After a PATCH, `updated_at` must be later than `created_at` (or equal if within the same second). The tester should add a small sleep between create and update to make this assertion reliable.

6. **No external dependencies**: The feedback router has no FK relationships to other tables, no external API calls, no background tasks. The conftest.py SQLite pattern from data-patterns.md works without modification.

---

## Open Questions ⚠️

1. **`summary` max length**
   The contract says `summary: string` with no max length. The plan specifies `VARCHAR(500)` and `max_length=500` in Pydantic.
   Default if not answered: `max_length=500` — long enough for a meaningful summary, short enough to prevent abuse in the absence of pagination.

2. **`client_name` max length**
   Same — contract has no max. Plan specifies `VARCHAR(255)`.
   Default if not answered: `max_length=255` — standard string column length.

3. **`updated_at` on create — should it equal `created_at`?**
   Both have `server_default=func.now()`. In practice they will be equal (or within microseconds) on creation.
   Default if not answered: Accept this behaviour — they will be equal on creation. The `updated_at` diverges after the first PATCH.

4. **Empty `detail` string vs null**
   If the user submits the detail textarea blank, the frontend sends `detail: ""` or omits it. The backend accepts `null` or a non-empty string (no `min_length` on `detail` — it is genuinely optional and nullable).
   Default if not answered: Frontend sends `detail: null` (not `""`) when the textarea is empty. Backend stores `null`. The frontend FeedbackForm converts an empty string input to `null` before submitting.

5. **Foundational frontend files (layout.tsx, tailwind config, etc.)**
   The frontend is greenfield. The frontend agent needs to decide whether to scaffold a minimal Next.js app or assume scaffolding exists.
   Default if not answered: Frontend agent creates `app/layout.tsx` with a minimal shell (html, body, font, basic nav), and assumes `tailwind.config.ts`, `tsconfig.json`, `package.json`, and shadcn/ui are already scaffolded. If not scaffolded, the agent should initialise them following the package.json in `frontend-patterns.md`.

6. **Foundational backend files (conftest.py, alembic setup)**
   Backend is also greenfield. Backend agent must create `conftest.py` and the alembic scaffold.
   Default if not answered: Backend agent creates `conftest.py` verbatim from `data-patterns.md` test database pattern, and scaffolds alembic using `alembic init alembic` then edits `env.py` to match the pattern in `data-patterns.md`.
