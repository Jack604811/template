"use client"

import type React from "react"

import { memo } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { differenceInDays, format } from "date-fns"
import { useRef } from "react"

import { type CalendarBooking } from "./types";
import { BookingItem } from "./booking-item";
import { useCalendarDnd } from "./calendar-dnd-context";

interface DraggableBookingProps {
  booking: CalendarBooking
  view: "month" | "week" | "day"
  showTime?: boolean
  onClick?: (e: React.MouseEvent) => void
  height?: number
  isMultiDay?: boolean
  multiDayWidth?: number
  isFirstDay?: boolean
  isLastDay?: boolean
  currentDay?: Date
  "aria-hidden"?: boolean | "true" | "false"
  allBookings?: CalendarBooking[]
  dateTimeFormat?: "12" | "24"
}

export const DraggableBooking = memo(({
  booking,
  view,
  showTime,
  onClick,
  height,
  isMultiDay,
  multiDayWidth,
  isFirstDay = true,
  isLastDay = true,
  currentDay,
  "aria-hidden": ariaHidden,
  allBookings = [],
  dateTimeFormat = "24",
}: DraggableBookingProps) => {
  const { activeId, activeBooking } = useCalendarDnd()
  const elementRef = useRef<HTMLDivElement>(null)

  // Check if this is a multi-day booking
  const bookingStart = new Date(booking.start)
  const bookingEnd = new Date(booking.end)
  const isMultiDayBooking = isMultiDay || booking.allDay || differenceInDays(bookingEnd, bookingStart) >= 1

  const dayIdentifier = currentDay ? format(currentDay, "yyyy-MM-dd") : ""
  const segmentId = `${booking.id}-${view}-${dayIdentifier}`

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    data: {
      booking,
      height: height || null,
      isFirstDay,
      isLastDay,
      isMultiDay: isMultiDayBooking,
      segmentDate: currentDay ? currentDay.toISOString() : null,
      // Store the actual rendered width of this segment
      segmentWidth: multiDayWidth || null,
      view,
    },
    id: segmentId,
  })

  const isThisBookingBeingDragged = activeBooking?.id === booking.id

  if (isDragging || isThisBookingBeingDragged) {
    return <div className="opacity-0" ref={setNodeRef} style={{ height: height || "auto" }} />
  }

  const style = transform
    ? {
        height: height || "auto",
        transform: CSS.Translate.toString(transform),
        width: isMultiDayBooking && multiDayWidth ? `${multiDayWidth}px` : undefined,
      }
    : {
        height: height || "auto",
        width: isMultiDayBooking && multiDayWidth ? `${multiDayWidth}px` : undefined,
      }

  return (
    <div
      className="touch-none"
      ref={(node) => {
        setNodeRef(node)
        if (elementRef) elementRef.current = node
      }}
      style={style}
    >
      <BookingItem
        aria-hidden={ariaHidden}
        dndAttributes={attributes}
        dndListeners={listeners}
        booking={booking}
        isDragging={isDragging}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        onClick={onClick}
        showTime={showTime}
        view={view}
        allBookings={allBookings}
        dateTimeFormat={dateTimeFormat}
      />
    </div>
  )
});

DraggableBooking.displayName = "DraggableBooking";
