/**
 * Adversarial tests for the API client (app/frontend/src/lib/api.ts).
 * Tests: error handling, request shapes, edge cases.
 * Written by: tester agent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { listFeedback, getFeedback, createFeedback, updateFeedback, deleteFeedback } from "../api"
import type { FeedbackCreate, FeedbackUpdate } from "@/types"

const originalFetch = global.fetch

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

function mockFetchSuccess(data: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => data,
  } as Response)
}

function mockFetchError(status: number, body: unknown = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  } as Response)
}

// ── listFeedback ────────────────────────────────────────────────────────────

describe("listFeedback", () => {
  it("returns array of feedback items on success", async () => {
    const items = [
      { id: 1, client_name: "Acme", summary: "Test", theme: "UX", status: "Open", date_logged: "2026-01-01T00:00:00Z", detail: null },
    ]
    mockFetchSuccess(items)
    const result = await listFeedback()
    expect(result).toEqual(items)
  })

  it("calls correct URL with GET method", async () => {
    mockFetchSuccess([])
    await listFeedback()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/feedback/"),
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  it("throws on server error", async () => {
    mockFetchError(500, { detail: "Internal Server Error" })
    await expect(listFeedback()).rejects.toThrow("Internal Server Error")
  })

  it("throws fallback message when no detail in error response", async () => {
    mockFetchError(500, {})
    await expect(listFeedback()).rejects.toThrow("HTTP 500")
  })

  it("throws fallback when error response is not valid JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("invalid json") },
    } as unknown as Response)
    await expect(listFeedback()).rejects.toThrow("Request failed")
  })
})

// ── getFeedback ─────────────────────────────────────────────────────────────

describe("getFeedback", () => {
  it("returns single feedback item", async () => {
    const item = { id: 1, client_name: "Acme", summary: "Test", theme: "UX", status: "Open", date_logged: "2026-01-01T00:00:00Z", detail: null }
    mockFetchSuccess(item)
    const result = await getFeedback(1)
    expect(result).toEqual(item)
  })

  it("calls correct URL with id", async () => {
    mockFetchSuccess({})
    await getFeedback(42)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/feedback/42"),
      expect.any(Object)
    )
  })

  it("throws on 404", async () => {
    mockFetchError(404, { detail: "Feedback item not found" })
    await expect(getFeedback(99999)).rejects.toThrow("Feedback item not found")
  })
})

// ── createFeedback ──────────────────────────────────────────────────────────

describe("createFeedback", () => {
  const validBody: FeedbackCreate = {
    client_name: "Acme Corp",
    summary: "Dashboard is slow",
    theme: "Performance",
  }

  it("returns created feedback on success", async () => {
    const created = { id: 1, ...validBody, detail: null, status: "Open", date_logged: "2026-01-01T00:00:00Z" }
    mockFetchSuccess(created)
    const result = await createFeedback(validBody)
    expect(result.id).toBe(1)
  })

  it("sends POST with JSON body", async () => {
    mockFetchSuccess({ id: 1 })
    await createFeedback(validBody)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/feedback/"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(validBody),
      })
    )
  })

  it("throws with detail message on 422", async () => {
    mockFetchError(422, { detail: "client_name is required" })
    await expect(createFeedback({ ...validBody, client_name: "" })).rejects.toThrow("client_name is required")
  })

  it("throws fallback on 500 without detail", async () => {
    mockFetchError(500, {})
    await expect(createFeedback(validBody)).rejects.toThrow("HTTP 500")
  })
})

// ── updateFeedback ──────────────────────────────────────────────────────────

describe("updateFeedback", () => {
  const updateBody: FeedbackUpdate = { status: "Actioned" }

  it("returns updated feedback on success", async () => {
    const updated = { id: 1, client_name: "Acme", summary: "Test", theme: "UX", status: "Actioned", date_logged: "2026-01-01T00:00:00Z", detail: null }
    mockFetchSuccess(updated)
    const result = await updateFeedback(1, updateBody)
    expect(result.status).toBe("Actioned")
  })

  it("sends PATCH with JSON body", async () => {
    mockFetchSuccess({})
    await updateFeedback(1, updateBody)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/feedback/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(updateBody),
      })
    )
  })

  it("throws on 404", async () => {
    mockFetchError(404, { detail: "Feedback item not found" })
    await expect(updateFeedback(99999, updateBody)).rejects.toThrow("Feedback item not found")
  })
})

// ── deleteFeedback ──────────────────────────────────────────────────────────

describe("deleteFeedback", () => {
  it("resolves on successful delete", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    } as Response)
    await expect(deleteFeedback(1)).resolves.toBeUndefined()
  })

  it("sends DELETE method", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response)
    await deleteFeedback(42)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/feedback/42"),
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("throws on 404", async () => {
    mockFetchError(404, { detail: "Feedback item not found" })
    await expect(deleteFeedback(99999)).rejects.toThrow("Feedback item not found")
  })

  it("does not call res.json() on success — 204 has no body", async () => {
    // This is an adversarial test: the generic request() helper calls res.json().
    // deleteFeedback bypasses the helper, so it should NOT call json() on 204.
    // If it did, it might throw because 204 has no body.
    const mockJson = vi.fn()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: mockJson,
    } as unknown as Response)
    await deleteFeedback(1)
    expect(mockJson).not.toHaveBeenCalled()
  })
})

// ── Adversarial: BASE_URL ───────────────────────────────────────────────────

describe("API base URL", () => {
  it("uses default base URL when env var is not set", async () => {
    mockFetchSuccess([])
    await listFeedback()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:8000"),
      expect.any(Object)
    )
  })
})
