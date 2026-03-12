# Client Feedback CRUD
Status: PENDING_PLAN_APPROVAL
UI Spec: design/ui-spec.md (APPROVED)
Contract: api-contract.yaml#Client Feedback CRUD

## Backend Tasks
- [x] BE-01: Model — Create `Feedback` SQLAlchemy model in `app/backend/app/models/feedback.py` with columns: id (int PK), client_name (varchar 255), summary (varchar 500), detail (text nullable), theme (SAEnum), status (SAEnum default "Open"), date_logged (timestamptz server_default now), updated_at (timestamptz)
- [x] BE-02: Schema — Create Pydantic schemas `FeedbackCreate`, `FeedbackUpdate`, `FeedbackRead` in `app/backend/app/schemas/feedback.py` with `Theme` and `Status` enums
- [x] BE-03: Router — Create FastAPI router in `app/backend/app/routers/feedback.py` with 5 endpoints: GET /, GET /{id}, POST /, PATCH /{id}, DELETE /{id}. GET / must return items ordered by date_logged descending.
- [x] BE-04: App wiring — Register feedback router in `app/backend/app/main.py`. Update `alembic/env.py` to import feedback model.
- [x] BE-05: Migration — Run `alembic revision --autogenerate` to create feedback table migration

## Frontend Tasks
- [ ] FE-01: Types — Add TypeScript interfaces `FeedbackItem`, `FeedbackCreate`, `FeedbackUpdate` and enums `Theme`, `Status` to `app/frontend/src/types/index.ts`
- [ ] FE-02: API functions — Add `listFeedback()`, `getFeedback(id)`, `createFeedback(data)`, `updateFeedback(id, data)`, `deleteFeedback(id)` to `app/frontend/src/lib/api.ts`
- [ ] FE-03: AppHeader component — Top bar with title and "Log Feedback" nav button. Maps to ui-spec § AppHeader.
- [ ] FE-04: FilterBar component — Search input (client name), theme dropdown, status dropdown, "Clear filters" button. Client-side filtering logic. Maps to ui-spec § FilterBar.
- [ ] FE-05: FeedbackTable component — Data table with columns: Client, Summary, Theme (badge), Status (badge), Date Logged (formatted), Edit link. Includes both empty states. Maps to ui-spec § FeedbackTable + EmptyState.
- [ ] FE-06: FeedbackForm component — Shared form for create/edit modes. Fields: client_name, summary, detail, theme, status. Inline validation on blur. Maps to ui-spec § FeedbackForm.
- [ ] FE-07: Feedback List page — `/feedback` route. Composes AppHeader + FilterBar + FeedbackTable. Server component that fetches data. Maps to ui-spec § Feedback List.
- [ ] FE-08: Log Feedback page — `/feedback/new` route. Composes FormHeader + FeedbackForm (create mode). Maps to ui-spec § Log Feedback.
- [ ] FE-09: Edit Feedback page — `/feedback/[id]` route. Composes FormHeader + FeedbackForm (edit mode) + Delete button + NotFoundState. Maps to ui-spec § Edit Feedback.
- [ ] FE-10: Root redirect — `/` redirects to `/feedback`. 404 catch-all redirects to `/feedback`.

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — All 5 CRUD endpoints: happy paths, 404 on missing ID, 422 on invalid body, 204 on delete
- [ ] T-02: Integration — GET /feedback/ returns items sorted by date_logged descending
- [ ] T-03: Integration — POST /feedback/ with missing required fields returns 422
- [ ] T-04: Integration — PATCH /feedback/{id} partial update (only status change, only theme change)
- [ ] T-05: Integration — DELETE /feedback/{id} twice returns 204 then 404
- [ ] T-06: Contract — Response shape of FeedbackRead matches api-contract.yaml (all required fields present, correct types)
- [ ] T-07: Unit — Theme and Status enum values match contract exactly
- [ ] T-08: Adversarial — XSS in client_name/summary/detail fields, SQL injection via ID param, empty string vs null for optional fields

## Testability Notes
- All endpoints are straightforward CRUD — no complex service logic, no external dependencies. Easily testable with SQLite test DB per existing conftest pattern.
- Filtering is client-side only (no server query params) so backend tests focus purely on CRUD correctness and ordering.
- The `date_logged` field uses server_default so tests need to account for auto-set timestamps (not passed in request body).
