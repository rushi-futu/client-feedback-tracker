"use client"

import { useState } from "react"
import { FeedbackItem } from "@/types"
import { FilterBar } from "@/components/feedback/FilterBar"
import { FeedbackTable } from "@/components/feedback/FeedbackTable"

interface FeedbackListClientProps {
  items: FeedbackItem[]
}

export function FeedbackListClient({ items }: FeedbackListClientProps) {
  const [search, setSearch] = useState("")
  const [theme, setTheme] = useState("all")
  const [status, setStatus] = useState("all")

  const filteredItems = items.filter((item) => {
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
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        theme={theme}
        onThemeChange={setTheme}
        status={status}
        onStatusChange={setStatus}
        onClear={handleClear}
      />
      <FeedbackTable items={filteredItems} totalCount={items.length} />
    </div>
  )
}
