# Implementation Plan: Client Feedback CRUD
Status: PENDING_APPROVAL
Contract: api-contract.yaml (APPROVED)
UI Spec: design/ui-spec.md (PM APPROVED)
Created: 2026-03-11

---

## Pre-conditions

- This is a **greenfield project** — no `backend/` or `frontend/` directories exist yet.
- Backend agent must scaffold the full FastAPI project structure before implementing feature code.
- Frontend agent must scaffold the full Next.js 15 project structure before implementing feature code.
- Both agents must follow the patterns in `.claude/skills/codebase/` exactly.

---

## Data Model

### New tables

| Table           | Column       | Type                              | Constraints                              | Notes                                      |
|-----------------|--------------|-----------------------------------|------------------------------------------|--------------------------------------------|
| feedback_items  | id           | UUID                              | PK, NOT NULL                             | Python-side generation via `uuid.uuid4`    |
| feedback_items  | client_name  | VARCHAR(255)                      | NOT NULL                                 | Free text — no FK to a clients table       |
| feedback_items  | summary      | VARCHAR(500)                      | NOT NULL                                 | Short description                          |
| feedback_items  | detail       | TEXT                              | NULLABLE                                 | Optional longer description                |
| feedback_items  | theme        | ENUM (FeedbackTheme)              | NOT NULL                                 | See enum values below                      |
| feedback_items  | status       | ENUM (FeedbackStatus)             | NOT NULL, default='open'                 | See enum values below                      |
| feedback_items  | created_at   | TIMESTAMP WITH TIME ZONE          | NOT NULL, server_default=func.now()      | Set once on insert                         |
| feedback_items  | updated_at   | TIMESTAMP WITH TIME ZONE          | NOT NULL, server_default=func.now(), onupdate=func.now() | Updated on every PATCH |

**FeedbackTheme enum values:** `UX`, `Performance`, `Support`, `Pricing`, `Communication`

**FeedbackStatus enum values:** `open`, `in_progress`, `actioned`

### New migrations

- `backend/alembic/versions/<hash>_add_feedback_items_table.py`
  - Generated via `alembic revision --autogenerate -m "add feedback_items table"`
  - Do NOT hand-write; run after defining the SQLAlchemy model

### Existing tables modified

- None — this is the first and only table in this project.

---

## Shared Types

These exact definitions must be used by both agents. Copy verbatim. No interpretation.

### Backend — Pydantic schemas (`backend/app/schemas/feedback_item.py`)

```python
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from uuid import UUID
from typing import Optional


class FeedbackTheme(str, Enum):
    UX = "UX"
    Performance = "Performance"
    Support = "Support"
    Pricing = "Pricing"
    Communication = "Communication"


class FeedbackStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    actioned = "actioned"


class FeedbackItemCreate(BaseModel):
    client_name: str
    summary: str
    detail: Optional[str] = None
    theme: FeedbackTheme
    status: FeedbackStatus = FeedbackStatus.open


class FeedbackItemUpdate(BaseModel):
    client_name: Optional[str] = None
    summary: Optional[str] = None
    detail: Optional[str] = None
    theme: Optional[FeedbackTheme] = None
    status: Optional[FeedbackStatus] = None


class FeedbackItemRead(BaseModel):
    id: UUID
    client_name: str
    summary: str
    detail: Optional[str]
    theme: FeedbackTheme
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

### Frontend — TypeScript types (`frontend/src/types/index.ts`)

```typescript
export type FeedbackTheme =
  | "UX"
  | "Performance"
  | "Support"
  | "Pricing"
  | "Communication"

export type FeedbackStatus = "open" | "in_progress" | "actioned"

export interface FeedbackItem {
  id: string               // UUID as string
  client_name: string
  summary: string
  detail: string | null
  theme: FeedbackTheme
  status: FeedbackStatus
  created_at: string       // ISO-8601 datetime string
  updated_at: string       // ISO-8601 datetime string
}

export interface FeedbackItemCreate {
  client_name: string
  summary: string
  detail?: string | null
  theme: FeedbackTheme
  status?: FeedbackStatus  // defaults to 'open' server-side
}

export interface FeedbackItemUpdate {
  client_name?: string | null
  summary?: string | null
  detail?: string | null
  theme?: FeedbackTheme | null
  status?: FeedbackStatus | null
}
```

---

## Delivery Slices

Slices are built in order. For each slice: backend agent builds first, then frontend agent builds the UI for that slice. Frontend can read backend code from the current and all previous slices.

---

### Slice 1: Backend Foundation

**What this delivers:** A fully working REST API for feedback CRUD, verified via `/docs` (Swagger). No UI yet. All five endpoints return correct responses.

**Backend scope:**

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app entry point — CORS, health endpoint, router registration |
| `backend/app/config.py` | Settings via pydantic-settings — database_url, environment |
| `backend/app/database.py` | SQLAlchemy engine, SessionLocal, Base, get_db dependency |
| `backend/app/models/__init__.py` | Empty init |
| `backend/app/models/feedback_item.py` | SQLAlchemy ORM model for feedback_items table |
| `backend/app/schemas/__init__.py` | Empty init |
| `backend/app/schemas/feedback_item.py` | Pydantic schemas — use Shared Types above verbatim |
| `backend/app/routers/__init__.py` | Empty init |
| `backend/app/routers/feedback_items.py` | FastAPI router — all 5 CRUD endpoints |
| `backend/alembic.ini` | Alembic config — point sqlalchemy.url at DATABASE_URL |
| `backend/alembic/env.py` | Import all models so autogenerate sees them |
| `backend/alembic/versions/<hash>_add_feedback_items_table.py` | Generated migration — run after model is defined |
| `backend/pyproject.toml` | Python project deps — fastapi, uvicorn, sqlalchemy, alembic, pydantic-settings, psycopg2-binary |
| `backend/.env.example` | Template for required env vars |

**Backend service logic (pseudocode — no implementation code):**

> Note: No separate service layer is introduced for this feature. CRUD operations with no business logic go directly in the router, following the pattern shown in `.claude/skills/codebase/api-patterns.md`. The services/ directory is reserved for future business logic (e.g. analytics, notifications).

```
FUNCTION list_feedback_items(db):
  query = SELECT * FROM feedback_items ORDER BY created_at DESC
  RETURN all rows as list[FeedbackItemRead]

FUNCTION create_feedback_item(body: FeedbackItemCreate, db):
  item = FeedbackItem(
    id = uuid.uuid4(),
    client_name = body.client_name,
    summary = body.summary,
    detail = body.detail,          // may be None
    theme = body.theme,
    status = body.status,          // defaults to FeedbackStatus.open if not supplied
    // created_at and updated_at set by server_default
  )
  db.add(item)
  db.commit()
  db.refresh(item)
  RETURN item as FeedbackItemRead with HTTP 201

FUNCTION get_feedback_item(id: UUID, db):
  item = SELECT * FROM feedback_items WHERE id = id
  IF item is None:
    RAISE HTTPException(404, "Feedback item not found")
  RETURN item as FeedbackItemRead

FUNCTION update_feedback_item(id: UUID, body: FeedbackItemUpdate, db):
  item = SELECT * FROM feedback_items WHERE id = id
  IF item is None:
    RAISE HTTPException(404, "Feedback item not found")
  FOR EACH field, value IN body.model_dump(exclude_unset=True).items():
    setattr(item, field, value)
  db.commit()
  db.refresh(item)
  RETURN item as FeedbackItemRead
  // Note: exclude_unset=True means only fields the client explicitly sent are updated.
  // Fields absent from request body are left unchanged.

FUNCTION delete_feedback_item(id: UUID, db):
  item = SELECT * FROM feedback_items WHERE id = id
  IF item is None:
    RAISE HTTPException(404, "Feedback item not found")
  db.delete(item)
  db.commit()
  RETURN HTTP 204 with no body
```

**Model definition notes:**
- UUID PK: use `Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)` — Python-side generation, not database-side
- Import `UUID` from `sqlalchemy.dialects.postgresql` for the column type, but also add `connect_args={"check_same_thread": False}` and use String type for SQLite compatibility in tests
- SAEnum: use `Column(SAEnum(FeedbackTheme, name="feedbacktheme"), nullable=False)` and `Column(SAEnum(FeedbackStatus, name="feedbackstatus"), nullable=False, default="open")`

**Frontend scope (Slice 1):** None — no frontend work in this slice. Frontend foundation (types + api client) is built in Slice 2.

**Contract endpoints covered:** All five: GET /feedback/, POST /feedback/, GET /feedback/{id}, PATCH /feedback/{id}, DELETE /feedback/{id}

---

### Slice 2: Feedback List Page

**What this delivers:** The `/feedback` route is visible and functional. Managers can see all feedback items in a table, filter by client name / theme / status, and navigate to create a new item (link renders, target page comes in Slice 3).

**Backend scope (Slice 2):** None — all backend work done in Slice 1.

**Frontend scope:**

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `frontend/src/types/index.ts` | Add FeedbackTheme, FeedbackStatus, FeedbackItem, FeedbackItemCreate, FeedbackItemUpdate types | Shared Types above |
| `frontend/src/lib/api.ts` | Add listFeedback, getFeedback, createFeedback, updateFeedback, deleteFeedback | All five endpoints |
| `frontend/src/components/feedback/FilterBar.tsx` | Filter controls — client name text input, theme select, status select, clear link | ui-spec.md § FilterBar |
| `frontend/src/components/feedback/FeedbackTable.tsx` | Table with columns Client, Summary, Theme, Status, Date Logged, Actions. Empty states. | ui-spec.md § FeedbackTable |
| `frontend/src/components/feedback/FeedbackListClient.tsx` | Client wrapper — holds filter state, passes filtered items to FeedbackTable | (architectural glue — see Decisions) |
| `frontend/src/app/feedback/page.tsx` | FeedbackListPage — server component, fetches all items, passes to FeedbackListClient | ui-spec.md § /feedback |
| `frontend/src/app/page.tsx` | Root redirect from `/` → `/feedback` | ui-spec.md § Routes |

**lib/api.ts function signatures (add to existing file):**
```
listFeedback()             → GET /feedback/       → Promise<FeedbackItem[]>
getFeedback(id: string)    → GET /feedback/{id}   → Promise<FeedbackItem>
createFeedback(body)       → POST /feedback/      → Promise<FeedbackItem>
updateFeedback(id, body)   → PATCH /feedback/{id} → Promise<FeedbackItem>
deleteFeedback(id: string) → DELETE /feedback/{id}→ Promise<void>
  // deleteFeedback: use res.ok check; 204 has no body, do not call res.json()
```

**FilterBar component behaviour:**
- Receives: `filters: FilterState`, `onFilterChange: (filters: FilterState) => void`
- FilterState shape: `{ clientName: string; theme: FeedbackTheme | ''; status: FeedbackStatus | '' }`
- Client name input: controlled text input, calls onFilterChange on every keystroke (no debounce needed — client-side filter)
- Theme select: options = ["All", "UX", "Performance", "Support", "Pricing", "Communication"]; empty string value = "All"
- Status select: options = ["All", "open", "in_progress", "actioned"]; empty string value = "All"
- Clear filters link: calls `onFilterChange({ clientName: '', theme: '', status: '' })`
- All three controls are side by side (flex row)

**FeedbackTable component behaviour:**
- Receives: `items: FeedbackItem[]` (pre-filtered by FeedbackListClient)
- Renders a `<table>` with columns: Client, Summary, Theme, Status, Date Logged, Actions
- Date Logged: format `created_at` as locale date string (e.g. "Mar 11, 2026")
- Actions column: "Edit" link → `/feedback/[id]` using Next.js `<Link>`
- Empty state (items.length === 0, no active filters): render message "No feedback logged yet." with a link "Log your first item →" pointing to `/feedback/new`
- Filtered empty state (items.length === 0, at least one filter active): render message "No items match your filters." — FeedbackListClient determines which empty state to show and passes a prop `hasActiveFilters: boolean`

**FeedbackListClient component behaviour:**
- "use client" directive required (manages useState for filters)
- Receives: `items: FeedbackItem[]` (all items, fetched server-side)
- Holds local state: `filters: FilterState`
- Derives `filteredItems` by applying all three filters to `items`:
  - clientName filter: case-insensitive partial match on `item.client_name`
  - theme filter: exact match on `item.theme` (skip if empty string)
  - status filter: exact match on `item.status` (skip if empty string)
- Renders: `<FilterBar>` + `<FeedbackTable>` + "Log Feedback" button (link to `/feedback/new`)
- `hasActiveFilters` = at least one filter field is non-empty string

**FeedbackListPage (server component) behaviour:**
- `async` function — calls `await listFeedback()` at render time
- Passes `items` to `<FeedbackListClient items={items} />`
- No client-side state or interactivity — pure data-fetch wrapper

**Root redirect (`frontend/src/app/page.tsx`):**
- Use Next.js `redirect('/feedback')` from `next/navigation` in a server component

**Frontend component tree (Slice 2):**
```
/feedback — FeedbackListPage (server — awaits listFeedback())
  └── FeedbackListClient (client — holds filter state)
        ├── FilterBar (client — controlled inputs, calls onFilterChange)
        └── FeedbackTable (client/presentational — receives pre-filtered items)

/ — page.tsx (server — redirect('/feedback'))
```

**Contract endpoints covered:** GET /feedback/

---

### Slice 3: Create Feedback Form

**What this delivers:** Managers can navigate to `/feedback/new`, fill in the form, submit it, and be redirected back to the list. The form validates required fields before submission.

**Backend scope (Slice 3):** None — POST /feedback/ already built in Slice 1.

**Frontend scope:**

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `frontend/src/components/feedback/FeedbackForm.tsx` | Shared form component — create mode and edit mode | ui-spec.md § FeedbackForm |
| `frontend/src/app/feedback/new/page.tsx` | NewFeedbackPage — page title "Log Feedback", contains FeedbackForm in create mode, cancel link | ui-spec.md § /feedback/new |

**FeedbackForm component behaviour:**
- "use client" directive required (uses useState, handles form submission)
- Props:
  - `mode: 'create' | 'edit'`
  - `initialData?: FeedbackItem` — required in edit mode, optional in create mode
- Fields:
  - `client_name`: `<input type="text">`, required. Label: "Client Name"
  - `summary`: `<input type="text">`, required. Label: "Summary"
  - `detail`: `<textarea>`, optional. Label: "Detail"
  - `theme`: `<select>`, required. Options: UX, Performance, Support, Pricing, Communication. Label: "Theme"
  - `status`: `<select>`, required. Options: open, in_progress, actioned. Default value: "open". Label: "Status"
- Submit button label:
  - create mode: "Save Feedback"
  - edit mode: "Save Changes"
- Local state: `loading: boolean`, `errors: Record<string, string>`
- Client-side validation (on submit, before API call):
  - `client_name` empty → `errors.client_name = "Client name is required"`
  - `summary` empty → `errors.summary = "Summary is required"`
  - Display each error inline below its field (red text)
  - If any errors, abort submission
- On successful submit:
  - create mode: call `createFeedback(body)`, then `router.push('/feedback')`
  - edit mode: call `updateFeedback(id, body)`, then `router.push('/feedback')`
  - Use `useRouter` from `next/navigation`
- On API error: display error message above the form (`errors.form`)
- While loading: disable submit button, show "Saving…" label

**NewFeedbackPage behaviour:**
- Server component (no interactivity needed at page level)
- Renders page heading "Log Feedback"
- Renders `<FeedbackForm mode="create" />`
- Renders cancel link: "Cancel" → `/feedback` (plain `<Link>`)

**Frontend component tree (Slice 3):**
```
/feedback/new — NewFeedbackPage (server — no data fetch)
  └── FeedbackForm (client — 'create' mode, calls createFeedback on submit)
```

**Contract endpoints covered:** POST /feedback/

---

### Slice 4: Edit and Delete

**What this delivers:** Managers can click "Edit" on any row, see the form pre-populated with existing data, save changes or delete the item. This completes the full feature.

**Backend scope (Slice 4):** None — GET /feedback/{id}, PATCH /feedback/{id}, DELETE /feedback/{id} all built in Slice 1.

**Frontend scope:**

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `frontend/src/app/feedback/[id]/page.tsx` | FeedbackDetailPage — fetches item by id, edit form, delete button | ui-spec.md § /feedback/[id] |

**FeedbackDetailPage behaviour:**
- `async` server component — receives `params: { id: string }` from Next.js app router
- Calls `await getFeedback(params.id)` at render time
- If `getFeedback` throws (404 from API), render a "Feedback item not found." message with a link back to `/feedback`
- Renders page heading "Edit Feedback"
- Renders `<FeedbackForm mode="edit" initialData={item} />`
- Renders cancel link: "Cancel" → `/feedback`
- Renders delete button below the form:
  - Label: "Delete"
  - Style: secondary/destructive (e.g. Tailwind `text-destructive border border-destructive`)
  - The delete button is a client component — needs onClick. Use a small `DeleteButton` sub-component marked "use client"
  - `DeleteButton` behaviour:
    - On click: call `window.confirm("Delete this feedback item? This cannot be undone.")`
    - If confirmed: call `deleteFeedback(id)`, then `router.push('/feedback')`
    - While loading: show "Deleting…", disable button
    - On error: show error message near the button

**DeleteButton sub-component:**
- File: inline in `frontend/src/app/feedback/[id]/page.tsx` OR extracted to `frontend/src/components/feedback/DeleteButton.tsx`
- Decision: extract to `frontend/src/components/feedback/DeleteButton.tsx` for cleanliness (see Decisions)
- Props: `id: string`

**Frontend component tree (Slice 4):**
```
/feedback/[id] — FeedbackDetailPage (server — awaits getFeedback(params.id))
  ├── FeedbackForm (client — 'edit' mode, pre-populated, calls updateFeedback on submit)
  └── DeleteButton (client — confirm dialog, calls deleteFeedback, redirects)
```

**Contract endpoints covered:** GET /feedback/{id}, PATCH /feedback/{id}, DELETE /feedback/{id}

---

## Slice Dependency Order

1. **Slice 1 — Backend Foundation** (no dependencies — must be built first)
   - Provides: all five API endpoints, migration, project scaffold
2. **Slice 2 — Feedback List Page** (depends on Slice 1 — uses GET /feedback/)
   - Provides: types, api client, list page with filtering, root redirect
3. **Slice 3 — Create Feedback Form** (depends on Slice 2 — FeedbackForm component is introduced here and reused in Slice 4)
   - Provides: FeedbackForm component (create mode), NewFeedbackPage
4. **Slice 4 — Edit and Delete** (depends on Slice 3 — reuses FeedbackForm in edit mode)
   - Provides: FeedbackDetailPage, DeleteButton, FeedbackForm edit mode

---

## Decisions Made

1. **No service layer for CRUD**
   Why: All five operations are straightforward database reads/writes with no business logic — no scoring, no side effects, no derived state. The `api-patterns.md` examples show direct DB access in routers for exactly this pattern. A service layer would add a file with no real logic, making the codebase harder to read for no gain.
   Alternative rejected: A `FeedbackItemService` class wrapping all DB operations. Rejected because it adds indirection with zero benefit for pure CRUD.

2. **UUID primary key (Python-side generation)**
   Why: The contract specifies `id: uuid`. Python-side generation (`default=uuid.uuid4`) is more testable — fixtures can supply deterministic UUIDs without database sequences. Also avoids dialect-specific `gen_random_uuid()` / `uuid_generate_v4()` differences.
   Alternative rejected: Database-side UUID generation (PostgreSQL `gen_random_uuid()`). Rejected because it requires `server_default` which is harder to supply in tests.

3. **FeedbackListClient as a client-side wrapper for filter state**
   Why: Next.js 15 requires `"use client"` for any component using `useState`. FeedbackListPage is a server component (fetches data). FilterBar and FeedbackTable need shared filter state. The cleanest architecture is: server component fetches, passes raw items to a client wrapper that owns filter state and renders the interactive UI below it. This avoids turning the entire page into a client component.
   Alternative rejected: Making FeedbackListPage a client component that fetches via `useEffect`. Rejected because it loses server-side rendering, increases client bundle size, and requires loading state handling that the server component approach avoids.

4. **Client-side filtering (no query params, no server round trips)**
   Why: The ui-spec explicitly states "Filters on /feedback are client-side — no round trip needed if all items loaded." and "No pagination — all items loaded on page mount."
   Alternative rejected: Server-side filtering via query params (e.g. `GET /feedback/?theme=UX`). Rejected because the PM explicitly ruled this out. Would also require adding query param support to the contract.

5. **Single FeedbackForm component with `mode` prop**
   Why: Create and edit forms are identical in field structure. A single component with a `mode: 'create' | 'edit'` prop avoids duplicating field definitions, validation logic, and styling. The only differences (submit button label, API call, presence of `initialData`) are small and handled via conditionals.
   Alternative rejected: Two separate components `CreateFeedbackForm` and `EditFeedbackForm`. Rejected because they would duplicate ~90% of their code and create a maintenance burden when fields change.

6. **DeleteButton as a separate extracted component**
   Why: FeedbackDetailPage is a server component. The delete action requires `onClick`, `useRouter`, and `useState` — all client-side. Extracting `DeleteButton` to its own "use client" file keeps the page server-rendered while isolating the client boundary to just the button. This is the standard Next.js 15 island pattern.
   Alternative rejected: Making the entire FeedbackDetailPage a client component. Rejected because it loses server rendering for the data fetch.

7. **`detail` field: always present in response, nullable**
   Why: The contract notes say "detail is nullable — omitted from response only if null, never omitted entirely." The `FeedbackItemRead` schema must always include `detail` in the response (as `null` when unset). The frontend `FeedbackItem` interface uses `detail: string | null` to match.
   Alternative rejected: Omitting `detail` from the response when null (using `Optional[str]` without `None` default in Read schema). Rejected because the contract is explicit that the field is always present.

8. **Project scaffold: backend agent scaffolds first**
   Why: No backend or frontend directories exist. The backend agent (Slice 1) must create the entire FastAPI project structure, alembic setup, and pyproject.toml before the frontend agent begins. Frontend agent (Slice 2+) creates the entire Next.js project structure.
   Alternative rejected: Running backend and frontend setup in parallel. Rejected because the frontend agent needs to verify the backend is accessible before building API client functions, and the dependency order is clear.

---

## Testability Notes

- **No service layer = router-level integration tests are the primary test surface.** All test coverage maps directly to HTTP endpoints. This is by design — there is no hidden business logic to unit test separately.
- **UUID PK and test fixtures:** Because UUIDs are Python-generated, test fixtures can supply deterministic UUIDs (e.g. `"12345678-1234-5678-1234-567812345678"`) for predictable assertions.
- **SQLite test DB compatibility:** The test database uses SQLite (per `data-patterns.md` conftest pattern). SQLAlchemy `UUID` column type from `sqlalchemy.dialects.postgresql` is not natively supported by SQLite. Use `String(36)` for the UUID column type in a way that works across both dialects, OR use SQLAlchemy's `TypeDecorator` pattern to store as string in SQLite and native UUID in PostgreSQL. **Decision: use `sqlalchemy.dialects.postgresql.UUID(as_uuid=True)` for the column, and in conftest use `create_engine("sqlite://...")` — SQLAlchemy will handle this via string coercion. The tester agent must verify this works; if not, use a `TypeDecorator`.** Default: proceed with PostgreSQL UUID type; if SQLite test failures occur, switch to `String(36)`.
- **SAEnum in SQLite:** SQLAlchemy SAEnum stores as string in SQLite (no native ENUM type). This is handled automatically. No special treatment needed.
- **PATCH partial update:** The `exclude_unset=True` behaviour is the core of partial updates. Tests must explicitly verify: sending only `status` updates only `status` and leaves other fields unchanged.
- **updated_at tracking:** Tests must verify that after a PATCH, `updated_at` is newer than or equal to `created_at`. Use a time comparison (not exact equality).
- **Default status:** Tests must send a POST with no `status` field and assert the response contains `"status": "open"`.

---

## Open Questions ⚠️

1. **Database URL for development**
   The `config.py` Settings class needs a default `database_url`. What is the development database?
   Default if not answered: `postgresql://postgres:postgres@localhost:5432/feedback_tracker`

2. **SQLite vs PostgreSQL for local dev**
   Should local development use SQLite (simpler, no Docker needed) or PostgreSQL (matches production)?
   Default if not answered: PostgreSQL (matches the `api-patterns.md` default). Developers must run PostgreSQL locally or via Docker.

3. **CORS allowed origins**
   The `main.py` CORS middleware needs `allow_origins`. Should it allow all origins in development?
   Default if not answered: `["http://localhost:3000"]` in development, configurable via env var for production.

4. **Next.js project initialisation**
   Should the frontend agent run `npx create-next-app` or scaffold manually from the patterns in `frontend-patterns.md`?
   Default if not answered: Scaffold manually from patterns. Do not run `create-next-app` as it may introduce unexpected defaults or prompt for input.

5. **shadcn/ui component availability**
   The `frontend-patterns.md` references `shadcn/ui` primitives (Button, Card, Badge, Select). Are these already installed, or does the frontend agent install them?
   Default if not answered: Frontend agent installs shadcn/ui via `npx shadcn@latest init` and adds the required components (`button`, `badge`, `select`, `input`, `label`, `textarea`) before building feature components.
```
