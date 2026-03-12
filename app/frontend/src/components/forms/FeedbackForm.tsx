"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Theme, Status, FeedbackItem, FeedbackCreate, FeedbackUpdate } from "@/types"
import { createFeedback, updateFeedback, deleteFeedback } from "@/lib/api"
import { cn } from "@/lib/utils"

const THEMES: Theme[] = ["UX", "Performance", "Support", "Pricing", "Communication"]
const STATUSES: Status[] = ["Open", "In Progress", "Actioned"]

interface FeedbackFormProps {
  mode: "create" | "edit"
  initialData?: FeedbackItem
}

interface FormState {
  client_name: string
  summary: string
  detail: string
  theme: string
  status: string
}

type FormErrors = Partial<Record<keyof FormState, string>>
type TouchedFields = Partial<Record<keyof FormState, boolean>>

export function FeedbackForm({ mode, initialData }: FeedbackFormProps) {
  const router = useRouter()

  const [formData, setFormData] = useState<FormState>({
    client_name: initialData?.client_name ?? "",
    summary: initialData?.summary ?? "",
    detail: initialData?.detail ?? "",
    theme: initialData?.theme ?? "",
    status: initialData?.status ?? "Open",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validateField(name: keyof FormState, value: string): string | undefined {
    if (name === "client_name" && !value.trim()) return "This field is required"
    if (name === "summary" && !value.trim()) return "This field is required"
    if (name === "theme" && !value) return "This field is required"
    return undefined
  }

  function validateAll(): FormErrors {
    const newErrors: FormErrors = {}
    const required: (keyof FormState)[] = ["client_name", "summary", "theme"]
    for (const field of required) {
      const err = validateField(field, formData[field])
      if (err) newErrors[field] = err
    }
    return newErrors
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name as keyof FormState]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name as keyof FormState]
        return next
      })
    }
  }

  function handleBlur(
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    const err = validateField(name as keyof FormState, value)
    if (err) {
      setErrors((prev) => ({ ...prev, [name]: err }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    const validationErrors = validateAll()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Mark all as touched so errors display
      const allTouched: TouchedFields = {}
      for (const key of Object.keys(validationErrors) as (keyof FormState)[]) {
        allTouched[key] = true
      }
      setTouched((prev) => ({ ...prev, ...allTouched }))
      return
    }

    setSubmitting(true)

    try {
      if (mode === "create") {
        const body: FeedbackCreate = {
          client_name: formData.client_name.trim(),
          summary: formData.summary.trim(),
          detail: formData.detail.trim() || null,
          theme: formData.theme as Theme,
          status: formData.status as Status,
        }
        await createFeedback(body)
      } else if (initialData) {
        const body: FeedbackUpdate = {
          client_name: formData.client_name.trim(),
          summary: formData.summary.trim(),
          detail: formData.detail.trim() || null,
          theme: formData.theme as Theme,
          status: formData.status as Status,
        }
        await updateFeedback(initialData.id, body)
      }
      router.push("/feedback")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save feedback")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!initialData) return

    const confirmed = window.confirm(
      "Are you sure you want to delete this feedback item?"
    )
    if (!confirmed) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await deleteFeedback(initialData.id)
      router.push("/feedback")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to delete feedback")
      setSubmitting(false)
    }
  }

  function fieldError(name: keyof FormState): string | undefined {
    return touched[name] ? errors[name] : undefined
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6" noValidate>
      {submitError && (
        <div className="rounded-md bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* Client Name */}
      <div>
        <label
          htmlFor="client_name"
          className="block text-sm font-medium text-gray-700"
        >
          Client Name <span className="text-red-500">*</span>
        </label>
        <input
          id="client_name"
          name="client_name"
          type="text"
          required
          maxLength={255}
          value={formData.client_name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            fieldError("client_name")
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          )}
        />
        {fieldError("client_name") && (
          <p className="mt-1 text-sm text-red-500">{fieldError("client_name")}</p>
        )}
      </div>

      {/* Summary */}
      <div>
        <label
          htmlFor="summary"
          className="block text-sm font-medium text-gray-700"
        >
          Summary <span className="text-red-500">*</span>
        </label>
        <input
          id="summary"
          name="summary"
          type="text"
          required
          maxLength={500}
          value={formData.summary}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            fieldError("summary")
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          )}
        />
        {fieldError("summary") && (
          <p className="mt-1 text-sm text-red-500">{fieldError("summary")}</p>
        )}
      </div>

      {/* Detail */}
      <div>
        <label
          htmlFor="detail"
          className="block text-sm font-medium text-gray-700"
        >
          Detail
        </label>
        <textarea
          id="detail"
          name="detail"
          rows={4}
          value={formData.detail}
          onChange={handleChange}
          onBlur={handleBlur}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Theme */}
      <div>
        <label
          htmlFor="theme"
          className="block text-sm font-medium text-gray-700"
        >
          Theme <span className="text-red-500">*</span>
        </label>
        <select
          id="theme"
          name="theme"
          required
          value={formData.theme}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1",
            fieldError("theme")
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          )}
        >
          <option value="">Select a theme...</option>
          {THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
        {fieldError("theme") && (
          <p className="mt-1 text-sm text-red-500">{fieldError("theme")}</p>
        )}
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          onBlur={handleBlur}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Saving..."
          : mode === "create"
            ? "Save Feedback"
            : "Save Changes"}
      </button>

      {/* Delete button (edit mode only) */}
      {mode === "edit" && initialData && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="w-full rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Deleting..." : "Delete"}
        </button>
      )}
    </form>
  )
}
