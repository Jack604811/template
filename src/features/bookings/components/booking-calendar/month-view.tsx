"use client"

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import type React from "react"
import { memo, useEffect, useMemo, useState } from "react"

import type { CalendarBooking } from "./types"
import { DraggableBooking } from "./draggable-booking"
import { DroppableCell } from "./droppable-cell"
import { BookingItem } from "./booking-item"
import { getBookingsForDay, getSpanningBookingsForDay, getAllBookingsForDay, sortBookings } from "./utils"
import { useBookingVisibility } from "./hooks/use-booking-visibility"
import { DefaultStartHour, BookingGap, BookingHeight } from "./constants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getWeekStartOption } from "@/lib/format-utils"

interface MonthViewProps {
  currentDate: Date
  bookings: CalendarBooking[]
  onBookingSelect: (booking: CalendarBooking) => void
  onBookingCreate: (startTime: Date) => void
  allBookings?: CalendarBooking[]
  weekStart?: "monday" | "sunday"
}

export const MonthView = memo(({
  currentDate,
  bookings,
  onBookingSelect,
  onBookingCreate,
  allBookings = [],
  weekStart = "sunday",
}: MonthViewProps) => {
  const weekStartOption = getWeekStartOption(weekStart);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartOption })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartOption })

    return eachDayOfInterval({ end: calendarEnd, start: calendarStart })
  }, [currentDate, weekStartOption])

  const weekdays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(startOfWeek(new Date(), { weekStartsOn: weekStartOption }), i)
      return format(date, "EEE")
    })
  }, [weekStartOption])

  const weeks = useMemo(() => {
    const result = []
    let week = []

    for (let i = 0; i < days.length; i++) {
      week.push(days[i])
      if (week.length === 7 || i === days.length - 1) {
        result.push(week)
        week = []
      }
    }

    return result
  }, [days])

  const handleBookingClick = (booking: CalendarBooking, e: React.MouseEvent) => {
    e.stopPropagation()
    onBookingSelect(booking)
  }

  const [isMounted, setIsMounted] = useState(false)
  const { contentRef: bookingContentRef, getVisibleBookingCount } = useBookingVisibility({
    eventGap: BookingGap,
    eventHeight: BookingHeight,
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="flex flex-col h-full" data-slot="month-view">
      <div className="grid grid-cols-7 border-border/70 border-b">
        {weekdays.map((day) => (
          <div className="py-2 text-center text-muted-foreground/70 text-sm" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr border-b border-border/70 overflow-auto">
        {weeks.map((week, weekIndex) => (
          <div className="grid grid-cols-7 [&:last-child>*]:border-b-0" key={week[0]?.toISOString() || `week-${week[0]?.getTime()}`}>
            {week.map((day, dayIndex) => {
              if (!day) return null // Skip if day is undefined

              const dayBookings = getBookingsForDay(bookings || [], day)
              const spanningBookings = getSpanningBookingsForDay(bookings || [], day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const cellId = `month-cell-${day.toISOString()}`
              const allDayBookings = [...spanningBookings, ...dayBookings]
              const allBookingsForDay = getAllBookingsForDay(bookings || [], day)

              const isReferenceCell = weekIndex === 0 && dayIndex === 0
              const bookingVisibleCount = isMounted ? getVisibleBookingCount(allDayBookings.length) : undefined
              const hasMoreBookings = bookingVisibleCount !== undefined && allDayBookings.length > bookingVisibleCount
              const remainingBookingCount = hasMoreBookings ? allDayBookings.length - bookingVisibleCount : 0

              return (
                <div
                  className="group border-border/70 border-r border-b last:border-r-0 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70"
                  data-outside-cell={!isCurrentMonth || undefined}
                  data-today={isToday(day) || undefined}
                  key={day.toString()}
                >
                  <DroppableCell
                    date={day}
                    id={cellId}
                    onClick={() => {
                      const startTime = new Date(day)
                      startTime.setHours(DefaultStartHour, 0, 0)
                      onBookingCreate(startTime)
                    }}
                  >
                    <div className="mt-1 inline-flex size-6 items-center justify-center text-sm group-data-today:bg-primary group-data-today:text-primary-foreground h-6 rounded-md">
                      {format(day, "d")}
                    </div>
                    <div
                      className="min-h-[calc((var(--event-height)+var(--event-gap))*2)] sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]"
                      ref={isReferenceCell ? bookingContentRef : null}
                    >
                      {sortBookings(allDayBookings).map((booking, index) => {
                        const bookingStart = new Date(booking.start)
                        const bookingEnd = new Date(booking.end)
                        const isFirstDay = isSameDay(day, bookingStart)
                        const isLastDay = isSameDay(day, bookingEnd)

                        const isHidden = isMounted && bookingVisibleCount && index >= bookingVisibleCount

                        if (!bookingVisibleCount) return null

                        return (
                          <div
                            aria-hidden={isHidden ? "true" : undefined}
                            className="aria-hidden:hidden"
                            key={booking.id}
                          >
                            <DraggableBooking
                              booking={booking}
                              currentDay={day}
                              isFirstDay={isFirstDay}
                              isLastDay={isLastDay}
                              onClick={(e) => handleBookingClick(booking, e)}
                              view="month"
                              allBookings={allBookings}
                            />
                          </div>
                        )
                      })}

                      {hasMoreBookings && (
                          <Popover modal>
                            <PopoverTrigger asChild>
                              <button
                                className="mt-(--event-gap) flex h-(--event-height) w-full select-none items-center overflow-hidden px-1 text-left text-[10px] text-muted-foreground outline-none backdrop-blur-md transition hover:bg-muted/50 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-2 sm:text-xs"
                                type="button"
                                onClick={(e) => {
                                // Stop propagation to prevent cell click handler from firing
                                e.stopPropagation();
                                }}
                              >
                                <span>
                                  + {remainingBookingCount} <span className="max-sm:sr-only">more</span>
                                </span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="center"
                              className="max-w-52 p-3"
                            onClick={(e) => {
                              // Stop propagation to prevent cell click handler from firing
                              e.stopPropagation();
                            }}
                              style={
                                {
                                  "--event-height": `${BookingHeight}px`,
                                } as Record<string, string>
                              }
                            >
                              <div className="space-y-2">
                                <div className="font-medium text-sm">{format(day, "EEE d")}</div>
                                <div className="space-y-1">
                                  {sortBookings(allBookingsForDay).map((booking) => {
                                    const bookingStart = new Date(booking.start)
                                    const bookingEnd = new Date(booking.end)
                                    const isFirstDay = isSameDay(day, bookingStart)
                                    const isLastDay = isSameDay(day, bookingEnd)

                                    return (
                                      <BookingItem
                                        booking={booking}
                                        isFirstDay={isFirstDay}
                                        isLastDay={isLastDay}
                                        key={booking.id}
                                        onClick={(e) => handleBookingClick(booking, e)}
                                        view="month"
                                        allBookings={allBookings}
                                      />
                                    )
                                  })}
                                </div>
                                <div className="border-t pt-2 text-center text-muted-foreground text-xs">
                                  {allBookingsForDay.length} {allBookingsForDay.length === 1 ? "booking" : "bookings"}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                      )}
                    </div>
                  </DroppableCell>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
});

MonthView.displayName = "MonthView";
