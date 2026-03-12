# Frontend Patterns
# Next.js 15 conventions for Story Assignment Board

## Component Structure

Three categories — never mix responsibilities:

```
components/
  ui/          ← shadcn primitives, never modify these
  board/       ← domain components (BriefCard, AssignmentBadge, BoardColumn)
  forms/       ← form components (CreateBriefForm, ReassignForm)
```

## Page Pattern (Server Component default)

```tsx
// app/frontend/src/app/page.tsx
import { getBriefs } from "@/lib/api"
import { BriefBoard } from "@/components/board/BriefBoard"

export default async function BoardPage() {
  const briefs = await getBriefs()
  return <BriefBoard briefs={briefs} />
}
```

## Client Component Pattern (only when needed)

Mark with "use client" only for: onClick, useState, useEffect, form submission.

```tsx
// app/frontend/src/components/board/BriefCard.tsx
"use client"

import { Brief } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

interface BriefCardProps {
  brief: Brief
  onApprove: (id: number) => void
  onReassign: (id: number) => void
}

export function BriefCard({ brief, onApprove, onReassign }: BriefCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-tight">{brief.headline}</h3>
          <PriorityBadge priority={brief.priority} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2">{brief.description}</p>
        {brief.assignment && (
          <div className="flex items-center justify-between">
            <span className="text-xs">{brief.assignment.reporter.name}</span>
            <ConfidenceScore score={brief.assignment.confidence_score} />
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={() => onApprove(brief.id)} className="text-xs text-green-600 hover:underline">
            Approve
          </button>
          <button onClick={() => onReassign(brief.id)} className="text-xs text-muted-foreground hover:underline">
            Reassign
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## API Client Pattern

All API calls go through lib/api.ts. Never call fetch() directly in a component.

```typescript
// app/frontend/src/lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const getBriefs = () =>
  request<Brief[]>("/briefs/")

export const getBrief = (id: number) =>
  request<Brief>(`/briefs/${id}`)

export const createBrief = (body: CreateBriefInput) =>
  request<Brief>("/briefs/", { method: "POST", body: JSON.stringify(body) })

export const updateBrief = (id: number, body: Partial<Brief>) =>
  request<Brief>(`/briefs/${id}`, { method: "PATCH", body: JSON.stringify(body) })

export const getAssignment = (briefId: number) =>
  request<Assignment>(`/assignments/brief/${briefId}`)

export const approveAssignment = (assignmentId: number) =>
  request<Assignment>(`/assignments/${assignmentId}/approve`, { method: "POST" })
```

## TypeScript Types Pattern

Types mirror backend Pydantic schemas exactly. Keep in sync with api-contract.yaml.

```typescript
// app/frontend/src/types/index.ts

export type Priority = "low" | "medium" | "high" | "breaking"
export type BriefStatus = "unassigned" | "assigned" | "in_progress" | "published"

export interface Brief {
  id: number
  headline: string
  description: string
  priority: Priority
  status: BriefStatus
  created_at: string
  updated_at: string
  assignment?: Assignment
}

export interface Reporter {
  id: number
  name: string
  beat: string
  current_workload: number  // 0-100
  availability: boolean
}

export interface Assignment {
  id: number
  brief_id: number
  reporter_id: number
  confidence_score: number  // 0-100
  status: "pending" | "approved" | "rejected"
  reporter: Reporter
  created_at: string
}

export interface CreateBriefInput {
  headline: string
  description: string
  priority: Priority
}
```

## Form Pattern

```tsx
// app/frontend/src/components/forms/CreateBriefForm.tsx
"use client"

import { useState } from "react"
import { createBrief } from "@/lib/api"
import { CreateBriefInput, Priority } from "@/types"

export function CreateBriefForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await createBrief({
        headline: form.get("headline") as string,
        description: form.get("description") as string,
        priority: form.get("priority") as Priority,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brief")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {/* fields */}
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Brief"}
      </button>
    </form>
  )
}
```

---

## Pattern: Server Component Page + Client Wrapper
<!-- Promoted: 2026-03-12 -->
<!-- Source: escalation/log/review-20260312-111941.md -->

When a page needs server-fetched data AND client-side interactivity (useState, filtering,
event handlers), split into two files:

1. `page.tsx` — async server component that fetches data
2. `FooClient.tsx` — "use client" wrapper that receives data as props and owns all state

```tsx
// app/frontend/src/app/feedback/page.tsx (server component)
import { getFeedbackItems } from "@/lib/api"
import { FeedbackListClient } from "@/components/feedback/FeedbackListClient"

export default async function FeedbackPage() {
  const items = await getFeedbackItems()
  return <FeedbackListClient initialItems={items} />
}
```

```tsx
// app/frontend/src/components/feedback/FeedbackListClient.tsx
"use client"
import { useState } from "react"
// owns filtering, search, and all interactive state
```

This is the correct Next.js 15 pattern — never put "use client" on a page that can
do server-side data fetching.

---

## Pattern: Custom shadcn Button Variants
<!-- Promoted: 2026-03-12 -->
<!-- Source: escalation/log/review-20260312-111941.md -->

When the UI spec requires a button style not in standard shadcn (e.g. a red outline
delete button), extend the `buttonVariants` in `components/ui/button.tsx` rather than
using inline styles or one-off classes:

```tsx
// In components/ui/button.tsx — add to the variants object
const buttonVariants = cva("...", {
  variants: {
    variant: {
      // ... existing variants ...
      "destructive-outline":
        "border border-destructive text-destructive bg-background hover:bg-destructive/10",
    },
  },
})
```

This keeps all button styles in one place and avoids ad-hoc Tailwind on individual buttons.
Never modify the shadcn base primitives — only add new variant values.

---

## Pattern: Bypass Generic API Helper for 204 No Content
<!-- Promoted: 2026-03-12 -->
<!-- Source: escalation/log/review-20260312-111941.md -->

The generic `request<T>()` helper calls `res.json()` to parse the response. For endpoints
that return 204 No Content (e.g. DELETE), this will throw because there is no body.
Bypass the helper and call fetch directly:

```typescript
export async function deleteFeedback(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/feedback/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Delete failed" }))
    throw new Error(error.detail ?? `HTTP ${res.status}`)
  }
  // No res.json() — 204 has no body
}
```

Apply this pattern to any endpoint that returns 204 or has no response body.

---

## Styling Rules

- Tailwind utility classes only — no inline styles, no CSS modules
- shadcn/ui for all primitives (Button, Card, Badge, Dialog, Select)
- `cn()` from lib/utils for conditional classes
- Responsive by default — mobile-first
- Dark mode via `dark:` prefix where needed

## package.json dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.263.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "vitest": "^2.0.0"
  }
}
```
