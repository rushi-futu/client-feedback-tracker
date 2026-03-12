import Link from "next/link"
import { getFeedback } from "@/lib/api"
import { FormHeader } from "@/components/feedback/FormHeader"
import { FeedbackForm } from "@/components/feedback/FeedbackForm"

interface EditFeedbackPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFeedbackPage({ params }: EditFeedbackPageProps) {
  const { id } = await params
  const feedbackId = parseInt(id, 10)

  if (isNaN(feedbackId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FormHeader title="Edit Feedback" />
        <NotFoundState />
      </div>
    )
  }

  let item = null
  let notFound = false

  try {
    item = await getFeedback(feedbackId)
  } catch {
    notFound = true
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FormHeader title="Edit Feedback" />
        <NotFoundState />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FormHeader title="Edit Feedback" />
      <FeedbackForm mode="edit" initialData={item} />
    </div>
  )
}

function NotFoundState() {
  return (
    <div className="py-16 text-center text-gray-500">
      <p className="mb-4">Feedback item not found.</p>
      <Link
        href="/feedback"
        className="text-gray-900 underline hover:text-gray-700"
      >
        Return to list
      </Link>
    </div>
  )
}
