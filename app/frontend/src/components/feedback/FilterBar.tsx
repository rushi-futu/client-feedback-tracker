"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Theme, Status } from "@/types"

const THEMES: Theme[] = ["UX", "Performance", "Support", "Pricing", "Communication"]
const STATUSES: Status[] = ["Open", "In Progress", "Actioned"]

interface FilterBarProps {
  search: string
  theme: string
  status: string
  onSearchChange: (value: string) => void
  onThemeChange: (value: string) => void
  onStatusChange: (value: string) => void
  onClear: () => void
}

export function FilterBar({
  search,
  theme,
  status,
  onSearchChange,
  onThemeChange,
  onStatusChange,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters = search !== "" || theme !== "all" || status !== "all"

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-4">
      <Input
        type="text"
        placeholder="Search client name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
        aria-label="Search by client name"
      />
      <Select value={theme} onValueChange={onThemeChange}>
        <SelectTrigger className="w-44" aria-label="Filter by theme">
          <SelectValue placeholder="All themes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All themes</SelectItem>
          {THEMES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-44" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Clear all filters"
        >
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
