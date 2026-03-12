"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  createFeedback,
  updateFeedback,
  deleteFeedback,
} from "@/lib/api"
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
  const [theme, setTheme] = useState<string>(initialData?.theme ?? "")
  const [status, setStatus] = useState<string>(initialData?.status ?? "Open")

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function validateField(field: string, value: string): string | undefined {
    switch (field) {
      case "client_name":
        return value.trim() === "" ? "Client name is required" : undefined
      case "summary":
        return value.trim() === "" ? "Summary is required" : undefined
      case "theme":
        return value === "" ? "Theme is required" : undefined
      default:
        return undefined
    }
  }

  function handleBlur(field: string, value: string) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const err = validateField(field, value)
    setFieldErrors((prev) => ({ ...prev, [field]: err }))
  }

  function validateAll(): boolean {
    const errors: FormErrors = {
      client_name: validateField("client_name", clientName),
      summary: validateField("summary", summary),
      theme: validateField("theme", theme),
    }
    setFieldErrors(errors)
    setTouched({ client_name: true, summary: true, theme: true })
    return !errors.client_name && !errors.summary && !errors.theme
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validateAll()) return

    setLoading(true)
    setError(null)

    try {
      if (mode === "create") {
        const body: FeedbackCreate = {
          client_name: clientName.trim(),
          summary: summary.trim(),
          detail: detail.trim() || null,
          theme: theme as Theme,
          status: status as Status,
        }
        await createFeedback(body)
      } else if (initialData) {
        await updateFeedback(initialData.id, {
          client_name: clientName.trim(),
          summary: summary.trim(),
          detail: detail.trim() || null,
          theme: theme as Theme,
          status: status as Status,
        })
      }
      router.push("/feedback")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!initialData) return
    if (!window.confirm("Are you sure you want to delete this feedback item?")) return

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
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="client_name">
          Client Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="client_name"
          name="client_name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          onBlur={() => handleBlur("client_name", clientName)}
          placeholder="e.g. Acme Corp"
          className={touched.client_name && fieldErrors.client_name ? "border-red-500" : ""}
          aria-invalid={touched.client_name && !!fieldErrors.client_name}
          aria-describedby={fieldErrors.client_name ? "client_name-error" : undefined}
        />
        {touched.client_name && fieldErrors.client_name && (
          <p id="client_name-error" className="text-sm text-red-500">
            {fieldErrors.client_name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">
          Summary <span className="text-red-500">*</span>
        </Label>
        <Input
          id="summary"
          name="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => handleBlur("summary", summary)}
          placeholder="Brief summary of the feedback"
          className={touched.summary && fieldErrors.summary ? "border-red-500" : ""}
          aria-invalid={touched.summary && !!fieldErrors.summary}
          aria-describedby={fieldErrors.summary ? "summary-error" : undefined}
        />
        {touched.summary && fieldErrors.summary && (
          <p id="summary-error" className="text-sm text-red-500">
            {fieldErrors.summary}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="detail">Detail</Label>
        <Textarea
          id="detail"
          name="detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Optional — add more context here"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme">
          Theme <span className="text-red-500">*</span>
        </Label>
        <Select
          value={theme}
          onValueChange={(val) => {
            setTheme(val)
            if (touched.theme) {
              setFieldErrors((prev) => ({
                ...prev,
                theme: validateField("theme", val),
              }))
            }
          }}
        >
          <SelectTrigger
            id="theme"
            className={touched.theme && fieldErrors.theme ? "border-red-500" : ""}
            aria-invalid={touched.theme && !!fieldErrors.theme}
            aria-describedby={fieldErrors.theme ? "theme-error" : undefined}
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
        {touched.theme && fieldErrors.theme && (
          <p id="theme-error" className="text-sm text-red-500">
            {fieldErrors.theme}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select a status" />
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

      <div className="space-y-3 pt-4">
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
            variant="destructive-outline"
            className="w-full"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        )}
      </div>
    </form>
  )
}
