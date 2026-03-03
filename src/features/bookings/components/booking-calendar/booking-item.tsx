"use client"

import type React from "react"

import type { DraggableAttributes } from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { differenceInMinutes, isPast } from "date-fns"
import { memo, useMemo, useState } from "react"

import type { CalendarBooking } from "./types"
import { getBorderRadiusClasses, getBookingColorCircle, formatTimeWithOptionalMinutes } from "./utils"
import { getBookingColorClasses } from "./utils"
import { BookingHoverTooltip } from "./booking-hover-tooltip"
import { useCalendarDnd } from "./calendar-dnd-context"
import { cn } from "@/lib/utils"
import { findBookingConflicts } from "./conflict-detection"
import { ConflictIndicator } from "./conflict-indicator"

interface BookingWrapperProps {
  booking: CalendarBooking
  isFirstDay?: boolean
  isLastDay?: boolean
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
  children: React.ReactNode
  currentTime?: Date
  dndListeners?: SyntheticListenerMap
  dndAttributes?: DraggableAttributes
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseMove?: (e: React.MouseEvent) => void
  onMouseLeave?: () => void
  hasConflict?: boolean
}

function BookingWrapper({
  booking,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  currentTime,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  hasConflict,
}: BookingWrapperProps) {
  const displayEnd = currentTime
    ? new Date(new Date(currentTime).getTime() + (new Date(booking.end).getTime() - new Date(booking.start).getTime()))
    : new Date(booking.end)

  const isBookingInPast = isPast(displayEnd)

  return (
    <button
      className={cn(
        "flex size-full select-none overflow-hidden px-1 text-left font-medium outline-none backdrop-blur-md transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-dragging:cursor-grabbing data-past-booking:line-through data-dragging:shadow-lg sm:px-2 rounded-md",
        getBookingColorClasses(booking.color, booking.status),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className,
      )}
      data-dragging={isDragging || undefined}
      data-past-booking={isBookingInPast || undefined}
      data-has-conflict={hasConflict || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      type="button"
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  )
}

interface BookingItemProps {
  booking: CalendarBooking
  view: "month" | "week" | "day" | "agenda"
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  showTime?: boolean
  currentTime?: Date
  isFirstDay?: boolean
  isLastDay?: boolean
  children?: React.ReactNode
  className?: string
  dndListeners?: SyntheticListenerMap
  dndAttributes?: DraggableAttributes
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
  allBookings?: CalendarBooking[]
  dateTimeFormat?: "12" | "24"
}

export const BookingItem = memo(({
  booking,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
  allBookings = [],
  dateTimeFormat = "24",
}: BookingItemProps) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const currentMousePositionRef = useState({ current: { x: 0, y: 0 } })[0]

  const { activeBooking } = useCalendarDnd()

  const conflicts = useMemo(() => {
    if (!booking.location || allBookings.length === 0) return []
    return findBookingConflicts(booking, allBookings)
  }, [booking, allBookings])

  const hasConflict = conflicts.length > 0

  const displayStart = useMemo(() => {
    return currentTime || new Date(booking.start)
  }, [currentTime, booking.start])

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() + (new Date(booking.end).getTime() - new Date(booking.start).getTime()),
        )
      : new Date(booking.end)
  }, [currentTime, booking.start, booking.end])

  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart)
  }, [displayStart, displayEnd])

  const getBookingTime = () => {
    if (booking.allDay) return "All day"

    if (durationMinutes < 45) {
      return formatTimeWithOptionalMinutes(displayStart, dateTimeFormat)
    }

    return `${formatTimeWithOptionalMinutes(displayStart, dateTimeFormat)} - ${formatTimeWithOptionalMinutes(displayEnd, dateTimeFormat)}`
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (activeBooking) return

    const target = e.currentTarget
    if (!target) return

    const initialPosition = { x: e.clientX + 12, y: e.clientY + 12 }
    currentMousePositionRef.current = initialPosition

    const timeout = setTimeout(() => {
      setTooltipPosition(currentMousePositionRef.current)
      setShowTooltip(true)
    }, 500)

    setHoverTimeout(timeout)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const newPosition = { x: e.clientX + 12, y: e.clientY + 12 }
    currentMousePositionRef.current = newPosition

    if (showTooltip) {
      setTooltipPosition(newPosition)
    }
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setShowTooltip(false)
  }

  if (view === "month") {
    return (
      <>
        <BookingWrapper
          className={cn("mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-xs", className)}
          currentTime={currentTime}
          dndAttributes={dndAttributes}
          dndListeners={dndListeners}
          booking={booking}
          isDragging={isDragging}
          isFirstDay={isFirstDay}
          isLastDay={isLastDay}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          hasConflict={hasConflict}
        >
          <div className="flex items-center justify-between w-full h-full gap-1">
            <div className="flex items-center min-w-0 flex-1">
              {children || (
                <span className="truncate">
                  {!booking.allDay && (
                    <span className="truncate font-normal opacity-70 sm:text-[11px]">
                      {formatTimeWithOptionalMinutes(displayStart, dateTimeFormat)}{" "}
                    </span>
                  )}
                  {booking.title}
                </span>
              )}
            </div>
            {hasConflict && isFirstDay && <ConflictIndicator conflictCount={conflicts.length} size="sm" />}
          </div>
        </BookingWrapper>
        {showTooltip && <BookingHoverTooltip booking={booking} position={tooltipPosition} conflicts={conflicts} dateTimeFormat={dateTimeFormat} />}
      </>
    )
  }

  if (view === "week" || view === "day") {
    return (
      <>
        <BookingWrapper
          className={cn(
            "py-1",
            durationMinutes < 45 ? "items-center" : "flex-col",
            view === "week" ? "text-[10px] sm:text-xs" : "text-xs",
            className,
          )}
          currentTime={currentTime}
          dndAttributes={dndAttributes}
          dndListeners={dndListeners}
          booking={booking}
          isDragging={isDragging}
          isFirstDay={isFirstDay}
          isLastDay={isLastDay}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          hasConflict={hasConflict}
        >
          <div className="flex flex-col w-full h-full">
            {durationMinutes < 45 ? (
              <div className="flex items-center justify-between gap-1">
                <div className="truncate min-w-0">
                  {booking.title}{" "}
                  {showTime && <span className="opacity-70">{formatTimeWithOptionalMinutes(displayStart, dateTimeFormat)}</span>}
                </div>
                {hasConflict && <ConflictIndicator conflictCount={conflicts.length} size="sm" />}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-1">
                  <div className="truncate font-medium min-w-0">{booking.title}</div>
                  {hasConflict && <ConflictIndicator conflictCount={conflicts.length} size="sm" />}
                </div>
                {showTime && <div className="truncate font-normal opacity-70 sm:text-[11px]">{getBookingTime()}</div>}
              </>
            )}
          </div>
        </BookingWrapper>
        {showTooltip && <BookingHoverTooltip booking={booking} position={tooltipPosition} conflicts={conflicts} dateTimeFormat={dateTimeFormat} />}
      </>
    )
  }

  // Agenda view
  return (
    <>
      <button
        className={cn(
          "flex w-full flex-col gap-1 rounded-lg p-2 text-left outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-past-booking:line-through data-past-booking:opacity-90",
          "bg-accent dark:bg-card hover:bg-accent text-card-foreground border border-border/40",
          className,
        )}
        data-past-booking={isPast(new Date(booking.end)) || undefined}
        data-has-conflict={hasConflict || undefined}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        type="button"
        {...dndListeners}
        {...dndAttributes}
      >
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">{booking.title}</div>
          <div
            className={cn("size-2 rounded-full flex-shrink-0", getBookingColorCircle(booking.color, booking.status))}
          />
          {hasConflict && <ConflictIndicator conflictCount={conflicts.length} size="sm" className="ml-auto" />}
        </div>
        <div className="text-xs opacity-70">
          {booking.allDay ? (
            <span>All day</span>
          ) : (
            <span className="uppercase">
              {formatTimeWithOptionalMinutes(displayStart, dateTimeFormat)} - {formatTimeWithOptionalMinutes(displayEnd, dateTimeFormat)}
            </span>
          )}
          {booking.location && (
            <>
              <span className="px-1 opacity-35"> · </span>
              <span>{booking.location}</span>
            </>
          )}
        </div>
      </button>
      {showTooltip && <BookingHoverTooltip booking={booking} position={tooltipPosition} conflicts={conflicts} />}
    </>
  )
});

BookingItem.displayName = "BookingItem";
