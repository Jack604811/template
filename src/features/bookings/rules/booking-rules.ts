/**
 * Reusable booking validation rules.
 * Use in booking details, calendar dialog, and any place that creates or updates start/end times.
 */

export const BOOKING_RULES = {
  /** User-facing message when end is before or equal to start (for toasts/form errors). */
  END_MUST_BE_AFTER_START: "End date and time must be after start date and time",
} as const;

export type DateTimeValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Validates that end date-time is strictly after start date-time.
 * Use before saving or applying date/time changes in the UI or API.
 */
export function validateBookingDateTime(
  startTime: Date,
  endTime: Date,
): DateTimeValidationResult {
  const start = startTime.getTime();
  const end = endTime.getTime();
  if (end <= start) {
    return { valid: false, error: BOOKING_RULES.END_MUST_BE_AFTER_START };
  }
  return { valid: true };
}

/**
 * Returns true if end is strictly after start; false otherwise.
 * Use for simple checks without needing an error message.
 */
export function isEndAfterStart(startTime: Date, endTime: Date): boolean {
  return endTime.getTime() > startTime.getTime();
}
