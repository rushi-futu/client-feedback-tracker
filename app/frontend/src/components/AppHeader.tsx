"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">
        Client Feedback Tracker
      </h1>
      <Button asChild>
        <Link href="/feedback/new">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Log Feedback
        </Link>
      </Button>
    </header>
  )
}
