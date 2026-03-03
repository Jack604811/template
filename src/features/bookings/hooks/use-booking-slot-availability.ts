import { endOfDay, endOfMonth, startOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/trpc/client";
import { generateSlotsForDate } from "@/features/bookables/lib/timeslot-generator";
import type { TimeslotConfig } from "@/features/bookables/lib/timeslot-generator";
import {
  getDatesWithNoAvailability,
  getDisabledSlotEnds,
  getDisabledSlotStarts,
  mapOverlappingBookings,
} from "@/features/bookings/utils/availability";

interface UseBookingSlotAvailabilityParams {
  bookableId: string;
  slotConfig: TimeslotConfig;
  maxUnits: number;
  excludeBookingId?: string;
  startPickerDate: Date;
  endPickerDate: Date;
  startTime: Date;
  isStartPopoverOpen: boolean;
  isEndPopoverOpen: boolean;
}

/**
 * Hook to fetch overlapping bookings and compute disabled slots/dates for a bookable.
 * Used by BookingInfoCard date/time pickers to prevent overbooking.
 */
export function useBookingSlotAvailability({
  bookableId,
  slotConfig,
  maxUnits,
  excludeBookingId,
  startPickerDate,
  endPickerDate,
  startTime,
  isStartPopoverOpen,
  isEndPopoverOpen,
}: UseBookingSlotAvailabilityParams) {
  const trpc = useTRPC();
  const monthRange = useMemo(
    () => ({
      start: startOfMonth(startPickerDate),
      end: endOfMonth(startPickerDate),
    }),
    [startPickerDate],
  );

  const { data: overlappingForStartDate } = useQuery({
    ...trpc.bookings.getOverlappingForDate.queryOptions({
      bookableId,
      date: startPickerDate,
      excludeBookingId,
    }),
    enabled: isStartPopoverOpen && maxUnits > 0,
  });

  const { data: overlappingForMonth } = useQuery({
    ...trpc.bookings.getOverlappingForDateRange.queryOptions({
      bookableId,
      startDate: monthRange.start,
      endDate: monthRange.end,
      excludeBookingId,
    }),
    enabled: isStartPopoverOpen && maxUnits > 0,
  });

  const { data: overlappingForEndRange } = useQuery({
    ...trpc.bookings.getOverlappingForRange.queryOptions({
      bookableId,
      startTime,
      endTime: endOfDay(endPickerDate),
      excludeBookingId,
    }),
    enabled: isEndPopoverOpen && maxUnits > 0,
  });

  const startSlots = useMemo(
    () => generateSlotsForDate(slotConfig, startPickerDate),
    [slotConfig, startPickerDate],
  );
  const endSlots = useMemo(
    () => generateSlotsForDate(slotConfig, endPickerDate, startTime),
    [slotConfig, endPickerDate, startTime],
  );

  const overlappingForStart = useMemo(
    () => mapOverlappingBookings(overlappingForStartDate ?? []),
    [overlappingForStartDate],
  );
  const overlappingForMonthMapped = useMemo(
    () => mapOverlappingBookings(overlappingForMonth ?? []),
    [overlappingForMonth],
  );
  const overlappingForEnd = useMemo(
    () => mapOverlappingBookings(overlappingForEndRange ?? []),
    [overlappingForEndRange],
  );

  const disabledStartSlots = useMemo(
    () => getDisabledSlotStarts(startSlots, overlappingForStart, maxUnits),
    [startSlots, overlappingForStart, maxUnits],
  );

  const disabledDates = useMemo(
    () =>
      getDatesWithNoAvailability(
        slotConfig,
        monthRange,
        overlappingForMonthMapped,
        maxUnits,
        generateSlotsForDate,
      ),
    [slotConfig, monthRange, overlappingForMonthMapped, maxUnits],
  );

  const disabledEndSlots = useMemo(
    () =>
      getDisabledSlotEnds(endSlots, startTime, overlappingForEnd, maxUnits),
    [endSlots, startTime, overlappingForEnd, maxUnits],
  );

  return {
    disabledStartSlots,
    disabledDates,
    disabledEndSlots,
  };
}
