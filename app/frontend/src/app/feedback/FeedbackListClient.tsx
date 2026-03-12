"use client"

import { useState } from "react"
import { AppHeader } from "@/components/feedback/AppHeader"
import { FilterBar } from "@/components/feedback/FilterBar"
import { FeedbackTable } from "@/components/feedback/FeedbackTable"
import type { FeedbackItem } from "@/types"

interface FeedbackListClientProps {
  initialItems: FeedbackItem[]
  initialError: string | null
}

export function FeedbackListClient({
  initialItems,
  initialError,
}: FeedbackListClientProps) {
  const [search, setSearch] = useState("")
  const [theme, setTheme] = useState("all")
  const [status, setStatus] = useState("all")

  const filteredItems = initialItems.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.client_name.toLowerCase().includes(search.toLowerCase())
    const matchesTheme = theme === "all" || item.theme === theme
    const matchesStatus = status === "all" || item.status === status
    return matchesSearch && matchesTheme && matchesStatus
  })

  function handleClear() {
    setSearch("")
    setTheme("all")
    setStatus("all")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      {initialError && (
        <div className="mx-6 mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {initialError}
        </div>
      )}
      <FilterBar
        search={search}
        theme={theme}
        status={status}
        onSearchChange={setSearch}
        onThemeChange={setTheme}
        onStatusChange={setStatus}
        onClear={handleClear}
      />
      <FeedbackTable items={filteredItems} totalCount={initialItems.length} />
    </div>
  )
}
