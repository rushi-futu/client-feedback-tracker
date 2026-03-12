import { FormHeader } from "@/components/feedback/FormHeader"
import { FeedbackForm } from "@/components/feedback/FeedbackForm"

export default function NewFeedbackPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <FormHeader title="Log Feedback" />
      <FeedbackForm mode="create" />
    </div>
  )
}
