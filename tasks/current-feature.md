# Client Feedback Tracker — Core Feedback CRUD
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md
Contract: api-contract.yaml

---

## Backend Tasks

- [ ] BE-01: Migration — create `feedback_items` table with columns: id (UUID PK), client_name (varchar NOT NULL), summary (varchar NOT NULL), detail (text nullable), theme (enum NOT NULL), status (enum NOT NULL default 'open'), created_at (timestamptz server default), updated_at (timestamptz server default + onupdate)
- [ ] BE-02: Model — `backend/app/models/feedback_item.py` — SQLAlchemy model mapping to `feedback_items` table; enums `FeedbackTheme` and `FeedbackStatus` defined here or in schemas and imported
- [ ] BE-03: Schemas — `backend/app/schemas/feedback_item.py` — three Pydantic classes: `FeedbackItemCreate`, `FeedbackItemUpdate`, `FeedbackItemRead`; include `FeedbackTheme` and `FeedbackStatus` str enums
- [ ] BE-04: Router — `backend/app/routers/feedback.py` — five endpoints: GET /feedback/, POST /feedback/, GET /feedback/{id}, PATCH /feedback/{id}, DELETE /feedback/{id}; register router in `backend/app/main.py`
- [ ] BE-05: Ordering — GET /feedback/ must return items sorted by `created_at` descending (newest first) — enforced at query level, not application level

---

## Frontend Tasks

- [ ] FE-01: Types — `frontend/src/types/index.ts` — add TypeScript interfaces `FeedbackItem`, `FeedbackItemCreate`, `FeedbackItemUpdate`; add enums/string-literal unions `FeedbackTheme` and `FeedbackStatus` mirroring backend schemas exactly
- [ ] FE-02: API functions — `frontend/src/lib/api.ts` — add five typed functions: `listFeedback()`, `createFeedback(body)`, `getFeedback(id)`, `updateFeedback(id, body)`, `deleteFeedback(id)`; all use `fetch` with base URL from env; typed return values use FE-01 types
- [ ] FE-03: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx` — client component; three controls: free-text client name input, theme dropdown (All + FeedbackTheme values), status dropdown (All + FeedbackStatus values); emits filter state up via props; "Clear filters" resets all three; maps to ui-spec.md § FilterBar
- [ ] FE-04: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx` — client component; columns: Client, Summary, Theme, Status, Date Logged, Actions; Edit link per row → `/feedback/[id]`; two empty states (no items / no filter matches); maps to ui-spec.md § FeedbackTable
- [ ] FE-05: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx` — client component; accepts `mode: "create" | "edit"` and optional `defaultValues`; fields: client_name, summary, detail, theme, status; inline validation for required fields; different submit label per mode; maps to ui-spec.md § FeedbackForm
- [ ] FE-06: FeedbackListPage — `frontend/src/app/feedback/page.tsx` — server component; fetches all items via `listFeedback()`; renders FilterBar + FeedbackTable with client-side filter logic; "Log Feedback" button → `/feedback/new`; maps to ui-spec.md § FeedbackListPage
- [ ] FE-07: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx` — server component shell; renders FeedbackForm in create mode; on success → redirect to `/feedback`; Cancel link → `/feedback`; maps to ui-spec.md § NewFeedbackPage
- [ ] FE-08: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx` — server component; fetches single item via `getFeedback(id)`; renders FeedbackForm in edit mode pre-populated; Delete button with browser confirm → `deleteFeedback(id)` → redirect to `/feedback`; Cancel link → `/feedback`; maps to ui-spec.md § FeedbackDetailPage
- [ ] FE-09: Root redirect — `frontend/src/app/page.tsx` — redirect `/` → `/feedback`

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/ — returns 200 list; empty list when no items; sorted newest-first
- [ ] T-02: Integration — POST /feedback/ — 201 with valid body; 422 when client_name missing; 422 when summary missing; 422 when theme missing; 422 with invalid enum value; default status applied when omitted
- [ ] T-03: Integration — GET /feedback/{id} — 200 with existing id; 404 with non-existent id; 404 with malformed uuid
- [ ] T-04: Integration — PATCH /feedback/{id} — 200 partial update (status only); 200 full update; 404 with unknown id; 422 with invalid enum value; verify updated_at changes
- [ ] T-05: Integration — DELETE /feedback/{id} — 204 on success; 404 for unknown id; verify item no longer returned in GET /feedback/
- [ ] T-06: Contract — FeedbackItemRead response shape matches schema exactly on all endpoints that return it
- [ ] T-07: Unit — ordering: GET /feedback/ always returns items newest-first regardless of insert order
- [ ] T-08: Unit — PATCH semantics: fields not included in request body are not modified

---

## Testability Notes

- The router is thin (HTTP logic only) and the service layer is minimal (CRUD + ordering) — all functions are straightforward to test via `TestClient` with SQLite in-memory test DB per the existing `conftest.py` pattern
- `updated_at` relies on `onupdate=func.now()` — SQLite may not honour this the same way as PostgreSQL; T-04 should test against PostgreSQL or mock the timestamp
- Client-side filtering in FeedbackListPage means there is no server-side filter logic to unit-test; integration tests for the list endpoint do not need to cover filter permutations
