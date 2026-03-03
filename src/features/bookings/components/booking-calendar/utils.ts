import { format, getMinutes, isSameDay } from "date-fns"
import { getStatusConfig } from "./status-config"
import { formatTime as formatTimeUtil } from "@/lib/format-utils"

import type { CalendarBooking, BookingColor, BookingStatus } from "./types"

// ============================================================================
// Time Formatting Utilities
// ============================================================================

/**
 * Format time with optional minutes display
 * Shows "9am" when minutes are 0, otherwise "9:30am" (12-hour) or "09:00"/"09:30" (24-hour)
 * @param date - The date to format
 * @param dateTimeFormat - "12" for 12-hour format, "24" for 24-hour format (default: "24")
 * @param uppercase - Whether to return uppercase (default: false for lowercase)
 * @returns Formatted time string (e.g., "9am", "9:30am", "09:00", or "09:30")
 */
export function formatTimeWithOptionalMinutes(
  date: Date,
  dateTimeFormat: "12" | "24" = "24",
  uppercase = false
): string {
  return formatTimeUtil(date, dateTimeFormat, uppercase);
}

// ============================================================================
// Color and Styling Utilities
// ============================================================================

/**
 * Get CSS classes for booking colors based on color or status
 * @param color - Optional booking color (sky, amber, violet, etc.)
 * @param status - Optional booking status (pending, approved, etc.)
 * @returns Combined CSS classes for background, hover, text, and shadow
 */
export function getBookingColorClasses(color?: BookingColor | string, status?: string | BookingStatus): string {
  if (status) {
    const statusConfig = getStatusConfig(status as BookingStatus)
    return `${statusConfig.color} ${statusConfig.hoverColor} ${statusConfig.textColor} shadow-sm`
  }

  // Fallback to legacy color system
  const bookingColor = color || "sky"

  switch (bookingColor) {
    case "sky":
      return "bg-sky-200/50 hover:bg-sky-200/40 text-sky-950/80 dark:bg-sky-400/25 dark:hover:bg-sky-400/20 dark:text-sky-200 shadow-sky-700/8"
    case "amber":
      return "bg-amber-200/50 hover:bg-amber-200/40 text-amber-950/80 dark:bg-amber-400/25 dark:hover:bg-amber-400/20 dark:text-amber-200 shadow-amber-700/8"
    case "violet":
      return "bg-violet-200/50 hover:bg-violet-200/40 text-violet-950/80 dark:bg-violet-400/25 dark:hover:bg-violet-400/20 dark:text-violet-200 shadow-violet-700/8"
    case "rose":
      return "bg-rose-200/50 hover:bg-rose-200/40 text-rose-950/80 dark:bg-rose-400/25 dark:hover:bg-rose-400/20 dark:text-rose-200 shadow-rose-700/8"
    case "emerald":
      return "bg-emerald-200/50 hover:bg-emerald-200/40 text-emerald-950/80 dark:bg-emerald-400/25 dark:hover:bg-emerald-400/20 dark:text-emerald-200 shadow-emerald-700/8"
    case "orange":
      return "bg-orange-200/50 hover:bg-orange-200/40 text-orange-950/80 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200 shadow-orange-700/8"
    default:
      return "bg-sky-200/50 hover:bg-sky-200/40 text-sky-950/80 dark:bg-sky-400/25 dark:hover:bg-sky-400/20 dark:text-sky-200 shadow-sky-700/8"
  }
}

/**
 * Get solid background color class for color indicator circles
 * Used for small status/color indicators in booking lists and cards
 * @param color - Optional booking color (sky, amber, violet, etc.)
 * @param status - Optional booking status (pending, approved, etc.)
 * @returns CSS class for solid background color (e.g., "bg-emerald-500 dark:bg-emerald-400")
 */
export function getBookingColorCircle(color?: BookingColor | string, status?: string | BookingStatus): string {
  if (status) {
    const statusConfig = getStatusConfig(status as BookingStatus)
    // Extract the base color from the status config (e.g., "emerald" from "bg-emerald-100")
    const colorMatch = statusConfig.color.match(/bg-(\w+)-/)
    const statusColor = colorMatch ? colorMatch[1] : "gray"

    switch (statusColor) {
      case "gray":
        return "bg-gray-500 dark:bg-gray-400"
      case "emerald":
        return "bg-emerald-500 dark:bg-emerald-400"
      case "blue":
        return "bg-blue-500 dark:bg-blue-400"
      case "red":
        return "bg-red-500 dark:bg-red-400"
      case "violet":
        return "bg-violet-500 dark:bg-violet-400"
      default:
        return "bg-gray-500 dark:bg-gray-400"
    }
  }

  // Fallback to legacy color system
  const bookingColor = color || "sky"

  switch (bookingColor) {
    case "sky":
      return "bg-sky-500 dark:bg-sky-400"
    case "amber":
      return "bg-amber-500 dark:bg-amber-400"
    case "violet":
      return "bg-violet-500 dark:bg-violet-400"
    case "rose":
      return "bg-rose-500 dark:bg-rose-400"
    case "emerald":
      return "bg-emerald-500 dark:bg-emerald-400"
    case "orange":
      return "bg-orange-500 dark:bg-orange-400"
    default:
      return "bg-sky-500 dark:bg-sky-400"
  }
}

/**
 * Get CSS classes for border radius based on booking position in multi-day bookings
 * Ensures proper visual continuity for bookings that span multiple days
 * @param isFirstDay - Whether this is the first day of a multi-day booking
 * @param isLastDay - Whether this is the last day of a multi-day booking
 * @returns CSS classes for border radius (rounded, rounded-l, rounded-r, or rounded-none)
 */
export function getBorderRadiusClasses(isFirstDay: boolean, isLastDay: boolean): string {
  if (isFirstDay && isLastDay) {
    return "rounded" // Both ends rounded
  }
  if (isFirstDay) {
    return "rounded-l rounded-r-none" // Only left end rounded
  }
  if (isLastDay) {
    return "rounded-r rounded-l-none" // Only right end rounded
  }
  return "rounded-none" // No rounded corners
}

// ============================================================================
// Booking Filtering and Sorting Utilities
// ============================================================================

/**
 * Check if a booking spans multiple days
 * @param booking - The booking to check
 * @returns True if booking is all-day or spans across multiple calendar days
 */
export function isMultiDayBooking(booking: CalendarBooking): boolean {
  const bookingStart = new Date(booking.start)
  const bookingEnd = new Date(booking.end)
  return booking.allDay || bookingStart.getDate() !== bookingEnd.getDate()
}

/**
 * Filter bookings that start on a specific day
 * @param bookings - Array of bookings to filter
 * @param day - The target day to filter by
 * @returns Array of bookings that start on the specified day, sorted by start time
 */
export function getBookingsForDay(bookings: CalendarBooking[], day: Date): CalendarBooking[] {
  if (!bookings || !Array.isArray(bookings)) {
    return []
  }
  return bookings
    .filter((booking) => {
      const bookingStart = new Date(booking.start)
      return isSameDay(day, bookingStart)
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

/**
 * Sort bookings with multi-day bookings first, then by start time
 * Multi-day bookings are prioritized to ensure they appear at the top of lists
 * @param bookings - Array of bookings to sort
 * @returns Sorted array with multi-day bookings first, then sorted by start time
 */
export function sortBookings(bookings: CalendarBooking[]): CalendarBooking[] {
  if (!bookings || !Array.isArray(bookings)) {
    return []
  }
  return [...bookings].sort((a, b) => {
    const aIsMultiDay = isMultiDayBooking(a)
    const bIsMultiDay = isMultiDayBooking(b)

    if (aIsMultiDay && !bIsMultiDay) return -1
    if (!aIsMultiDay && bIsMultiDay) return 1

    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

/**
 * Get multi-day bookings that span across a specific day (but don't start on that day)
 * Used in month view to show bookings that continue from previous days
 * @param bookings - Array of bookings to filter
 * @param day - The target day to check for spanning bookings
 * @returns Array of multi-day bookings that span the specified day but don't start on it
 */
export function getSpanningBookingsForDay(bookings: CalendarBooking[], day: Date): CalendarBooking[] {
  if (!bookings || !Array.isArray(bookings)) {
    return []
  }
  return bookings.filter((booking) => {
    if (!isMultiDayBooking(booking)) return false

    const bookingStart = new Date(booking.start)
    const bookingEnd = new Date(booking.end)

    return !isSameDay(day, bookingStart) && (isSameDay(day, bookingEnd) || (day > bookingStart && day < bookingEnd))
  })
}

/**
 * Get all bookings visible on a specific day (starting, ending, or spanning)
 * Includes bookings that start, end, or span across the specified day
 * @param bookings - Array of bookings to filter
 * @param day - The target day to filter by
 * @returns Array of all bookings visible on the specified day
 */
export function getAllBookingsForDay(bookings: CalendarBooking[], day: Date): CalendarBooking[] {
  if (!bookings || !Array.isArray(bookings)) {
    return []
  }
  return bookings.filter((booking) => {
    const bookingStart = new Date(booking.start)
    const bookingEnd = new Date(booking.end)
    return isSameDay(day, bookingStart) || isSameDay(day, bookingEnd) || (day > bookingStart && day < bookingEnd)
  })
}

/**
 * Get all bookings for a day (for agenda view)
 * Similar to getAllBookingsForDay but specifically formatted for agenda view display
 * @param bookings - Array of bookings to filter
 * @param day - The target day to filter by
 * @returns Array of bookings visible on the specified day, sorted by start time
 */
export function getAgendaBookingsForDay(bookings: CalendarBooking[], day: Date): CalendarBooking[] {
  if (!bookings || !Array.isArray(bookings)) {
    return []
  }
  return bookings
    .filter((booking) => {
      const bookingStart = new Date(booking.start)
      const bookingEnd = new Date(booking.end)
      return isSameDay(day, bookingStart) || isSameDay(day, bookingEnd) || (day > bookingStart && day < bookingEnd)
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

// ============================================================================
// Date Manipulation Utilities
// ============================================================================

/**
 * Add hours to a date and return a new Date object
 * @param date - The base date
 * @param hours - Number of hours to add (can be negative to subtract)
 * @returns New Date object with hours added
 */
export function addHoursToDate(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

// ============================================================================
