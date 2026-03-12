"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import type { Theme, Status, FeedbackFilters } from "@/types"

const THEMES: Theme[] = ["UX", "Performance", "Support", "Pricing", "Communication"]
const STATUSES: Status[] = ["Open", "In Progress", "Actioned"]

interface FilterBarProps {
  filters: FeedbackFilters
  onFiltersChange: (filters: FeedbackFilters) => void
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchInput || undefined })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const hasActiveFilters = filters.search || filters.theme || filters.status

  function handleThemeChange(value: string) {
    onFiltersChange({
      ...filters,
      theme: value === "all" ? undefined : (value as Theme),
    })
  }

  function handleStatusChange(value: string) {
    onFiltersChange({
      ...filters,
      status: value === "all" ? undefined : (value as Status),
    })
  }

  function handleClear() {
    setSearchInput("")
    onFiltersChange({})
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="text"
          placeholder="Search by client name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
          aria-label="Search by client name"
        />
      </div>
      <Select
        value={filters.theme ?? "all"}
        onValueChange={handleThemeChange}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by theme">
          <SelectValue placeholder="All Themes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Themes</SelectItem>
          {THEMES.map((theme) => (
            <SelectItem key={theme} value={theme}>
              {theme}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status ?? "all"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground"
          aria-label="Clear all filters"
        >
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
