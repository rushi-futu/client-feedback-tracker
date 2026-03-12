"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function AppHeader() {
  const router = useRouter()

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-xl font-semibold text-gray-900">
        Client Feedback Tracker
      </h1>
      <Button onClick={() => router.push("/feedback/new")}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Log Feedback
      </Button>
    </header>
  )
}
