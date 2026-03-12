import { FeedbackItem, FeedbackCreate, FeedbackUpdate, FeedbackFilters } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function requestNoContent(path: string, options?: RequestInit): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
}

export function listFeedback(filters?: FeedbackFilters): Promise<FeedbackItem[]> {
  const params = new URLSearchParams()
  if (filters?.search) params.set("search", filters.search)
  if (filters?.theme) params.set("theme", filters.theme)
  if (filters?.status) params.set("status", filters.status)
  const query = params.toString()
  return request<FeedbackItem[]>(`/feedback/${query ? `?${query}` : ""}`)
}

export function getFeedback(id: number): Promise<FeedbackItem> {
  return request<FeedbackItem>(`/feedback/${id}`)
}

export function createFeedback(data: FeedbackCreate): Promise<FeedbackItem> {
  return request<FeedbackItem>("/feedback/", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateFeedback(id: number, data: FeedbackUpdate): Promise<FeedbackItem> {
  return request<FeedbackItem>(`/feedback/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteFeedback(id: number): Promise<void> {
  return requestNoContent(`/feedback/${id}`, {
    method: "DELETE",
  })
}
