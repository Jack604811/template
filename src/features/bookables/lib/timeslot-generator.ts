import {
  addMinutes,
  isAfter,
  isBefore,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
} from "date-fns";
import type { DurationUnit } from "@/generated/prisma";

const DEFAULT_OPERATING_START = "09:00";
const DEFAULT_OPERATING_END = "17:00";
const MINUTES_PER_DAY = 24 * 60;

export interface TimeslotConfig {
  durationValue: number;
  durationUnit: DurationUnit;
  startTime?: string | null;
  endTime?: string | null;
  bufferMinutes?: number | null;
  allowMultipleDays?: boolean;
}

export interface Timeslot {
  start: Date;
  end: Date;
}

/**
 * Convert a duration (value + unit) to total minutes.
 */
export function durationToMinutes(value: number, unit: DurationUnit): number {
  switch (unit) {
    case "MINUTES":
      return value;
    case "HOURS":
      return value * 60;
    case "DAYS":
    case "NIGHTS":
      return value * MINUTES_PER_DAY;
    default:
      return value * 60;
  }
}

/**
 * Parse a time string (HH:mm) on the given date and return a Date at that local time.
 */
export function parseTimeOnDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = startOfDay(date);
  return setMilliseconds(
    setSeconds(setMinutes(setHours(d, h ?? 0), m ?? 0), 0),
    0,
  );
}

/**
 * Get the start of the operating window for the given date (defaults to 09:00 if not set).
 */
function getWindowStart(date: Date, startTime?: string | null): Date {
  const time = startTime ?? DEFAULT_OPERATING_START;
  return parseTimeOnDate(date, time);
}

/**
 * Get the end of the operating window for the given date (defaults to 17:00 if not set).
 */
function getWindowEnd(date: Date, endTime?: string | null): Date {
  const time = endTime ?? DEFAULT_OPERATING_END;
  return parseTimeOnDate(date, time);
}

/**
 * Generate available slots for a given date from bookable config.
 * Same-day: slots within operating window with duration and buffer.
 * Long duration (e.g. >= 24h or fills remaining window): one slot per day.
 * Multi-day (allowMultipleDays + long duration): one slot per day at operating start.
 */
export function generateSlotsForDate(
  config: TimeslotConfig,
  date: Date,
  minStartTime?: Date | null,
): Timeslot[] {
  const {
    durationValue,
    durationUnit,
    startTime,
    endTime,
    bufferMinutes = 0,
    allowMultipleDays = false,
  } = config;

  const durationMinutes = durationToMinutes(durationValue, durationUnit);
  const buffer = bufferMinutes ?? 0;

  if (durationMinutes <= 0) return [];

  const windowStart = getWindowStart(date, startTime);
  let windowEnd = getWindowEnd(date, endTime);

  // Overnight window: end before start (e.g. 6pm-12pm = check-in 6pm, check-out noon next day)
  if (!isAfter(windowEnd, windowStart)) {
    // For long durations (>=12h), one slot from windowStart spanning to next day
    if (durationMinutes >= 12 * 60) {
      const cursor =
        minStartTime && isAfter(minStartTime, windowStart)
          ? minStartTime
          : windowStart;
      const slotEnd = addMinutes(cursor, durationMinutes);
      return [{ start: new Date(cursor), end: new Date(slotEnd) }];
    }
    windowEnd = addMinutes(startOfDay(date), MINUTES_PER_DAY - 1);
  }

  let cursor =
    minStartTime && isAfter(minStartTime, windowStart)
      ? minStartTime
      : windowStart;
  if (isBefore(cursor, windowStart)) cursor = windowStart;

  const slots: Timeslot[] = [];

  // Long duration or multi-day: one slot per day (e.g. overnight or 24h+)
  if (durationMinutes >= MINUTES_PER_DAY || allowMultipleDays) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    slots.push({ start: new Date(cursor), end: new Date(slotEnd) });
    return slots;
  }

  // Same-day slots: fill window with duration + buffer
  while (true) {
    const slotEnd = addMinutes(cursor, durationMinutes);
    if (slotEnd.getTime() > windowEnd.getTime()) break;
    slots.push({ start: new Date(cursor), end: new Date(slotEnd) });
    cursor = addMinutes(slotEnd, buffer);
    if (cursor.getTime() >= windowEnd.getTime()) break;
  }

  return slots;
}
