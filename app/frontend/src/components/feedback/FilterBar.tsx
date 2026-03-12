"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { Theme, Status } from "@/types"

const THEMES: Theme[] = ["UX", "Performance", "Support", "Pricing", "Communication"]
const STATUSES: Status[] = ["Open", "In Progress", "Actioned"]

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  theme: string
  onThemeChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  onClear: () => void
}

export function FilterBar({
  search,
  onSearchChange,
  theme,
  onThemeChange,
  status,
  onStatusChange,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters = search !== "" || theme !== "all" || status !== "all"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
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
          aria-label="Clear filters"
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
