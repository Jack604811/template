"use client"

import { memo } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConflictIndicatorProps {
  conflictCount: number
  className?: string
  size?: "sm" | "md"
}

export const ConflictIndicator = memo(({ conflictCount, className, size = "md" }: ConflictIndicatorProps) => {
  if (conflictCount === 0) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-red-500 text-white font-medium shadow-sm",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className,
      )}
      title={`Conflicts with ${conflictCount} booking${conflictCount > 1 ? "s" : ""}`}
    >
      <AlertTriangle className={cn("flex-shrink-0", size === "sm" ? "size-2.5" : "size-3")} />
      <span>{conflictCount}</span>
    </div>
  )
});

ConflictIndicator.displayName = "ConflictIndicator";
