"use client";

import { format, isSameDay } from "date-fns";
import { CalendarDays, Clock, FileText, Search, Tag } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import DateTimePicker, {
  type DateTimePickerRef,
} from "@/components/date-time-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BookableImage } from "@/features/bookables/components/bookable-image";
import { useSuspenseBookables } from "@/features/bookables/hooks/use-bookables";
import { formatDuration } from "@/features/bookables/lib/utils";
import {
  BOOKING_STATUSES,
  getStatusConfig,
} from "@/features/bookings/components/booking-calendar/status-config";
import { useBookingSlotAvailability } from "@/features/bookings/hooks/use-booking-slot-availability";
import {
  addDurationToDate,
  formatBookingDuration,
  formatBookingTimeForBadge,
} from "@/features/bookings/utils/format-booking-duration";
import { buildSlotConfig } from "@/features/bookings/utils/slot-config";
import { useSuspenseCustomFields } from "@/features/custom-fields/hooks/use-custom-fields";
import { parseCustomFields } from "@/features/custom-fields/utils/parse-custom-fields";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import {
  CustomFieldDisplayLocation,
  CustomFieldType,
  type DurationUnit,
} from "@/generated/prisma";
import { formatCurrency, formatTime } from "@/lib/format-utils";
import { cn } from "@/lib/utils";

type BookingStatus =
  | "pending"
  | "approved"
  | "in_progress"
  | "canceled"
  | "completed";

interface BookingInfoCardProps {
  bookable: {
    id: string;
    title: string;
    images: unknown;
    durationValue: number;
    durationUnit: DurationUnit;
    startTime?: string | null;
    endTime?: string | null;
    bufferMinutes?: number | null;
    allowMultipleDays?: boolean;
    units?: number | null;
  };
  bookingId?: string;
  status?: BookingStatus;
  startTime: Date;
  endTime: Date;
  customFields?: Record<string, unknown>;
  notes?: string | null;
  onBookableChange?: (bookableId: string) => void;
  onStatusChange?: (status: BookingStatus) => void;
  onDateTimeChange?: (startTime: Date, endTime: Date) => void;
  onCustomFieldsChange?: (customFields: Record<string, string>) => void;
  onNotesChange?: (notes: string) => void;
}

export const BookingInfoCard = memo(
  ({
    bookable,
    bookingId,
    status: bookingStatus = "pending",
    startTime,
    endTime,
    customFields: initialCustomFields = {},
    notes: initialNotes,
    onBookableChange,
    onStatusChange,
    onDateTimeChange,
    onCustomFieldsChange,
    onNotesChange,
  }: BookingInfoCardProps) => {
    const currentOrg = useCurrentOrganizationWithSettings();
    const dateTimeFormat = (currentOrg?.dateTimeFormat as "12" | "24") || "24";
    const currency = currentOrg?.currency || "USD";

    const allBookablesQuery = useSuspenseBookables(null);
    const allBookables = allBookablesQuery.data.items;
    const { data: allCustomFields } = useSuspenseCustomFields();

    const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
    const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);
    const [startPickerKey, setStartPickerKey] = useState(0);
    const [endPickerKey, setEndPickerKey] = useState(0);
    const [bookablePopoverOpen, setBookablePopoverOpen] = useState(false);
    const [bookableSearch, setBookableSearch] = useState("");
    const [startPickerDate, setStartPickerDate] = useState<Date>(startTime);
    const [endPickerDate, setEndPickerDate] = useState<Date>(endTime);

    useEffect(() => {
      if (isStartPopoverOpen) setStartPickerDate(startTime);
    }, [isStartPopoverOpen, startTime]);
    useEffect(() => {
      if (isEndPopoverOpen) setEndPickerDate(endTime);
    }, [isEndPopoverOpen, endTime]);

    const maxUnits = bookable.units ?? 0;
    const slotConfig = useMemo(
      () => buildSlotConfig(bookable),
      [bookable],
    );

    const {
      disabledStartSlots,
      disabledDates,
      disabledEndSlots,
    } = useBookingSlotAvailability({
      bookableId: bookable.id,
      slotConfig,
      maxUnits,
      excludeBookingId: bookingId,
      startPickerDate,
      endPickerDate,
      startTime,
      isStartPopoverOpen,
      isEndPopoverOpen,
    });

    const handleStartDateChange = useCallback((date: Date) => {
      setStartPickerDate(date);
    }, []);
    const handleEndDateChange = useCallback((date: Date) => {
      setEndPickerDate(date);
    }, []);

    // Remount date/time pickers when popover opens (closed → open) so they get fresh initial values; key stable while open so parent re-renders don't reset selection
    const prevStartOpen = useRef(false);
    const prevEndOpen = useRef(false);
    useEffect(() => {
      if (isStartPopoverOpen && !prevStartOpen.current)
        setStartPickerKey((k) => k + 1);
      prevStartOpen.current = isStartPopoverOpen;
    }, [isStartPopoverOpen]);
    useEffect(() => {
      if (isEndPopoverOpen && !prevEndOpen.current)
        setEndPickerKey((k) => k + 1);
      prevEndOpen.current = isEndPopoverOpen;
    }, [isEndPopoverOpen]);
    const bookableTriggerRef = useRef<HTMLButtonElement>(null);

    // Filter bookables by search
    const filteredBookables = useMemo(() => {
      if (!bookableSearch.trim()) {
        return allBookables;
      }
      const searchLower = bookableSearch.toLowerCase();
      return allBookables.filter((b) =>
        b.title.toLowerCase().includes(searchLower),
      );
    }, [allBookables, bookableSearch]);

    // Local state for notes to allow immediate editing (controlled component)
    const [notes, setNotes] = useState(initialNotes || "");

    // Sync local state when prop changes (e.g., after server update)
    useEffect(() => {
      setNotes(initialNotes || "");
    }, [initialNotes]);

    // Filter and parse custom fields
    const bookingCustomFields = useMemo(
      () =>
        parseCustomFields(allCustomFields, CustomFieldDisplayLocation.BOOKING),
      [allCustomFields],
    );

    // Initialize custom fields state from booking data
    const [customFields, setCustomFields] = useState<Record<string, string>>(
      () => {
        if (!initialCustomFields || typeof initialCustomFields !== "object") {
          return {};
        }
        // Convert all values to strings for consistency
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(initialCustomFields)) {
          result[key] = value != null ? String(value) : "";
        }
        return result;
      },
    );

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const handleUpdateCustomField = (
      fieldIdentifier: string,
      value: string,
    ) => {
      const updatedFields = {
        ...customFields,
        [fieldIdentifier]: value,
      };
      setCustomFields(updatedFields);
      setOpenDropdown(null);
      // Call callback to persist changes
      onCustomFieldsChange?.(updatedFields);
    };

    const startDatePickerRef = useRef<DateTimePickerRef>(null);
    const endDatePickerRef = useRef<DateTimePickerRef>(null);

    const handleSaveStartDateTime = () => {
      const dateTime = startDatePickerRef.current?.getDateTime();
      if (!dateTime?.time || !onDateTimeChange) {
        setIsStartPopoverOpen(false);
        return;
      }
      const [hours = 0, minutes = 0] = dateTime.time.split(":").map(Number);
      const newStartTime = new Date(dateTime.date);
      newStartTime.setHours(hours, minutes, 0, 0);
      const newEndTime = addDurationToDate(
        newStartTime,
        bookable.durationValue,
        bookable.durationUnit,
      );
      setIsStartPopoverOpen(false);
      onDateTimeChange(newStartTime, newEndTime);
    };

    const handleSaveEndDateTime = () => {
      const dateTime = endDatePickerRef.current?.getDateTime();
      if (!dateTime?.time || !onDateTimeChange) {
        setIsEndPopoverOpen(false);
        return;
      }
      const [hours = 0, minutes = 0] = dateTime.time.split(":").map(Number);
      const newDateTime = new Date(dateTime.date);
      newDateTime.setHours(hours, minutes, 0, 0);
      setIsEndPopoverOpen(false);
      onDateTimeChange(startTime, newDateTime);
    };

    return (
      <Card className="gap-0">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Service
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Popover
                open={bookablePopoverOpen}
                onOpenChange={setBookablePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    ref={bookableTriggerRef}
                    type="button"
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <BookableImage
                      images={bookable.images}
                      alt={bookable.title}
                      size={64}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[524px]"
                  align="start"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Search bar */}
                  <div className="p-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search bookables..."
                        value={bookableSearch}
                        onChange={(e) => setBookableSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Scrollable bookables list */}
                  <div className="h-[400px] overflow-y-auto overflow-x-hidden">
                    {filteredBookables.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        No bookables found
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {filteredBookables.map((b) => {
                          const isSelected = b.id === bookable.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors w-full text-left",
                                "hover:bg-muted/30",
                                isSelected && "bg-primary/5",
                              )}
                              onClick={() => {
                                if (onBookableChange && b.id !== bookable.id) {
                                  onBookableChange(b.id);
                                }
                                setBookablePopoverOpen(false);
                                setBookableSearch("");
                              }}
                            >
                              <BookableImage
                                images={b.images}
                                alt={b.title}
                                size={56}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base text-foreground">
                                  {b.title}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                                  <span className="font-medium">
                                    {formatCurrency(b.basePrice, currency)}
                                  </span>
                                  <span>
                                    {formatDuration(
                                      b.durationValue,
                                      b.durationUnit,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setBookablePopoverOpen(true)}
                  className={cn(
                    "text-base font-semibold text-left w-full truncate block",
                    "hover:underline focus:underline focus:outline-none cursor-pointer",
                  )}
                >
                  {bookable.title}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "mt-2 gap-1.5 font-medium rounded-full",
                        getStatusConfig(bookingStatus).color,
                        getStatusConfig(bookingStatus).textColor,
                        "border-border/50 hover:opacity-90",
                      )}
                    >
                      {getStatusConfig(bookingStatus).label}
                      <span
                        className={cn(
                          "size-2 rounded-full shrink-0",
                          getStatusConfig(bookingStatus).circleColor,
                        )}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[10rem]">
                    <DropdownMenuRadioGroup
                      value={bookingStatus}
                      onValueChange={(value) =>
                        onStatusChange?.(value as BookingStatus)
                      }
                    >
                      {BOOKING_STATUSES.map((status) => (
                        <DropdownMenuRadioItem
                          key={status.value}
                          value={status.value}
                        >
                          <span className="flex flex-1">{status.label}</span>
                          <span
                            className={cn(
                              "size-2 rounded-full shrink-0",
                              status.circleColor,
                            )}
                          />
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-6">
            {/* Start Date & Time Badge */}
            <Popover
              open={isStartPopoverOpen}
              onOpenChange={setIsStartPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">
                      {format(startTime, "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBookingTimeForBadge(
                        startTime,
                        endTime,
                        formatTime,
                        dateTimeFormat,
                        true,
                      )}
                    </p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4">
                  <DateTimePicker
                    key={`start-${startPickerKey}`}
                    ref={startDatePickerRef}
                    initialDate={startTime}
                    initialTime={formatTime(startTime, dateTimeFormat)}
                    bookableDuration={{
                      value: bookable.durationValue,
                      unit: bookable.durationUnit,
                    }}
                    startTime={bookable.startTime}
                    endTime={bookable.endTime}
                    bufferMinutes={bookable.bufferMinutes}
                    allowMultipleDays={bookable.allowMultipleDays}
                    disabledTimeSlots={disabledStartSlots}
                    disabledDates={disabledDates}
                    dateTimeFormat={dateTimeFormat}
                    onDateChange={handleStartDateChange}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsStartPopoverOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveStartDateTime}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* End Date & Time Badge - only when multi-day */}
            {!isSameDay(startTime, endTime) && (
            <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">
                      {format(endTime, "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBookingTimeForBadge(
                        startTime,
                        endTime,
                        formatTime,
                        dateTimeFormat,
                        false,
                      )}
                    </p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4">
                  <DateTimePicker
                    key={`end-${endPickerKey}`}
                    ref={endDatePickerRef}
                    initialDate={endTime}
                    initialTime={formatTime(endTime, dateTimeFormat)}
                    minDate={startTime}
                    maxDate={!bookable.allowMultipleDays ? startTime : undefined}
                    bookableDuration={{
                      value: bookable.durationValue,
                      unit: bookable.durationUnit,
                    }}
                    startTime={bookable.startTime}
                    endTime={bookable.endTime}
                    bufferMinutes={bookable.bufferMinutes}
                    allowMultipleDays={bookable.allowMultipleDays}
                    disabledTimeSlots={disabledEndSlots}
                    dateTimeFormat={dateTimeFormat}
                    onDateChange={handleEndDateChange}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEndPopoverOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveEndDateTime}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            )}

            {/* Duration Badge (calculated from start and end; updates when start/end change) */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">
                  {formatBookingDuration(startTime, endTime)}
                </p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Custom Fields
            </h4>
            {bookingCustomFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No custom fields configured
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {bookingCustomFields.map((field) => {
                  const userValue = customFields[field.identifier];
                  const currentValue = userValue || field.defaultValue || "";

                  // Determine if field should use text input, textarea, or dropdown
                  const isTextInput =
                    field.type === CustomFieldType.TEXT ||
                    field.type === CustomFieldType.NUMBER ||
                    field.type === CustomFieldType.DATE ||
                    field.type === CustomFieldType.TIME;
                  const isTextarea = field.type === CustomFieldType.TEXTAREA;

                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground">
                          {field.name}
                        </p>
                        {field.required && (
                          <span className="text-xs text-destructive">*</span>
                        )}
                      </div>
                      {isTextarea ? (
                        <Textarea
                          value={currentValue}
                          onChange={(e) =>
                            handleUpdateCustomField(
                              field.identifier,
                              e.target.value,
                            )
                          }
                          className="min-h-[80px] resize-none text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0 dark:bg-transparent"
                          placeholder={
                            field.placeholder || field.defaultValue || ""
                          }
                        />
                      ) : isTextInput ? (
                        <Input
                          value={currentValue}
                          onChange={(e) =>
                            handleUpdateCustomField(
                              field.identifier,
                              e.target.value,
                            )
                          }
                          className="h-8 text-sm font-medium border-none shadow-none focus-visible:ring-0 px-0 dark:bg-transparent"
                          placeholder={
                            field.placeholder || field.defaultValue || ""
                          }
                        />
                      ) : (
                        <DropdownMenu
                          open={openDropdown === field.identifier}
                          onOpenChange={(open) =>
                            setOpenDropdown(open ? field.identifier : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "text-sm font-medium text-left hover:underline cursor-pointer",
                                !currentValue && "text-muted-foreground",
                              )}
                            >
                              {currentValue || ""}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            {field.options && field.options.length > 0 ? (
                              field.options.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCustomField(
                                      field.identifier,
                                      option,
                                    )
                                  }
                                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                >
                                  {option}
                                </button>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No options available
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h4>
            <Textarea
              value={notes}
              onChange={(e) => {
                const newNotes = e.target.value;
                setNotes(newNotes);
                onNotesChange?.(newNotes);
              }}
              className="min-h-[100px] resize-none text-sm bg-muted"
              placeholder="Add notes about this booking..."
            />
          </div>
        </CardContent>
      </Card>
    );
  },
);

BookingInfoCard.displayName = "BookingInfoCard";
