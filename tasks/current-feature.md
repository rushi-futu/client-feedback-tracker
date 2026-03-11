# Client Feedback CRUD

Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md (APPROVED)
Contract: api-contract.yaml

## Backend Tasks

- [ ] BE-01: Model — Create `backend/app/models/feedback.py` with Feedback SQLAlchemy model (id, client_name, summary, detail, theme, status, created_at, updated_at)
- [ ] BE-02: Schemas — Create `backend/app/schemas/feedback.py` with FeedbackCreate, FeedbackUpdate, FeedbackRead Pydantic schemas plus Theme and FeedbackStatus enums
- [ ] BE-03: Router — Create `backend/app/routers/feedback.py` with GET list, GET by id, POST, PATCH, DELETE endpoints following existing CRUD pattern
- [ ] BE-04: App registration — Register feedback router in `backend/app/main.py`
- [ ] BE-05: Migration — Generate Alembic migration for feedback table via `alembic revision --autogenerate`
- [ ] BE-06: Alembic env — Import feedback model in `backend/alembic/env.py` so autogenerate detects it

## Frontend Tasks

- [ ] FE-01: Types — Add FeedbackItem, FeedbackCreate, FeedbackUpdate TypeScript interfaces to `frontend/src/types/index.ts` matching backend schemas
- [ ] FE-02: API functions — Add getAllFeedback, getFeedback, createFeedback, updateFeedback, deleteFeedback to `frontend/src/lib/api.ts`
- [ ] FE-03: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx` — table with columns: Client, Summary, Theme, Status, Date Logged, Actions (Edit link). Empty states per ui-spec.
- [ ] FE-04: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx` — client name text input, theme dropdown, status dropdown, clear filters link. Client-side filtering, no API call.
- [ ] FE-05: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx` — reusable form for both create and edit mode. Fields: client_name, summary, detail, theme, status. Inline validation.
- [ ] FE-06: FeedbackListPage — `frontend/src/app/feedback/page.tsx` — fetches all feedback, renders FilterBar + FeedbackTable + "Log Feedback" button
- [ ] FE-07: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx` — renders FeedbackForm in create mode with cancel link
- [ ] FE-08: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx` — fetches single item, renders FeedbackForm in edit mode + delete button with confirm
- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx` — redirect `/` to `/feedback`

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — CRUD lifecycle: create → read → update status → delete. Verify 201, 200, 200, 204.
- [ ] T-02: Integration — 404 on GET/PATCH/DELETE with non-existent id
- [ ] T-03: Integration — 422 on POST with missing required fields (client_name, summary, theme, status)
- [ ] T-04: Integration — 422 on POST/PATCH with invalid theme or status enum value
- [ ] T-05: Integration — PATCH with partial fields (only status) leaves other fields unchanged
- [ ] T-06: Integration — GET list returns items sorted by created_at descending
- [ ] T-07: Contract — Verify FeedbackRead response shape matches schema (all required fields present, correct types)
- [ ] T-08: Unit — Enum validation for Theme and FeedbackStatus values

## Testability Notes

- No complex service logic — this is straightforward CRUD. Router functions interact directly with the DB session following existing patterns.
- No service layer needed for this feature — business logic is minimal (enum validation handled by Pydantic, sorting by created_at in query).
- Client-side filtering means no backend filter logic to test — frontend tests should cover filter behavior.
- The detail field being optional (nullable) should be tested in both create and update paths.
