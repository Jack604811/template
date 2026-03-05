"use client"

import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachHourOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  startOfDay,
} from "date-fns"
import { memo, useMemo } from "react"
import type { MouseEvent } from "react"

import { EndHour, StartHour, WeekCellsHeight } from "./constants"
import { useCurrentTimeIndicator } from "./hooks/use-current-time-indicator"
import type { CalendarBooking } from "./types";
import { DraggableBooking } from "./draggable-booking";
import { DroppableCell } from "./droppable-cell";
import { BookingItem } from "./booking-item";
import { isMultiDayBooking } from "./utils"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/format-utils"

interface DayViewProps {
  currentDate: Date
  bookings: CalendarBooking[]
  onBookingSelect: (booking: CalendarBooking) => void
  onBookingCreate: (startTime: Date) => void
  allBookings?: CalendarBooking[]
  dateTimeFormat?: "12" | "24"
}

interface PositionedBooking {
  booking: CalendarBooking
  top: number
  height: number
  left: number
  width: number
  zIndex: number
}

export const DayView = memo(({ currentDate, bookings, onBookingSelect, onBookingCreate, allBookings = [], dateTimeFormat = "24" }: DayViewProps) => {
  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate)
    return eachHourOfInterval({
      end: addHours(dayStart, EndHour - 1),
      start: addHours(dayStart, StartHour),
    })
  }, [currentDate])

  const dayBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const bookingStart = new Date(booking.start)
        const bookingEnd = new Date(booking.end)
        return (
          isSameDay(currentDate, bookingStart) ||
          isSameDay(currentDate, bookingEnd) ||
          (currentDate > bookingStart && currentDate < bookingEnd)
        )
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [currentDate, bookings])

  // Filter all-day bookings
  const allDayBookings = useMemo(() => {
    return dayBookings.filter((booking) => {
      // Include explicitly marked all-day bookings or multi-day bookings
      return booking.allDay || isMultiDayBooking(booking)
    })
  }, [dayBookings])

  // Get only single-day time-based bookings
  const timeBookings = useMemo(() => {
    return dayBookings.filter((booking) => {
      // Exclude all-day bookings and multi-day bookings
      return !booking.allDay && !isMultiDayBooking(booking)
    })
  }, [dayBookings])

  // Process bookings to calculate positions
  const positionedBookings = useMemo(() => {
    const result: PositionedBooking[] = []
    const dayStart = startOfDay(currentDate)

    // Sort bookings by start time and duration
    const sortedBookings = [...timeBookings].sort((a, b) => {
      const aStart = new Date(a.start)
      const bStart = new Date(b.start)
      const aEnd = new Date(a.end)
      const bEnd = new Date(b.end)

      // First sort by start time
      if (aStart < bStart) return -1
      if (aStart > bStart) return 1

      // If start times are equal, sort by duration (longer bookings first)
      const aDuration = differenceInMinutes(aEnd, aStart)
      const bDuration = differenceInMinutes(bEnd, bStart)
      return bDuration - aDuration
    })

    // Track columns for overlapping bookings
    const columns: { booking: CalendarBooking; end: Date }[][] = []

    for (const booking of sortedBookings) {
      const bookingStart = new Date(booking.start)
      const bookingEnd = new Date(booking.end)

      // Adjust start and end times if they're outside this day
      const adjustedStart = isSameDay(currentDate, bookingStart) ? bookingStart : dayStart
      const adjustedEnd = isSameDay(currentDate, bookingEnd) ? bookingEnd : addHours(dayStart, 24)

      // Calculate top position and height
      const startHour = getHours(adjustedStart) + getMinutes(adjustedStart) / 60
      const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60

      const top = (startHour - StartHour) * WeekCellsHeight
      const height = (endHour - startHour) * WeekCellsHeight

      // Find a column for this booking
      let columnIndex = 0
      let placed = false

      while (!placed) {
        const col = columns[columnIndex] || []
        if (col.length === 0) {
          columns[columnIndex] = col
          placed = true
        } else {
          const overlaps = col.some((c) =>
            areIntervalsOverlapping(
              { end: adjustedEnd, start: adjustedStart },
              { end: new Date(c.booking.end), start: new Date(c.booking.start) },
            ),
          )

          if (!overlaps) {
            placed = true
          } else {
            columnIndex++
          }
        }
      }

      // Ensure column is initialized before pushing
      const currentColumn = columns[columnIndex] || []
      columns[columnIndex] = currentColumn
      currentColumn.push({ booking, end: adjustedEnd })

      // First column takes full width, others are indented by 10% and take 90% width
      const width = columnIndex === 0 ? 1 : 0.9
      const left = columnIndex === 0 ? 0 : columnIndex * 0.1

      result.push({
        booking,
        height,
        left,
        top,
        width,
        zIndex: 10 + columnIndex,
      })
    }

    return result
  }, [currentDate, timeBookings])

  const handleBookingClick = (booking: CalendarBooking, e: MouseEvent) => {
    e.stopPropagation();
    onBookingSelect(booking);
  };

  const showAllDaySection = allDayBookings.length > 0
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(currentDate, "day", "sunday")

  return (
    <div className="flex h-full flex-col min-h-0" data-slot="day-view">
      {showAllDaySection && (
        <div className="border-border/70 border-t bg-muted/50">
          <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
            <div className="relative">
              <span className="absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] text-muted-foreground/70 sm:pe-4 sm:text-xs">
                All day
              </span>
            </div>
            <div className="relative border-border/70 border-r p-1 last:border-r-0">
              {allDayBookings.map((booking) => {
                const bookingStart = new Date(booking.start)
                const bookingEnd = new Date(booking.end)
                const isFirstDay = isSameDay(currentDate, bookingStart)
                const isLastDay = isSameDay(currentDate, bookingEnd)

                return (
                  <BookingItem
                    allBookings={allBookings.length > 0 ? allBookings : bookings}
                    booking={booking}
                    isFirstDay={isFirstDay}
                    isLastDay={isLastDay}
                    key={`spanning-${booking.id}`}
                    onClick={(e) => handleBookingClick(booking, e)}
                    view="month"
                    dateTimeFormat={dateTimeFormat}
                  >
                    <div>{booking.title}</div>
                  </BookingItem>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-[3rem_1fr] overflow-auto min-h-0 border-border/70 border-t sm:grid-cols-[4rem_1fr]">
        <div>
          {hours.map((hour, index) => (
            <div
              className="relative h-[var(--week-cells-height)] border-border/70 border-b last:border-b-0"
              key={hour.toString()}
            >
              {index > 0 && (
                <span className="-top-3 absolute left-0 flex h-6 w-16 max-w-full items-center justify-end bg-background pe-2 text-[10px] text-muted-foreground/70 sm:pe-4 sm:text-xs">
                  {formatTime(hour, dateTimeFormat)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Positioned bookings */}
          {positionedBookings.map((positionedBooking) => (
            <div
              className="absolute z-10 px-0.5"
              key={positionedBooking.booking.id}
              style={{
                height: `${positionedBooking.height}px`,
                left: `${positionedBooking.left * 100}%`,
                top: `${positionedBooking.top}px`,
                width: `${positionedBooking.width * 100}%`,
                zIndex: positionedBooking.zIndex,
              }}
            >
              <div className="size-full">
                <DraggableBooking
                  allBookings={allBookings.length > 0 ? allBookings : bookings}
                  booking={positionedBooking.booking}
                  height={positionedBooking.height}
                  onClick={(e) => handleBookingClick(positionedBooking.booking, e)}
                  showTime
                  view="day"
                  dateTimeFormat={dateTimeFormat}
                />
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimeVisible && (
            <div
              className="pointer-events-none absolute right-0 left-0 z-20"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="relative flex items-center">
                <div className="-left-1 absolute h-2 w-2 rounded-full bg-primary" />
                <div className="h-[2px] w-full bg-primary" />
              </div>
            </div>
          )}

          {/* Time grid */}
          {hours.map((hour) => {
            const hourValue = getHours(hour)
            return (
              <div
                className="relative h-[var(--week-cells-height)] border-border/70 border-b last:border-b-0"
                key={hour.toString()}
              >
                {/* Quarter-hour intervals */}
                {[0, 1, 2, 3].map((quarter) => {
                  const quarterHourTime = hourValue + quarter * 0.25
                  return (
                    <DroppableCell
                      className={cn(
                        "absolute h-[calc(var(--week-cells-height)/4)] w-full",
                        quarter === 0 && "top-0",
                        quarter === 1 && "top-[calc(var(--week-cells-height)/4)]",
                        quarter === 2 && "top-[calc(var(--week-cells-height)/4*2)]",
                        quarter === 3 && "top-[calc(var(--week-cells-height)/4*3)]",
                      )}
                      date={currentDate}
                      id={`day-cell-${currentDate.toISOString()}-${quarterHourTime}`}
                      key={`${hour.toString()}-${quarter}`}
                      onClick={() => {
                        const startTime = new Date(currentDate)
                        startTime.setHours(hourValue)
                        startTime.setMinutes(quarter * 15)
                        onBookingCreate(startTime)
                      }}
                      time={quarterHourTime}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
});

DayView.displayName = "DayView";
