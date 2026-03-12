import { FormHeader } from "@/components/FormHeader"
import { FeedbackForm } from "@/components/FeedbackForm"

export default function LogFeedbackPage() {
  return (
    <div className="space-y-6">
      <FormHeader title="Log Feedback" />
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
        <FeedbackForm mode="create" />
      </div>
    </div>
  )
}
