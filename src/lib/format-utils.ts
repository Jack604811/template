import { format } from "date-fns";

/**
 * Format time with minutes always displayed
 * Shows "9:00am" or "09:00" for exact hours, "9:30am" or "09:30" for times with minutes
 * @param date - The date to format
 * @param dateTimeFormat - "12" for 12-hour format, "24" for 24-hour format
 * @param uppercase - Whether to return uppercase (default: false for lowercase)
 * @returns Formatted time string (e.g., "9:00am", "9:30am", "09:00", or "09:30")
 */
export function formatTime(
  date: Date,
  dateTimeFormat: "12" | "24" = "24",
  uppercase = false
): string {
  let formatted: string;
  if (dateTimeFormat === "12") {
    // 12-hour format: always show minutes "9:00am" or "9:30am"
    formatted = format(date, "h:mm a");
    formatted = uppercase ? formatted.toUpperCase() : formatted.toLowerCase();
  } else {
    // 24-hour format: always show minutes "09:00" or "09:30"
    formatted = format(date, "HH:mm");
  }

  return formatted;
}

/**
 * Format currency amount with currency code/symbol
 * Uses dots (.) for thousands separators instead of commas
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., "USD", "COP", "EUR")
 * @returns Formatted currency string (e.g., "$1.234" or "COP 1.234")
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    // Get currency symbol from Intl.NumberFormat
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    // Format the number and replace commas with dots
    const formatted = formatter.format(amount);
    
    // Replace commas with dots for thousands separators
    return formatted.replace(/,/g, ".");
  } catch (error) {
    // Fallback to simple formatting if currency code is invalid
    const rounded = Math.round(amount);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${currency} ${formatted}`;
  }
}

/**
 * Convert date to organization timezone
 * Note: JavaScript Date objects are always in UTC internally.
 * This function returns a Date object that represents the same moment in time,
 * but formatted according to the organization's timezone.
 * @param date - The date to convert
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date object (same moment, but can be formatted for the timezone)
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatDate(date: Date, timezone?: string): Date {
  // JavaScript Date objects are always UTC internally
  // The timezone is only relevant when formatting for display
  // So we just return the date as-is - formatting functions will handle timezone
  // This is a placeholder for future timezone-aware formatting if needed
  return date;
}

/**
 * Get week start option for date-fns functions
 * @param weekStart - "monday" or "sunday"
 * @returns 0 for Sunday, 1 for Monday (date-fns weekStartsOn option)
 */
export function getWeekStartOption(weekStart: "monday" | "sunday" = "sunday"): 0 | 1 {
  return weekStart === "monday" ? 1 : 0;
}

