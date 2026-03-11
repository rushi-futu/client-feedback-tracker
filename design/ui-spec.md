# UI Spec — Client Feedback Tracker

**Status:** PENDING_PM_APPROVAL
**Written by:** PM (intent-only mode — no prototype provided)
**Date:** 2026-03-11

---

## Summary

A tool for client success managers to log feedback from clients, tag each item by theme, and track whether it has been actioned. The primary view is a filterable list of all feedback items. Managers can create new items, update their status, and filter by client name, theme, or status.

---

## Pages and Routes

| Route | Page |
|-------|------|
| `/` | Redirect to `/feedback` |
| `/feedback` | Feedback List — main view |
| `/feedback/new` | New Feedback Form |
| `/feedback/[id]` | Feedback Detail / Edit |

---

## Component Inventory

### `/feedback` — Feedback List Page

**FeedbackListPage**
- Displays all feedback items in a table/card list
- Contains FilterBar and FeedbackTable
- Contains a "Log Feedback" button → navigates to `/feedback/new`

**FilterBar**
- Three filter controls side by side:
  - Client name: free-text search input (filters by partial match)
  - Theme: dropdown select (`All` + enum values)
  - Status: dropdown select (`All` + enum values)
- Filters apply immediately (no submit button)
- A "Clear filters" link resets all three

**FeedbackTable**
- Columns: Client, Summary, Theme, Status, Date Logged, Actions
- Each row has an "Edit" link → navigates to `/feedback/[id]`
- Empty state: "No feedback logged yet. Log your first item →"
- Filtered empty state: "No items match your filters."
- Rows sorted by date logged descending (newest first)

---

### `/feedback/new` — New Feedback Form

**NewFeedbackPage**
- Page title: "Log Feedback"
- Contains FeedbackForm in create mode
- Cancel link → back to `/feedback`

**FeedbackForm (create mode)**
- Fields:
  - Client name: text input (required)
  - Summary: text input, single line (required)
  - Detail: textarea, optional — longer description
  - Theme: select dropdown (required) — values: UX | Performance | Support | Pricing | Communication
  - Status: select dropdown (required, default: `open`) — values: open | in_progress | actioned
- Submit button: "Save Feedback"
- On success: redirect to `/feedback`
- Validation: client name and summary are required; show inline errors

---

### `/feedback/[id]` — Feedback Detail / Edit

**FeedbackDetailPage**
- Page title: "Edit Feedback"
- Contains FeedbackForm in edit mode
- Cancel link → back to `/feedback`
- Delete button (bottom of form, secondary/destructive style) — confirms before deleting → redirects to `/feedback`

**FeedbackForm (edit mode)**
- Same fields as create mode, pre-populated
- Submit button: "Save Changes"
- On success: redirect to `/feedback`

---

## Data Shapes Implied by the UI

### FeedbackItem
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | system-generated |
| client_name | string | free text, required |
| summary | string | short description, required |
| detail | string? | optional longer description |
| theme | enum | UX \| Performance \| Support \| Pricing \| Communication |
| status | enum | open \| in_progress \| actioned |
| created_at | datetime | set on create |
| updated_at | datetime | updated on edit |

---

## Interactions and State

- Filters on `/feedback` are client-side — no round trip needed if all items loaded
- No pagination — all items loaded on page mount
- Status change can be made from the edit page only (not inline in the list)
- Delete requires confirmation (browser confirm dialog is acceptable)

---

## Empty States

| Location | Message |
|----------|---------|
| List, no items at all | "No feedback logged yet. Log your first item →" (links to `/feedback/new`) |
| List, filters active, no results | "No items match your filters. Clear filters" |

---

## Ambiguities and Questions for PM

None — all design decisions made above. Key decisions documented:
- `client` is free text, not a managed entity
- `status` is a 3-value enum, not a boolean
- `theme` is a fixed enum, not user-managed tags
- No pagination
- Filters: client (text search), theme (select), status (select)

---

## What Is Explicitly Out of Scope

- User authentication / login
- Multi-user / team management
- Email notifications
- Exporting feedback to CSV
- Comments or discussion threads on feedback items
- Client management (create/edit/delete clients as entities)

---

👁 UI SPEC READY FOR PM REVIEW
