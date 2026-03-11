# Client Feedback Tracker — Core CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Model — Create `backend/app/models/feedback.py`
      SQLAlchemy model for `feedback_items` table.
      Columns: id (UUID PK), client_name (String), summary (String),
      detail (Text nullable), theme (SAEnum FeedbackTheme),
      status (SAEnum FeedbackStatus, default open),
      created_at (DateTime server_default), updated_at (DateTime onupdate).

- [ ] BE-02: Schemas — Create `backend/app/schemas/feedback.py`
      Three Pydantic classes: FeedbackItemCreate, FeedbackItemUpdate, FeedbackItemRead.
      Define FeedbackTheme and FeedbackStatus enums here.
      FeedbackItemRead uses `model_config = {"from_attributes": True}`.
      id field is UUID type (python `uuid.UUID`).

- [ ] BE-03: Router — Create `backend/app/routers/feedback.py`
      Five endpoints per api-contract.yaml:
        GET  /feedback/        → list all, ordered by created_at desc
        POST /feedback/        → create item
        GET  /feedback/{id}    → fetch single item (404 if missing)
        PATCH /feedback/{id}   → partial update (404 if missing)
        DELETE /feedback/{id}  → delete (204, 404 if missing)

- [ ] BE-04: App wiring — Update `backend/app/main.py`
      Import and include the feedback router.
      Confirm CORS allows `http://localhost:3000`.

- [ ] BE-05: Migration — Generate Alembic migration
      Run `alembic revision --autogenerate -m "add feedback_items table"`
      after model is written. Do NOT hand-write migration SQL.

---

## Frontend Tasks

- [ ] FE-01: Types — Add to `frontend/src/types/index.ts`
      TypeScript interfaces: FeedbackItem, FeedbackItemCreate, FeedbackItemUpdate.
      Enums: FeedbackTheme, FeedbackStatus.
      All field names and types must mirror the Pydantic schemas exactly.

- [ ] FE-02: API functions — Add to `frontend/src/lib/api.ts`
      `listFeedback(): Promise<FeedbackItem[]>`
      `getFeedback(id: string): Promise<FeedbackItem>`
      `createFeedback(body: FeedbackItemCreate): Promise<FeedbackItem>`
      `updateFeedback(id: string, body: FeedbackItemUpdate): Promise<FeedbackItem>`
      `deleteFeedback(id: string): Promise<void>`
      All calls go through this file — no direct fetch() in components.

- [ ] FE-03: Root redirect — `frontend/src/app/page.tsx`
      Redirect `/` → `/feedback` (Next.js `redirect()` or `notFound()` swap).

- [ ] FE-04: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx`
      Client component. Three controls side by side:
        - client_name: text input, partial match filter
        - theme: select dropdown (All + FeedbackTheme values)
        - status: select dropdown (All + FeedbackStatus values)
      "Clear filters" link resets all three.
      Filters apply immediately on change (no submit button).
      Receives items + filter state via props/context; emits filtered list.
      Maps to: ui-spec.md § FilterBar

- [ ] FE-05: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx`
      Client component. Columns: Client, Summary, Theme, Status, Date Logged, Actions.
      Each row: "Edit" link → `/feedback/[id]`.
      Empty state (no items): "No feedback logged yet. Log your first item →" (links to /feedback/new).
      Filtered empty state: "No items match your filters."
      Rows sorted by created_at descending (newest first).
      Maps to: ui-spec.md § FeedbackTable

- [ ] FE-06: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx`
      Client component. Shared by create and edit modes (prop: mode="create"|"edit").
      Fields: client_name (text, required), summary (text, required),
              detail (textarea, optional), theme (select, required),
              status (select, required, default open).
      Inline validation errors for client_name and summary when empty.
      Submit button label: "Save Feedback" (create) | "Save Changes" (edit).
      On success: calls router.push("/feedback").
      Maps to: ui-spec.md § FeedbackForm

- [ ] FE-07: FeedbackListPage — `frontend/src/app/feedback/page.tsx`
      Server component that fetches all items on mount via listFeedback().
      Renders FilterBar + FeedbackTable with fetched data.
      "Log Feedback" button → navigates to /feedback/new.
      Maps to: ui-spec.md § FeedbackListPage

- [ ] FE-08: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx`
      Page title: "Log Feedback".
      Renders FeedbackForm in create mode.
      Cancel link → /feedback.
      Maps to: ui-spec.md § NewFeedbackPage

- [ ] FE-09: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx`
      Server component that fetches item by id on mount via getFeedback(id).
      Page title: "Edit Feedback".
      Renders FeedbackForm in edit mode (pre-populated).
      Cancel link → /feedback.
      Delete button (destructive style) — calls confirm() before deleteFeedback(id) → redirects to /feedback.
      Maps to: ui-spec.md § FeedbackDetailPage

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/
      Happy path: returns empty list, returns items sorted newest-first.
      Adversarial: no items in DB returns [], not 404.

- [ ] T-02: Integration — POST /feedback/
      Happy path: all required fields → 201 with FeedbackItemRead.
      Adversarial: missing client_name → 422; missing summary → 422;
      missing theme → 422; invalid theme value → 422;
      invalid status value → 422; extra unknown fields ignored.
      Default: omitting status → created with status=open.
      detail omitted → detail is null in response.

- [ ] T-03: Integration — GET /feedback/{id}
      Happy path: known uuid → 200 with correct item.
      Adversarial: unknown uuid → 404; malformed uuid → 422.

- [ ] T-04: Integration — PATCH /feedback/{id}
      Happy path: partial update → 200, only changed fields updated.
      Status transition: open → actioned → 200.
      Adversarial: unknown uuid → 404; invalid theme → 422;
      invalid status → 422; sending detail: null clears the field.
      PATCH semantics: empty body {} → item unchanged.

- [ ] T-05: Integration — DELETE /feedback/{id}
      Happy path: known uuid → 204, subsequent GET → 404.
      Adversarial: unknown uuid → 404; double delete → 404.

- [ ] T-06: Contract — FeedbackItemRead shape
      All required fields present: id (uuid string), client_name, summary,
      theme, status, created_at, updated_at.
      detail is null when not provided.
      created_at and updated_at are ISO 8601 datetime strings.

- [ ] T-07: Unit — Enum values
      FeedbackTheme: only UX, Performance, Support, Pricing, Communication accepted.
      FeedbackStatus: only open, in_progress, actioned accepted.

---

## Testability Notes

- The feedback router has no external service dependencies (no scoring, no integrations) —
  all five endpoints are straightforwardly testable with the SQLite test DB pattern
  from data-patterns.md.
- UUID primary keys: the test client must handle uuid strings, not integer IDs.
  `str(uuid.uuid4())` in test fixtures will work; no special setup required.
- No async endpoints anticipated — synchronous FastAPI + SQLAlchemy is testable
  with the standard TestClient without pytest-asyncio complexity.
