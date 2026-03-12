"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { FeedbackItem, FeedbackFilters } from "@/types"
import { listFeedback } from "@/lib/api"
import { FilterBar } from "@/components/feedback/FilterBar"
import { FeedbackTable } from "@/components/feedback/FeedbackTable"
import { EmptyState } from "@/components/feedback/EmptyState"

export function FeedbackListClient() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [filters, setFilters] = useState<FeedbackFilters>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (currentFilters: FeedbackFilters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await listFeedback(currentFilters)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchData(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFiltersChange(newFilters: FeedbackFilters) {
    setFilters(newFilters)

    // Debounce search, immediate for dropdowns
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If only the search field changed, debounce 300ms
    const searchChanged = newFilters.search !== filters.search
    const dropdownChanged =
      newFilters.theme !== filters.theme || newFilters.status !== filters.status

    if (searchChanged && !dropdownChanged) {
      debounceTimerRef.current = setTimeout(() => {
        fetchData(newFilters)
      }, 300)
    } else {
      fetchData(newFilters)
    }
  }

  const hasActiveFilters = !!(filters.search || filters.theme || filters.status)

  return (
    <div>
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      <div className="bg-white">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState hasFilters={hasActiveFilters} />
        )}

        {!loading && !error && items.length > 0 && (
          <FeedbackTable items={items} />
        )}
      </div>
    </div>
  )
}
