import { cn } from "@/lib/utils"
import type { Theme } from "@/types"

const themeStyles: Record<Theme, string> = {
  UX: "bg-purple-100 text-purple-700",
  Performance: "bg-orange-100 text-orange-700",
  Support: "bg-blue-100 text-blue-700",
  Pricing: "bg-pink-100 text-pink-700",
  Communication: "bg-teal-100 text-teal-700",
}

interface ThemeBadgeProps {
  theme: Theme
}

export function ThemeBadge({ theme }: ThemeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        themeStyles[theme]
      )}
    >
      {theme}
    </span>
  )
}
