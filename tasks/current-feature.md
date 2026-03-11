# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Model — Create `backend/app/models/feedback.py` with `Feedback` SQLAlchemy model. Fields: id (UUID PK), client_name (String, required), summary (String, required), detail (Text, nullable), theme (SAEnum FeedbackTheme, required), status (SAEnum FeedbackStatus, required, default=open), created_at (timestamptz server default), updated_at (timestamptz server default + onupdate).
- [ ] BE-02: Enums — Define `FeedbackTheme` (UX, Performance, Support, Pricing, Communication) and `FeedbackStatus` (open, in_progress, actioned) as `str, Enum` classes. Place in `backend/app/schemas/feedback.py` so they can be imported by both the model and the schema.
- [ ] BE-03: Schemas — Create `backend/app/schemas/feedback.py` with `FeedbackCreate`, `FeedbackUpdate`, and `FeedbackRead` Pydantic classes exactly matching the shapes in `api-contract.yaml`. `FeedbackRead.id` is UUID. `FeedbackCreate.status` is optional with default `FeedbackStatus.open`.
- [ ] BE-04: Router — Create `backend/app/routers/feedback.py` with the five endpoints defined in `api-contract.yaml`: `GET /feedback/` (all items, sorted created_at DESC), `POST /feedback/` (201), `GET /feedback/{id}` (404 if missing), `PATCH /feedback/{id}` (partial update, exclude_unset=True), `DELETE /feedback/{id}` (204, 404 if missing).
- [ ] BE-05: App wiring — Register `feedback.router` in `backend/app/main.py`. No service layer needed for this feature — CRUD logic lives directly in the router (no scoring or complex business logic).
- [ ] BE-06: Migration — After model is defined, run `alembic revision --autogenerate -m "add_feedback_table"` and `alembic upgrade head`. Confirm the generated migration includes the `feedback` table, both enum types, and the UUID primary key.

---

## Frontend Tasks

- [ ] FE-01: Types — Add `FeedbackTheme`, `FeedbackStatus`, and `FeedbackItem` TypeScript interfaces to `frontend/src/types/index.ts`. Must match `FeedbackRead` schema field-for-field. `id` is `string` (UUID). `detail` is `string | null`.
- [ ] FE-02: API functions — Add to `frontend/src/lib/api.ts`: `getFeedbackItems()` → GET /feedback/, `createFeedbackItem(body)` → POST /feedback/, `getFeedbackItem(id)` → GET /feedback/{id}, `updateFeedbackItem(id, body)` → PATCH /feedback/{id}, `deleteFeedbackItem(id)` → DELETE /feedback/{id}.
- [ ] FE-03: Root redirect — `frontend/src/app/page.tsx` redirects to `/feedback` (Next.js `redirect()` or `permanentRedirect()`).
- [ ] FE-04: FeedbackListPage — `frontend/src/app/feedback/page.tsx`. Server component. Fetches all items via `getFeedbackItems()` on load. Renders FilterBar (client), FeedbackTable (client), and "Log Feedback" button → `/feedback/new`. Passes items to child components.
- [ ] FE-05: FilterBar — `frontend/src/components/feedback/FilterBar.tsx`. Client component. Three controls: client name text input (partial match), theme dropdown (All + enum values), status dropdown (All + enum values). Filters apply immediately via local state. "Clear filters" link resets all three. Passes filtered results up or drives FeedbackTable via shared state/prop.
- [ ] FE-06: FeedbackTable — `frontend/src/components/feedback/FeedbackTable.tsx`. Client component (receives filtered items as prop). Columns: Client, Summary, Theme, Status, Date Logged, Actions. Each row has "Edit" link → `/feedback/[id]`. Empty state when no items at all: "No feedback logged yet. Log your first item →" (links to `/feedback/new`). Filtered empty state: "No items match your filters."
- [ ] FE-07: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx`. Page title "Log Feedback". Renders FeedbackForm in create mode. Cancel link → `/feedback`.
- [ ] FE-08: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx`. Server component. Fetches item by id via `getFeedbackItem(id)`. Page title "Edit Feedback". Renders FeedbackForm in edit mode (pre-populated). Cancel link → `/feedback`. Delete button (destructive style, bottom of form) — browser confirm → `deleteFeedbackItem(id)` → redirect to `/feedback`.
- [ ] FE-09: FeedbackForm — `frontend/src/components/feedback/FeedbackForm.tsx`. Client component. Handles both create and edit mode via `mode` prop. Fields: client_name (text, required), summary (text, required), detail (textarea, optional), theme (select, required), status (select, required, default open). Submit button label: "Save Feedback" (create) / "Save Changes" (edit). Inline validation errors for required fields. On success: redirect to `/feedback`.

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — `GET /feedback/` — empty list returns `[]`; after creates, returns all items sorted newest first; confirm shape matches `FeedbackRead`.
- [ ] T-02: Integration — `POST /feedback/` — valid body returns 201 + FeedbackRead; missing required fields returns 422; default status applied when omitted.
- [ ] T-03: Integration — `GET /feedback/{id}` — returns correct item; unknown UUID returns 404 (not 200 null).
- [ ] T-04: Integration — `PATCH /feedback/{id}` — partial update only changes supplied fields; unknown UUID returns 404; invalid enum value returns 422; verify updated_at changes.
- [ ] T-05: Integration — `DELETE /feedback/{id}` — returns 204 and item is gone from subsequent GET; unknown UUID returns 404.
- [ ] T-06: Contract — Every response shape matches the `FeedbackRead` schema exactly. UUID `id` field is a valid UUID string. `created_at` and `updated_at` are ISO 8601 datetime strings.
- [ ] T-07: Unit — FilterBar (client-side): filtering by client_name partial match; filtering by theme; filtering by status; combined filters; clear filters resets to all items.
- [ ] T-08: Adversarial — POST with empty string for required fields (should 422, not 201); PATCH with invalid theme enum value; DELETE twice (second should 404); GET non-UUID id format.

---

## Testability Notes

- The router does direct CRUD with no service layer — all test coverage is integration-level against the test DB. This is intentional and appropriate for simple CRUD.
- UUID primary keys: SQLite (used in test DB) supports UUID storage as strings. Ensure the test `conftest.py` handles UUID columns (may need `import uuid` and `String` column type mapped for SQLite).
- FilterBar is purely client-side state — unit tests can run without a real API. The tester agent should test this component in isolation.
- No auth layer — no token headers needed in test requests.
