import { listFeedback } from "@/lib/api"
import { FeedbackListClient } from "@/components/FeedbackListClient"
import type { FeedbackItem } from "@/types"

export default async function FeedbackListPage() {
  let initialItems: FeedbackItem[] = []
  try {
    initialItems = await listFeedback()
  } catch {
    initialItems = []
  }

  return <FeedbackListClient initialItems={initialItems} />
}
