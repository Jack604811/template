"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"
import { BOOKING_STATUSES } from "./status-config"
import type { BookingStatus } from "./types"

interface StatusFilterProps {
  selectedStatuses: BookingStatus[]
  onStatusChange: (statuses: BookingStatus[]) => void
  className?: string
}

export const StatusFilter = memo(({ selectedStatuses, onStatusChange, className }: StatusFilterProps) => {
  const isAllSelected = selectedStatuses.length === 0

  const handleStatusToggle = (status: BookingStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
  }

  const handleAllClick = () => {
    onStatusChange([])
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        type="button"
        onClick={handleAllClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
          "border border-border/50",
          isAllSelected ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted",
        )}
      >
        <span>All</span>
      </button>

      {BOOKING_STATUSES.map((status) => {
        const isSelected = selectedStatuses.includes(status.value)
        return (
          <button
            key={status.value}
            type="button"
            onClick={() => handleStatusToggle(status.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
              "border border-border/50",
              isSelected
                ? cn(status.color, status.textColor, "border-transparent")
                : "bg-background text-foreground hover:bg-muted",
            )}
          >
            <span>{status.label}</span>
            <span className={cn("size-2 rounded-full shrink-0", status.circleColor)} />
          </button>
        )
      })}
    </div>
  )
});

StatusFilter.displayName = "StatusFilter";
