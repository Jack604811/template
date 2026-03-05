import { addHours, addMinutes, isSameDay } from "date-fns";
import type { DurationUnit } from "@/generated/prisma";

/**
 * Add a duration (value + unit) to a date. Used to compute end time from start + bookable duration.
 */
export function addDurationToDate(
  start: Date,
  value: number,
  unit: DurationUnit,
): Date {
  switch (unit) {
    case "MINUTES":
      return addMinutes(start, value);
    case "HOURS":
      return addHours(start, value);
    case "DAYS":
    case "NIGHTS": {
      const end = new Date(start);
      end.setDate(end.getDate() + value);
      return end;
    }
    default:
      return addHours(start, value);
  }
}

/**
 * Format the duration between start and end as a human-readable string
 * (e.g. "3 hours", "1 hour 30 minutes", "2 days").
 */
export function formatBookingDuration(startTime: Date, endTime: Date): string {
  const totalMs = endTime.getTime() - startTime.getTime();
  if (totalMs <= 0) return "0 minutes";
  const totalMinutes = Math.round(totalMs / 60_000);
  const minutesPerDay = 24 * 60;
  const days = Math.floor(totalMinutes / minutesPerDay);
  const remainderMinutes = totalMinutes % minutesPerDay;
  const hours = Math.floor(remainderMinutes / 60);
  const minutes = remainderMinutes % 60;

  if (days > 0) {
    const dayPart = days === 1 ? "1 day" : `${days} days`;
    if (hours === 0 && minutes === 0) return dayPart;
    const parts = [dayPart];
    if (hours > 0) parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
    if (minutes > 0) parts.push(minutes === 1 ? "1 minute" : `${minutes} minutes`);
    return parts.join(" ");
  }

  if (hours === 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  if (minutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`;
  const minPart = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `${hourPart} ${minPart}`;
}

/**
 * Format time for booking badge display.
 * Same-day: "9:00 am - 12:00 pm"; multi-day: single time (start or end).
 */
export function formatBookingTimeForBadge(
  startTime: Date,
  endTime: Date,
  formatTime: (date: Date, format: "12" | "24") => string,
  dateTimeFormat: "12" | "24",
  showStart: boolean,
): string {
  if (isSameDay(startTime, endTime)) {
    return `${formatTime(startTime, dateTimeFormat)} - ${formatTime(endTime, dateTimeFormat)}`;
  }
  return formatTime(showStart ? startTime : endTime, dateTimeFormat);
}
