"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import type { FeedbackItem, Theme, Status } from "@/types"

const THEME_COLORS: Record<Theme, string> = {
  UX: "bg-purple-100 text-purple-700 border-transparent",
  Performance: "bg-orange-100 text-orange-700 border-transparent",
  Support: "bg-blue-100 text-blue-700 border-transparent",
  Pricing: "bg-pink-100 text-pink-700 border-transparent",
  Communication: "bg-teal-100 text-teal-700 border-transparent",
}

const STATUS_COLORS: Record<Status, string> = {
  Open: "bg-blue-100 text-blue-700 border-transparent",
  "In Progress": "bg-amber-100 text-amber-700 border-transparent",
  Actioned: "bg-green-100 text-green-700 border-transparent",
}

interface FeedbackTableProps {
  items: FeedbackItem[]
  hasFilters: boolean
}

export function FeedbackTable({ items, hasFilters }: FeedbackTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-12 text-center">
        {hasFilters ? (
          <p className="text-muted-foreground">No items match your filters.</p>
        ) : (
          <p className="text-muted-foreground">
            No feedback logged yet.{" "}
            <Link
              href="/feedback/new"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Log your first item &rarr;
            </Link>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Client
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Summary
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Theme
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Date Logged
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b last:border-0 hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 font-medium">{item.client_name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.summary}
              </td>
              <td className="px-4 py-3">
                <Badge className={THEME_COLORS[item.theme]}>
                  {item.theme}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge className={STATUS_COLORS[item.status]}>
                  {item.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatDate(item.date_logged)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/feedback/${item.id}`}
                  className="text-sm text-primary hover:underline underline-offset-4"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
