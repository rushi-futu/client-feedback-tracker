"use client"

import { useCallback, useEffect, useState } from "react"
import { AppHeader } from "@/components/AppHeader"
import { FilterBar } from "@/components/FilterBar"
import { FeedbackTable } from "@/components/FeedbackTable"
import { listFeedback } from "@/lib/api"
import type { FeedbackItem, FeedbackFilters } from "@/types"

interface FeedbackListClientProps {
  initialItems: FeedbackItem[]
}

export function FeedbackListClient({ initialItems }: FeedbackListClientProps) {
  const [items, setItems] = useState<FeedbackItem[]>(initialItems)
  const [filters, setFilters] = useState<FeedbackFilters>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async (currentFilters: FeedbackFilters) => {
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

  useEffect(() => {
    // Skip initial fetch — we already have server-rendered data
    const hasFilters = filters.search || filters.theme || filters.status
    if (hasFilters !== undefined || Object.keys(filters).length > 0) {
      fetchItems(filters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const hasActiveFilters = !!(filters.search || filters.theme || filters.status)

  return (
    <div className="space-y-6">
      <AppHeader />
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className={loading ? "opacity-60 transition-opacity" : ""}>
        <FeedbackTable items={items} hasFilters={hasActiveFilters} />
      </div>
    </div>
  )
}
