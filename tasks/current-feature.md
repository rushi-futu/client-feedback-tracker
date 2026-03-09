# Client Feedback Logging
Status: PENDING_CONTRACT_APPROVAL
Feature intent: CLAUDE.md + user story (design/ui-spec.md not yet produced — PM should run visual agent)
Contract: api-contract.yaml § Feature: Client Feedback Logging

---

## Backend Tasks

- [ ] BE-01: Model — Create `backend/app/models/feedback.py`
      SQLAlchemy model for `feedback` table.
      Columns: id (PK), client_name (String 255 NOT NULL), content (Text NOT NULL),
      theme (SAEnum FeedbackTheme NOT NULL), actioned (Boolean NOT NULL default False),
      created_at (timestamptz server default), updated_at (timestamptz server default + onupdate).

- [ ] BE-02: Alembic migration — autogenerate after BE-01 is complete.
      Run: `alembic revision --autogenerate -m "add feedback table"`
      Verify: migration creates `feedback` table with all columns and correct enum type.

- [ ] BE-03: Pydantic schemas — Create `backend/app/schemas/feedback.py`
      Three classes: FeedbackCreate, FeedbackUpdate, FeedbackRead.
      FeedbackTheme enum lives in this file; import it into the model.
      Exact field shapes per api-contract.yaml.

- [ ] BE-04: Router — Create `backend/app/routers/feedback.py`
      Five endpoints as defined in api-contract.yaml:
        GET  /feedback/       — list with query param filters (client_name, theme, actioned)
        POST /feedback/       — create, return 201
        GET  /feedback/{id}   — single item, 404 if not found
        PATCH /feedback/{id}  — partial update, 404 if not found
        DELETE /feedback/{id} — delete, 204, 404 if not found
      Filter logic for GET /feedback/ belongs in the router (simple WHERE clause via ORM).
      Register router in `backend/app/main.py`.

- [ ] BE-05: Register router — In `backend/app/main.py` add:
      `from app.routers import feedback` and `app.include_router(feedback.router)`.

---

## Frontend Tasks

- [ ] FE-01: TypeScript types — Extend `frontend/src/types/index.ts`
      Add: FeedbackRead, FeedbackCreate, FeedbackUpdate, FeedbackTheme.
      Must match api-contract.yaml schemas field-for-field (snake_case matches backend).

- [ ] FE-02: API functions — Extend `frontend/src/lib/api.ts`
      Add five functions:
        listFeedback(filters?: { client_name?: string; theme?: string; actioned?: boolean }) → FeedbackRead[]
        createFeedback(body: FeedbackCreate) → FeedbackRead
        getFeedback(id: number) → FeedbackRead
        updateFeedback(id: number, body: FeedbackUpdate) → FeedbackRead
        deleteFeedback(id: number) → void
      All follow existing fetch pattern in api.ts.

- [ ] FE-03: FeedbackCard component — `frontend/src/components/feedback/FeedbackCard.tsx`
      Client component (interactive — actioned toggle + delete button).
      Props: feedback: FeedbackRead, onUpdate: (updated: FeedbackRead) => void, onDelete: (id: number) => void.
      Displays: client_name, content, theme badge (colour-coded), actioned toggle, delete button.
      Calls updateFeedback on actioned toggle; calls deleteFeedback on delete.

- [ ] FE-04: ThemeBadge component — `frontend/src/components/feedback/ThemeBadge.tsx`
      Server component (no interactivity). Props: theme: FeedbackTheme.
      Renders a colour-coded pill: ux → blue, performance → orange, support → green.

- [ ] FE-05: CreateFeedbackForm component — `frontend/src/components/feedback/CreateFeedbackForm.tsx`
      Client component (form state, submission).
      Fields: client_name (text), content (textarea), theme (select).
      On submit: calls createFeedback, calls onCreated callback.
      Validation: all fields required. Display 422 errors from API.

- [ ] FE-06: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx`
      Client component (controls filter state).
      Controls: client_name (text input), theme (select with blank "All" option),
      actioned (select: All / Open / Actioned).
      On change: calls onFilterChange callback.

- [ ] FE-07: FeedbackBoard component — `frontend/src/components/feedback/FeedbackBoard.tsx`
      Client component (owns list state + filter state).
      Fetches feedback via listFeedback on mount and on filter change.
      Renders: FilterBar + list of FeedbackCards.
      Handles onUpdate and onDelete callbacks from FeedbackCard to update local state.

- [ ] FE-08: Home page — `frontend/src/app/page.tsx`
      Server component (initial page shell).
      Renders: page heading + FeedbackBoard + CreateFeedbackForm.
      CreateFeedbackForm sits above or alongside the board; on submit, board re-fetches.

---

## Test Tasks (tester agent only — do not build during feature build)

- [ ] T-01: Integration — `backend/tests/test_feedback.py`
      Cover all five endpoints:
        - POST creates item, returns 201 with correct shape
        - POST with missing field returns 422
        - POST with invalid theme returns 422
        - GET / returns all items
        - GET /?client_name= filters correctly
        - GET /?theme= filters correctly
        - GET /?actioned= filters correctly
        - GET /{id} returns correct item
        - GET /{id} with unknown id returns 404
        - PATCH /{id} marks actioned=true, returns updated item
        - PATCH /{id} updates theme, returns updated item
        - PATCH /{id} with unknown id returns 404
        - PATCH /{id} with invalid theme returns 422
        - DELETE /{id} returns 204
        - DELETE /{id} with unknown id returns 404
        - DELETE /{id} then GET /{id} returns 404 (verify deletion)

- [ ] T-02: Contract shape — Verify FeedbackRead response includes all required fields
      (id, client_name, content, theme, actioned, created_at, updated_at) in correct types.

- [ ] T-03: Filter combination — Test GET /feedback/ with multiple filters applied simultaneously
      to confirm AND logic, not OR.

---

## Testability Notes

- The GET /feedback/ filter logic is inline ORM WHERE chaining in the router.
  This is intentional (no service layer needed for simple filters) and is
  directly testable via the TestClient with a seeded SQLite test DB.
- No external service dependencies — all logic is self-contained in the DB.
- The `actioned` toggle on FeedbackCard (FE) makes a PATCH call; can be tested
  by mocking api.ts in component tests.
