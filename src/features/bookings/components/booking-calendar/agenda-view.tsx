"use client"

import { memo, useMemo } from "react"
import type { MouseEvent } from "react"
import { CalendarIcon } from "lucide-react";
import { addDays, format, isToday } from "date-fns"

import { AgendaDaysToShow } from "./constants"
import type { CalendarBooking } from "./types"
import { BookingItem } from "./booking-item"
import { getAgendaBookingsForDay } from "./utils"

interface AgendaViewProps {
  currentDate: Date
  bookings: CalendarBooking[]
  onBookingSelect: (booking: CalendarBooking) => void
  allBookings?: CalendarBooking[]
  dateTimeFormat?: "12" | "24"
}

export const AgendaView = memo(({ currentDate, bookings, onBookingSelect, allBookings = [], dateTimeFormat = "24" }: AgendaViewProps) => {
  const days = useMemo(() => {
    return Array.from({ length: AgendaDaysToShow }, (_, i) => addDays(new Date(currentDate), i));
  }, [currentDate]);

  const handleBookingClick = (booking: CalendarBooking, e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onBookingSelect(booking);
  };

  const hasBookings = days.some((day) => getAgendaBookingsForDay(bookings, day).length > 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="border-border/70 border-t px-4 overflow-auto flex-1 min-h-0 bg-background">
      {!hasBookings ? (
        <div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
          <CalendarIcon className="mb-2 text-muted-foreground/50" size={32} />
          <h3 className="font-medium text-lg">No bookings found</h3>
          <p className="text-muted-foreground">There are no bookings scheduled for this time period.</p>
        </div>
      ) : (
        days.map((day) => {
          const dayBookings = getAgendaBookingsForDay(bookings, day)

          if (dayBookings.length === 0) return null

          return (
            <div className="relative my-12 border-border/70 border-t" key={day.toString()}>
              <span
                className="-top-3 absolute left-0 flex h-6 items-center bg-background pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
                data-today={isToday(day) || undefined}
              >
                {format(day, "d MMM, EEEE")}
              </span>
              <div className="mt-6 space-y-2">
                {dayBookings.map((booking) => (
                  <BookingItem
                    allBookings={allBookings.length > 0 ? allBookings : bookings}
                    booking={booking}
                    key={booking.id}
                    onClick={(e) => handleBookingClick(booking, e)}
                    view="agenda"
                    dateTimeFormat={dateTimeFormat}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}
      </div>
    </div>
  );
});

AgendaView.displayName = "AgendaView";
