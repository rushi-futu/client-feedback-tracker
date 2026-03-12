"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FeedbackItem, Theme, Status } from "@/types"
import { createFeedback, updateFeedback, deleteFeedback } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const THEMES: Theme[] = ["UX", "Performance", "Support", "Pricing", "Communication"]
const STATUSES: Status[] = ["Open", "In Progress", "Actioned"]

interface FeedbackFormProps {
  mode: "create" | "edit"
  initialData?: FeedbackItem
}

interface FormErrors {
  client_name?: string
  summary?: string
  theme?: string
}

export function FeedbackForm({ mode, initialData }: FeedbackFormProps) {
  const router = useRouter()

  const [clientName, setClientName] = useState(initialData?.client_name ?? "")
  const [summary, setSummary] = useState(initialData?.summary ?? "")
  const [detail, setDetail] = useState(initialData?.detail ?? "")
  const [theme, setTheme] = useState<string>(initialData?.theme ?? "")
  const [status, setStatus] = useState<string>(initialData?.status ?? "Open")

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validateField(field: string, value: string): string | undefined {
    if (field === "client_name" && !value.trim()) {
      return "Client name is required"
    }
    if (field === "summary" && !value.trim()) {
      return "Summary is required"
    }
    if (field === "theme" && !value) {
      return "Theme is required"
    }
    return undefined
  }

  function handleBlur(field: string, value: string) {
    const error = validateField(field, value)
    setErrors((prev) => ({ ...prev, [field]: error }))
  }

  function validateAll(): boolean {
    const newErrors: FormErrors = {
      client_name: validateField("client_name", clientName),
      summary: validateField("summary", summary),
      theme: validateField("theme", theme),
    }
    setErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAll()) return

    setLoading(true)
    setSubmitError(null)

    try {
      const payload = {
        client_name: clientName.trim(),
        summary: summary.trim(),
        detail: detail.trim() || null,
        theme: theme as Theme,
        status: status as Status,
      }

      if (mode === "create") {
        await createFeedback(payload)
      } else if (initialData) {
        await updateFeedback(initialData.id, payload)
      }

      router.push("/feedback")
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!initialData) return

    const confirmed = window.confirm(
      "Are you sure you want to delete this feedback item?"
    )
    if (!confirmed) return

    setLoading(true)
    setSubmitError(null)

    try {
      await deleteFeedback(initialData.id)
      router.push("/feedback")
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to delete feedback"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {submitError && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="client_name">
          Client Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="client_name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          onBlur={() => handleBlur("client_name", clientName)}
          placeholder="Enter client name"
          maxLength={255}
          className={errors.client_name ? "border-red-500" : ""}
          aria-invalid={!!errors.client_name}
          aria-describedby={errors.client_name ? "client_name-error" : undefined}
        />
        {errors.client_name && (
          <p id="client_name-error" className="text-sm text-red-500">
            {errors.client_name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">
          Summary <span className="text-red-500">*</span>
        </Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => handleBlur("summary", summary)}
          placeholder="Enter a brief summary"
          maxLength={500}
          className={errors.summary ? "border-red-500" : ""}
          aria-invalid={!!errors.summary}
          aria-describedby={errors.summary ? "summary-error" : undefined}
        />
        {errors.summary && (
          <p id="summary-error" className="text-sm text-red-500">
            {errors.summary}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="detail">Detail (optional)</Label>
        <Textarea
          id="detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Add more detail (optional)"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme">
          Theme <span className="text-red-500">*</span>
        </Label>
        <Select
          value={theme}
          onValueChange={(value) => {
            setTheme(value)
            setErrors((prev) => ({ ...prev, theme: undefined }))
          }}
        >
          <SelectTrigger
            id="theme"
            className={errors.theme ? "border-red-500" : ""}
            aria-invalid={!!errors.theme}
            aria-describedby={errors.theme ? "theme-error" : undefined}
            onBlur={() => handleBlur("theme", theme)}
          >
            <SelectValue placeholder="Select a theme" />
          </SelectTrigger>
          <SelectContent>
            {THEMES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.theme && (
          <p id="theme-error" className="text-sm text-red-500">
            {errors.theme}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 pt-2">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Saving..."
            : mode === "create"
              ? "Save Feedback"
              : "Save Changes"}
        </Button>

        {mode === "edit" && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}
