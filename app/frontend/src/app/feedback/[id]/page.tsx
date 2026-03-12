import { EditFeedbackClient } from "@/components/feedback/EditFeedbackClient"

interface EditFeedbackPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFeedbackPage({ params }: EditFeedbackPageProps) {
  const { id } = await params
  return (
    <div className="min-h-screen">
      <EditFeedbackClient id={id} />
    </div>
  )
}
