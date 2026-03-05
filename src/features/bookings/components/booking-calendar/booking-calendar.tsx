"use client"

import type React from "react"
import { format } from "date-fns"
import { memo } from "react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { BookingGap, BookingHeight, WeekCellsHeight } from "./constants"
import { addHoursToDate } from "./utils"
import { AgendaView } from "./agenda-view"
import { CalendarDndProvider } from "./calendar-dnd-context"
import type { CalendarBooking, CalendarView, BookingStatus } from "./types"
import { DayView } from "./day-view"
import { BookingDialog } from "./booking-dialog"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"

export interface BookingCalendarProps {
  bookings?: CalendarBooking[]
  onBookingAdd?: (booking: CalendarBooking) => void
  onBookingUpdate?: (booking: CalendarBooking) => void
  onBookingDelete?: (bookingId: string) => void
  className?: string
  initialView?: CalendarView
  onBookingClick?: (booking: CalendarBooking) => void
  selectedBooking?: CalendarBooking | null
  onSelectedBookingChange?: (booking: CalendarBooking | null) => void
  isBookingDialogOpen?: boolean
  onBookingDialogOpenChange?: (open: boolean) => void
  selectedStatuses?: BookingStatus[]
  currentDate?: Date
  onCurrentDateChange?: (date: Date) => void
  view?: CalendarView
  onViewChange?: (view: CalendarView) => void
  dateTimeFormat?: "12" | "24"
  weekStart?: "monday" | "sunday"
}

export const BookingCalendar = memo(({
  bookings = [],
  onBookingAdd,
  onBookingUpdate,
  onBookingDelete,
  initialView = "month",
  onBookingClick,
  selectedBooking: externalSelectedBooking,
  onSelectedBookingChange,
  isBookingDialogOpen: externalIsBookingDialogOpen,
  onBookingDialogOpenChange,
  selectedStatuses = [],
  currentDate: externalCurrentDate,
  onCurrentDateChange,
  view: externalView,
  onViewChange,
  dateTimeFormat = "24",
  weekStart = "sunday",
}: BookingCalendarProps) => {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date())
  const [internalView, setInternalView] = useState<CalendarView>(initialView)

  const currentDate = externalCurrentDate ?? internalCurrentDate
  const view = externalView ?? internalView

  // biome-ignore lint/correctness/noUnusedVariables: Needed for backward compatibility when external props aren't provided
  const setCurrentDate = onCurrentDateChange ?? setInternalCurrentDate
  const setView = onViewChange ?? setInternalView

  const [internalSelectedBooking, setInternalSelectedBooking] = useState<CalendarBooking | null>(null)
  const [internalIsBookingDialogOpen, setInternalIsBookingDialogOpen] = useState(false)

  const selectedBooking = externalSelectedBooking !== undefined ? externalSelectedBooking : internalSelectedBooking
  const isBookingDialogOpen =
    externalIsBookingDialogOpen !== undefined ? externalIsBookingDialogOpen : internalIsBookingDialogOpen

  const setSelectedBooking = onSelectedBookingChange || setInternalSelectedBooking
  const setIsBookingDialogOpen = onBookingDialogOpenChange || setInternalIsBookingDialogOpen

  const filteredBookings = useMemo(() => {
    if (selectedStatuses.length === 0) {
      // Show all bookings when no status filter is selected, sorted by creation date (newest first)
      return [...bookings].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
    }
    // Filter by selected statuses
    return bookings.filter((booking) => selectedStatuses.includes(booking.status || "pending"))
  }, [bookings, selectedStatuses])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isBookingDialogOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month")
          break
        case "w":
          setView("week")
          break
        case "d":
          setView("day")
          break
        case "a":
          setView("agenda")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isBookingDialogOpen, setView])

  const handleBookingSelect = (booking: CalendarBooking) => {
    // Navigate to booking details page when clicking a booking
    onBookingClick?.(booking)
  }

  const handleBookingCreate = (startTime: Date) => {

    const minutes = startTime.getMinutes()
    const remainder = minutes % 15
    if (remainder !== 0) {
      if (remainder < 7.5) {
        startTime.setMinutes(minutes - remainder)
      } else {
        startTime.setMinutes(minutes + (15 - remainder))
      }
      startTime.setSeconds(0)
      startTime.setMilliseconds(0)
    }

    const newBooking: CalendarBooking = {
      allDay: false,
      end: addHoursToDate(startTime, 1),
      id: "",
      start: startTime,
      title: "",
    }
    setSelectedBooking(newBooking)
    setIsBookingDialogOpen(true)
  }

  const handleBookingSave = (booking: CalendarBooking) => {
    // Trigger optimistic update immediately - booking appears instantly
    // Toast notifications are handled by mutation hooks to avoid duplicates
    if (booking.id && !booking.id.startsWith("temp-")) {
      onBookingUpdate?.(booking);
    } else {
      onBookingAdd?.(booking);
    }
    setIsBookingDialogOpen(false);
    setSelectedBooking(null);
  };

  const handleBookingDelete = (bookingId: string) => {
    const deletedBooking = bookings.find((e) => e.id === bookingId)
    onBookingDelete?.(bookingId)
    setIsBookingDialogOpen(false)
    setSelectedBooking(null)

    if (deletedBooking) {
      toast(`Booking "${deletedBooking.title}" deleted`, {
        description: format(new Date(deletedBooking.start), "MMM d, yyyy"),
        position: "bottom-right",
      })
    }
  }

  const handleBookingUpdate = (updatedBooking: CalendarBooking) => {
    // Trigger optimistic update for drag-and-drop moves
    // Toast notifications are handled by mutation hooks if needed
    onBookingUpdate?.(updatedBooking)
  }


  return (
    <div
      className="flex flex-col h-full has-data-[slot=month-view]:flex-1"
      style={
        {
          "--booking-gap": `${BookingGap}px`,
          "--booking-height": `${BookingHeight}px`,
          "--week-cells-height": `${WeekCellsHeight}px`,
          "--event-gap": `${BookingGap}px`,
          "--event-height": `${BookingHeight}px`,
        } as React.CSSProperties
      }
    >
      <CalendarDndProvider onBookingUpdate={handleBookingUpdate} allBookings={bookings}>
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              bookings={filteredBookings}
              onBookingCreate={handleBookingCreate}
              onBookingSelect={handleBookingSelect}
              allBookings={bookings}
              weekStart={weekStart}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              bookings={filteredBookings}
              onBookingCreate={handleBookingCreate}
              onBookingSelect={handleBookingSelect}
              allBookings={bookings}
              weekStart={weekStart}
              dateTimeFormat={dateTimeFormat}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              bookings={filteredBookings}
              onBookingCreate={handleBookingCreate}
              onBookingSelect={handleBookingSelect}
              allBookings={bookings}
              dateTimeFormat={dateTimeFormat}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              currentDate={currentDate}
              bookings={filteredBookings}
              onBookingSelect={handleBookingSelect}
              allBookings={bookings}
              dateTimeFormat={dateTimeFormat}
            />
          )}
        </div>

        {externalIsBookingDialogOpen === undefined && (
          <BookingDialog
            booking={selectedBooking}
            isOpen={isBookingDialogOpen}
            onClose={() => {
              setIsBookingDialogOpen(false)
              setSelectedBooking(null)
            }}
            onDelete={handleBookingDelete}
            onSave={handleBookingSave}
          />
        )}
      </CalendarDndProvider>
    </div>
  )
});

BookingCalendar.displayName = "BookingCalendar";
