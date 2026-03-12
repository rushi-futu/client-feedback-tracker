# Client Feedback CRUD + Filtering
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md (APPROVED)
Contract: api-contract.yaml

## Backend Tasks
- [x] BE-01: Model — Create `Feedback` SQLAlchemy model with fields: id, client_name, summary, detail, theme (enum), status (enum), date_logged, updated_at
- [x] BE-02: Migration — Auto-generate Alembic migration for `feedback` table
- [x] BE-03: Schemas — Create `FeedbackCreate`, `FeedbackUpdate`, `FeedbackRead` Pydantic schemas + `Theme` and `Status` enums
- [x] BE-04: Router — Create `/feedback` router with five endpoints: list (GET /), get (GET /{id}), create (POST /), update (PATCH /{id}), delete (DELETE /{id})
- [x] BE-05: List filtering — Implement query-param filtering on GET /feedback/ (search by client_name substring, exact match on theme, exact match on status)
- [x] BE-06: App wiring — Register feedback router in main.py, import model in alembic env.py

## Frontend Tasks
- [x] FE-01: Types — Create TypeScript interfaces matching backend schemas: `FeedbackItem`, `FeedbackCreate`, `FeedbackUpdate`, `Theme` enum, `Status` enum
- [x] FE-02: API functions — Add to `lib/api.ts`: `listFeedback(params?)`, `getFeedback(id)`, `createFeedback(data)`, `updateFeedback(id, data)`, `deleteFeedback(id)`
- [x] FE-03: AppHeader component — App title + "Log Feedback" nav button (ui-spec § AppHeader)
- [x] FE-04: FilterBar component — Search input + theme dropdown + status dropdown + clear filters (ui-spec § FilterBar)
- [x] FE-05: FeedbackTable component — Data table with columns: Client, Summary, Theme badge, Status badge, Date Logged, Edit link; includes both empty states (ui-spec § FeedbackTable, EmptyState)
- [x] FE-06: FeedbackForm component — Shared form for create/edit modes with validation; delete button in edit mode (ui-spec § FeedbackForm)
- [x] FE-07: Feedback List page — Route /feedback composing AppHeader + FilterBar + FeedbackTable (ui-spec § Feedback List)
- [x] FE-08: Log Feedback page — Route /feedback/new with FormHeader + FeedbackForm in create mode (ui-spec § Log Feedback)
- [x] FE-09: Edit Feedback page — Route /feedback/[id] with FormHeader + FeedbackForm in edit mode + NotFoundState (ui-spec § Edit Feedback)
- [x] FE-10: Layout + routing — Root layout, redirect / → /feedback, catch-all 404 → /feedback

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — All five CRUD endpoints: happy path + 404s + validation errors
- [ ] T-02: Integration — GET /feedback/ filtering: search substring, theme filter, status filter, combined filters, no-match returns empty list
- [ ] T-03: Unit — Schema validation: required fields, enum values, default status
- [ ] T-04: Contract — Response shapes match FeedbackRead schema exactly (field names, types, nullability)
- [ ] T-05: Edge cases — Empty string client_name, very long summary, SQL injection in search param, unknown theme/status values

## Testability Notes
- Filtering logic (search + theme + status) will be in the router/query layer. If it grows complex, extract to a service function for easier unit testing.
- No service layer is needed for v1 — CRUD is straightforward enough to live in routers per the existing codebase pattern. If business logic emerges later, extract then.
- Delete endpoint relies on browser `confirm()` on frontend — backend just deletes, no soft-delete complexity.
