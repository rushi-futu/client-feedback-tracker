# Client Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

## Backend Tasks
- [ ] BE-01: Model — Create `Feedback` SQLAlchemy model with fields: id, client_name, summary, detail, theme (enum), status (enum), date_logged. Table name: `feedback_items`.
- [ ] BE-02: Migration — Autogenerate Alembic migration for `feedback_items` table
- [ ] BE-03: Schemas — Create Pydantic schemas: `FeedbackCreate`, `FeedbackUpdate`, `FeedbackRead`, plus `Theme` and `Status` enums
- [ ] BE-04: Router — Create `/feedback` router with 5 endpoints: list (GET /), get (GET /{id}), create (POST /), update (PATCH /{id}), delete (DELETE /{id})
- [ ] BE-05: App wiring — Register feedback router in main.py, update CORS, import model in alembic env.py

## Frontend Tasks
- [ ] FE-01: Types — Create TypeScript types matching backend schemas: `FeedbackItem`, `FeedbackCreate`, `FeedbackUpdate`, `Theme`, `Status` enums
- [ ] FE-02: API functions — Add to `lib/api.ts`: `listFeedback()`, `getFeedback(id)`, `createFeedback(data)`, `updateFeedback(id, data)`, `deleteFeedback(id)`
- [ ] FE-03: AppHeader component — Top bar with title and "Log Feedback" nav button (ui-spec § AppHeader)
- [ ] FE-04: FilterBar component — Search input + theme dropdown + status dropdown + clear filters button, all client-side (ui-spec § FilterBar)
- [ ] FE-05: FeedbackTable component — Data table with columns: Client, Summary, Theme badge, Status badge, Date Logged, Edit link. Includes both empty states (ui-spec § FeedbackTable, EmptyState)
- [ ] FE-06: FeedbackForm component — Shared form for create/edit modes with inline validation on blur. Delete button in edit mode with confirm() (ui-spec § FeedbackForm)
- [ ] FE-07: Feedback List page (`/feedback`) — Composes AppHeader + FilterBar + FeedbackTable, fetches all feedback on load
- [ ] FE-08: Log Feedback page (`/feedback/new`) — FormHeader + FeedbackForm in create mode
- [ ] FE-09: Edit Feedback page (`/feedback/[id]`) — FormHeader + FeedbackForm in edit mode, includes NotFoundState
- [ ] FE-10: Root redirect — `/` redirects to `/feedback`, 404 catch-all redirects to `/feedback`

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — All 5 feedback endpoints: happy path + 404s + 422 validation failures
- [ ] T-02: Integration — List endpoint returns items in date_logged descending order
- [ ] T-03: Integration — Create with missing required fields returns 422
- [ ] T-04: Integration — PATCH with partial fields updates only those fields
- [ ] T-05: Integration — DELETE on non-existent ID returns 404
- [ ] T-06: Contract — Response shapes match FeedbackRead schema exactly (field names, types, nullability)
- [ ] T-07: Unit — Theme and Status enum values match contract exactly

## Testability Notes
- No service layer complexity for MVP — router handles CRUD directly via ORM. If business logic is added later (e.g. immutability rules for "Actioned" items), extract to a service and test in isolation.
- Client-side filtering has no backend component to test — frontend tests should cover filter logic.
- The `date_logged` field uses server_default, so tests must account for auto-generated timestamps rather than expecting exact values.
