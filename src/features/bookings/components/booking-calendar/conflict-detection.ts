import type { CalendarBooking } from "./types"

/**
 * Represents a booking conflict with detailed information
 */
export interface BookingConflict {
  conflictingBooking: CalendarBooking
  overlapStart: Date
  overlapEnd: Date
  overlapMinutes: number
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Calculate the overlap between two time ranges
 */
function calculateOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): { start: Date; end: Date; minutes: number } | null {
  if (!timeRangesOverlap(start1, end1, start2, end2)) {
    return null
  }

  const overlapStart = start1 > start2 ? start1 : start2
  const overlapEnd = end1 < end2 ? end1 : end2
  const overlapMinutes = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60))

  return {
    start: overlapStart,
    end: overlapEnd,
    minutes: overlapMinutes,
  }
}

/**
 * Check if two bookings conflict based on time and location
 * Two bookings conflict if:
 * 1. Their times overlap
 * 2. They have the same location (resource)
 */
export function checkBookingConflict(booking1: CalendarBooking, booking2: CalendarBooking): BookingConflict | null {
  // Don't check conflict with itself
  if (booking1.id === booking2.id) {
    return null
  }

  // Only check conflicts if both bookings have a location
  // Bookings without location don't conflict
  if (!booking1.location || !booking2.location) {
    return null
  }

  // Only check conflicts if locations match (same resource)
  if (booking1.location.trim().toLowerCase() !== booking2.location.trim().toLowerCase()) {
    return null
  }

  const start1 = new Date(booking1.start)
  const end1 = new Date(booking1.end)
  const start2 = new Date(booking2.start)
  const end2 = new Date(booking2.end)

  const overlap = calculateOverlap(start1, end1, start2, end2)

  if (!overlap) {
    return null
  }

  return {
    conflictingBooking: booking2,
    overlapStart: overlap.start,
    overlapEnd: overlap.end,
    overlapMinutes: overlap.minutes,
  }
}

/**
 * Find all conflicts for a specific booking
 */
export function findBookingConflicts(booking: CalendarBooking, allBookings: CalendarBooking[]): BookingConflict[] {
  const conflicts: BookingConflict[] = []

  for (const otherBooking of allBookings) {
    const conflict = checkBookingConflict(booking, otherBooking)
    if (conflict) {
      conflicts.push(conflict)
    }
  }

  return conflicts
}

/**
 * Check if a booking has any conflicts
 */
export function hasConflicts(booking: CalendarBooking, allBookings: CalendarBooking[]): boolean {
  return findBookingConflicts(booking, allBookings).length > 0
}

/**
 * Create a temporary booking object for conflict checking during drag operations
 */
export function createTemporaryBooking(
  originalBooking: CalendarBooking,
  newStart: Date,
  newEnd: Date,
): CalendarBooking {
  return {
    ...originalBooking,
    start: newStart,
    end: newEnd,
  }
}

/**
 * Check for conflicts during drag operation
 * Returns conflicts excluding the booking being dragged
 */
export function checkDragConflicts(
  draggedBooking: CalendarBooking,
  newStart: Date,
  newEnd: Date,
  allBookings: CalendarBooking[],
): BookingConflict[] {
  const tempBooking = createTemporaryBooking(draggedBooking, newStart, newEnd)

  // Exclude the booking being dragged from conflict check
  const otherBookings = allBookings.filter((b) => b.id !== draggedBooking.id)

  return findBookingConflicts(tempBooking, otherBookings)
}
