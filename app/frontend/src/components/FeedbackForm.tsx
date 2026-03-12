"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { createFeedback, updateFeedback, deleteFeedback } from "@/lib/api"
import type { FeedbackItem, FeedbackCreate, Theme, Status } from "@/types"

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientName, setClientName] = useState(initialData?.client_name ?? "")
  const [summary, setSummary] = useState(initialData?.summary ?? "")
  const [detail, setDetail] = useState(initialData?.detail ?? "")
  const [theme, setTheme] = useState<Theme | "">(initialData?.theme ?? "")
  const [status, setStatus] = useState<Status>(initialData?.status ?? "Open")

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!clientName.trim()) errs.client_name = "Client name is required"
    if (!summary.trim()) errs.summary = "Summary is required"
    if (!theme) errs.theme = "Theme is required"
    return errs
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors(validate())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    setTouched({ client_name: true, summary: true, theme: true })

    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    setError(null)

    try {
      const data: FeedbackCreate = {
        client_name: clientName.trim(),
        summary: summary.trim(),
        detail: detail.trim() || null,
        theme: theme as Theme,
        status,
      }

      if (mode === "create") {
        await createFeedback(data)
      } else if (initialData) {
        await updateFeedback(initialData.id, data)
      }
      router.push("/feedback")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
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
    setError(null)
    try {
      await deleteFeedback(initialData.id)
      router.push("/feedback")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Client Name */}
      <div className="space-y-1.5">
        <label htmlFor="client_name" className="text-sm font-medium">
          Client Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="client_name"
          type="text"
          placeholder="e.g. Acme Corp"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          onBlur={() => handleBlur("client_name")}
          className={touched.client_name && errors.client_name ? "border-destructive" : ""}
          aria-invalid={!!(touched.client_name && errors.client_name)}
          aria-describedby={errors.client_name ? "client_name-error" : undefined}
        />
        {touched.client_name && errors.client_name && (
          <p id="client_name-error" className="text-xs text-destructive">
            {errors.client_name}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <label htmlFor="summary" className="text-sm font-medium">
          Summary <span className="text-destructive">*</span>
        </label>
        <Input
          id="summary"
          type="text"
          placeholder="Short description of the feedback"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => handleBlur("summary")}
          className={touched.summary && errors.summary ? "border-destructive" : ""}
          aria-invalid={!!(touched.summary && errors.summary)}
          aria-describedby={errors.summary ? "summary-error" : undefined}
        />
        {touched.summary && errors.summary && (
          <p id="summary-error" className="text-xs text-destructive">
            {errors.summary}
          </p>
        )}
      </div>

      {/* Detail */}
      <div className="space-y-1.5">
        <label htmlFor="detail" className="text-sm font-medium">
          Detail
        </label>
        <textarea
          id="detail"
          rows={4}
          placeholder="Optional longer description..."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Theme */}
      <div className="space-y-1.5">
        <label htmlFor="theme" className="text-sm font-medium">
          Theme <span className="text-destructive">*</span>
        </label>
        <Select
          value={theme || undefined}
          onValueChange={(value) => {
            setTheme(value as Theme)
            setTouched((prev) => ({ ...prev, theme: true }))
            setErrors(validate())
          }}
        >
          <SelectTrigger
            id="theme"
            className={touched.theme && errors.theme ? "border-destructive" : ""}
            aria-label="Select theme"
            aria-invalid={!!(touched.theme && errors.theme)}
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
        {touched.theme && errors.theme && (
          <p className="text-xs text-destructive">{errors.theme}</p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as Status)}
        >
          <SelectTrigger id="status" aria-label="Select status">
            <SelectValue />
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

      {/* Actions */}
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
            className="w-full border-destructive text-destructive hover:bg-destructive/10"
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
