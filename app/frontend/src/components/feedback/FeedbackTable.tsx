"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { FeedbackItem, Theme, Status } from "@/types"

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

function formatDate(dateString: string): string {
  const date = new Date(dateString)
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
      <div className="py-16 text-center text-gray-500">
        <p>
          No feedback logged yet.{" "}
          <Link
            href="/feedback/new"
            className="text-gray-900 underline hover:text-gray-700"
          >
            Log your first item &rarr;
          </Link>
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p>No items match your filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto px-6">
      <table className="w-full text-left text-sm" role="table">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="pb-3 pr-4 font-medium" scope="col">Client</th>
            <th className="pb-3 pr-4 font-medium" scope="col">Summary</th>
            <th className="pb-3 pr-4 font-medium" scope="col">Theme</th>
            <th className="pb-3 pr-4 font-medium" scope="col">Status</th>
            <th className="pb-3 pr-4 font-medium" scope="col">Date Logged</th>
            <th className="pb-3 font-medium" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 pr-4 font-medium text-gray-900">
                {item.client_name}
              </td>
              <td className="py-3 pr-4 text-gray-700 max-w-xs truncate">
                {item.summary}
              </td>
              <td className="py-3 pr-4">
                <Badge
                  className={`border-0 ${THEME_COLORS[item.theme]}`}
                >
                  {item.theme}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <Badge
                  className={`border-0 ${STATUS_COLORS[item.status]}`}
                >
                  {item.status}
                </Badge>
              </td>
              <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                {formatDate(item.date_logged)}
              </td>
              <td className="py-3">
                <Link
                  href={`/feedback/${item.id}`}
                  className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
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
