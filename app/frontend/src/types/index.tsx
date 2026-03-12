export type Theme = "UX" | "Performance" | "Support" | "Pricing" | "Communication"

export type Status = "Open" | "In Progress" | "Actioned"

export interface FeedbackItem {
  id: number
  client_name: string
  summary: string
  detail: string | null
  theme: Theme
  status: Status
  date_logged: string  // ISO 8601 datetime string
}

export interface FeedbackCreate {
  client_name: string
  summary: string
  detail?: string | null
  theme: Theme
  status?: Status  // defaults to "Open" on server
}

export interface FeedbackUpdate {
  client_name?: string
  summary?: string
  detail?: string | null
  theme?: Theme
  status?: Status
}
