import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AppHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Client Feedback Tracker
        </h1>
        <Button asChild>
          <Link href="/feedback/new">Log Feedback</Link>
        </Button>
      </div>
    </header>
  )
}
