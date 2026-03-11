# Client Feedback Tracker — Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml (Feature: Feedback CRUD)
Created: 2026-03-11

---

## Backend Tasks

- [ ] BE-01: Migration — create `feedback_items` table with columns: id (UUID PK),
      client_name (varchar 255, not null), summary (varchar 255, not null),
      detail (text, nullable), theme (SAEnum FeedbackTheme, not null),
      status (SAEnum FeedbackStatus, not null, default 'open'),
      created_at (timestamptz, server default), updated_at (timestamptz, server default + onupdate)
      Run via: `alembic revision --autogenerate -m "create feedback_items table"`

- [ ] BE-02: Model — `backend/app/models/feedback_item.py`
      SQLAlchemy model for the feedback_items table. Enums imported from schemas.

- [ ] BE-03: Schemas — `backend/app/schemas/feedback_item.py`
      Three Pydantic schema classes:
      - FeedbackTheme (str Enum): ux, performance, support, pricing, communication
      - FeedbackStatus (str Enum): open, in_progress, actioned
      - FeedbackItemCreate: client_name (str), summary (str), detail (str | None), theme (FeedbackTheme)
      - FeedbackItemUpdate: all fields Optional — client_name, summary, detail, theme, status
      - FeedbackItemRead: all fields including id (UUID), created_at, updated_at; model_config from_attributes=True
      Validation rule: FeedbackItemUpdate must reject null client_name or null summary (use @field_validator).

- [ ] BE-04: Router — `backend/app/routers/feedback_items.py`
      prefix="/feedback", tags=["feedback"]
      Five endpoints per api-contract.yaml:
      GET /          → list all, ordered by created_at DESC
      POST /         → create, status forced to "open"
      GET /{id}      → get single, 404 if missing
      PATCH /{id}    → partial update, 404 if missing
      DELETE /{id}   → delete, 204, 404 if missing

- [ ] BE-05: Register router — `backend/app/main.py`
      Include feedback_items.router. Update app title if needed.

---

## Frontend Tasks

- [ ] FE-01: Types — `frontend/src/types/index.ts`
      Add TypeScript interfaces matching FeedbackItemRead, FeedbackItemCreate,
      FeedbackItemUpdate from the contract. Add FeedbackTheme and FeedbackStatus
      const enums (or union types) matching the contract values exactly.

- [ ] FE-02: API functions — `frontend/src/lib/api.ts`
      Add five typed functions:
      - getFeedbackItems(): Promise<FeedbackItemRead[]>
      - getFeedbackItem(id: string): Promise<FeedbackItemRead>
      - createFeedbackItem(body: FeedbackItemCreate): Promise<FeedbackItemRead>
      - updateFeedbackItem(id: string, body: FeedbackItemUpdate): Promise<FeedbackItemRead>
      - deleteFeedbackItem(id: string): Promise<void>

- [ ] FE-03: FeedbackListPage — `frontend/src/app/feedback/page.tsx`
      Server component. Fetches all feedback items on load via getFeedbackItems().
      Renders FilterBar and FeedbackTable. Contains "Log Feedback" button → /feedback/new.
      Maps to ui-spec.md § /feedback — Feedback List Page.

- [ ] FE-04: FilterBar — `frontend/src/components/feedback/FilterBar.tsx`
      Client component (needs useState for filter state).
      Three controls: client name text input (partial match), theme dropdown, status dropdown.
      Both dropdowns include an "All" option as default.
      Filters apply immediately (onChange). "Clear filters" resets all three.
      Receives items list as prop; emits filtered items up (or owns filter state with
      callback to parent). Maps to ui-spec.md § FilterBar.

- [ ] FE-05: FeedbackTable — `frontend/src/components/feedback/FeedbackTable.tsx`
      Client component (receives filtered items array as prop).
      Columns: Client, Summary, Theme, Status, Date Logged, Actions.
      Each row: "Edit" link → /feedback/[id].
      Empty state (no items ever): "No feedback logged yet. Log your first item →" (links to /feedback/new).
      Filtered empty state: "No items match your filters."
      Maps to ui-spec.md § FeedbackTable.

- [ ] FE-06: FeedbackForm — `frontend/src/components/feedback/FeedbackForm.tsx`
      Client component. Used in both create and edit modes (mode prop).
      Fields: client_name (text, required), summary (text, required), detail (textarea, optional),
      theme (select, required), status (select, required, shown in edit mode only — hidden or
      defaulted to "open" in create mode).
      Inline validation for required fields.
      Create mode submit button: "Save Feedback". Edit mode: "Save Changes".
      On success: router.push("/feedback").
      Maps to ui-spec.md § FeedbackForm (create mode) and FeedbackForm (edit mode).

- [ ] FE-07: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx`
      Server component shell; contains FeedbackForm in create mode.
      Page title: "Log Feedback". Cancel link → /feedback.
      Maps to ui-spec.md § /feedback/new — New Feedback Form.

- [ ] FE-08: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx`
      Server component. Fetches item by id via getFeedbackItem(id). Passes to FeedbackForm in edit mode.
      Page title: "Edit Feedback". Cancel link → /feedback.
      Delete button (destructive style): browser confirm → deleteFeedbackItem(id) → router.push("/feedback").
      Maps to ui-spec.md § /feedback/[id] — Feedback Detail / Edit.

- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx`
      Redirect `/` → `/feedback`.
      Maps to ui-spec.md § Routes.

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/ — empty list, populated list, sorted newest-first
- [ ] T-02: Integration — POST /feedback/ — happy path, missing required fields (422),
      status is always "open" regardless of body, unknown theme value (422)
- [ ] T-03: Integration — GET /feedback/{id} — found, not found (404), invalid UUID format
- [ ] T-04: Integration — PATCH /feedback/{id} — partial update (only status), full update,
      null client_name rejected (422), null summary rejected (422), unknown id (404)
- [ ] T-05: Integration — DELETE /feedback/{id} — success (204), not found (404)
- [ ] T-06: Contract — FeedbackItemRead shape matches every field in api-contract.yaml
      (id is UUID string, created_at and updated_at are ISO 8601 datetime strings)
- [ ] T-07: Unit — FeedbackItemUpdate validator rejects null client_name and null summary
- [ ] T-08: Frontend — FilterBar filters correctly by client (partial, case-insensitive),
      theme (exact enum match), status (exact enum match), combined filters, clear resets all

---

## Testability Notes

- The feedback router has no external dependencies or side effects — pure DB CRUD.
  SQLite in-memory test DB (per data-patterns.md conftest pattern) is sufficient.
- The FilterBar component does all filtering in memory (no API call on filter change).
  Test with a static array of FeedbackItemRead fixtures — no mocking needed.
- No service layer is needed for this feature (pure CRUD, no business logic).
  Validators that enforce "null client_name is 422" live in the Pydantic schema —
  test via the HTTP layer, not unit tests.
