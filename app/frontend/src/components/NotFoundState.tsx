import Link from "next/link"

export function NotFoundState() {
  return (
    <div className="rounded-lg border bg-white py-12 text-center">
      <p className="text-muted-foreground">
        Feedback item not found.{" "}
        <Link
          href="/feedback"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Return to list
        </Link>
      </p>
    </div>
  )
}
