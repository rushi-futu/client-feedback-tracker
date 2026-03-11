# Client Feedback Tracker
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

## Backend Tasks
- [ ] BE-01: model — FeedbackItem SQLAlchemy model with uuid PK, enums, timestamps
- [ ] BE-02: schema — FeedbackItemCreate, FeedbackItemUpdate, FeedbackItemRead Pydantic schemas
- [ ] BE-03: router — /feedback/ CRUD endpoints (GET list, POST, GET by id, PATCH, DELETE)
- [ ] BE-04: service — filtering logic (client_name partial match, theme/status exact match)
- [ ] BE-05: migration — create feedback_items table with both enums
- [ ] BE-06: scaffolding — pyproject.toml, main.py, config.py, database.py, alembic setup

## Frontend Tasks
- [ ] FE-01: types — TypeScript interfaces matching backend schemas
- [ ] FE-02: api client — lib/api.ts with all 5 endpoint functions
- [ ] FE-03: FeedbackTable — table component with columns per ui-spec
- [ ] FE-04: FilterBar — client text input, theme dropdown, status dropdown
- [ ] FE-05: FeedbackForm — create/edit mode with validation
- [ ] FE-06: FeedbackListPage — /feedback route, combines FilterBar + FeedbackTable
- [ ] FE-07: NewFeedbackPage — /feedback/new route
- [ ] FE-08: FeedbackDetailPage — /feedback/[id] route with delete button
- [ ] FE-09: scaffolding — Next.js app shell, layout, root redirect

## Test Tasks (tester agent only — do not build)
- [ ] T-01: Integration — all 5 endpoints, happy path + error cases
- [ ] T-02: Unit — filtering logic (partial match, case-insensitive)
- [ ] T-03: Contract — response shapes match FeedbackItemRead exactly
- [ ] T-04: Adversarial — empty strings, missing fields, invalid enums, uuid format

## Testability Notes
- Filtering is server-side (query params) — easy to test via HTTP
- UUID generation should be deterministic in tests (use factory fixtures)
