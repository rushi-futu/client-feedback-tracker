# Client Feedback Tracker — Core CRUD Feature
Status: PENDING_CONTRACT_APPROVAL
UI Spec: design/ui-spec.md (APPROVED 2026-03-11)
Contract: api-contract.yaml (PENDING_APPROVAL)
Created: 2026-03-11

---

## Scope Summary

Enable client success managers to:
1. View all feedback items in a filterable list (`/feedback`)
2. Log a new feedback item (`/feedback/new`)
3. Edit an existing feedback item, including changing its status (`/feedback/[id]`)
4. Delete a feedback item from the edit page

---

## Backend Tasks

- [ ] BE-01: Migration — Create `feedback_items` table
      Columns: id (UUID PK), client_name (VARCHAR NOT NULL), summary (VARCHAR NOT NULL),
      detail (TEXT nullable), theme (SAEnum NOT NULL), status (SAEnum NOT NULL default 'open'),
      created_at (TIMESTAMPTZ server default), updated_at (TIMESTAMPTZ server default + onupdate).
      Run via `alembic revision --autogenerate`.

- [ ] BE-02: Model — `backend/app/models/feedback_item.py`
      SQLAlchemy model for `feedback_items` table. Use SAEnum for theme and status columns.
      No foreign keys (client is free text, no managed client entity).

- [ ] BE-03: Schemas — `backend/app/schemas/feedback_item.py`
      Three classes: FeedbackItemCreate, FeedbackItemUpdate, FeedbackItemRead.
      ThemeEnum and StatusEnum defined here (str, Enum).
      FeedbackItemRead must have `model_config = {"from_attributes": True}`.
      Match field names and types exactly as specified in api-contract.yaml.

- [ ] BE-04: Router — `backend/app/routers/feedback.py`
      Five endpoints per api-contract.yaml:
        GET  /feedback/          → list, ordered by created_at DESC
        POST /feedback/          → create, returns 201
        GET  /feedback/{id}      → get by UUID, 404 if not found
        PATCH /feedback/{id}     → partial update, 404 if not found
        DELETE /feedback/{id}    → delete, 204 on success, 404 if not found
      Prefix: /feedback, tag: feedback.

- [ ] BE-05: Register router — `backend/app/main.py`
      Import and include feedback router. Add to CORS allowed origins if needed.

---

## Frontend Tasks

- [ ] FE-01: Types — `frontend/src/types/index.ts`
      Add TypeScript interfaces: FeedbackItem, FeedbackItemCreate, FeedbackItemUpdate.
      ThemeEnum and StatusEnum as TypeScript union types or const enums.
      Must mirror Pydantic schemas field-for-field (same names, compatible types).

- [ ] FE-02: API functions — `frontend/src/lib/api.ts`
      Add five functions:
        listFeedback(): Promise<FeedbackItem[]>
        createFeedback(data: FeedbackItemCreate): Promise<FeedbackItem>
        getFeedback(id: string): Promise<FeedbackItem>
        updateFeedback(id: string, data: FeedbackItemUpdate): Promise<FeedbackItem>
        deleteFeedback(id: string): Promise<void>

- [ ] FE-03: Root redirect — `frontend/src/app/page.tsx`
      Redirect `/` → `/feedback` (Next.js redirect or `notFound`/`redirect` from `next/navigation`).

- [ ] FE-04: FeedbackListPage — `frontend/src/app/feedback/page.tsx`
      Server component. Fetches all feedback on mount via listFeedback().
      Renders FilterBar and FeedbackTable. Contains "Log Feedback" button → /feedback/new.
      Maps to ui-spec.md § `/feedback — Feedback List Page`.

- [ ] FE-05: FilterBar component — `frontend/src/components/feedback/FilterBar.tsx`
      Client component (needs interactivity/state).
      Three controls: client name text input, theme dropdown, status dropdown.
      Filters applied immediately on change (no submit).
      "Clear filters" link resets all three.
      Maps to ui-spec.md § FilterBar.

- [ ] FE-06: FeedbackTable component — `frontend/src/components/feedback/FeedbackTable.tsx`
      Client component (receives filtered items as prop from FeedbackListPage).
      Columns: Client, Summary, Theme, Status, Date Logged, Actions.
      "Edit" link per row → /feedback/[id].
      Empty states: "No feedback logged yet. Log your first item →" (no items at all)
      and "No items match your filters." (filtered empty state).
      Maps to ui-spec.md § FeedbackTable.

- [ ] FE-07: FeedbackForm component — `frontend/src/components/feedback/FeedbackForm.tsx`
      Client component. Used in both create and edit modes.
      Fields: client_name (text, required), summary (text, required), detail (textarea, optional),
      theme (select, required), status (select, required, default open).
      Inline validation errors for required fields.
      Submit label differs by mode: "Save Feedback" (create) vs "Save Changes" (edit).
      On success: redirect to /feedback.
      Maps to ui-spec.md § FeedbackForm (create mode) and FeedbackForm (edit mode).

- [ ] FE-08: NewFeedbackPage — `frontend/src/app/feedback/new/page.tsx`
      Page title: "Log Feedback". Contains FeedbackForm in create mode.
      Cancel link → /feedback.
      Maps to ui-spec.md § `/feedback/new — New Feedback Form`.

- [ ] FE-09: FeedbackDetailPage — `frontend/src/app/feedback/[id]/page.tsx`
      Server component. Fetches item by id via getFeedback(id).
      Page title: "Edit Feedback". Contains FeedbackForm in edit mode (pre-populated).
      Cancel link → /feedback.
      Delete button (secondary/destructive style, bottom of form). Confirms before deleting
      (browser confirm dialog). On confirm: calls deleteFeedback(id), redirects to /feedback.
      Maps to ui-spec.md § `/feedback/[id] — Feedback Detail / Edit`.

---

## Test Tasks (tester agent only — do not build)

- [ ] T-01: Integration — GET /feedback/
      Happy path: returns 200 with list[FeedbackItemRead].
      Empty list: returns 200 with [].
      Sort order: items returned newest first.
      Response shape: all required fields present and typed correctly.

- [ ] T-02: Integration — POST /feedback/
      Happy path: valid body → 201 with FeedbackItemRead.
      Default status: omit status in body → created item has status=open.
      Missing required fields: omit client_name → 422 with detail.
      Missing required fields: omit summary → 422 with detail.
      Missing required fields: omit theme → 422 with detail.
      Invalid enum: theme="invalid" → 422.
      Adversarial: empty string client_name → 422 (empty string should fail validation).

- [ ] T-03: Integration — GET /feedback/{id}
      Happy path: existing UUID → 200 with FeedbackItemRead.
      Not found: non-existent UUID → 404 with detail string.
      Bad input: non-UUID string as id → 422.

- [ ] T-04: Integration — PATCH /feedback/{id}
      Happy path: update status only → 200, other fields unchanged.
      Happy path: update all fields → 200, all fields updated.
      Not found: non-existent UUID → 404.
      Invalid enum value: status="bad" → 422.
      Adversarial: PATCH with empty body → 200, nothing changed (all fields optional).

- [ ] T-05: Integration — DELETE /feedback/{id}
      Happy path: existing UUID → 204, no body.
      Not found: non-existent UUID → 404.
      Idempotency: delete twice → second call returns 404 (not 204).

- [ ] T-06: Contract — FeedbackItemRead shape
      All list/get/create/update responses match FeedbackItemRead schema exactly.
      No extra fields. No missing required fields. UUID format on id.
      Datetime fields are timezone-aware ISO 8601 strings.

- [ ] T-07: Unit — StatusEnum and ThemeEnum completeness
      All five theme values accepted. All three status values accepted.
      No unlisted values accepted.

---

## Testability Notes

- The feedback router contains no business logic beyond DB CRUD — services layer may be
  thin or absent for this feature. The router functions themselves are the unit under test.
  Tests should use the SQLite test DB pattern from data-patterns.md (no mocking the ORM).
- Updated_at behaviour should be verified: PATCH must update the `updated_at` timestamp.
  SQLite's `onupdate` behaviour differs from PostgreSQL — integration tests should verify
  this works in the test DB, or the tester should flag it for manual verification.
- Delete confirmation is a browser `confirm()` dialog — this cannot be tested in the
  backend test suite. Frontend integration tests (if added) would need to mock window.confirm.
