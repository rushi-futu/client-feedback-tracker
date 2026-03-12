export type Theme = "UX" | "Performance" | "Support" | "Pricing" | "Communication"

export type Status = "Open" | "In Progress" | "Actioned"

export interface FeedbackItem {
  id: number
  client_name: string
  summary: string
  detail: string | null
  theme: Theme
  status: Status
  date_logged: string        // ISO date "YYYY-MM-DD" — format in UI as "Mon DD, YYYY"
  created_at: string         // ISO datetime
  updated_at: string         // ISO datetime
}

export interface FeedbackCreate {
  client_name: string
  summary: string
  detail?: string | null
  theme: Theme
  status?: Status            // defaults to "Open" on backend
}

export interface FeedbackUpdate {
  client_name?: string
  summary?: string
  detail?: string | null
  theme?: Theme
  status?: Status
}

export interface FeedbackFilters {
  search?: string
  theme?: Theme
  status?: Status
}
