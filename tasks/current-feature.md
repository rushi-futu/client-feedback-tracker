# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

## Backend Tasks
- [ ] BE-01: Model — Create `FeedbackItem` SQLAlchemy model with uuid PK, client_name, summary, detail, theme (enum), status (enum), created_at, updated_at
- [ ] BE-02: Schemas — Create `FeedbackCreate`, `FeedbackUpdate`, `FeedbackRead` Pydantic schemas plus `Theme` and `Status` enums
- [ ] BE-03: Router — Create `/feedback` router with 5 endpoints: list all, get by id, create, update (PATCH), delete
- [ ] BE-04: Migration — Generate Alembic migration for `feedback_items` table
- [ ] BE-05: App wiring — Register feedback router in `main.py`, update CORS, update alembic env.py model imports

## Frontend Tasks
- [ ] FE-01: Types — Create TypeScript `FeedbackItem`, `FeedbackCreate`, `FeedbackUpdate` types plus `Theme` and `Status` enums matching backend schemas
- [ ] FE-02: API functions — Add `listFeedback`, `getFeedback`, `createFeedback`, `updateFeedback`, `deleteFeedback` to `lib/api.ts`
- [ ] FE-03: FeedbackTable component — Table displaying feedback items with columns: Client, Summary, Theme, Status, Date Logged, Actions (Edit link)
- [ ] FE-04: FilterBar component — Three filter controls (client name text search, theme dropdown, status dropdown) with clear filters link
- [ ] FE-05: FeedbackForm component — Reusable form for create and edit modes with validation (client_name and summary required)
- [ ] FE-06: FeedbackListPage — `/feedback` route page composing FilterBar + FeedbackTable + "Log Feedback" button; handles empty states
- [ ] FE-07: NewFeedbackPage — `/feedback/new` route page with FeedbackForm in create mode
- [ ] FE-08: FeedbackDetailPage — `/feedback/[id]` route page with FeedbackForm in edit mode + delete button with confirm
- [ ] FE-09: Root redirect — `/` redirects to `/feedback`

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — All 5 CRUD endpoints: happy path + 404 on missing id + 422 on invalid body
- [ ] T-02: Integration — Verify uuid format for id field in responses
- [ ] T-03: Integration — PATCH partial update: send only `status`, confirm other fields unchanged
- [ ] T-04: Integration — DELETE returns 204 with no body; subsequent GET returns 404
- [ ] T-05: Contract — Response shape matches `FeedbackRead` schema for all endpoints that return feedback
- [ ] T-06: Unit — Enum validation: reject invalid theme/status values

## Testability Notes
- No complex service logic in this feature — straightforward CRUD. All endpoints are directly testable via HTTP.
- Filtering is client-side only, so no backend filter logic to test. Frontend filter tests will need component-level testing.
- UUID primary key means tests cannot predict IDs — must capture from POST response.
