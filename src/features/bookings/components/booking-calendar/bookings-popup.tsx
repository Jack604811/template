"use client"

import { memo } from "react"
import { format, isSameDay } from "date-fns"
import { XIcon } from "lucide-react"
import { useEffect, useRef } from "react"

import { type CalendarBooking } from "./types";
import { BookingItem } from "./booking-item";

interface BookingsPopupProps {
  date: Date
  bookings: CalendarBooking[]
  position: { top: number; left: number }
  onClose: () => void
  onBookingSelect: (booking: CalendarBooking) => void
}

export const BookingsPopup = memo(({ date, bookings, position, onClose, onBookingSelect }: BookingsPopupProps) => {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [onClose])

  const handleBookingClick = (booking: CalendarBooking) => {
    onBookingSelect(booking)
    onClose()
  }

  const adjustedLeft = Math.max(0, Math.min(position.left, window.innerWidth - 320))
  const adjustedTop = Math.max(0, Math.min(position.top, window.innerHeight - 384))

  return (
    <div
      className="absolute z-50 max-h-96 w-80 overflow-auto rounded-md border bg-background shadow-lg"
      ref={popupRef}
      style={{
        left: `${adjustedLeft}px`,
        top: `${adjustedTop}px`,
      }}
    >
      <div className="sticky top-0 flex items-center justify-between border-b bg-background p-3">
        <h3 className="font-medium">{format(date, "EEE d")}</h3>
        <button aria-label="Close" className="rounded-full p-1 hover:bg-muted" onClick={onClose} type="button">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {bookings.length === 0 ? (
          <div className="py-2 text-muted-foreground text-sm">No bookings</div>
        ) : (
          bookings.map((booking) => {
            const bookingStart = new Date(booking.start)
            const bookingEnd = new Date(booking.end)
            const isFirstDay = isSameDay(date, bookingStart)
            const isLastDay = isSameDay(date, bookingEnd)

            return (
              <div className="cursor-pointer" key={booking.id} onClick={() => handleBookingClick(booking)}>
                <BookingItem booking={booking} isFirstDay={isFirstDay} isLastDay={isLastDay} view="agenda" />
              </div>
            )
          })
        )}
      </div>

      <div className="sticky bottom-0 border-t bg-background p-3 text-center">
        <div className="text-muted-foreground text-sm font-medium">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
        </div>
      </div>
    </div>
  )
});

BookingsPopup.displayName = "BookingsPopup";
