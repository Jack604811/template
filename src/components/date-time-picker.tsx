"use client";

import { addHours, addMinutes, format, startOfDay } from "date-fns";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  durationToMinutes,
  generateSlotsForDate,
} from "@/features/bookables/lib/timeslot-generator";
import type { DurationUnit } from "@/generated/prisma";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { formatTime } from "@/lib/format-utils";

interface DateTimePickerProps {
  initialDate?: Date;
  initialTime?: string;
  /** Disable calendar days before this date (e.g. for end-date picker, pass start date). */
  minDate?: Date;
  /** Disable calendar days after this date (e.g. for start-date picker, pass end date). */
  maxDate?: Date;
  /** When set with minDate, generate end-time slots (for end-date picker). */
  bookableDuration?: { value: number; unit: DurationUnit };
  /** Operating window and buffer: when set with bookableDuration, use timeslot generator for slots. */
  startTime?: string | null;
  endTime?: string | null;
  bufferMinutes?: number | null;
  allowMultipleDays?: boolean;
  /** Time strings (HH:mm) to disable in the time slot list (e.g. fully booked slots). */
  disabledTimeSlots?: string[];
  /** Date strings (yyyy-MM-dd) to disable in the calendar (e.g. fully booked days). */
  disabledDates?: string[];
  /** "12" or "24" for time display (e.g. "9:00 am" vs "09:00"). */
  dateTimeFormat?: "12" | "24";
  /** Called when the selected date changes (e.g. to refetch availability). */
  onDateChange?: (date: Date) => void;
}

export interface DateTimePickerRef {
  getDateTime: () => { date: Date; time: string | null };
}

interface TimeSlot {
  time: string;
  start?: Date;
  end?: Date;
}

const DEFAULT_SLOT_INTERVAL_MINUTES = 30;

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += DEFAULT_SLOT_INTERVAL_MINUTES) {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      slots.push({ time });
    }
  }
  return slots;
};

type SlotMode = "start" | "end";

function generateTimeslotGeneratorSlots(
  selectedDate: Date,
  durationValue: number,
  durationUnit: DurationUnit,
  mode: SlotMode,
  minStartTime?: Date | null,
  startTime?: string | null,
  endTime?: string | null,
  bufferMinutes?: number | null,
  allowMultipleDays?: boolean,
): TimeSlot[] {
  const generated = generateSlotsForDate(
    {
      durationValue,
      durationUnit,
      startTime,
      endTime,
      bufferMinutes,
      allowMultipleDays,
    },
    selectedDate,
    minStartTime,
  );
  const durationMinutes = durationToMinutes(durationValue, durationUnit);
  const isShortSlot = durationMinutes > 0 && durationMinutes < 12 * 60;
  const timeSet = new Set<string>();
  const slots: TimeSlot[] = [];
  const formatSlot =
    mode === "start"
      ? (s: { start: Date }) => format(s.start, "HH:mm")
      : (s: { end: Date }) => format(s.end, "HH:mm");
  for (const slot of generated) {
    const time = formatSlot(slot);
    if (!timeSet.has(time)) {
      timeSet.add(time);
      slots.push({
        time,
        ...(isShortSlot && slot.start && slot.end
          ? { start: slot.start, end: slot.end }
          : {}),
      });
    }
  }
  return slots;
}

function generateDurationTimeSlots(
  minDate: Date | undefined,
  selectedDate: Date,
  durationValue: number,
  durationUnit: DurationUnit,
  startTime?: string | null,
  endTime?: string | null,
  bufferMinutes?: number | null,
  allowMultipleDays?: boolean,
): TimeSlot[] {
  // Always use timeslot generator when bookable has duration - Start/End/Buffer define the slots
  // (e.g. 5pm-12am, 2hr duration, 1hr buffer → 5-7pm, 8-10pm). Generator uses 09:00-17:00 when null.
  const useGenerator = true;

  if (useGenerator) {
    const mode: SlotMode = minDate ? "end" : "start";
    return generateTimeslotGeneratorSlots(
      selectedDate,
      durationValue,
      durationUnit,
      mode,
      minDate ?? null,
      startTime,
      endTime,
      bufferMinutes,
      allowMultipleDays,
    );
  }

  if (!minDate) return generateTimeSlots();

  const minDayStart = startOfDay(minDate).getTime();
  const selectedDayStart = startOfDay(selectedDate).getTime();
  const isSameDay = minDayStart === selectedDayStart;
  const toTimeString = (d: Date) => format(d, "HH:mm");
  const isSameCalendarDay = (a: Date, b: Date) =>
    startOfDay(a).getTime() === startOfDay(b).getTime();

  if (durationUnit === "DAYS" || durationUnit === "NIGHTS") {
    if (isSameDay) return [];
    const time = toTimeString(minDate);
    return [{ time }];
  }

  const slots: TimeSlot[] = [];
  const cursor = isSameDay
    ? new Date(minDate)
    : startOfDay(new Date(selectedDate));

  const addDuration = (d: Date, n: number): Date => {
    switch (durationUnit) {
      case "MINUTES":
        return addMinutes(d, durationValue * n);
      case "HOURS":
        return addHours(d, durationValue * n);
      default:
        return addHours(d, durationValue * n);
    }
  };

  for (let n = 1; n <= 48; n++) {
    const slotDate = addDuration(new Date(cursor), n);
    if (!isSameCalendarDay(slotDate, selectedDate)) break;
    const time = toTimeString(slotDate);
    slots.push({ time });
  }

  return slots;
}

const DateTimePicker = forwardRef<DateTimePickerRef, DateTimePickerProps>(
  (
    {
      initialDate,
      initialTime,
      minDate,
      maxDate,
      bookableDuration,
      startTime,
      endTime,
      bufferMinutes,
      allowMultipleDays,
      disabledTimeSlots = [],
      disabledDates = [],
      dateTimeFormat,
      onDateChange,
    },
    ref,
  ) => {
    const currentOrg = useCurrentOrganizationWithSettings();
    const resolvedDateFormat: "12" | "24" =
      dateTimeFormat ??
      (currentOrg?.dateTimeFormat as "12" | "24") ??
      "24";
    const [date, setDate] = useState<Date>(() => initialDate ?? new Date());
    const [time, setTime] = useState<string | null>(() => initialTime ?? null);
    const selectedTimeRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      getDateTime: () => ({ date, time }),
    }));

    useEffect(() => {
      if (selectedTimeRef.current && time) {
        setTimeout(() => {
          selectedTimeRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    }, [time]);

    const handleDateSelect = (newDate: Date | undefined) => {
      if (newDate) {
        setDate(newDate);
        onDateChange?.(newDate);
      }
    };

    const disabled = useMemo(() => {
      const disabledSet = new Set(disabledDates);
      return (day: Date) => {
        const d = startOfDay(day);
        const dateKey = format(d, "yyyy-MM-dd");
        if (disabledSet.has(dateKey)) return true;
        if (minDate && d < startOfDay(minDate)) return true;
        if (maxDate && d > startOfDay(maxDate)) return true;
        return false;
      };
    }, [minDate, maxDate, disabledDates]);

    // Use timeslot generator when bookable has duration: Start/End define the window, Duration defines
    // each slot length, Buffer goes between (e.g. 5pm-12am, 2hr, 1hr buffer → 5-7pm, 8-10pm).
    const useDurationSlots = Boolean(
      bookableDuration && bookableDuration.value > 0,
    );
    const timeSlots =
      useDurationSlots && bookableDuration
        ? generateDurationTimeSlots(
            minDate,
            date,
            bookableDuration.value,
            bookableDuration.unit,
            startTime,
            endTime,
            bufferMinutes,
            allowMultipleDays,
          )
        : generateTimeSlots();
    const timeSlotStrings = useMemo(
      () => timeSlots.map((s) => s.time),
      [timeSlots],
    );
    useEffect(() => {
      if (
        time &&
        timeSlotStrings.length > 0 &&
        !timeSlotStrings.includes(time)
      ) {
        setTime(timeSlotStrings[0] ?? null);
      }
    }, [timeSlotStrings, time]);

    return (
      <div className="rounded-md border">
        <div className="flex max-sm:flex-col">
          <Calendar
            className="p-2 sm:pe-5"
            mode="single"
            onSelect={handleDateSelect}
            selected={date}
            defaultMonth={date}
            disabled={disabled}
          />
          <div className="relative w-full max-sm:h-48 sm:w-40">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="font-medium text-sm">
                      {format(date, "EEEE, d")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 px-5">
                    {timeSlots.map(({ time: timeSlot, start: slotStart, end: slotEnd }) => {
                      const isDisabled = disabledTimeSlots.includes(timeSlot);
                      let displayLabel: string;
                      if (slotStart && slotEnd) {
                        displayLabel = `${formatTime(slotStart, resolvedDateFormat)} - ${formatTime(slotEnd, resolvedDateFormat)}`;
                      } else {
                        const [h = 0, m = 0] = timeSlot.split(":").map(Number);
                        const d = new Date(date);
                        d.setHours(h, m, 0, 0);
                        displayLabel = formatTime(d, resolvedDateFormat);
                      }
                      return (
                        <Button
                          ref={time === timeSlot ? selectedTimeRef : null}
                          className="w-full justify-start"
                          key={timeSlot}
                          onClick={() => !isDisabled && setTime(timeSlot)}
                          size="sm"
                          variant={time === timeSlot ? "default" : "outline"}
                          disabled={isDisabled}
                          aria-disabled={isDisabled}
                        >
                          {displayLabel}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DateTimePicker.displayName = "DateTimePicker";

export default DateTimePicker;
