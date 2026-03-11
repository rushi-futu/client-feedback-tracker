# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Model/migration — create `feedback_items` table
      - UUID primary key (use `uuid.uuid4` default, not Integer)
      - Columns: id, client_name (String 255, NOT NULL), summary (String 500, NOT NULL),
        detail (Text, nullable), theme (SAEnum FeedbackTheme, NOT NULL),
        status (SAEnum FeedbackStatus, NOT NULL, default='open'),
        created_at (DateTime timezone, server_default func.now()),
        updated_at (DateTime timezone, server_default func.now(), onupdate func.now())
      - Generate via `alembic revision --autogenerate`

- [ ] BE-02: Pydantic schemas — `backend/app/schemas/feedback_item.py`
      - `FeedbackTheme` (str Enum): UX, Performance, Support, Pricing, Communication
      - `FeedbackStatus` (str Enum): open, in_progress, actioned
      - `FeedbackItemCreate`: client_name, summary, detail (optional), theme, status (default open)
      - `FeedbackItemUpdate`: all fields Optional, all default None
      - `FeedbackItemRead`: id (UUID), client_name, summary, detail, theme, status,
        created_at, updated_at — with `model_config = {"from_attributes": True}`

- [ ] BE-03: SQLAlchemy model — `backend/app/models/feedback_item.py`
      - Inherits Base; __tablename__ = "feedback_items"
      - UUID PK (server-side generation via Python uuid4, not database gen)
      - Import and use FeedbackTheme and FeedbackStatus enums from schemas

- [ ] BE-04: FastAPI router — `backend/app/routers/feedback_items.py`
      - prefix="/feedback", tags=["feedback"]
      - GET /feedback/ — list all, ORDER BY created_at DESC → list[FeedbackItemRead]
      - POST /feedback/ → 201 FeedbackItemRead
      - GET /feedback/{id} → FeedbackItemRead, 404 if not found
      - PATCH /feedback/{id} → FeedbackItemRead, 404 if not found
      - DELETE /feedback/{id} → 204, 404 if not found
      - All DB access via Depends(get_db)

- [ ] BE-05: Register router in `backend/app/main.py`
      - Import feedback_items router
      - `app.include_router(feedback_items.router)`

---

## Frontend Tasks

- [ ] FE-01: TypeScript types — add to `frontend/src/types/index.ts`
      - `FeedbackTheme` string union: 'UX' | 'Performance' | 'Support' | 'Pricing' | 'Communication'
      - `FeedbackStatus` string union: 'open' | 'in_progress' | 'actioned'
      - `FeedbackItem` interface — field-for-field match to FeedbackItemRead schema

- [ ] FE-02: API functions — add to `frontend/src/lib/api.ts`
      - `listFeedback(): Promise<FeedbackItem[]>`
      - `getFeedback(id: string): Promise<FeedbackItem>`
      - `createFeedback(body: FeedbackItemCreate): Promise<FeedbackItem>`
      - `updateFeedback(id: string, body: FeedbackItemUpdate): Promise<FeedbackItem>`
      - `deleteFeedback(id: string): Promise<void>`

- [ ] FE-03: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx`
      - Maps to FeedbackTable in ui-spec.md § FeedbackListPage
      - Columns: Client, Summary, Theme, Status, Date Logged, Actions
      - "Edit" link per row → `/feedback/[id]`
      - Empty state (no items): "No feedback logged yet. Log your first item →" (link to /feedback/new)
      - Empty state (filtered): "No items match your filters. Clear filters"

- [ ] FE-04: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx`
      - Maps to FilterBar in ui-spec.md § FeedbackListPage
      - Client name: text input, partial-match filter (client-side)
      - Theme: select dropdown — "All" + FeedbackTheme enum values
      - Status: select dropdown — "All" + FeedbackStatus enum values
      - Filters apply immediately (no submit)
      - "Clear filters" link resets all three

- [ ] FE-05: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx`
      - Maps to FeedbackForm (create and edit modes) in ui-spec.md
      - Fields: client_name (text, required), summary (text, required),
        detail (textarea, optional), theme (select, required), status (select, required, default open)
      - Create mode: submit button "Save Feedback", on success redirect to /feedback
      - Edit mode: submit button "Save Changes", on success redirect to /feedback
      - Inline validation errors for required fields
      - Accepts `mode: 'create' | 'edit'` and optional `initialData: FeedbackItem` prop

- [ ] FE-06: FeedbackListPage — `frontend/src/app/feedback/page.tsx`
      - Maps to FeedbackListPage in ui-spec.md § /feedback
      - Server component: fetches all feedback on load via listFeedback()
      - Contains FilterBar + FeedbackTable
      - "Log Feedback" button → navigates to /feedback/new

- [ ] FE-07: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx`
      - Maps to NewFeedbackPage in ui-spec.md § /feedback/new
      - Page title: "Log Feedback"
      - Contains FeedbackForm in create mode
      - Cancel link → /feedback

- [ ] FE-08: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx`
      - Maps to FeedbackDetailPage in ui-spec.md § /feedback/[id]
      - Page title: "Edit Feedback"
      - Fetches item by id, pre-populates FeedbackForm in edit mode
      - Delete button (secondary/destructive style) — browser confirm dialog → calls deleteFeedback → redirect to /feedback
      - Cancel link → /feedback

- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx`
      - Redirect `/` → `/feedback`

---

## Test Tasks (tester agent only — do not build during backend/frontend build)

- [ ] T-01: Integration — GET /feedback/
      - Empty list returns 200 + []
      - With items returns all items
      - Items are sorted newest created_at first
      - Response shape matches FeedbackItemRead schema

- [ ] T-02: Integration — POST /feedback/
      - Valid payload returns 201 + FeedbackItemRead
      - Missing client_name returns 422
      - Missing summary returns 422
      - Missing theme returns 422
      - Invalid theme value returns 422
      - Invalid status value returns 422
      - detail field absent → null in response (not an error)
      - status defaults to 'open' when not supplied

- [ ] T-03: Integration — GET /feedback/{id}
      - Existing id returns 200 + FeedbackItemRead
      - Non-existent id returns 404
      - Malformed UUID returns 422

- [ ] T-04: Integration — PATCH /feedback/{id}
      - Partial update (status only) succeeds
      - Full field update succeeds
      - Non-existent id returns 404
      - Invalid enum value returns 422
      - updated_at is newer than created_at after update

- [ ] T-05: Integration — DELETE /feedback/{id}
      - Existing id returns 204 with no body
      - Non-existent id returns 404
      - Deleted item no longer appears in GET /feedback/

- [ ] T-06: Contract — FeedbackItemRead shape
      - All required fields present in every response
      - id is a valid UUID string
      - theme value is one of the defined enum values
      - status value is one of the defined enum values
      - created_at and updated_at are valid ISO-8601 datetimes

- [ ] T-07: Unit — Enum validation
      - All 5 FeedbackTheme values accepted
      - All 3 FeedbackStatus values accepted
      - Values outside enums rejected at schema layer

---

## Testability Notes

- FeedbackItem has no external dependencies or side effects — all CRUD operations
  are straightforward to test with the SQLite test database pattern from data-patterns.md
- No service layer with complex logic anticipated — router-level tests should cover all cases
- UUID generation is handled by Python (not DB), so test fixtures can supply deterministic UUIDs
- The default status='open' logic must be tested explicitly to confirm it does not require
  the client to supply the field
