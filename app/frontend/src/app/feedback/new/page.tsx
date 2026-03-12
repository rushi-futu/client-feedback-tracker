import { FormHeader } from "@/components/feedback/FormHeader"
import { FeedbackForm } from "@/components/feedback/FeedbackForm"

export default function NewFeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <FormHeader title="Log Feedback" />
      <main className="mx-auto max-w-2xl px-6 py-6">
        <FeedbackForm mode="create" />
      </main>
    </div>
  )
}
