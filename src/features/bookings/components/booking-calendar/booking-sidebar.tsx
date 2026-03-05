"use client";
import type React from "react";

import { memo, useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format, isPast } from "date-fns";

import type { CalendarBooking, BookingStatus } from "./types";
import { getAllBookingsForDay, getBookingColorCircle, formatTimeWithOptionalMinutes } from "./utils";
import { BookingHoverTooltip } from "./booking-hover-tooltip";
import { useCalendarDnd } from "./calendar-dnd-context";
import { StatusFilter } from "./status-filter";
import { findBookingConflicts } from "./conflict-detection";
import { cn } from "@/lib/utils";
import { EntitySearch, EntityList, EntityItem, EmptyView } from "@/components/entity-components";

interface BookingSidebarProps {
  bookings: CalendarBooking[];
  onDateSelect?: (date: Date | undefined) => void;
  onBookingClick?: (booking: CalendarBooking) => void;
  selectedStatuses?: BookingStatus[];
  onStatusChange?: (statuses: BookingStatus[]) => void;
  dateTimeFormat?: "12" | "24";
}

export const BookingSidebar = memo(({
  bookings,
  onDateSelect,
  onBookingClick,
  selectedStatuses = [],
  onStatusChange,
  dateTimeFormat = "24",
}: BookingSidebarProps) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredBooking, setHoveredBooking] = useState<CalendarBooking | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const { activeBooking } = useCalendarDnd();

  const statusFilteredBookings = useMemo(() => {
    if (selectedStatuses.length === 0) {
      // Show all bookings sorted by creation date (newest first)
      return [...bookings].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }
    // Filter by selected statuses
    return bookings.filter((booking) => selectedStatuses.includes(booking.status || "pending"));
  }, [bookings, selectedStatuses]);

  const dateFilteredBookings = useMemo(() => {
    return date ? getAllBookingsForDay(statusFilteredBookings, date) : statusFilteredBookings;
  }, [date, statusFilteredBookings]);

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) {
      return dateFilteredBookings;
    }
    const query = searchQuery.toLowerCase();
    return dateFilteredBookings.filter(
      (booking) => booking.title.toLowerCase().includes(query),
    );
  }, [dateFilteredBookings, searchQuery]);

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    onDateSelect?.(newDate);
  };

  const handleMouseEnter = (e: React.MouseEvent, booking: CalendarBooking) => {
    if (activeBooking) return;

    const target = e.currentTarget;

    const timeout = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const tooltipWidth = 280;
      const gap = 8;

      setTooltipPosition({
        x: rect.left - tooltipWidth - gap,
        y: rect.top,
      });
      setHoveredBooking(booking);
    }, 500);

    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setHoveredBooking(null);
  };

  const handleItemClick = (e: React.MouseEvent, booking: CalendarBooking) => {
    e.preventDefault();
    e.stopPropagation();
    onBookingClick?.(booking);
  };

  return (
    <div className="flex h-full w-[348px] flex-col border-l bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b p-4 bg-background">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="w-full [&>div]:w-full [&_table]:w-full"
        />
      </div>

      <div className="flex-shrink-0 border-b p-4 space-y-4 bg-background">
        {onStatusChange && (
          <StatusFilter selectedStatuses={selectedStatuses} onStatusChange={onStatusChange} className="mb-2" />
        )}

        <EntitySearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search bookings..."
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 pb-6">
          <EntityList
            items={filteredBookings}
            getKey={(booking) => booking.id}
            renderItem={(booking) => {
              const bookingDate = new Date(booking.start);
              const monthAbbr = format(bookingDate, "MMM");
              const dayNumber = format(bookingDate, "d");
              const isBookingInPast = isPast(new Date(booking.end));
              const conflicts = findBookingConflicts(booking, bookings);
              const hasConflicts = conflicts.length > 0;

              const getBookingTime = () => {
                if (booking.allDay) return "All day";
                const start = formatTimeWithOptionalMinutes(bookingDate, dateTimeFormat, true);
                const end = formatTimeWithOptionalMinutes(new Date(booking.end), dateTimeFormat, true);
                return `${start} - ${end}`;
              };

              // Date badge as image
              const dateBadge = (
                <div className="flex flex-col items-center justify-center min-w-[44px]">
                  <div className="text-xs font-medium opacity-70 uppercase">{monthAbbr}</div>
                  <div className="text-2xl font-bold leading-none">{dayNumber}</div>
                </div>
              );

              // Title with status indicator and conflicts
              const titleWithIndicators = (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{booking.title}</span>
                  <div
                    className={cn(
                      "size-2 rounded-full flex-shrink-0",
                      getBookingColorCircle(booking.color, booking.status),
                    )}
                  />
                  {hasConflicts && (
                    <div className="flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <span className="text-[10px]">⚠</span>
                      <span>{conflicts.length}</span>
                    </div>
                  )}
                </div>
              );

              // Subtitle with time and location
              const subtitle = (
                <div className="text-xs opacity-70 mt-0.5">
                  {getBookingTime()}
                  {booking.location && (
                    <>
                      <span className="px-1 opacity-50"> · </span>
                      <span>{booking.location}</span>
                    </>
                  )}
                </div>
              );

              return (
                <button
                  type="button"
                  onMouseEnter={(e) => handleMouseEnter(e, booking)}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => handleItemClick(e, booking)}
                  className={cn(
                    "w-full text-left p-0 m-0 border-0 bg-transparent",
                    isBookingInPast && "opacity-75",
                  )}
                >
                  <EntityItem
                    href={`/calendar/${booking.id}`}
                    title={titleWithIndicators}
                    subtitle={subtitle}
                    image={dateBadge}
                    className={cn(
                      "bg-accent dark:bg-card hover:bg-accent",

                    )}
                  />
                </button>
              );
            }}
            emptyView={<EmptyView message="No bookings found" />}
          />
        </div>
      </div>
      {hoveredBooking && (
        <BookingHoverTooltip
          booking={hoveredBooking}
          position={tooltipPosition}
          conflicts={findBookingConflicts(hoveredBooking, bookings)}
          dateTimeFormat={dateTimeFormat}
        />
      )}
    </div>
  );
});

BookingSidebar.displayName = "BookingSidebar";

