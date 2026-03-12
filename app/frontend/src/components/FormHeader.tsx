import Link from "next/link"

interface FormHeaderProps {
  title: string
}

export function FormHeader({ title }: FormHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Link
        href="/feedback"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </Link>
    </header>
  )
}
