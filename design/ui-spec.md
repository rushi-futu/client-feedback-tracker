# UI Spec
Source: https://www.figma.com/make/vDiknMrMUS6GHtyv127HfZ/Client-Feedback-Tracker
Read: 2026-03-12
Status: APPROVED

## Summary

A tool for client success managers to log, browse, and manage feedback received from clients. Each feedback item is associated with a client, tagged by theme (UX, Performance, Support, Pricing, Communication), and tracked through a status lifecycle (Open → In Progress → Actioned). The main interface is a filterable table of all feedback, with dedicated pages for creating and editing individual items. The design is minimal, clean, and utility-focused — no dashboard, no analytics, no user accounts.

## Pages and Routes

| Route | Page Name | Purpose |
|-------|-----------|---------|
| / | Redirect | Redirects to /feedback |
| /feedback | Feedback List | Main page — browse, search, and filter all feedback items in a table |
| /feedback/new | Log Feedback | Form to create a new feedback item |
| /feedback/:id | Edit Feedback | Form to edit an existing feedback item, with option to delete |
| * | 404 Redirect | Any unknown route redirects to /feedback |

## Component Inventory

### Page: Feedback List (/feedback)

- **AppHeader** — Top bar with app title and primary action
  - Displays: "Client Feedback Tracker" title text
  - Interactions: "Log Feedback" button navigates to /feedback/new

- **FilterBar** — Horizontal bar with search and dropdown filters
  - Displays: Search input, theme dropdown, status dropdown, conditional "Clear filters" button
  - Interactions: Type in search box to filter by client name; select theme dropdown to filter by theme; select status dropdown to filter by status; click "Clear filters" (X icon + text) to reset all filters

- **FeedbackTable** — Data table showing all feedback items
  - Displays: Columns — Client (name, font-medium), Summary (text), Theme (coloured badge), Status (coloured badge), Date Logged (formatted as "Mon DD, YYYY"), Edit link
  - Interactions: Click "Edit" link on any row to navigate to /feedback/:id; rows highlight on hover (bg-gray-50)

- **EmptyState (filtered)** — Shown when filters match no items
  - Displays: "No items match your filters."
  - Interactions: None

- **EmptyState (no data)** — Shown when no feedback exists at all
  - Displays: "No feedback logged yet. Log your first item →"
  - Interactions: "Log your first item →" is a link to /feedback/new

### Page: Log Feedback (/feedback/new)

- **FormHeader** — Top bar with page title and cancel action
  - Displays: "Log Feedback" title
  - Interactions: "Cancel" link navigates back to /feedback

- **FeedbackForm (create mode)** — Form with fields to create a new feedback item
  - Displays: Client Name input (required), Summary input (required), Detail textarea (optional), Theme select dropdown (required), Status select dropdown (defaults to "Open")
  - Interactions: Fill fields, submit via "Save Feedback" button (full-width); inline validation on blur shows red border + error message for required fields

### Page: Edit Feedback (/feedback/:id)

- **FormHeader** — Top bar with page title and cancel action
  - Displays: "Edit Feedback" title
  - Interactions: "Cancel" link navigates back to /feedback

- **FeedbackForm (edit mode)** — Same form as create, pre-populated with existing data
  - Displays: Same fields as create mode, pre-filled with the item's current values
  - Interactions: Edit fields, submit via "Save Changes" button; "Delete" button (red outline, below save) triggers browser confirm dialog then deletes and navigates to /feedback

- **NotFoundState** — Shown when feedback item ID does not exist
  - Displays: "Feedback item not found." with "Return to list" link
  - Interactions: "Return to list" navigates to /feedback

## Data Shapes Implied by the UI

### FeedbackItem
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | Used in URL for edit route (/feedback/:id); generated on create |
| clientName | string | yes | Shown in table "Client" column and form; validated as required |
| summary | string | yes | Shown in table "Summary" column and form; validated as required |
| detail | string | no | Optional textarea in form; not displayed in the table |
| theme | Theme (enum) | yes | Shown as coloured badge in table; select dropdown in form; validated as required |
| status | Status (enum) | yes | Shown as coloured badge in table; select dropdown in form; defaults to "Open" on create |
| dateLogged | string (date) | yes | Shown in table "Date Logged" column formatted as "Mon DD, YYYY"; auto-set on create |

### Theme (enum)
| Value | Badge colour |
|-------|-------------|
| UX | Purple (bg-purple-100, text-purple-700) |
| Performance | Orange (bg-orange-100, text-orange-700) |
| Support | Blue (bg-blue-100, text-blue-700) |
| Pricing | Pink (bg-pink-100, text-pink-700) |
| Communication | Teal (bg-teal-100, text-teal-700) |

### Status (enum)
| Value | Badge colour |
|-------|-------------|
| Open | Blue (bg-blue-100, text-blue-700) |
| In Progress | Amber (bg-amber-100, text-amber-700) |
| Actioned | Green (bg-green-100, text-green-700) |

## Interactions and State

| Trigger | Where | What happens |
|---------|-------|-------------|
| Click "Log Feedback" button | AppHeader (list page) | Navigate to /feedback/new |
| Type in search box | FilterBar | Table filters in real-time by client name (case-insensitive substring match) |
| Select theme dropdown | FilterBar | Table filters to show only items matching selected theme |
| Select status dropdown | FilterBar | Table filters to show only items matching selected status |
| Click "Clear filters" (X) | FilterBar | Resets search text, theme, and status filters to defaults ("All") |
| Click "Edit" on table row | FeedbackTable | Navigate to /feedback/:id |
| Hover over table row | FeedbackTable | Row background changes to gray-50 |
| Blur a required field (empty) | FeedbackForm | Field border turns red, error message appears below field |
| Submit form with missing required fields | FeedbackForm | All required fields validated; red borders and error messages shown on invalid fields; form does not submit |
| Submit valid create form | FeedbackForm (create) | New feedback item created with auto-generated id and today's date; navigate to /feedback |
| Submit valid edit form | FeedbackForm (edit) | Existing feedback item updated; navigate to /feedback |
| Click "Delete" | FeedbackForm (edit) | Browser confirm dialog ("Are you sure you want to delete this feedback item?"); if confirmed, item deleted and navigate to /feedback |
| Click "Cancel" | FormHeader | Navigate to /feedback (no save) |
| Navigate to /feedback/:id with invalid id | EditFeedback page | Shows "Feedback item not found" with "Return to list" link |
| Navigate to unknown route | 404 handler | Redirect to /feedback |

## Empty States

| Component | Empty state behaviour |
|-----------|----------------------|
| FeedbackTable (no data at all) | Centered text: "No feedback logged yet. Log your first item →" (link to /feedback/new) |
| FeedbackTable (filters active, no matches) | Centered text: "No items match your filters." |
| EditFeedback (invalid ID) | Centered text: "Feedback item not found." with "Return to list" link |

## Ambiguities and Questions for PM

1. **Persistence**: The prototype uses in-memory storage (data resets on refresh). Should the production app use a server-side database? If so, what is the expected persistence layer?
2. **Authentication / multi-user**: There is no login or user identification in the prototype. Is this a single-user tool, or should feedback items be scoped to the logged-in user? Is auth needed?
3. **Client name — free text vs. predefined list**: Client name is a free-text input. Should there be a predefined list of clients (autocomplete/dropdown), or is free text intentional?
4. **Search scope**: Search currently only matches against client name. Should it also search summary or detail text?
5. **Sorting**: The table is sorted by date descending (newest first) with no user-sortable columns. Should users be able to sort by other columns (client name, theme, status)?
6. **Pagination**: The prototype shows 6 items with no pagination. What is the expected scale — tens, hundreds, thousands of items? Is pagination or infinite scroll needed?
7. **Theme and Status extensibility**: The theme and status values are hard-coded enums. Should users (or admins) be able to add/edit themes and statuses?
8. **Delete confirmation**: The prototype uses a browser `confirm()` dialog for delete. Should this be a styled modal instead?
9. **Detail field visibility**: The "detail" field is editable in the form but not visible in the table. Is this intentional, or should there be a detail view / expandable row?
10. **Date logged editability**: The date is auto-set on creation and does not appear as an editable field. Can a user backdate feedback, or is auto-date correct?
11. **Feedback for the same client**: There is no grouping or client-level view. Is a "view all feedback for client X" feature desired?
12. **Mobile responsiveness**: The prototype uses a wide table layout. How should the table behave on mobile — horizontal scroll, card layout, or is desktop-only acceptable for v1?

## What Is Explicitly Out of Scope

- **User authentication / accounts** — no login flow visible in prototype; out of scope unless PM confirms otherwise
- **Analytics or dashboard** — no charts, counts, or summary statistics are shown
- **Notifications or email** — no indication of alerts when feedback is logged or status changes
- **File attachments** — no upload UI visible in the prototype
- **Comments or discussion threads** — no threaded conversation on feedback items
- **Audit trail / history** — no change log visible for feedback items
- **Bulk operations** — no multi-select or batch actions in the table
- **Export / import** — no CSV or report export functionality visible
- **Client management** — no dedicated client list or client detail pages
