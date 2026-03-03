import type { DurationUnit } from "@/generated/prisma";
import type { TimeslotConfig } from "@/features/bookables/lib/timeslot-generator";

/** Bookable shape with slot-related fields */
export interface BookableSlotFields {
  durationValue: number;
  durationUnit: DurationUnit;
  startTime?: string | null;
  endTime?: string | null;
  bufferMinutes?: number | null;
  allowMultipleDays?: boolean;
}

/**
 * Build TimeslotConfig from bookable for slot generation and availability checks.
 */
export function buildSlotConfig(bookable: BookableSlotFields): TimeslotConfig {
  return {
    durationValue: bookable.durationValue,
    durationUnit: bookable.durationUnit,
    startTime: bookable.startTime,
    endTime: bookable.endTime,
    bufferMinutes: bookable.bufferMinutes,
    allowMultipleDays: bookable.allowMultipleDays,
  };
}
