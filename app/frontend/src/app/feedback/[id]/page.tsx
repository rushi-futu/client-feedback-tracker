import { getFeedback } from "@/lib/api"
import { FormHeader } from "@/components/FormHeader"
import { FeedbackForm } from "@/components/FeedbackForm"
import { NotFoundState } from "@/components/NotFoundState"

interface EditFeedbackPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFeedbackPage({ params }: EditFeedbackPageProps) {
  const { id } = await params
  const feedbackId = parseInt(id, 10)

  if (isNaN(feedbackId)) {
    return (
      <div className="space-y-6">
        <FormHeader title="Edit Feedback" />
        <NotFoundState />
      </div>
    )
  }

  let item
  try {
    item = await getFeedback(feedbackId)
  } catch {
    return (
      <div className="space-y-6">
        <FormHeader title="Edit Feedback" />
        <NotFoundState />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FormHeader title="Edit Feedback" />
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6">
        <FeedbackForm mode="edit" initialData={item} />
      </div>
    </div>
  )
}
