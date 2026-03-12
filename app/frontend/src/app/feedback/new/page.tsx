import { FormHeader } from "@/components/layout/FormHeader"
import { FeedbackForm } from "@/components/forms/FeedbackForm"

export default function LogFeedbackPage() {
  return (
    <div className="min-h-screen">
      <FormHeader title="Log Feedback" />
      <main>
        <FeedbackForm mode="create" />
      </main>
    </div>
  )
}
