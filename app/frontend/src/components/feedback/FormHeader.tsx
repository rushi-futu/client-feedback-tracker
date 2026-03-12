import Link from "next/link"

interface FormHeaderProps {
  title: string
}

export function FormHeader({ title }: FormHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <Link
        href="/feedback"
        className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
      >
        Cancel
      </Link>
    </header>
  )
}
