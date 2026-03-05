"use client";

import { format, parseISO } from "date-fns";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";
import { EmptyView } from "@/components/entity-components";
import {
  DURATION_UNITS_SLOT,
  DAYS,
  durationUnitLabels,
} from "../lib/schemas";
import type { BookableFormValues } from "../lib/schemas";
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AvailabilitySectionProps {
  form: UseFormReturn<BookableFormValues>;
  timeOptions: Array<{ label: string; value: string }>;
  dateTimeFormat?: "12" | "24";
}

const DEFAULT_RANGE = { startTime: "09:00", endTime: "17:00" } as const;

export const AvailabilitySection = ({
  form,
  timeOptions,
  dateTimeFormat = "24",
}: AvailabilitySectionProps) => {
  const [addBlockedDateValue, setAddBlockedDateValue] = useState<Date | undefined>(undefined);
  const [blockedDatePopoverOpen, setBlockedDatePopoverOpen] = useState(false);
  const { fields: availabilityFields } = useFieldArray({
    control: form.control,
    name: "availability",
  });

  return (
    <div className="space-y-6">
      {/* Booking Duration */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Booking Duration
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            How long does this booking take?
          </p>
        </div>
        <FormField
          control={form.control}
          name="durationValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration *</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    className="w-full max-w-[120px]"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 1)
                    }
                  />
                </FormControl>
                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field: unitField }) => (
                    <FormItem className="flex-1 min-w-[140px]">
                      <FormControl>
                        <Select
                          onValueChange={unitField.onChange}
                          value={unitField.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_UNITS_SLOT.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {durationUnitLabels[unit]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Working Hours */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Working Hours
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set when this booking type can be booked
          </p>
        </div>
        <div className="space-y-3">
          {availabilityFields.map((field, dayIndex) => (
            <DayRangesRow
              key={field.id}
              form={form}
              dayIndex={dayIndex}
              dayLabel={DAYS[dayIndex] ?? field.day}
              timeOptions={timeOptions}
              dateTimeFormat={dateTimeFormat}
            />
          ))}
        </div>
      </div>

      {/* Blocked Days */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Blocked Days
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Specify dates when bookings are not available
          </p>
        </div>
        <FormField
          control={form.control}
          name="blockedDates"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">
                  Add Blocked Date
                </FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Popover
                      open={blockedDatePopoverOpen}
                      onOpenChange={setBlockedDatePopoverOpen}
                    >
                      <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start px-2.5 font-normal"
                      >
                        <CalendarIcon className="size-4 shrink-0" />
                        {addBlockedDateValue ? (
                          format(addBlockedDateValue, "LLL dd, y")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        defaultMonth={addBlockedDateValue}
                        selected={addBlockedDateValue}
                        onSelect={(date) => {
                          setAddBlockedDateValue(date);
                          setBlockedDatePopoverOpen(false);
                        }}
                        disabled={(date) =>
                          (field.value ?? []).includes(
                            format(date, "yyyy-MM-dd"),
                          )
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (!addBlockedDateValue) return;
                      const dateStr = format(addBlockedDateValue, "yyyy-MM-dd");
                      const existing = form.getValues("blockedDates") ?? [];
                      if (existing.includes(dateStr)) return;
                      const next = [...existing, dateStr].sort();
                      form.setValue("blockedDates", next, {
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                      setAddBlockedDateValue(undefined);
                      setBlockedDatePopoverOpen(false);
                    }}
                    className="gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">
                  Blocked Dates
                </FormLabel>
                <div className="space-y-2">
                  {(field.value ?? []).length === 0 ? (
                    <EmptyView message="No blocked dates. Add a date above to block bookings." />
                  ) : (
                    (field.value ?? []).map((dateStr, index) => (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                      >
                        <span className="text-sm font-medium">
                          {format(parseISO(dateStr), "EEEE, MMMM d, yyyy")}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const current = form.getValues("blockedDates") ?? [];
                            const next = current.filter((_, i) => i !== index);
                            form.setValue("blockedDates", next, {
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          aria-label="Remove blocked date"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

interface DayRangesRowProps {
  form: UseFormReturn<BookableFormValues>;
  dayIndex: number;
  dayLabel: string;
  timeOptions: Array<{ label: string; value: string }>;
  dateTimeFormat: "12" | "24";
}

function DayRangesRow({
  form,
  dayIndex,
  dayLabel,
  timeOptions: _timeOptions,
  dateTimeFormat,
}: DayRangesRowProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: `availability.${dayIndex}.ranges`,
  });

  const isEnabled = fields.length > 0;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      append(DEFAULT_RANGE);
    } else {
      replace([]);
    }
  };

  // Grid: [switch+day 140px] [time block] [action 40px] so + and delete align in one column
  const gridCols = "140px 1fr 40px";

  return (
    <div className="flex flex-col gap-2 py-2 border-b border-border last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-2">
        {/* First row: switch + day + first time range + plus (no delete) */}
        <div
          className="grid items-center gap-x-3 gap-y-0"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
            <span className="text-sm font-medium truncate">{dayLabel}</span>
          </div>
          {isEnabled && (
            <>
              {fields.map((rangeField, rangeIndex) =>
                rangeIndex === 0 ? (
                  <div
                    key={rangeField.id}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <FormField
                      control={form.control}
                      name={`availability.${dayIndex}.ranges.0.startTime`}
                      render={({ field }) => (
                        <FormItem className="mb-0 shrink-0">
                          <TimeInput
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            dateTimeFormat={dateTimeFormat}
                            placeholder="Start"
                            className="min-w-[140px] w-[140px]"
                          />
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-muted-foreground shrink-0">
                      to
                    </span>
                    <FormField
                      control={form.control}
                      name={`availability.${dayIndex}.ranges.0.endTime`}
                      render={({ field }) => (
                        <FormItem className="mb-0 shrink-0">
                          <TimeInput
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            dateTimeFormat={dateTimeFormat}
                            placeholder="End"
                            className="min-w-[140px] w-[140px]"
                          />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null,
              )}
              {isEnabled && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => append(DEFAULT_RANGE)}
                    aria-label="Add time range"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        {/* Second row and below: same grid, empty first cell + time range + delete */}
        {isEnabled &&
          fields.slice(1).map((rangeField, sliceIndex) => {
            const rangeIndex = sliceIndex + 1;
            return (
              <div
                key={rangeField.id}
                className="grid items-center gap-x-3 gap-y-0"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="min-w-0" aria-hidden />
                <div className="flex items-center gap-2 min-w-0">
                  <FormField
                    control={form.control}
                    name={`availability.${dayIndex}.ranges.${rangeIndex}.startTime`}
                    render={({ field }) => (
                      <FormItem className="mb-0 shrink-0">
                        <TimeInput
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          dateTimeFormat={dateTimeFormat}
                          placeholder="Start"
                          className="min-w-[140px] w-[140px]"
                        />
                      </FormItem>
                    )}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">
                    to
                  </span>
                  <FormField
                    control={form.control}
                    name={`availability.${dayIndex}.ranges.${rangeIndex}.endTime`}
                    render={({ field }) => (
                      <FormItem className="mb-0 shrink-0">
                        <TimeInput
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          dateTimeFormat={dateTimeFormat}
                          placeholder="End"
                          className="min-w-[140px] w-[140px]"
                        />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(rangeIndex)}
                    aria-label="Remove range"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
