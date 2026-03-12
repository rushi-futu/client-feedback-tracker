import Link from "next/link"

interface EmptyStateProps {
  hasFilters: boolean
}

export function EmptyState({ hasFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">No items match your filters.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-gray-500">
        No feedback logged yet.{" "}
        <Link
          href="/feedback/new"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Log your first item &rarr;
        </Link>
      </p>
    </div>
  )
}
