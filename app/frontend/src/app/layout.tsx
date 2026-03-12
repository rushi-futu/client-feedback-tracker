import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Client Feedback Tracker",
  description: "Log, browse, and manage client feedback",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
