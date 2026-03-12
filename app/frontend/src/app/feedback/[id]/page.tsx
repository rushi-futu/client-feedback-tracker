import Link from "next/link"
import { getFeedback } from "@/lib/api"
import { FormHeader } from "@/components/feedback/FormHeader"
import { FeedbackForm } from "@/components/feedback/FeedbackForm"

export const dynamic = "force-dynamic"

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
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <p className="text-gray-500">Feedback item not found.</p>
          <Link
            href="/feedback"
            className="mt-2 inline-block text-primary hover:underline"
          >
            Return to list
          </Link>
        </main>
      </div>
    )
  }

  let feedback
  try {
    feedback = await getFeedback(feedbackId)
  } catch {
    return (
      <div className="min-h-screen bg-gray-50">
        <FormHeader title="Edit Feedback" />
        <main className="mx-auto max-w-2xl px-6 py-12 text-center">
          <p className="text-gray-500">Feedback item not found.</p>
          <Link
            href="/feedback"
            className="mt-2 inline-block text-primary hover:underline"
          >
            Return to list
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FormHeader title="Edit Feedback" />
      <main className="mx-auto max-w-2xl px-6 py-6">
        <FeedbackForm mode="edit" initialData={feedback} />
      </main>
    </div>
  )
}
