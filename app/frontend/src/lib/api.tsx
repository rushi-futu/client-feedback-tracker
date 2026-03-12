import { FeedbackItem, FeedbackCreate, FeedbackUpdate } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const listFeedback = () =>
  request<FeedbackItem[]>("/feedback/")

export const getFeedback = (id: number) =>
  request<FeedbackItem>(`/feedback/${id}`)

export const createFeedback = (body: FeedbackCreate) =>
  request<FeedbackItem>("/feedback/", {
    method: "POST",
    body: JSON.stringify(body),
  })

export const updateFeedback = (id: number, body: FeedbackUpdate) =>
  request<FeedbackItem>(`/feedback/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })

export const deleteFeedback = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/feedback/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
}
