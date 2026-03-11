# Client Feedback Tracker — Core Feedback CRUD

Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Migration — generate `feedback_items` table via `alembic revision --autogenerate`
      Columns: id (UUID PK), client_name (VARCHAR NOT NULL), summary (VARCHAR NOT NULL),
      detail (TEXT nullable), theme (enum NOT NULL), status (enum NOT NULL, default 'open'),
      created_at (timestamptz server default), updated_at (timestamptz server default + onupdate)

- [ ] BE-02: Model — `backend/app/models/feedback_item.py`
      SQLAlchemy model for the `feedback_items` table.
      Use SAEnum for theme and status columns. UUID primary key (use sqlalchemy.dialects.postgresql.UUID).
      created_at and updated_at with server_default=func.now() and onupdate=func.now().

- [ ] BE-03: Schema — `backend/app/schemas/feedback_item.py`
      Define: FeedbackTheme (str enum), FeedbackStatus (str enum),
      FeedbackItemCreate, FeedbackItemUpdate (all Optional fields), FeedbackItemRead.
      FeedbackItemRead must have model_config = {"from_attributes": True}.
      id field type: uuid.UUID

- [ ] BE-04: Router — `backend/app/routers/feedback.py`
      prefix="/feedback", tags=["feedback"].
      Implement: GET / (list, ordered by created_at desc), POST / (create, 201),
      GET /{id} (by uuid, 404 if missing), PATCH /{id} (partial update via exclude_unset=True),
      DELETE /{id} (204 no content, 404 if missing).

- [ ] BE-05: App registration — update `backend/app/main.py`
      Import feedback router and register with app.include_router(feedback.router).

---

## Frontend Tasks

- [ ] FE-01: Types — `frontend/src/types/index.ts`
      Add: FeedbackTheme (string union), FeedbackStatus (string union), FeedbackItem interface.
      Must match FeedbackItemRead schema field-for-field.
      FeedbackItem.id: string (UUID as string in TypeScript).

- [ ] FE-02: API functions — `frontend/src/lib/api.ts`
      Add five functions:
        listFeedback(): Promise<FeedbackItem[]>
        createFeedback(data: FeedbackItemCreate): Promise<FeedbackItem>
        getFeedback(id: string): Promise<FeedbackItem>
        updateFeedback(id: string, data: Partial<FeedbackItemCreate>): Promise<FeedbackItem>
        deleteFeedback(id: string): Promise<void>
      All calls go through this file — no direct fetch() in components.

- [ ] FE-03: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx`
      Client component (uses state for filter values).
      Three controls side by side: client_name text input (partial match filter),
      theme select (All + FeedbackTheme values), status select (All + FeedbackStatus values).
      Filters apply immediately (onChange, no submit).
      "Clear filters" link resets all three to empty/All.
      Accepts: items: FeedbackItem[], onFiltered: (items: FeedbackItem[]) => void.
      ui-spec ref: FilterBar component on /feedback.

- [ ] FE-04: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx`
      Client component.
      Columns: Client, Summary, Theme, Status, Date Logged, Actions.
      Actions column: "Edit" link → /feedback/[id].
      Sorted by created_at descending (newest first) — display only, sort is done by API.
      Empty state (no items ever): "No feedback logged yet. Log your first item →" (links to /feedback/new).
      Filtered empty state (items exist but none match): "No items match your filters. Clear filters".
      ui-spec ref: FeedbackTable component on /feedback.

- [ ] FE-05: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx`
      Client component (form state + submission).
      Mode prop: "create" | "edit".
      Fields: client_name (text, required), summary (text, required), detail (textarea, optional),
      theme (select, required), status (select, required, default "open").
      Inline validation errors on client_name and summary (required).
      Create mode: submit button "Save Feedback", on success redirect to /feedback.
      Edit mode: submit button "Save Changes", pre-populated from initialData prop, on success redirect to /feedback.
      ui-spec ref: FeedbackForm component — create mode on /feedback/new, edit mode on /feedback/[id].

- [ ] FE-06: FeedbackListPage — `frontend/src/app/feedback/page.tsx`
      Server component: fetches all feedback items via listFeedback() on page load.
      Renders: "Log Feedback" button → /feedback/new, FilterBar, FeedbackTable.
      Passes items to FilterBar; FilterBar drives what FeedbackTable renders.
      ui-spec ref: FeedbackListPage on route /feedback.

- [ ] FE-07: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx`
      Server component shell (form itself is client).
      Page title: "Log Feedback".
      Renders: FeedbackForm in create mode, cancel link → /feedback.
      ui-spec ref: NewFeedbackPage on route /feedback/new.

- [ ] FE-08: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx`
      Server component: fetches item by id via getFeedback(id) on page load.
      Page title: "Edit Feedback".
      Renders: FeedbackForm in edit mode (with initialData), cancel link → /feedback,
      delete button (secondary/destructive style, bottom of form).
      Delete button calls window.confirm() before calling deleteFeedback(), then redirects to /feedback.
      ui-spec ref: FeedbackDetailPage on route /feedback/[id].

- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx`
      Redirect `/` → `/feedback` using Next.js redirect().
      ui-spec ref: "/ — Redirect to /feedback".

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/
      Happy path: returns empty list []; returns list with multiple items; items sorted by
      created_at descending; verify FeedbackItemRead shape on each item.

- [ ] T-02: Integration — POST /feedback/
      Happy path: all fields provided → 201 + FeedbackItemRead body;
      minimal fields (no detail, no status) → 201 + detail null + status "open";
      missing client_name → 422; missing summary → 422; missing theme → 422;
      invalid theme value → 422; invalid status value → 422.

- [ ] T-03: Integration — GET /feedback/{id}
      Happy path: returns item with correct id; all fields present and typed correctly;
      nonexistent UUID → 404; malformed UUID (not a uuid) → 422.

- [ ] T-04: Integration — PATCH /feedback/{id}
      Partial update — send only status → only status changes, other fields unchanged;
      send client_name + summary → both update, other fields unchanged;
      set detail to null → detail becomes null;
      send empty body → item unchanged (exclude_unset semantics);
      nonexistent UUID → 404.

- [ ] T-05: Integration — DELETE /feedback/{id}
      Happy path: returns 204 no content; verify GET /{id} returns 404 after delete;
      nonexistent UUID → 404; delete same id twice → first 204, second 404.

- [ ] T-06: Contract — FeedbackItemRead shape verification
      All required fields present: id (uuid string), client_name, summary, theme, status,
      created_at (ISO datetime), updated_at (ISO datetime);
      detail field present and nullable; no extra undocumented fields.

- [ ] T-07: Unit — Enum validation
      All FeedbackTheme values accepted: UX, Performance, Support, Pricing, Communication;
      All FeedbackStatus values accepted: open, in_progress, actioned;
      Case-sensitive: "ux" rejected, "UX" accepted; "Open" rejected, "open" accepted.

---

## Testability Notes

- No service layer in this feature — all logic is in routers (pure CRUD).
  Router functions can be tested directly via the TestClient + SQLite pattern
  documented in data-patterns.md.

- UUID primary key: tests must NOT hardcode IDs. Always use the id returned in
  the POST response body for subsequent GET/PATCH/DELETE calls.

- detail field nullability: must be tested in both directions —
  create without detail (expect null in response) and create with detail (expect string).

- PATCH exclude_unset semantics: a test sending an empty body {} should confirm
  no fields change (potential bug surface if exclude_unset is not applied correctly).

- Enum case sensitivity: a common implementation mistake is case-insensitive enum
  matching. Adversarial test should send lowercase theme values to verify rejection.
