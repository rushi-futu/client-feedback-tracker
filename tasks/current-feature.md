# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Migration — create `feedback_items` table with columns: id (UUID PK), client_name (varchar NOT NULL), summary (varchar NOT NULL), detail (text nullable), theme (enum NOT NULL), status (enum NOT NULL, default 'open'), created_at (timestamptz server default), updated_at (timestamptz server default + onupdate)
- [ ] BE-02: Model — `backend/app/models/feedback_item.py` — SQLAlchemy model for feedback_items table; UUID PK using `server_default=func.gen_random_uuid()` or equivalent; SAEnum for theme and status columns
- [ ] BE-03: Schemas — `backend/app/schemas/feedback_item.py` — three Pydantic classes: FeedbackItemCreate, FeedbackItemUpdate (all fields Optional), FeedbackItemRead; plus FeedbackTheme and FeedbackStatus enums; model_config from_attributes=True on Read
- [ ] BE-04: Router — `backend/app/routers/feedback.py` — five endpoints: GET /, POST /, GET /{id}, PATCH /{id}, DELETE /{id}; sorted list by created_at desc; 404 on missing resource; PATCH uses exclude_unset=True; 204 on delete
- [ ] BE-05: Register router — add `feedback.router` to `backend/app/main.py` with prefix `/feedback`

## Frontend Tasks

- [ ] FE-01: Types — add `FeedbackTheme`, `FeedbackStatus`, `FeedbackItemRead`, `FeedbackItemCreate`, `FeedbackItemUpdate` TypeScript interfaces/types to `frontend/src/types/index.ts`; must match FeedbackItemRead schema field-for-field
- [ ] FE-02: API functions — add to `frontend/src/lib/api.ts`: `listFeedback()`, `getFeedback(id)`, `createFeedback(body)`, `updateFeedback(id, body)`, `deleteFeedback(id)`; all typed against the types from FE-01
- [ ] FE-03: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx` — three filter controls (client text input, theme select, status select) with "Clear filters" link; client component; maps to ui-spec FilterBar
- [ ] FE-04: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx` — table with columns Client, Summary, Theme, Status, Date Logged, Actions (Edit link); empty state and filtered empty state messages; maps to ui-spec FeedbackTable
- [ ] FE-05: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx` — shared form for create and edit modes; fields: client_name, summary, detail, theme select, status select; inline validation for required fields; maps to ui-spec FeedbackForm (both modes)
- [ ] FE-06: Feedback List page — `frontend/src/app/feedback/page.tsx` — server component; fetches all feedback on load; renders FilterBar + FeedbackTable; "Log Feedback" button; maps to ui-spec FeedbackListPage
- [ ] FE-07: New Feedback page — `frontend/src/app/feedback/new/page.tsx` — renders FeedbackForm in create mode; on success redirect to /feedback; Cancel link; maps to ui-spec NewFeedbackPage
- [ ] FE-08: Feedback Detail/Edit page — `frontend/src/app/feedback/[id]/page.tsx` — fetches item by id; renders FeedbackForm in edit mode pre-populated; Delete button with confirmation; on success redirect to /feedback; maps to ui-spec FeedbackDetailPage
- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx` — redirect `/` to `/feedback`

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/ — returns empty list, returns list sorted newest-first, multiple items
- [ ] T-02: Integration — POST /feedback/ — valid payload creates item; missing required fields returns 422; default status is 'open'; response matches FeedbackItemRead shape
- [ ] T-03: Integration — GET /feedback/{id} — returns item; unknown UUID returns 404; malformed UUID returns 422
- [ ] T-04: Integration — PATCH /feedback/{id} — partial update (status only); partial update (multiple fields); unknown UUID returns 404; invalid enum value returns 422; exclude_unset semantics (unsent fields not overwritten)
- [ ] T-05: Integration — DELETE /feedback/{id} — returns 204; second delete on same id returns 404; item absent from GET list after delete
- [ ] T-06: Contract — FeedbackItemRead shape present on all write responses (POST 201, PATCH 200); id is UUID string; created_at/updated_at are ISO 8601
- [ ] T-07: Adversarial — empty string for required fields (client_name="", summary="") should return 422; very long strings; SQL injection attempt in client_name; invalid theme/status enum values

## Testability Notes

- The feedback router has no external service dependencies (no scoring, no FK joins to other entities) — fully testable in isolation with SQLite in-memory test DB using the existing conftest.py pattern
- UUID primary key requires `uuid-ossp` extension in PostgreSQL (or `gen_random_uuid()` in PG 13+); SQLite test DB handles `uuid()` differently — backend agent should use `uuid.uuid4()` as Python-side default rather than a server-side SQL function to stay portable across test and prod DBs
