import { listFeedback } from "@/lib/api"
import { AppHeader } from "@/components/feedback/AppHeader"
import { FeedbackListClient } from "@/components/feedback/FeedbackListClient"
import { FeedbackItem } from "@/types"

export const dynamic = "force-dynamic"

export default async function FeedbackListPage() {
  let items: FeedbackItem[]
  try {
    items = await listFeedback()
  } catch {
    items = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <FeedbackListClient items={items} />
      </main>
    </div>
  )
}
