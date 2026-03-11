# Implementation Plan: Feedback CRUD
Status: PENDING_APPROVAL
Contract: api-contract.yaml (APPROVED)
UI Spec: design/ui-spec.md (PM APPROVED)
Created: 2026-03-11

---

## Data Model

### New tables

| Table | Column | Type | Constraints | Notes |
|-------|--------|------|-------------|-------|
| feedback_items | id | UUID | PK, not null | Generated server-side via `uuid.uuid4()` as default |
| feedback_items | client_name | VARCHAR(255) | NOT NULL | Free text — no FK to a clients table |
| feedback_items | summary | VARCHAR(255) | NOT NULL | Single-line short description |
| feedback_items | detail | TEXT | NULLABLE | Optional longer description; null if not provided |
| feedback_items | theme | SAEnum(FeedbackTheme) | NOT NULL | Enforced by DB enum — see FeedbackTheme below |
| feedback_items | status | SAEnum(FeedbackStatus) | NOT NULL, default='open' | Server sets to 'open' on create |
| feedback_items | created_at | TIMESTAMPTZ | NOT NULL, server_default=func.now() | Set once at insert, never updated |
| feedback_items | updated_at | TIMESTAMPTZ | NOT NULL, server_default=func.now(), onupdate=func.now() | Auto-updated on every PATCH |

### New migrations

Generate via:
```
cd backend
alembic revision --autogenerate -m "create_feedback_items_table"
alembic upgrade head
```

File path (hash assigned by alembic):
`backend/alembic/versions/[hash]_create_feedback_items_table.py`

The `alembic/env.py` must import `app.models.feedback_item` (noqa: F401) so autogenerate sees the new model.

### Existing tables modified

None. This feature adds a single new standalone table with no foreign keys.

---

## Shared Types

These exact types must be used by both agents. Both copy verbatim. No interpretation.

### Backend — Pydantic schemas (`backend/app/schemas/feedback_item.py`)

```
import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional


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
    client_name: str                  # required, min length enforced by validator
    summary: str                      # required, min length enforced by validator
    detail: Optional[str] = None      # optional
    theme: FeedbackTheme              # required

    @field_validator("client_name", "summary")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v


class FeedbackItemUpdate(BaseModel):
    client_name: Optional[str] = None
    summary: Optional[str] = None
    detail: Optional[str] = None
    theme: Optional[FeedbackTheme] = None
    status: Optional[FeedbackStatus] = None

    @model_validator(mode="after")
    def check_non_nullable_fields(self) -> "FeedbackItemUpdate":
        # PATCH semantics: field not sent = fine (excluded by exclude_unset).
        # Field sent as null = 422 for client_name and summary (they cannot be unset).
        if "client_name" in self.model_fields_set and self.client_name is None:
            raise ValueError("client_name cannot be set to null")
        if "summary" in self.model_fields_set and self.summary is None:
            raise ValueError("summary cannot be set to null")
        return self


class FeedbackItemRead(BaseModel):
    id: uuid.UUID
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

```
// Enums — union types to match contract string values exactly
export type FeedbackTheme =
  | "ux"
  | "performance"
  | "support"
  | "pricing"
  | "communication"

export type FeedbackStatus = "open" | "in_progress" | "actioned"

// Read — matches FeedbackItemRead Pydantic schema field-for-field
export interface FeedbackItemRead {
  id: string              // UUID serialised as string by FastAPI
  client_name: string
  summary: string
  detail: string | null
  theme: FeedbackTheme
  status: FeedbackStatus
  created_at: string      // ISO 8601 datetime string
  updated_at: string      // ISO 8601 datetime string
}

// Create — matches FeedbackItemCreate Pydantic schema
export interface FeedbackItemCreate {
  client_name: string
  summary: string
  detail: string | null
  theme: FeedbackTheme
  // status is NOT included — server always sets to "open"
}

// Update — matches FeedbackItemUpdate Pydantic schema (all optional)
export interface FeedbackItemUpdate {
  client_name?: string
  summary?: string
  detail?: string | null
  theme?: FeedbackTheme
  status?: FeedbackStatus
}

// Display helpers — label maps for rendering enum values
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

## Backend: Files to Create

| File | Purpose |
|------|---------|
| `backend/app/models/feedback_item.py` | SQLAlchemy ORM model for feedback_items table |
| `backend/app/schemas/feedback_item.py` | Pydantic schemas — exact text from Shared Types above |
| `backend/app/routers/feedback_items.py` | FastAPI router — five endpoints per contract |
| `backend/app/main.py` | Update: include feedback_items router, update app title |
| `backend/alembic/versions/[hash]_create_feedback_items_table.py` | Generated migration — do NOT hand-write |
| `backend/alembic/env.py` | Update: add import of `app.models.feedback_item` |

---

## Backend: Model Spec (`backend/app/models/feedback_item.py`)

```
SQLAlchemy model class: FeedbackItem
  __tablename__ = "feedback_items"

  Imports required:
    - Column, String, Text, DateTime, Enum as SAEnum from sqlalchemy
    - func from sqlalchemy.sql
    - Uuid from sqlalchemy.types   ← database-agnostic UUID (works with SQLite in tests)
    - uuid from Python stdlib
    - Base from app.database
    - FeedbackTheme, FeedbackStatus from app.schemas.feedback_item

  Columns:
    id          = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_name = Column(String(255), nullable=False)
    summary     = Column(String(255), nullable=False)
    detail      = Column(Text, nullable=True)
    theme       = Column(SAEnum(FeedbackTheme), nullable=False)
    status      = Column(SAEnum(FeedbackStatus), nullable=False, default=FeedbackStatus.open)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(),
                         onupdate=func.now(), nullable=False)
```

---

## Backend: Service Logic

No separate service layer for this feature. This is pure CRUD with no business logic beyond validation. All logic lives in the router. This is intentional — see Decision #3.

### Router: `backend/app/routers/feedback_items.py`

```
prefix = "/feedback"
tags = ["feedback"]

ENDPOINT: GET /
  Input:  none
  Output: list[FeedbackItemRead]
  Logic:
    1. Query all FeedbackItem rows
    2. Order by created_at DESC (newest first)
    3. Return list — FastAPI serialises via response_model

ENDPOINT: POST /
  Input:  body: FeedbackItemCreate
  Output: FeedbackItemRead (HTTP 201)
  Logic:
    1. Build FeedbackItem from body.model_dump()
    2. Do NOT set status from body — status is always FeedbackStatus.open (model default)
    3. db.add(item), db.commit(), db.refresh(item)
    4. Return item

ENDPOINT: GET /{feedback_id}
  Input:  path param feedback_id: uuid.UUID
  Output: FeedbackItemRead
  Logic:
    1. Query FeedbackItem by id
    2. If not found: raise HTTPException 404, detail="Feedback item not found"
    3. Return item

ENDPOINT: PATCH /{feedback_id}
  Input:  path param feedback_id: uuid.UUID, body: FeedbackItemUpdate
  Output: FeedbackItemRead
  Logic:
    1. Query FeedbackItem by id
    2. If not found: raise HTTPException 404, detail="Feedback item not found"
    3. For each key, value in body.model_dump(exclude_unset=True).items():
         setattr(item, key, value)
    4. db.commit(), db.refresh(item)
    5. Return item
  Notes:
    - exclude_unset=True ensures only explicitly sent fields are updated
    - Null validation for client_name/summary is enforced by Pydantic before this runs

ENDPOINT: DELETE /{feedback_id}
  Input:  path param feedback_id: uuid.UUID
  Output: HTTP 204 No Content
  Logic:
    1. Query FeedbackItem by id
    2. If not found: raise HTTPException 404, detail="Feedback item not found"
    3. db.delete(item), db.commit()
    4. Return (no body — FastAPI sends 204 automatically)
```

### `backend/app/main.py` update

```
Add import: from app.routers import feedback_items
Add line:   app.include_router(feedback_items.router)
Update:     app title to "Client Feedback Tracker API"
```

### `backend/alembic/env.py` update

```
Add import: from app.models import feedback_item  # noqa: F401
```

---

## Frontend: Files to Create

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `frontend/src/types/index.ts` | TypeScript types — exact text from Shared Types above | api-contract.yaml schemas |
| `frontend/src/lib/api.ts` | Five typed API functions for feedback CRUD | api-contract.yaml endpoints |
| `frontend/src/app/page.tsx` | Root redirect → /feedback | ui-spec.md § Pages and Routes |
| `frontend/src/app/feedback/page.tsx` | FeedbackListPage — server component, fetches all items | ui-spec.md § /feedback — Feedback List Page |
| `frontend/src/app/feedback/new/page.tsx` | NewFeedbackPage — server shell, renders FeedbackForm (create) | ui-spec.md § /feedback/new — New Feedback Form |
| `frontend/src/app/feedback/[id]/page.tsx` | FeedbackDetailPage — server component, fetches item by id | ui-spec.md § /feedback/[id] — Feedback Detail / Edit |
| `frontend/src/components/feedback/FeedbackListClient.tsx` | Client wrapper owning filter state | ui-spec.md § FilterBar + FeedbackTable |
| `frontend/src/components/feedback/FilterBar.tsx` | Three filter controls — client component | ui-spec.md § FilterBar |
| `frontend/src/components/feedback/FeedbackTable.tsx` | Table of feedback items — client component | ui-spec.md § FeedbackTable |
| `frontend/src/components/feedback/FeedbackForm.tsx` | Shared create/edit form — client component | ui-spec.md § FeedbackForm (both modes) |
| `frontend/src/components/feedback/DeleteFeedbackButton.tsx` | Confirm + delete action — client component | ui-spec.md § FeedbackDetailPage delete button |

---

## Frontend: API Functions (`frontend/src/lib/api.ts`)

Use the `request<T>` helper pattern from frontend-patterns.md. Base URL from `NEXT_PUBLIC_API_URL`.

```
getFeedbackItems(): Promise<FeedbackItemRead[]>
  → GET /feedback/
  → Returns array sorted newest-first (server sorts)

getFeedbackItem(id: string): Promise<FeedbackItemRead>
  → GET /feedback/{id}
  → Throws Error on 404 (propagates to page error boundary)

createFeedbackItem(body: FeedbackItemCreate): Promise<FeedbackItemRead>
  → POST /feedback/
  → body: JSON.stringify(body)
  → Returns created item (201)

updateFeedbackItem(id: string, body: FeedbackItemUpdate): Promise<FeedbackItemRead>
  → PATCH /feedback/{id}
  → body: JSON.stringify(body)
  → Only send fields that are present in body object

deleteFeedbackItem(id: string): Promise<void>
  → DELETE /feedback/{id}
  → Returns void (204 — no body to parse)
  → request helper must handle 204 without calling res.json()
```

**Special note for deleteFeedbackItem**: The generic `request<T>` helper calls `res.json()`. For DELETE (204 No Content), there is no body. The helper must check `res.status === 204` and return early without parsing JSON. Backend agent must coordinate this detail — see Decision #4.

---

## Frontend: Component Tree

```
RootPage — src/app/page.tsx
  server component — immediate redirect to /feedback, no render

FeedbackListPage — src/app/feedback/page.tsx
  server component
  ∟ calls: getFeedbackItems() on page load
  ∟ renders: "Log Feedback" button (link to /feedback/new)
  ∟ renders: FeedbackListClient (passes full items array as prop)

  FeedbackListClient — src/components/feedback/FeedbackListClient.tsx
    client component — owns all filter state
    ∟ state: clientFilter (string), themeFilter (FeedbackTheme | ""), statusFilter (FeedbackStatus | "")
    ∟ computes: filteredItems from items prop + current filter state
    ∟ renders: FilterBar (passes filter state + setters as props)
    ∟ renders: FeedbackTable (passes filteredItems as prop)

    FilterBar — src/components/feedback/FilterBar.tsx
      client component — receives filter values and onChange callbacks as props
      ∟ renders: client name text input — onChange fires immediately
      ∟ renders: theme select (options: "All" + FeedbackTheme values with THEME_LABELS)
      ∟ renders: status select (options: "All" + FeedbackStatus values with STATUS_LABELS)
      ∟ renders: "Clear filters" link — calls all three setters with empty/reset values
      ∟ NO internal state — all state owned by FeedbackListClient

    FeedbackTable — src/components/feedback/FeedbackTable.tsx
      client component — receives filteredItems: FeedbackItemRead[] as prop
      ∟ columns: Client | Summary | Theme | Status | Date Logged | Actions
      ∟ Theme cell: displays THEME_LABELS[item.theme]
      ∟ Status cell: displays STATUS_LABELS[item.status]
      ∟ Date cell: format created_at as localised date string
      ∟ Actions cell: "Edit" link → /feedback/[item.id]
      ∟ empty state (items.length === 0 overall): message + link to /feedback/new
      ∟ filtered empty state (filteredItems.length === 0 but items.length > 0):
          "No items match your filters."

NewFeedbackPage — src/app/feedback/new/page.tsx
  server component — shell only, no data fetch
  ∟ page title: "Log Feedback"
  ∟ renders: Cancel link → /feedback
  ∟ renders: FeedbackForm mode="create"

  FeedbackForm (create mode) — src/components/feedback/FeedbackForm.tsx
    client component — "use client"
    ∟ props: mode="create" (no initialData)
    ∟ state: field values (client_name, summary, detail, theme)
    ∟ state: loading (boolean), error (string | null), fieldErrors ({})
    ∟ status field: NOT rendered in create mode (server forces "open")
    ∟ theme field: required select, no default selected (force user to pick)
    ∟ validation: inline — client_name and summary show error if empty on submit
    ∟ on submit: calls createFeedbackItem(body)
    ∟ on success: router.push("/feedback")
    ∟ submit button text: "Save Feedback"
    ∟ calls: createFeedbackItem from lib/api

FeedbackDetailPage — src/app/feedback/[id]/page.tsx
  server component
  ∟ receives: params.id (string)
  ∟ calls: getFeedbackItem(params.id) on page load
  ∟ if 404: renders Next.js notFound() → shows 404 page
  ∟ page title: "Edit Feedback"
  ∟ renders: Cancel link → /feedback
  ∟ renders: FeedbackForm mode="edit" initialData={item}
  ∟ renders: DeleteFeedbackButton id={item.id}

  FeedbackForm (edit mode) — src/components/feedback/FeedbackForm.tsx
    client component — same component, different mode prop
    ∟ props: mode="edit", initialData: FeedbackItemRead
    ∟ state: field values pre-populated from initialData
    ∟ status field: IS rendered in edit mode (allows actioning)
    ∟ validation: same inline rules as create mode
    ∟ on submit: calls updateFeedbackItem(initialData.id, body)
    ∟ on success: router.push("/feedback")
    ∟ submit button text: "Save Changes"
    ∟ calls: updateFeedbackItem from lib/api

  DeleteFeedbackButton — src/components/feedback/DeleteFeedbackButton.tsx
    client component — "use client"
    ∟ props: id (string)
    ∟ on click: window.confirm("Delete this feedback item?")
    ∟ if confirmed: calls deleteFeedbackItem(id) → router.push("/feedback")
    ∟ state: loading (boolean) — disables button during request
    ∟ style: destructive/secondary button styling
    ∟ calls: deleteFeedbackItem from lib/api
```

---

## Decisions Made

1. **No service layer — router handles all CRUD directly**
   Why: This feature has zero business logic. Every endpoint is a straight DB read/write. Adding a service layer would be indirection without value — the router IS the right abstraction boundary for pure CRUD.
   Alternative rejected: `backend/app/services/feedback_item.py` with functions like `get_all()`, `create()`. Rejected because it adds a file and function call chain with no testability benefit — the router test hits the DB directly in tests anyway.

2. **UUID primary key using `sqlalchemy.types.Uuid` (database-agnostic)**
   Why: The contract specifies `id: uuid`. Using `sqlalchemy.types.Uuid(as_uuid=True)` (SQLAlchemy 2.0+) works with both PostgreSQL (native UUID type) and SQLite (stored as CHAR(32)), allowing the test suite to use SQLite in-memory without special handling.
   Alternative rejected: `sqlalchemy.dialects.postgresql.UUID` — PostgreSQL-only, breaks SQLite test DB. Also rejected: `String(36)` — loses type semantics and validation.

3. **`FeedbackItemUpdate` null-rejection via `@model_validator(mode="after")` with `model_fields_set`**
   Why: PATCH semantics require distinguishing "field not sent" (OK) from "field sent as null" (error for client_name and summary). Pydantic v2's `model_fields_set` tracks which fields were explicitly set. A `model_validator` that checks `"client_name" in self.model_fields_set and self.client_name is None` is the idiomatic v2 approach.
   Alternative rejected: Making `client_name: str` non-optional — this breaks PATCH semantics entirely since the field would be required.
   Alternative rejected: `@field_validator` with `mode="before"` — cannot distinguish "not sent" from "sent as null" at field level without accessing model_fields_set.

4. **`deleteFeedbackItem` returns `Promise<void>` with special 204 handling**
   Why: HTTP 204 has no response body. The shared `request<T>` helper must check for 204 and skip `res.json()`. Both agents must coordinate: backend returns 204 (no body), frontend skips JSON parse.
   Alternative rejected: Having the backend return 200 with `{}` — violates the contract which specifies 204.

5. **`FeedbackListClient` wrapper component owns filter state**
   Why: `FeedbackListPage` is a server component (data fetch). `FilterBar` and `FeedbackTable` must share filter state. The cleanest pattern is a client wrapper (`FeedbackListClient`) that receives the full items array from the server component and owns all filter state, passing down filtered items to `FeedbackTable` and filter controls to `FilterBar`. This preserves server-component data fetching while enabling client-side interactivity.
   Alternative rejected: Making `FeedbackListPage` a client component — loses server-side data fetch, adds unnecessary loading state complexity.
   Alternative rejected: `FilterBar` owning state and passing filtered items up — children cannot set parent state; this is the wrong direction.

6. **`FeedbackForm` single component with `mode` prop**
   Why: Create and edit forms are identical in field set (except status is hidden on create). A single component with `mode: "create" | "edit"` and optional `initialData` prop avoids duplicating form logic, validation, and styling.
   Alternative rejected: Two separate components (`CreateFeedbackForm`, `EditFeedbackForm`) — significant duplication of identical validation and field rendering code.

7. **`DeleteFeedbackButton` extracted as separate client component**
   Why: `FeedbackDetailPage` is a server component. The delete action requires `onClick`, `window.confirm`, and API call — all client-only. Extracting it as `DeleteFeedbackButton` lets the page remain a server component while composing in the interactive action cleanly.
   Alternative rejected: Making `FeedbackDetailPage` a client component — forces the entire page (including data fetch) into client territory unnecessarily.

8. **Client-side filtering — no server-side filter params**
   Why: The contract specifies `GET /feedback/` always returns the full list (filtering is client-side per ui-spec.md). This simplifies the backend and is appropriate for the expected data volume (no pagination requirement, all items loaded at once).
   Alternative rejected: Query params `?theme=&status=&client_name=` on `GET /feedback/`. Not in the approved contract — would require a contract amendment.

9. **Status field hidden in FeedbackForm create mode**
   Why: The contract explicitly states "Status is NOT accepted on create — always set to 'open' by the server." The ui-spec shows status as a visible dropdown on the form page (defaulted to `open`), but showing it in create mode and having the server ignore it creates confusion. Hiding it entirely in create mode is cleaner.
   Alternative rejected: Show status in create mode but strip it before the API call — confusing UX and inconsistent with contract semantics.

---

## Testability Notes

1. **Router is trivially testable in isolation.** No service layer, no external calls, no side effects beyond DB. SQLite in-memory with the `conftest.py` pattern (from data-patterns.md) is sufficient. The `setup_db` fixture creates and drops tables per test, ensuring clean state. UUID primary key works with SQLite via `Uuid(as_uuid=True)`.

2. **`FeedbackItemUpdate` null validator is tested at HTTP layer.** The Pydantic model_validator fires before the router handler runs. Sending `{"client_name": null}` via the test client will produce a 422 response with FastAPI's standard error body. No separate unit test of the validator is needed — the HTTP integration test covers it.

3. **`FilterBar` is fully testable with static fixture data.** It does no API calls — all filtering is in-memory JavaScript. Tests pass a `FeedbackItemRead[]` array as the items prop and assert that `filteredItems` (passed to `FeedbackTable`) matches expectations. No mocking required.

4. **`FeedbackForm` submit paths are testable by mocking `lib/api.ts`.** The form calls `createFeedbackItem` or `updateFeedbackItem` — these can be mocked in Vitest tests. Verify: correct function called, correct body sent, redirect on success, error display on failure.

5. **`DeleteFeedbackButton` confirm dialog requires `window.confirm` mock in tests.** Set `window.confirm = () => true` / `() => false` to test both paths.

6. **`FeedbackDetailPage` 404 path: test that `notFound()` is called when `getFeedbackItem` throws.** Mock `lib/api` to throw, assert Next.js `notFound` is invoked.

---

## Open Questions ⚠️

1. **App-level layout: is there a shared navigation header?**
   The ui-spec does not describe a `layout.tsx` with a nav bar or header. All pages have their own title text and Cancel links.
   Default if not answered: No shared nav. `frontend/src/app/layout.tsx` contains only `<html><body>{children}</body>` with basic Tailwind reset. No navigation component is created.

2. **Date format for "Date Logged" column in FeedbackTable**
   The ui-spec says "Date Logged" as a column but does not specify a format (e.g., `Mar 11, 2026` vs `2026-03-11` vs relative `2 days ago`).
   Default if not answered: Use `new Date(item.created_at).toLocaleDateString()` — browser locale default, no external date library needed.

3. **Error handling for `getFeedbackItem` in `FeedbackDetailPage` when server is unreachable (non-404 error)**
   The contract specifies 404 for missing items. For network errors or 500s, `getFeedbackItem` will throw a generic Error.
   Default if not answered: Allow the error to propagate — Next.js will show its default error boundary. No custom error.tsx is created for this feature.

4. **Existing `frontend/src/types/index.ts` and `frontend/src/lib/api.ts` — do they already exist with other content?**
   Based on filesystem inspection, neither file exists yet (greenfield project).
   Default if not answered: Create both files from scratch containing only the types and functions defined in this plan. No existing content to preserve.

5. **Theme select in FeedbackForm — should it have a placeholder "Select a theme" as the default empty option?**
   The ui-spec says "Theme: select dropdown (required)" but does not specify whether the initial state shows a placeholder or the first enum value.
   Default if not answered: Render a disabled placeholder option `"Select a theme"` as the first `<option>`, value `""`. Form validation rejects empty string as missing required field.
