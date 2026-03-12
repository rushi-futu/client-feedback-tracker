import { AppHeader } from "@/components/layout/AppHeader"
import { FeedbackListClient } from "@/components/feedback/FeedbackListClient"

export default function FeedbackListPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>
        <FeedbackListClient />
      </main>
    </div>
  )
}
