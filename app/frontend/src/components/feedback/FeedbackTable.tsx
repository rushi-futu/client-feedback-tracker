"use client"

import Link from "next/link"
import { FeedbackItem, Theme, Status } from "@/types"
import { Badge } from "@/components/ui/badge"

const THEME_COLORS: Record<Theme, string> = {
  UX: "bg-purple-100 text-purple-700",
  Performance: "bg-orange-100 text-orange-700",
  Support: "bg-blue-100 text-blue-700",
  Pricing: "bg-pink-100 text-pink-700",
  Communication: "bg-teal-100 text-teal-700",
}

const STATUS_COLORS: Record<Status, string> = {
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Actioned: "bg-green-100 text-green-700",
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface FeedbackTableProps {
  items: FeedbackItem[]
  totalCount: number
}

export function FeedbackTable({ items, totalCount }: FeedbackTableProps) {
  if (totalCount === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>
          No feedback logged yet.{" "}
          <Link
            href="/feedback/new"
            className="text-primary underline hover:no-underline"
          >
            Log your first item &rarr;
          </Link>
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No items match your filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Client
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Summary
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Theme
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Date Logged
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b transition-colors hover:bg-gray-50"
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                {item.client_name}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-gray-700">
                {item.summary}
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={`border-transparent ${THEME_COLORS[item.theme]}`}
                >
                  {item.theme}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={`border-transparent ${STATUS_COLORS[item.status]}`}
                >
                  {item.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                {formatDate(item.date_logged)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/feedback/${item.id}`}
                  className="text-sm text-primary hover:underline"
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
