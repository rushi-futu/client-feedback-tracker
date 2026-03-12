import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Client Feedback Tracker",
  description: "Log, browse, and manage client feedback by theme and status",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
}
