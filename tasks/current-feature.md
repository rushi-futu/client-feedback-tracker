# Client Feedback CRUD with Filtering
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

## Backend Tasks
- [x] BE-01: Model — Create `FeedbackItem` SQLAlchemy model with fields: id, client_name, summary, detail, theme (enum), status (enum), date_logged, created_at, updated_at
- [ ] BE-02: Migration — Auto-generate Alembic migration for `feedback_items` table (BLOCKED: alembic/env.py requires human creation — see escalation)
- [x] BE-03: Schemas — Create `FeedbackCreate`, `FeedbackUpdate`, `FeedbackRead` Pydantic schemas with `Theme` and `Status` enums
- [x] BE-04: Router — Create `/feedback` router with 5 endpoints: list (with search/theme/status query params), get by id, create, update (PATCH), delete
- [x] BE-05: Main — Register feedback router in `main.py`, update CORS and app metadata
- [x] BE-06: Database — Set up SQLAlchemy engine, session, Base, and `get_db` dependency
- [x] BE-07: Config — Set up pydantic-settings with DATABASE_URL

## Frontend Tasks
- [ ] FE-01: Types — Create TypeScript interfaces matching backend schemas: `FeedbackItem`, `FeedbackCreate`, `FeedbackUpdate`, `Theme`, `Status`
- [ ] FE-02: API functions — Add `listFeedback(filters?)`, `getFeedback(id)`, `createFeedback(data)`, `updateFeedback(id, data)`, `deleteFeedback(id)` to `lib/api.ts`
- [ ] FE-03: AppHeader — Top bar with title and "Log Feedback" navigation button
- [ ] FE-04: FilterBar — Search input + theme dropdown + status dropdown + clear filters button; manages filter state
- [ ] FE-05: FeedbackTable — Data table displaying feedback items with client, summary, theme badge, status badge, date, edit link; includes empty states
- [ ] FE-06: FeedbackForm — Reusable form for create and edit modes with validation; includes delete button in edit mode
- [ ] FE-07: Feedback List page (`/feedback`) — Composes AppHeader, FilterBar, FeedbackTable; fetches data with filters
- [ ] FE-08: Log Feedback page (`/feedback/new`) — FormHeader + FeedbackForm in create mode
- [ ] FE-09: Edit Feedback page (`/feedback/[id]`) — FormHeader + FeedbackForm in edit mode + NotFoundState
- [ ] FE-10: Root redirect — `/` redirects to `/feedback`; 404 catch-all redirects to `/feedback`
- [ ] FE-11: Layout — Root layout with metadata and global styles

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — All 5 CRUD endpoints: happy path + 404s + validation failures
- [ ] T-02: Integration — GET /feedback/ filtering: search by client_name, filter by theme, filter by status, combined filters, no-match returns empty array
- [ ] T-03: Unit — Enum validation: invalid theme/status values rejected
- [ ] T-04: Contract — Response shapes match FeedbackRead schema for all endpoints
- [ ] T-05: Edge cases — Delete non-existent item, update with empty body, create with extra fields, SQL injection in search param

## Testability Notes
- Filtering logic lives in the router (query construction). If it grows complex, extract to a service function for isolated unit testing.
- No service layer needed for v1 — business logic is simple CRUD. Router-level integration tests are sufficient.
- Search is case-insensitive substring match on `client_name` only — use SQL `ILIKE` on PostgreSQL. Test with SQLite in tests may need `LIKE` with `COLLATE NOCASE` or a test-specific override.
