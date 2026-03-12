# Implementation Plan: Client Feedback CRUD with Filtering
Status: PENDING_APPROVAL
Contract: api-contract.yaml (APPROVED)
UI Spec: design/ui-spec.md (PM APPROVED)
Created: 2026-03-12

## Data Model

### New tables

| Table | Column | Type | Constraints | Notes |
|-------|--------|------|-------------|-------|
| feedback_items | id | integer | PK, autoincrement | |
| feedback_items | client_name | varchar(255) | NOT NULL | Free-text; searchable via ILIKE |
| feedback_items | summary | varchar(500) | NOT NULL | Short description of feedback |
| feedback_items | detail | text | NULL | Optional long-form detail |
| feedback_items | theme | varchar(20) | NOT NULL | Enum: UX, Performance, Support, Pricing, Communication |
| feedback_items | status | varchar(20) | NOT NULL, default 'Open' | Enum: Open, In Progress, Actioned |
| feedback_items | date_logged | date | NOT NULL, server default CURRENT_DATE | Auto-set on creation, not editable |
| feedback_items | created_at | timestamptz | NOT NULL, server default now() | |
| feedback_items | updated_at | timestamptz | NOT NULL, server default now(), onupdate now() | |

### New migrations

- `app/backend/alembic/versions/xxxx_create_feedback_items_table.py` (auto-generated)

### Existing tables modified

- None — this is the first table in the database.

## Shared Types

These exact types must be used by both agents. Both copy verbatim. No interpretation.

### Backend — Pydantic schemas (`app/backend/app/schemas/feedback.py`)

```python
from pydantic import BaseModel
from datetime import date, datetime
from enum import Enum


class Theme(str, Enum):
    UX = "UX"
    Performance = "Performance"
    Support = "Support"
    Pricing = "Pricing"
    Communication = "Communication"


class Status(str, Enum):
    Open = "Open"
    InProgress = "In Progress"
    Actioned = "Actioned"


class FeedbackCreate(BaseModel):
    client_name: str
    summary: str
    detail: str | None = None
    theme: Theme
    status: Status = Status.Open


class FeedbackUpdate(BaseModel):
    client_name: str | None = None
    summary: str | None = None
    detail: str | None = None
    theme: Theme | None = None
    status: Status | None = None


class FeedbackRead(BaseModel):
    id: int
    client_name: str
    summary: str
    detail: str | None
    theme: Theme
    status: Status
    date_logged: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

### Frontend — TypeScript types (`app/frontend/src/types/index.ts`)

```typescript
export type Theme = "UX" | "Performance" | "Support" | "Pricing" | "Communication"

export type Status = "Open" | "In Progress" | "Actioned"

export interface FeedbackItem {
  id: number
  client_name: string
  summary: string
  detail: string | null
  theme: Theme
  status: Status
  date_logged: string        // ISO date "YYYY-MM-DD" — format in UI as "Mon DD, YYYY"
  created_at: string         // ISO datetime
  updated_at: string         // ISO datetime
}

export interface FeedbackCreate {
  client_name: string
  summary: string
  detail?: string | null
  theme: Theme
  status?: Status            // defaults to "Open" on backend
}

export interface FeedbackUpdate {
  client_name?: string
  summary?: string
  detail?: string | null
  theme?: Theme
  status?: Status
}

export interface FeedbackFilters {
  search?: string
  theme?: Theme
  status?: Status
}
```

## Delivery Slices

Slices are built in order. Each slice is a vertical feature increment:
backend agent builds the API/service, then frontend agent builds the UI that uses it.
Later slices may depend on earlier slices. The frontend agent can read the backend
code from the current and previous slices.

---

### Slice 1: Backend Foundation + List Page

**What this delivers**: Feedback items can be created via API and viewed in a filterable table in the browser.

**Backend scope**:

| File | Purpose |
|------|---------|
| `app/backend/pyproject.toml` | Project config with all dependencies |
| `app/backend/.env.example` | Example env vars (DATABASE_URL, ENVIRONMENT) |
| `app/backend/app/__init__.py` | Package init |
| `app/backend/app/config.py` | Pydantic settings — reads DATABASE_URL from env |
| `app/backend/app/database.py` | SQLAlchemy engine, SessionLocal, Base, get_db dependency |
| `app/backend/app/models/__init__.py` | Package init — import FeedbackItem for alembic |
| `app/backend/app/models/feedback.py` | SQLAlchemy model for feedback_items table |
| `app/backend/app/schemas/__init__.py` | Package init |
| `app/backend/app/schemas/feedback.py` | Pydantic schemas — verbatim from Shared Types above |
| `app/backend/app/routers/__init__.py` | Package init |
| `app/backend/app/routers/feedback.py` | FastAPI router with all 5 CRUD endpoints |
| `app/backend/app/main.py` | FastAPI app entry point — CORS, router registration, health check |
| `app/backend/alembic.ini` | Alembic config pointing to alembic/ directory |
| `app/backend/alembic/env.py` | Alembic env — imports all models, uses Base.metadata |
| `app/backend/alembic/script.py.mako` | Alembic migration template |
| `app/backend/alembic/versions/` | Auto-generated migration directory |

**Backend service logic**:

No separate service layer for this feature — business logic is simple CRUD. All logic lives in the router. If filtering becomes complex in future, extract to a service.

- **`list_feedback(search?, theme?, status?)`**:
  - Start with `db.query(FeedbackItem)`
  - If `search` provided: append `.filter(FeedbackItem.client_name.ilike(f"%{search}%"))`
  - If `theme` provided: append `.filter(FeedbackItem.theme == theme)`
  - If `status` provided: append `.filter(FeedbackItem.status == status)`
  - Order by `FeedbackItem.date_logged.desc()`, then `FeedbackItem.created_at.desc()`
  - Return `.all()`

- **`get_feedback(id)`**:
  - Query by id. If not found, raise 404 with detail "Feedback item not found".

- **`create_feedback(body: FeedbackCreate)`**:
  - Create FeedbackItem from `body.model_dump()`.
  - `date_logged` is auto-set by server default (CURRENT_DATE) — do NOT set it from request.
  - Add, commit, refresh, return.

- **`update_feedback(id, body: FeedbackUpdate)`**:
  - Fetch by id. If not found, raise 404.
  - Loop `body.model_dump(exclude_unset=True)` and setattr each field.
  - Commit, refresh, return.

- **`delete_feedback(id)`**:
  - Fetch by id. If not found, raise 404.
  - Delete, commit. Return 204 No Content.

**Frontend scope**:

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `app/frontend/package.json` | Dependencies: next, react, tailwindcss, shadcn deps, lucide-react |
| `app/frontend/tsconfig.json` | TypeScript config with path aliases (@/) |
| `app/frontend/next.config.ts` | Next.js config |
| `app/frontend/postcss.config.mjs` | PostCSS with Tailwind |
| `app/frontend/tailwind.config.ts` | Tailwind config with shadcn preset |
| `app/frontend/src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `app/frontend/src/lib/api.ts` | API client: `listFeedback`, `getFeedback`, `createFeedback`, `updateFeedback`, `deleteFeedback` | All endpoints |
| `app/frontend/src/types/index.ts` | TypeScript types — verbatim from Shared Types above | — |
| `app/frontend/src/app/globals.css` | Tailwind directives + shadcn CSS variables |
| `app/frontend/src/app/layout.tsx` | Root layout — html, body, metadata | — |
| `app/frontend/src/app/page.tsx` | Root page — redirect to /feedback | ui-spec § Routes: `/` |
| `app/frontend/src/app/feedback/page.tsx` | Feedback List page — server component, fetches data | ui-spec § Feedback List |
| `app/frontend/src/components/ui/badge.tsx` | shadcn Badge primitive | — |
| `app/frontend/src/components/ui/button.tsx` | shadcn Button primitive | — |
| `app/frontend/src/components/ui/input.tsx` | shadcn Input primitive | — |
| `app/frontend/src/components/ui/select.tsx` | shadcn Select primitive | — |
| `app/frontend/src/components/AppHeader.tsx` | Top bar: title + "Log Feedback" button | ui-spec § AppHeader |
| `app/frontend/src/components/FilterBar.tsx` | Search + theme dropdown + status dropdown + clear | ui-spec § FilterBar |
| `app/frontend/src/components/FeedbackTable.tsx` | Data table with theme/status badges, edit links, empty states | ui-spec § FeedbackTable, EmptyState |

**Frontend component tree** (this slice only):

```
FeedbackListPage (server — initial fetch of all feedback)
  └── FeedbackListClient (client — manages filter state + refetch)
        ├── AppHeader (client — "Log Feedback" button navigates to /feedback/new)
        ├── FilterBar (client — search input, theme select, status select, clear button)
        │     └── manages: search, theme, status state → calls listFeedback(filters)
        ├── FeedbackTable (client — renders rows, edit links)
        │     └── maps FeedbackItem[] → table rows with theme badge, status badge, date, edit link
        ├── EmptyState (no data) — shown when total items = 0 and no filters active
        └── EmptyState (filtered) — shown when filtered results = 0 but items exist
```

**Design note on server vs. client**: The list page needs client-side filter state (search input, dropdowns). Two approaches:

1. Server component fetches initial data, passes to client wrapper that manages filters and refetches via API.
2. Entire page is a client component.

We go with approach 1: `page.tsx` is a server component that does the initial fetch (good for first paint), then renders `FeedbackListClient` which is a `"use client"` component managing filter state and calling `listFeedback(filters)` on filter changes.

**Contract endpoints covered**: GET /feedback/, GET /feedback/{id}, POST /feedback/, PATCH /feedback/{id}, DELETE /feedback/{id}

---

### Slice 2: Create + Edit + Delete Pages

**What this delivers**: Users can navigate to /feedback/new to log new feedback, /feedback/:id to edit existing feedback and delete items.

**Backend scope**:

No new backend files — all endpoints are built in Slice 1.

**Frontend scope**:

| File | Purpose | UI Spec reference |
|------|---------|------------------|
| `app/frontend/src/app/feedback/new/page.tsx` | Log Feedback page — FormHeader + FeedbackForm (create mode) | ui-spec § Log Feedback |
| `app/frontend/src/app/feedback/[id]/page.tsx` | Edit Feedback page — FormHeader + FeedbackForm (edit mode) + NotFoundState | ui-spec § Edit Feedback |
| `app/frontend/src/components/FormHeader.tsx` | Top bar: page title + cancel link | ui-spec § FormHeader |
| `app/frontend/src/components/FeedbackForm.tsx` | Reusable form: create mode + edit mode, validation, delete in edit mode | ui-spec § FeedbackForm |
| `app/frontend/src/components/NotFoundState.tsx` | "Feedback item not found" + return link | ui-spec § NotFoundState |
| `app/frontend/src/app/not-found.tsx` | Global 404 — redirects to /feedback | ui-spec § Routes: `*` |

**Frontend component tree** (this slice only):

```
LogFeedbackPage (/feedback/new — server component)
  └── FormHeader (server — "Log Feedback" title, cancel link)
  └── FeedbackForm (client — create mode)
        ├── client_name input (required, validates on blur)
        ├── summary input (required, validates on blur)
        ├── detail textarea (optional)
        ├── theme select (required)
        ├── status select (defaults to "Open")
        └── "Save Feedback" submit button (full-width)

EditFeedbackPage (/feedback/[id] — server component, fetches item by id)
  ├── [if item found]:
  │     └── FormHeader (server — "Edit Feedback" title, cancel link)
  │     └── FeedbackForm (client — edit mode, pre-populated)
  │           ├── same fields as create, pre-filled
  │           ├── "Save Changes" submit button
  │           └── "Delete" button (red outline, triggers confirm() → deleteFeedback)
  └── [if 404]:
        └── NotFoundState (server — "Feedback item not found" + return link)
```

**FeedbackForm logic (pseudocode — both modes)**:

- **Props**: `mode: "create" | "edit"`, `initialData?: FeedbackItem`, `onSuccess: () => void`
- **State**: `formData` (initialized from initialData or defaults), `errors` (per-field), `loading`
- **Validation** (on blur for each field + on submit for all):
  - `client_name`: required, non-empty after trim
  - `summary`: required, non-empty after trim
  - `theme`: required, must be a valid Theme value
  - `status`: always has a value (defaults to "Open")
- **Submit (create)**: call `createFeedback(formData)` → on success, `router.push("/feedback")`
- **Submit (edit)**: call `updateFeedback(id, formData)` → on success, `router.push("/feedback")`
- **Delete (edit only)**: `window.confirm("Are you sure you want to delete this feedback item?")` → if true, call `deleteFeedback(id)` → `router.push("/feedback")`

**Contract endpoints covered**: POST /feedback/, GET /feedback/{id}, PATCH /feedback/{id}, DELETE /feedback/{id}

---

## Slice Dependency Order

1. **Slice 1** (no dependencies — foundational): Backend API + database + frontend list page. Must be built first — Slice 2 depends on the API client, types, layout, and component primitives established here.
2. **Slice 2** (depends on Slice 1): Create/edit/delete pages. Uses types, api.ts functions, layout, AppHeader, and shadcn primitives from Slice 1.

## Decisions Made

1. **No service layer — CRUD logic in routers**
   Why: The business logic is trivial CRUD with filtering. Adding a service layer adds indirection without value. The testability notes in current-feature.md agree ("No service layer needed for v1").
   Alternative rejected: Separate service module with functions. Rejected because there's no complex business logic, no cross-entity operations, and no scoring/computation. If filtering grows complex, extract then.

2. **Theme and Status as Python str Enums stored as varchar(20), not PostgreSQL ENUM type**
   Why: PostgreSQL native ENUM types require explicit ALTER TYPE migrations to add values. Using varchar(20) with Python-side Enum validation keeps the DB flexible while maintaining API-level type safety. The pattern file shows SAEnum but for a greenfield table with enums that may evolve, varchar is safer.
   Alternative rejected: SAEnum(Theme) creating a PostgreSQL ENUM type. Rejected because adding new theme/status values later requires a painful migration (ALTER TYPE ... ADD VALUE).

3. **Server component initial fetch + client component for filter interaction on list page**
   Why: First paint shows data without a loading spinner. Filter changes are handled client-side with API calls, giving instant feedback. This is the standard Next.js 15 pattern.
   Alternative rejected: Fully client-side page with useEffect fetch. Rejected because it shows a loading state on first visit with no data.

4. **FeedbackForm as single reusable component for create and edit**
   Why: The ui-spec explicitly describes the same form in both modes. A single component with a `mode` prop avoids duplication and keeps validation logic in one place.
   Alternative rejected: Separate CreateFeedbackForm and EditFeedbackForm. Rejected because the fields, validation, and layout are identical — only submit behavior and button text differ.

5. **Filter state managed client-side, not via URL search params**
   Why: Simpler implementation for v1. Filters reset on page navigation, which is acceptable for the scale (no pagination, no deep-linking to filtered views needed).
   Alternative rejected: URL search params (useSearchParams) for filter persistence. Rejected for v1 simplicity, but this is a good enhancement if users want shareable filtered URLs later.

6. **date_logged as server-default CURRENT_DATE, not client-provided**
   Why: The ui-spec says "auto-set on creation" and the date field is not editable in the form. Server default ensures consistency regardless of client timezone.
   Alternative rejected: Client sends date_logged in create body. Rejected because the ui-spec explicitly says it's auto-generated and there's no UI for editing it.

7. **Sorting: date_logged DESC, created_at DESC (fixed)**
   Why: The ui-spec shows newest first with no user-sortable columns. Using date_logged as primary sort and created_at as tiebreaker gives predictable ordering.
   Alternative rejected: User-configurable sort. Rejected — ui-spec explicitly has no sortable columns.

8. **Use `"use client"` FeedbackListClient wrapper rather than making the entire page client-side**
   Why: Allows the page.tsx to remain a server component for the initial data fetch. The client wrapper handles filter state and refetching.
   Alternative rejected: Making page.tsx a client component. Rejected because it loses server-side initial fetch benefits.

## Testability Notes

- **Filtering logic**: The ILIKE search and enum filtering all live in the `list_feedback` router function. For integration tests, this is fine (hit the endpoint with query params). If unit testing is needed later, the filter query construction could be extracted to a helper.
- **SQLite vs PostgreSQL for tests**: The test pattern uses SQLite. `ILIKE` is PostgreSQL-specific. The backend agent should use `func.lower()` comparison or the SQLAlchemy `ilike()` method which SQLAlchemy translates appropriately, OR the test conftest should note that search tests may behave differently on SQLite. Recommendation: use SQLAlchemy's `.ilike()` method — it falls back to case-insensitive LIKE on SQLite.
- **FeedbackForm validation**: Client-side only for v1 (blur + submit). Backend Pydantic handles server-side validation. No complex cross-field validation to test.
- **Delete confirmation**: Uses browser `confirm()` — not testable in unit tests. Integration/E2E tests would need to mock `window.confirm`.

## Open Questions ⚠️

Questions needing human input. If approved without answering, agents use the default.

1. **Should search also match `summary` field, not just `client_name`?**
   Default if not answered: Search matches `client_name` only (per ui-spec: "Type in search box to filter by client name").

2. **Should the list page show a loading state while filters are being applied (API call in flight)?**
   Default if not answered: Yes — show a subtle loading indicator (e.g., reduced opacity on the table) while the filtered results are being fetched. No full-page spinner.

3. **Maximum length validation on `client_name` and `summary` fields?**
   Default if not answered: `client_name` max 255 chars, `summary` max 500 chars. Enforced at DB column level; Pydantic does not add explicit max_length (FastAPI returns 500 if DB constraint is hit, which is acceptable for v1).

4. **Should the frontend `FeedbackListClient` debounce the search input?**
   Default if not answered: Yes — 300ms debounce on search input to avoid excessive API calls while typing.
