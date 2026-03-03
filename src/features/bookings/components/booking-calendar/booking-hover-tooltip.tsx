"use client"

import { memo } from "react"
import { format, differenceInDays, isSameDay } from "date-fns"
import { Calendar, Clock, MapPin, AlertTriangle } from "lucide-react"
import type { CalendarBooking } from "./types"
import type { BookingConflict } from "./conflict-detection"
import { formatTimeWithOptionalMinutes } from "./utils"

interface BookingHoverTooltipProps {
  booking: CalendarBooking
  position: { x: number; y: number }
  conflicts?: BookingConflict[]
  dateTimeFormat?: "12" | "24"
}

export const BookingHoverTooltip = memo(({ booking, position, conflicts = [], dateTimeFormat = "24" }: BookingHoverTooltipProps) => {
  const startDate = new Date(booking.start)
  const endDate = new Date(booking.end)
  const isMultiDay = !isSameDay(startDate, endDate)
  const daysDifference = differenceInDays(endDate, startDate)

  // Format date display
  const bookingDate = isMultiDay
    ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`
    : format(startDate, "MMM d")

  // Format time display - for multi-day show start and end times
  const bookingTime = isMultiDay
    ? `${formatTimeWithOptionalMinutes(startDate, dateTimeFormat, true)} - ${formatTimeWithOptionalMinutes(endDate, dateTimeFormat, true)}`
    : booking.allDay
      ? "All day"
      : `${formatTimeWithOptionalMinutes(startDate, dateTimeFormat, true)} - ${formatTimeWithOptionalMinutes(endDate, dateTimeFormat, true)}`

  const duration = isMultiDay ? `${daysDifference} ${daysDifference === 1 ? "night" : "nights"}` : null

  const parts = booking.title.split(" - ")
  const bookingType = parts[0]
  const customerName = parts[1] || parts[0]

  return (
    <div
      className="fixed z-[100] w-[280px] animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: "none",
      }}
    >
      <div className="rounded-lg bg-black dark:bg-black p-4 shadow-2xl border border-gray-800">
        <div className="text-white text-xl font-bold mb-1">{customerName}</div>
        <div className="text-gray-400 text-sm font-medium mb-4">{bookingType}</div>

        <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
          <Calendar className="size-4 flex-shrink-0" />
          <span>{bookingDate}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
          <Clock className="size-4 flex-shrink-0" />
          <div className="flex flex-col">
            <span>{bookingTime}</span>
            {duration && <span className="text-gray-500 text-xs mt-0.5">{duration}</span>}
          </div>
        </div>

        {booking.location && (
          <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
            <MapPin className="size-4 flex-shrink-0" />
            <span className="truncate">{booking.location}</span>
          </div>
        )}


        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1">
              <AlertTriangle className="size-3 flex-shrink-0" />
              <span>
                Conflicts with {conflicts.length} booking{conflicts.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-gray-500 text-xs">Same location at overlapping time</div>
          </div>
        )}
      </div>
    </div>
  )
});

BookingHoverTooltip.displayName = "BookingHoverTooltip";
