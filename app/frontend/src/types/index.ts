export type Theme = "UX" | "Performance" | "Support" | "Pricing" | "Communication"

export type Status = "Open" | "In Progress" | "Actioned"

export interface FeedbackItem {
  id: number
  client_name: string
  summary: string
  detail: string | null
  theme: Theme
  status: Status
  date_logged: string   // ISO datetime string
  updated_at: string    // ISO datetime string
}

export interface FeedbackCreate {
  client_name: string
  summary: string
  detail?: string | null
  theme: Theme
  status?: Status       // defaults to "Open" on backend
}

export interface FeedbackUpdate {
  client_name?: string
  summary?: string
  detail?: string | null
  theme?: Theme
  status?: Status
}

// Filter params for GET /feedback/
export interface FeedbackFilters {
  search?: string
  theme?: Theme
  status?: Status
}
