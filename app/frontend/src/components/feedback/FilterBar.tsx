"use client"

import { X } from "lucide-react"
import type { Theme, Status, FeedbackFilters } from "@/types"

const THEMES: Theme[] = ["UX", "Performance", "Support", "Pricing", "Communication"]
const STATUSES: Status[] = ["Open", "In Progress", "Actioned"]

interface FilterBarProps {
  filters: FeedbackFilters
  onFiltersChange: (filters: FeedbackFilters) => void
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const hasActiveFilters = !!(filters.search || filters.theme || filters.status)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, search: e.target.value || undefined })
  }

  function handleThemeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      theme: value ? (value as Theme) : undefined,
    })
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      status: value ? (value as Status) : undefined,
    })
  }

  function handleClearFilters() {
    onFiltersChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="search-input" className="sr-only">
          Search by client name
        </label>
        <input
          id="search-input"
          type="text"
          placeholder="Search by client name..."
          value={filters.search ?? ""}
          onChange={handleSearchChange}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="theme-filter" className="sr-only">
          Filter by theme
        </label>
        <select
          id="theme-filter"
          value={filters.theme ?? ""}
          onChange={handleThemeChange}
          className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Themes</option>
          {THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={filters.status ?? ""}
          onChange={handleStatusChange}
          className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Clear all filters"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )
}
