# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Migration — generate alembic migration for `feedback_items` table
      Columns: id (UUID PK), client_name (VARCHAR NOT NULL), summary (VARCHAR NOT NULL),
      detail (TEXT nullable), theme (ENUM NOT NULL), status (ENUM NOT NULL default 'open'),
      created_at (TIMESTAMPTZ server default), updated_at (TIMESTAMPTZ server default + onupdate).
      Run: `alembic revision --autogenerate -m "add feedback_items table"`

- [ ] BE-02: Model — `backend/app/models/feedback_item.py`
      SQLAlchemy model `FeedbackItem` mapping to `feedback_items` table.
      Use SAEnum for FeedbackTheme and FeedbackStatus. UUID primary key.

- [ ] BE-03: Schemas — `backend/app/schemas/feedback_item.py`
      Define: FeedbackTheme (str Enum), FeedbackStatus (str Enum),
      FeedbackItemCreate, FeedbackItemUpdate, FeedbackItemRead.
      FeedbackItemRead must include all eight fields from the contract.
      model_config = {"from_attributes": True} on FeedbackItemRead.

- [ ] BE-04: Router — `backend/app/routers/feedback.py`
      Five endpoints per contract: GET /, POST /, GET /{feedback_id},
      PATCH /{feedback_id}, DELETE /{feedback_id}.
      prefix="/feedback", tags=["feedback"].
      GET / orders by created_at DESC.
      404 on missing resource for GET, PATCH, DELETE.
      204 (no body) for DELETE.

- [ ] BE-05: Register router — `backend/app/main.py`
      Import and include feedback router. Add to CORS allow_origins if needed.

---

## Frontend Tasks

- [ ] FE-01: Types — `frontend/src/types/index.ts`
      Add TypeScript interfaces mirroring the contract schemas verbatim:
      FeedbackTheme (union type), FeedbackStatus (union type),
      FeedbackItem (matches FeedbackItemRead), FeedbackItemCreate,
      FeedbackItemUpdate.

- [ ] FE-02: API functions — `frontend/src/lib/api.ts`
      Add five functions, one per endpoint:
        listFeedback(): Promise<FeedbackItem[]>
        createFeedback(body: FeedbackItemCreate): Promise<FeedbackItem>
        getFeedback(id: string): Promise<FeedbackItem>
        updateFeedback(id: string, body: FeedbackItemUpdate): Promise<FeedbackItem>
        deleteFeedback(id: string): Promise<void>

- [ ] FE-03: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx`
      Client component. Three controls: client name text input (partial match),
      theme select (All + enum values), status select (All + enum values).
      Filters apply immediately (onChange). "Clear filters" link resets all three.
      Accepts items[] and returns filteredItems via callback or shared state.
      Maps to: ui-spec.md § FilterBar.

- [ ] FE-04: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx`
      Client component. Columns: Client, Summary, Theme, Status, Date Logged, Actions.
      Actions column: "Edit" link → /feedback/[id].
      Empty state (no items ever): "No feedback logged yet. Log your first item →"
        with link to /feedback/new.
      Filtered empty state: "No items match your filters."
      Rows sorted by created_at descending (already sorted by API, preserve order).
      Maps to: ui-spec.md § FeedbackTable.

- [ ] FE-05: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx`
      Client component. Shared between create and edit modes (mode prop).
      Fields: client_name (text, required), summary (text, required),
      detail (textarea, optional), theme (select, required),
      status (select, required, default 'open').
      Inline validation errors for client_name and summary.
      Submit label: "Save Feedback" (create) / "Save Changes" (edit).
      On success: router.push('/feedback').
      Maps to: ui-spec.md § FeedbackForm (create mode) and § FeedbackForm (edit mode).

- [ ] FE-06: Feedback List Page — `frontend/src/app/feedback/page.tsx`
      Server component that calls listFeedback() on load.
      Renders FeedbackListPage layout: "Log Feedback" button → /feedback/new,
      FilterBar, FeedbackTable.
      Passes items to client components.
      Maps to: ui-spec.md § FeedbackListPage.

- [ ] FE-07: New Feedback Page — `frontend/src/app/feedback/new/page.tsx`
      Server component shell. Title "Log Feedback". Cancel link → /feedback.
      Renders FeedbackForm in create mode.
      Maps to: ui-spec.md § NewFeedbackPage.

- [ ] FE-08: Feedback Detail/Edit Page — `frontend/src/app/feedback/[id]/page.tsx`
      Server component that calls getFeedback(id) on load.
      Title "Edit Feedback". Cancel link → /feedback.
      Renders FeedbackForm in edit mode pre-populated with fetched item.
      Delete button (destructive style, bottom of form) — browser confirm dialog,
      calls deleteFeedback(id), then router.push('/feedback').
      Maps to: ui-spec.md § FeedbackDetailPage.

- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx` (or middleware)
      Route / redirects to /feedback.
      Maps to: ui-spec.md § Pages and Routes.

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/
      Happy path: empty list returns [].
      Happy path: list returns all items sorted by created_at DESC.
      No filtering params accepted (filters are client-side only).

- [ ] T-02: Integration — POST /feedback/
      Happy path: all required fields → 201 with FeedbackItemRead body.
      Missing client_name → 422.
      Missing summary → 422.
      Missing theme → 422.
      Invalid theme value → 422.
      Invalid status value → 422.
      detail omitted → accepted, null in response.
      status omitted → defaults to "open" in response.

- [ ] T-03: Integration — GET /feedback/{feedback_id}
      Happy path: valid UUID → 200 with correct item.
      Non-existent UUID → 404 with detail string.
      Malformed UUID (not a UUID) → 422.

- [ ] T-04: Integration — PATCH /feedback/{feedback_id}
      Happy path: update status only → 200 with updated item, other fields unchanged.
      Happy path: update all fields → 200.
      Non-existent UUID → 404.
      Invalid theme value → 422.
      Empty body (no fields) → 200 with item unchanged.
      Explicit null for detail → detail is null in response.

- [ ] T-05: Integration — DELETE /feedback/{feedback_id}
      Happy path: valid UUID → 204 no body.
      Non-existent UUID → 404.
      Subsequent GET for deleted item → 404.

- [ ] T-06: Contract — FeedbackItemRead shape
      All eight fields present on every response: id, client_name, summary,
      detail, theme, status, created_at, updated_at.
      id is a valid UUID string (not integer).
      detail is null (not absent) when not provided.
      Timestamps are ISO-8601 UTC strings.

- [ ] T-07: Unit — FeedbackStatus enum transitions
      All three status values accepted: open, in_progress, actioned.
      A status value not in the enum is rejected at schema validation.

---

## Testability Notes

- The feedback router has no business logic beyond CRUD — no service layer needed,
  but if one is added later, ensure it is injectable for testing.
- UUID primary key: SQLite (used in test conftest) supports UUID as TEXT.
  Ensure SQLAlchemy model uses `String(36)` or `Uuid` type that is SQLite-compatible,
  or override test DB to PostgreSQL. Flag this for tester agent to verify.
- The PATCH endpoint uses `exclude_unset=True` — tests must verify that a field not
  sent in the request body is NOT set to null (only explicitly-sent nulls clear fields).
