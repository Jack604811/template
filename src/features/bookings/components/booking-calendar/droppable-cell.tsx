"use client"

import type React from "react"

import { memo } from "react"
import { useDroppable } from "@dnd-kit/core"
import { addDays, isSameDay } from "date-fns"

import { useCalendarDnd } from "./calendar-dnd-context";
import { cn } from "@/lib/utils"

interface DroppableCellProps {
  id: string
  date: Date
  time?: number
  children?: React.ReactNode
  className?: string
  onClick?: () => void
}

export const DroppableCell = memo(({ id, date, time, children, className, onClick }: DroppableCellProps) => {
  const { activeBooking, bookingDurationDays, hoveredDate } = useCalendarDnd()

  const { setNodeRef, isOver } = useDroppable({
    data: {
      date,
      time,
    },
    id,
  })

  const shouldShowHover = (() => {
    if (!activeBooking || !hoveredDate) return false

    // For single day bookings, only highlight the cell being hovered
    if (bookingDurationDays <= 1) {
      return isOver
    }

    // For multi-day bookings, check if this cell is within the range
    // Starting from the hoveredDate for the duration of the booking
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    // Check if this cell is within the range [hoveredDate, hoveredDate + duration)
    for (let i = 0; i < bookingDurationDays; i++) {
      const targetDate = addDays(hoveredDate, i)
      if (isSameDay(normalizedDate, targetDate)) {
        return true
      }
    }

    return false
  })()

  const formattedTime =
    time !== undefined
      ? `${Math.floor(time)}:${Math.round((time - Math.floor(time)) * 60)
          .toString()
          .padStart(2, "0")}`
      : null

  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden px-0.5 py-1 data-dragging:bg-accent sm:px-1", className)}
      data-dragging={shouldShowHover ? true : undefined}
      onClick={onClick}
      ref={setNodeRef}
      title={formattedTime ? `${formattedTime}` : undefined}
    >
      {children}
    </div>
  )
});

DroppableCell.displayName = "DroppableCell";
