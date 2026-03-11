# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

## Backend Tasks
- [ ] BE-01: Model — Create `FeedbackItem` SQLAlchemy model with uuid PK, client_name, summary, detail, theme (enum), status (enum), created_at, updated_at
- [ ] BE-02: Migration — Auto-generate Alembic migration for `feedback_items` table
- [ ] BE-03: Schemas — Create `FeedbackCreate`, `FeedbackUpdate`, `FeedbackRead` Pydantic schemas with `Theme` and `FeedbackStatus` enums
- [ ] BE-04: Router — Create `/feedback` router with GET list, GET by id, POST create, PATCH update, DELETE endpoints
- [ ] BE-05: App wiring — Register feedback router in `main.py`, update CORS, update alembic env.py model imports

## Frontend Tasks
- [ ] FE-01: Types — Create TypeScript types (`FeedbackItem`, `FeedbackCreate`, `FeedbackUpdate`, `Theme`, `FeedbackStatus`) matching backend schemas
- [ ] FE-02: API functions — Add `fetchFeedback`, `fetchFeedbackById`, `createFeedback`, `updateFeedback`, `deleteFeedback` to `lib/api.ts`
- [ ] FE-03: FilterBar component — Client name text input, Theme dropdown, Status dropdown, clear filters link (client-side filtering)
- [ ] FE-04: FeedbackTable component — Table with columns: Client, Summary, Theme, Status, Date Logged, Actions (Edit link). Two empty states.
- [ ] FE-05: FeedbackListPage — `/feedback` page composing FilterBar + FeedbackTable + "Log Feedback" button. Maps to ui-spec § FeedbackListPage
- [ ] FE-06: FeedbackForm component — Shared form for create and edit modes with validation (client_name + summary required)
- [ ] FE-07: NewFeedbackPage — `/feedback/new` page with FeedbackForm in create mode. Maps to ui-spec § NewFeedbackPage
- [ ] FE-08: FeedbackDetailPage — `/feedback/[id]` page with FeedbackForm in edit mode + delete button with confirmation. Maps to ui-spec § FeedbackDetailPage
- [ ] FE-09: Root redirect — `/` redirects to `/feedback`
- [ ] FE-10: Layout — Root layout with app title

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — CRUD lifecycle: create → read → update → delete. Verify 201/200/204 status codes and correct response shapes
- [ ] T-02: Integration — GET /feedback/ returns list; GET /feedback/{id} returns single item; GET /feedback/{nonexistent} returns 404
- [ ] T-03: Integration — POST /feedback/ with missing required fields returns 422
- [ ] T-04: Integration — PATCH /feedback/{id} with partial body updates only specified fields
- [ ] T-05: Integration — DELETE /feedback/{id} for nonexistent id returns 404
- [ ] T-06: Contract — All responses match FeedbackRead schema (field names, types, required fields)
- [ ] T-07: Unit — Enum validation: theme and status only accept defined values

## Testability Notes
- No complex service logic — this is straightforward CRUD with no business rules beyond validation
- All filtering is client-side per ui-spec, so no backend filter/query logic to test
- UUID primary keys mean tests need to capture the created id from POST response for subsequent operations
- Delete confirmation is browser-side (window.confirm) — not testable in API integration tests
