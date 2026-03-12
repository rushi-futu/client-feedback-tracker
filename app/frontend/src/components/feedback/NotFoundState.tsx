import Link from "next/link"

export function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-gray-500">Feedback item not found.</p>
      <Link
        href="/feedback"
        className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-500"
      >
        Return to list
      </Link>
    </div>
  )
}
