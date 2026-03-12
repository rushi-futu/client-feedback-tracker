import Link from "next/link"
import { Button } from "@/components/ui/button"

interface FormHeaderProps {
  title: string
}

export function FormHeader({ title }: FormHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <Button variant="outline" asChild>
          <Link href="/feedback">Cancel</Link>
        </Button>
      </div>
    </header>
  )
}
