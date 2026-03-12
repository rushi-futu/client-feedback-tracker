"use client"

import { useState, useEffect } from "react"
import type { FeedbackItem } from "@/types"
import { getFeedback } from "@/lib/api"
import { FormHeader } from "@/components/layout/FormHeader"
import { FeedbackForm } from "@/components/forms/FeedbackForm"
import { NotFoundState } from "@/components/feedback/NotFoundState"

interface EditFeedbackClientProps {
  id: string
}

export function EditFeedbackClient({ id }: EditFeedbackClientProps) {
  const [item, setItem] = useState<FeedbackItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const feedbackId = parseInt(id, 10)
    if (isNaN(feedbackId)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    async function fetchItem() {
      try {
        const data = await getFeedback(feedbackId)
        setItem(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id])

  if (loading) {
    return (
      <>
        <FormHeader title="Edit Feedback" />
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </>
    )
  }

  if (notFound || !item) {
    return (
      <>
        <FormHeader title="Edit Feedback" />
        <NotFoundState />
      </>
    )
  }

  return (
    <>
      <FormHeader title="Edit Feedback" />
      <main>
        <FeedbackForm mode="edit" initialData={item} />
      </main>
    </>
  )
}
