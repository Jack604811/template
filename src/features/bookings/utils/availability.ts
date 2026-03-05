import { eachDayOfInterval, format, startOfDay } from "date-fns";
import type {
  Timeslot,
  TimeslotConfig,
} from "@/features/bookables/lib/timeslot-generator";

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** Map API overlapping response to { startTime: Date; endTime: Date }[] */
export function mapOverlappingBookings(
  raw: { startTime: Date; endTime: Date }[],
): { startTime: Date; endTime: Date }[] {
  return raw.map((b) => ({
    startTime: new Date(b.startTime),
    endTime: new Date(b.endTime),
  }));
}

/**
 * Returns time strings (HH:mm) for slot starts that are fully booked.
 * A slot is disabled when the count of overlapping non-canceled bookings >= maxUnits.
 */
export function getDisabledSlotStarts(
  slots: Timeslot[],
  overlappingBookings: { startTime: Date; endTime: Date }[],
  maxUnits: number,
): string[] {
  if (maxUnits <= 0 || overlappingBookings.length === 0) return [];

  const disabled: string[] = [];
  for (const slot of slots) {
    const overlapCount = overlappingBookings.filter((b) =>
      intervalsOverlap(
        slot.start,
        slot.end,
        new Date(b.startTime),
        new Date(b.endTime),
      ),
    ).length;
    if (overlapCount >= maxUnits) {
      disabled.push(format(slot.start, "HH:mm"));
    }
  }
  return disabled;
}

/**
 * Returns date strings (yyyy-MM-dd) for dates that have no available slots.
 * Used to disable calendar dates when fully booked.
 */
export function getDatesWithNoAvailability(
  slotConfig: TimeslotConfig,
  dateRange: { start: Date; end: Date },
  overlappingBookings: { startTime: Date; endTime: Date }[],
  maxUnits: number,
  generateSlotsForDate: (
    config: TimeslotConfig,
    date: Date,
    minStartTime?: Date | null,
  ) => Timeslot[],
): string[] {
  if (maxUnits <= 0) return [];

  const disabled: string[] = [];
  const days = eachDayOfInterval(dateRange);

  for (const day of days) {
    const slots = generateSlotsForDate(slotConfig, day);
    if (slots.length === 0) continue;
    const allDisabled = slots.every((slot) => {
      const overlapCount = overlappingBookings.filter((b) =>
        intervalsOverlap(
          slot.start,
          slot.end,
          new Date(b.startTime),
          new Date(b.endTime),
        ),
      ).length;
      return overlapCount >= maxUnits;
    });
    if (allDisabled) {
      disabled.push(format(startOfDay(day), "yyyy-MM-dd"));
    }
  }
  return disabled;
}

/**
 * Returns time strings (HH:mm) for slot ends that are fully booked when combined with fixed start.
 * Used for end-date picker: each slot end forms range (fixedStart, slotEnd).
 */
export function getDisabledSlotEnds(
  slots: Timeslot[],
  fixedStart: Date,
  overlappingBookings: { startTime: Date; endTime: Date }[],
  maxUnits: number,
): string[] {
  if (maxUnits <= 0 || overlappingBookings.length === 0) return [];

  const disabled: string[] = [];
  for (const slot of slots) {
    const rangeEnd = slot.end;
    const overlapCount = overlappingBookings.filter((b) =>
      intervalsOverlap(
        fixedStart,
        rangeEnd,
        new Date(b.startTime),
        new Date(b.endTime),
      ),
    ).length;
    if (overlapCount >= maxUnits) {
      disabled.push(format(rangeEnd, "HH:mm"));
    }
  }
  return disabled;
}
