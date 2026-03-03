"use client"

import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
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
import { getWeekStartOption, formatTime } from "@/lib/format-utils"

interface WeekViewProps {
  currentDate: Date
  bookings: CalendarBooking[]
  onBookingSelect: (booking: CalendarBooking) => void
  onBookingCreate: (startTime: Date) => void
  allBookings?: CalendarBooking[]
  weekStart?: "monday" | "sunday"
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

export const WeekView = memo(({ currentDate, bookings, onBookingSelect, onBookingCreate, allBookings = [], weekStart = "sunday", dateTimeFormat = "24" }: WeekViewProps) => {
  const handleBookingClick = (booking: CalendarBooking, e: MouseEvent) => {
    e.stopPropagation();
    onBookingSelect(booking);
  };
  const weekStartOption = getWeekStartOption(weekStart);

  const days = useMemo(() => {
    const weekStartDate = startOfWeek(currentDate, { weekStartsOn: weekStartOption })
    const weekEndDate = endOfWeek(currentDate, { weekStartsOn: weekStartOption })
    return eachDayOfInterval({ end: weekEndDate, start: weekStartDate })
  }, [currentDate, weekStartOption])

  const weekStartDate = useMemo(() => startOfWeek(currentDate, { weekStartsOn: weekStartOption }), [currentDate, weekStartOption])

  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate)
    return eachHourOfInterval({
      end: addHours(dayStart, EndHour - 1),
      start: addHours(dayStart, StartHour),
    })
  }, [currentDate])

  // Get all-day bookings and multi-day bookings for the week
  const allDayBookings = useMemo(() => {
    return (bookings || [])
      .filter((booking) => {
        return booking.allDay || isMultiDayBooking(booking)
      })
      .filter((booking) => {
        const bookingStart = new Date(booking.start)
        const bookingEnd = new Date(booking.end)
        return days.some(
          (day) =>
            isSameDay(day, bookingStart) || isSameDay(day, bookingEnd) || (day > bookingStart && day < bookingEnd),
        )
      })
  }, [bookings, days])

  // Process bookings for each day to calculate positions
  const processedDayBookings = useMemo(() => {
    return days.map((day) => {
      const dayStart = startOfDay(day)

      const dayTimeBookings = (bookings || [])
        .filter((booking) => {
          if (booking.allDay || isMultiDayBooking(booking)) return false

          const bookingStart = new Date(booking.start)
          return isSameDay(day, bookingStart)
        })
        .sort((a, b) => {
          const aStart = new Date(a.start)
          const bStart = new Date(b.start)
          const aEnd = new Date(a.end)
          const bEnd = new Date(b.end)

          if (aStart < bStart) return -1
          if (aStart > bStart) return 1

          const aDuration = differenceInMinutes(aEnd, aStart)
          const bDuration = differenceInMinutes(bEnd, bStart)
          return bDuration - aDuration
        })

      const positionedBookings: PositionedBooking[] = []

      const columns: { booking: CalendarBooking; end: Date }[][] = []

      for (const booking of dayTimeBookings) {
        const bookingStart = new Date(booking.start)
        const bookingEnd = new Date(booking.end)

        // Adjust start and end times if they're outside this day
        const adjustedStart = isSameDay(day, bookingStart) ? bookingStart : dayStart
        const adjustedEnd = isSameDay(day, bookingEnd) ? bookingEnd : addHours(dayStart, 24)

        // Calculate top position and height
        const startHour = getHours(adjustedStart) + getMinutes(adjustedStart) / 60
        const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60

        // Adjust the top calculation to account for the new start time
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
                {
                  end: new Date(c.booking.end),
                  start: new Date(c.booking.start),
                },
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

        // Calculate width and left position based on number of columns
        const width = columnIndex === 0 ? 1 : 0.9
        const left = columnIndex === 0 ? 0 : columnIndex * 0.1

        positionedBookings.push({
          booking,
          height,
          left,
          top,
          width,
          zIndex: 10 + columnIndex,
        })
      }

      return positionedBookings
    })
  }, [days, bookings])

  const showAllDaySectionBookings = allDayBookings.length > 0
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(currentDate, "week", weekStart)

  return (
    <div className="flex h-full flex-col min-h-0" data-slot="week-view">
      <div className="sticky top-0 z-30 grid grid-cols-8 border-border/70 border-b bg-background/80 backdrop-blur-md">
        <div className="py-2 text-center text-muted-foreground/70 text-sm">
          <span className="max-[479px]:sr-only">{format(new Date(), "O")}</span>
        </div>
        {days.map((day) => (
          <div
            className="py-2 text-center text-muted-foreground/70 text-sm data-today:font-medium data-today:text-foreground"
            data-today={isToday(day) || undefined}
            key={day.toString()}
          >
            <span aria-hidden="true" className="sm:hidden">
              {format(day, "E")[0]} {format(day, "d")}
            </span>
            <span className="max-sm:hidden">{format(day, "EEE dd")}</span>
          </div>
        ))}
      </div>

      {showAllDaySectionBookings && (
        <div className="border-border/70 border-b bg-muted/50">
          <div className="grid grid-cols-8">
            <div className="relative border-border/70 border-r">
              <span className="absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] text-muted-foreground/70 sm:pe-4 sm:text-xs">
                All day Bookings
              </span>
            </div>
            {days.map((day, dayIndex) => {
              const dayAllDayBookings = allDayBookings.filter((booking) => {
                const bookingStart = new Date(booking.start)
                const bookingEnd = new Date(booking.end)
                return (
                  isSameDay(day, bookingStart) || (day > bookingStart && day < bookingEnd) || isSameDay(day, bookingEnd)
                )
              })

              return (
                <div
                  className="relative border-border/70 border-r p-1 last:border-r-0"
                  data-today={isToday(day) || undefined}
                  key={day.toString()}
                >
                  {dayAllDayBookings.map((booking) => {
                    const bookingStart = new Date(booking.start)
                    const bookingEnd = new Date(booking.end)
                    const isFirstDay = isSameDay(day, bookingStart)
                    const isLastDay = isSameDay(day, bookingEnd)

                    // Check if this is the first day in the current week view
                    const isFirstVisibleDay = dayIndex === 0 && isBefore(bookingStart, weekStartDate)
                    const shouldShowTitle = isFirstDay || isFirstVisibleDay

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
                        {/* Show title if it's the first day of the booking or the first visible day in the week */}
                        <div aria-hidden={!shouldShowTitle} className={cn("truncate", !shouldShowTitle && "invisible")}>
                          {booking.title}
                        </div>
                      </BookingItem>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-8 overflow-auto min-h-0">
        <div className="grid auto-cols-fr border-border/70 border-r">
          {hours.map((hour, index) => (
            <div
              className="relative min-h-[var(--week-cells-height)] border-border/70 border-b last:border-b-0"
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

        {days.map((day, dayIndex) => (
          <div
            className="relative grid auto-cols-fr border-border/70 border-r last:border-r-0"
            data-today={isToday(day) || undefined}
            key={day.toString()}
          >
            {/* Positioned bookings */}
            {(processedDayBookings[dayIndex] ?? []).map((positionedBooking) => (
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
                    allBookings={bookings}
                    booking={positionedBooking.booking}
                    height={positionedBooking.height}
                    onClick={(e) => handleBookingClick(positionedBooking.booking, e)}
                    showTime
                    view="week"
                    dateTimeFormat={dateTimeFormat}
                  />
                </div>
              </div>
            ))}

            {/* Current time indicator - only show for today's column */}
            {currentTimeVisible && isToday(day) && (
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
            {hours.map((hour) => {
              const hourValue = getHours(hour)
              return (
                <div
                  className="relative min-h-[var(--week-cells-height)] border-border/70 border-b last:border-b-0"
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
                        date={day}
                        id={`week-cell-${day.toISOString()}-${quarterHourTime}`}
                        key={`${hour.toString()}-${quarter}`}
                        onClick={() => {
                          const startTime = new Date(day)
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
        ))}
      </div>
    </div>
  )
});

WeekView.displayName = "WeekView";
