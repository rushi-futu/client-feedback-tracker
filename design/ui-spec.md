# UI Spec
Source: https://www.figma.com/make/vDiknMrMUS6GHtyv127HfZ/Client-Feedback-Tracker
Read: 2026-03-12
Status: APPROVED

## Summary

A tool for client success managers to log, browse, and manage feedback received from clients. Each feedback item is tagged with a theme (UX, Performance, Support, Pricing, Communication) and tracked through a status lifecycle (Open, In Progress, Actioned). The main interface is a filterable table of all feedback items, with dedicated forms for creating new feedback and editing/deleting existing items. The application is minimal and utilitarian — no dashboard, no analytics, no user accounts.

## Pages and Routes

| Route | Page Name | Purpose |
|-------|-----------|---------|
| / | (redirect) | Redirects to /feedback |
| /feedback | Feedback List | Browse, search, and filter all feedback items in a table |
| /feedback/new | Log Feedback | Form to create a new feedback item |
| /feedback/:id | Edit Feedback | Form to edit an existing feedback item, or delete it |
| * | (redirect) | 404 catch-all redirects to /feedback |

## Component Inventory

### Page: Feedback List (/feedback)

- **AppHeader** — Top bar with app title and primary action
  - Displays: "Client Feedback Tracker" title text
  - Interactions: "Log Feedback" button navigates to /feedback/new

- **FilterBar** — Search and filter controls above the table
  - Displays: Search input, theme dropdown, status dropdown, conditional "Clear filters" button
  - Interactions:
    - Text input filters by client name (placeholder: "Search client name...")
    - Theme dropdown filters by theme (options: All themes, UX, Performance, Support, Pricing, Communication)
    - Status dropdown filters by status (options: All statuses, Open, In Progress, Actioned)
    - "Clear filters" button (with X icon) appears when any filter is active; resets all filters
    - Filtering is client-side and immediate (no submit button)

- **FeedbackTable** — Data table showing all feedback items
  - Displays: Columns — Client, Summary, Theme (color-coded badge), Status (color-coded badge), Date Logged (formatted "Mon DD, YYYY"), Edit link
  - Interactions:
    - Row hover highlights (bg-gray-50)
    - "Edit" link in last column navigates to /feedback/:id

- **EmptyState (no data)** — Shown when no feedback exists at all
  - Displays: "No feedback logged yet. Log your first item ->"
  - Interactions: Inline link navigates to /feedback/new

- **EmptyState (no results)** — Shown when filters match nothing
  - Displays: "No items match your filters."
  - Interactions: none

### Page: Log Feedback (/feedback/new)

- **FormHeader** — Top bar with page title and cancel action
  - Displays: "Log Feedback" title
  - Interactions: "Cancel" link navigates back to /feedback

- **FeedbackForm (create mode)** — Form to log a new feedback item
  - Displays: Fields — Client Name (text input, required), Summary (text input, required), Detail (textarea, optional), Theme (select dropdown, required), Status (select dropdown, defaults to "Open")
  - Interactions:
    - Inline validation on blur for required fields (red border + error message)
    - On submit: validates all fields, creates item, navigates to /feedback
    - "Save Feedback" button (full-width, dark)

### Page: Edit Feedback (/feedback/:id)

- **FormHeader** — Top bar with page title and cancel action
  - Displays: "Edit Feedback" title
  - Interactions: "Cancel" link navigates back to /feedback

- **FeedbackForm (edit mode)** — Pre-filled form to edit an existing feedback item
  - Displays: Same fields as create mode, pre-populated with existing data
  - Interactions:
    - Same inline validation as create mode
    - "Save Changes" button (full-width, dark)
    - "Delete" button (full-width, red outline) — triggers browser confirm dialog, then deletes and navigates to /feedback

- **NotFoundState** — Shown when feedback ID does not exist
  - Displays: "Feedback item not found."
  - Interactions: "Return to list" link navigates to /feedback

## Data Shapes Implied by the UI

### FeedbackItem
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | Used in URL for edit route (/feedback/:id), auto-generated |
| clientName | string | yes | Shown in table "Client" column; text input in form; validated as required |
| summary | string | yes | Shown in table "Summary" column; text input in form; validated as required |
| detail | string | no | Not shown in table; textarea in form; placeholder says "optional" |
| theme | Theme (enum) | yes | Shown as color-coded badge in table; select dropdown in form; validated as required |
| status | Status (enum) | yes | Shown as color-coded badge in table; select dropdown in form; defaults to "Open" on create |
| dateLogged | string (date) | yes | Shown in table "Date Logged" column (formatted); auto-set on create; not editable in form |

### Theme (enum)
| Value | Badge Color |
|-------|-------------|
| UX | purple (bg-purple-100, text-purple-700) |
| Performance | orange (bg-orange-100, text-orange-700) |
| Support | blue (bg-blue-100, text-blue-700) |
| Pricing | pink (bg-pink-100, text-pink-700) |
| Communication | teal (bg-teal-100, text-teal-700) |

### Status (enum)
| Value | Badge Color |
|-------|-------------|
| Open | blue (bg-blue-100, text-blue-700) |
| In Progress | amber (bg-amber-100, text-amber-700) |
| Actioned | green (bg-green-100, text-green-700) |

## Interactions and State

| Trigger | Where | What happens |
|---------|-------|-------------|
| Click "Log Feedback" button | AppHeader on /feedback | Navigate to /feedback/new |
| Type in search input | FilterBar on /feedback | Table filters in real-time by client name (case-insensitive substring match) |
| Change theme dropdown | FilterBar on /feedback | Table filters by selected theme (or shows all) |
| Change status dropdown | FilterBar on /feedback | Table filters by selected status (or shows all) |
| Click "Clear filters" (X) | FilterBar on /feedback | Resets search text, theme, and status filters to defaults |
| Click "Edit" link on a row | FeedbackTable on /feedback | Navigate to /feedback/:id |
| Blur a required field (empty) | FeedbackForm on /feedback/new or /feedback/:id | Red border appears, error message shown below field |
| Click "Save Feedback" | FeedbackForm on /feedback/new | Validates all fields; if valid, creates item and navigates to /feedback |
| Click "Save Changes" | FeedbackForm on /feedback/:id | Validates all fields; if valid, updates item and navigates to /feedback |
| Click "Delete" | FeedbackForm on /feedback/:id | Browser confirm dialog; if confirmed, deletes item and navigates to /feedback |
| Click "Cancel" | FormHeader on /feedback/new or /feedback/:id | Navigate back to /feedback (no save) |
| Click "Log your first item" | EmptyState on /feedback | Navigate to /feedback/new |
| Click "Return to list" | NotFoundState on /feedback/:id | Navigate to /feedback |

## Empty States

| Component | Empty state behaviour |
|-----------|----------------------|
| FeedbackTable (no data at all) | Centered text: "No feedback logged yet. Log your first item ->" with link to /feedback/new |
| FeedbackTable (filters active, no matches) | Centered text: "No items match your filters." |
| EditFeedback (invalid ID) | Centered text: "Feedback item not found." with "Return to list" link |

## Ambiguities and Questions for PM

1. **Pagination or virtual scroll**: The prototype shows 6 sample items with no pagination controls. If a client success team logs hundreds of items, should the table paginate, infinite-scroll, or is the current "show all" acceptable for MVP?

2. **Sort order**: The data appears sorted by date descending (newest first). Should the user be able to sort by other columns (client name, theme, status), or is date-descending the only sort?

3. **Client name as free text vs. managed list**: Client name is a free-text input. Should there be an autocomplete/dropdown from previously used client names to prevent duplicates (e.g. "Acme Corp" vs "Acme corp" vs "ACME")?

4. **Delete confirmation UX**: The prototype uses a browser `confirm()` dialog for delete. Should this be a styled modal/dialog instead for production?

5. **Who can access this tool**: The prototype has no login, authentication, or user identification. Is this a single-user tool, or should there be multi-user support with user attribution on feedback items (e.g. "logged by [user]")?

6. **Detail field visibility**: The detail field is captured in the form but never displayed in the table view. Is it only visible when editing? Should there be a detail/expand view or click-through to see the full detail without entering edit mode?

7. **Date editing**: The dateLogged field is auto-set on creation and not editable. Should a user be able to backdate feedback that was received earlier but logged late?

8. **Feedback immutability after "Actioned"**: Can a feedback item be edited or status-changed after it reaches "Actioned" status, or should it become read-only?

9. **Search scope**: Search currently filters only by client name. Should it also search the summary or detail text?

10. **Theme and status extensibility**: The prototype has 5 themes and 3 statuses hardcoded. Should these be configurable/extensible by users or admins, or fixed for MVP?

## What Is Explicitly Out of Scope

- **Authentication / user accounts** — No login screen or user model visible in prototype. Out of scope unless PM confirms multi-user requirement.
- **Analytics / dashboard** — No charts, summary statistics, or dashboard page visible. Pure CRUD tool.
- **Bulk operations** — No multi-select, bulk status change, or bulk delete visible.
- **Export functionality** — No CSV/PDF export visible in the prototype.
- **Notifications** — No email, Slack, or in-app notification system visible.
- **Audit trail / history** — No changelog or edit history for feedback items visible.
- **Responsive / mobile layout** — Prototype uses desktop-width layout (max-w-7xl). Mobile responsiveness not explicitly designed — PM to confirm if needed for MVP.
- **Dark mode** — Prototype is light-mode only.
