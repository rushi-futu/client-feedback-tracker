import { listFeedback } from "@/lib/api"
import { FeedbackListClient } from "./FeedbackListClient"

export default async function FeedbackListPage() {
  let items: Awaited<ReturnType<typeof listFeedback>> = []
  let error: string | null = null

  try {
    items = await listFeedback()
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load feedback"
  }

  return <FeedbackListClient initialItems={items} initialError={error} />
}
