"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookableStatus, TaxType } from "@/generated/prisma";
import { findTaxById } from "@/config/taxes";
import { formatNumberWithPeriods, parseFormattedNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { HelpCircle } from "lucide-react";
import type { BookableFormValues } from "../lib/schemas";
import {
  DURATION_UNITS_SLOT,
  MAX_ADVANCE_UNITS,
  maxAdvanceUnitLabels,
  MIN_ADVANCE_UNITS,
  minAdvanceUnitLabels,
  statusLabels,
  durationUnitLabels,
  tooltipContent,
} from "../lib/schemas";

/** Parse "HH:mm" (24h) to 12h hour (1-12), minute (0-59), and amPm ("am" | "pm"). */
function parseTimeTo12h(value: string | null | undefined): {
  hour12: number;
  minute: number;
  amPm: "am" | "pm";
} {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) {
    return { hour12: 9, minute: 0, amPm: "am" as const };
  }
  const [h, m] = value.split(":").map(Number);
  const hour24 = h ?? 0;
  const minute = Math.min(59, Math.max(0, m ?? 0));
  const hour12 = hour24 % 12 || 12;
  const amPm = hour24 < 12 ? ("am" as const) : ("pm" as const);
  return { hour12, minute, amPm };
}

/** Build "HH:mm" (24h) from 12h hour, minute, and amPm. */
function buildTimeFrom12h(
  hour12: number,
  minute: number,
  amPm: "am" | "pm",
): string {
  const hour24 =
    amPm === "pm" ? (hour12 === 12 ? 12 : hour12 + 12) : hour12 === 12 ? 0 : hour12;
  return `${hour24.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

const AM_PM_OPTIONS: Array<"am" | "pm"> = ["am", "pm"];

const TIME_WRAPPER_CLASS =
  "flex h-9 w-fit min-w-[7.5rem] items-center rounded-md border border-input bg-transparent shadow-xs overflow-hidden";
const TIME_INPUT_CLASS =
  "h-9 w-8 shrink-0 border-0 bg-transparent px-1 py-1 text-center text-base shadow-none outline-none focus-visible:ring-0 md:text-sm tabular-nums";
const TIME_SELECT_TRIGGER_CLASS =
  "h-9 min-w-[2.75rem] border-0 bg-transparent px-2 shadow-none focus-visible:ring-0";

type TimeLocal = { hour: string; minute: string };

interface BookableFormProps {
  form: UseFormReturn<BookableFormValues>;
  availableTaxes: Array<{ id: string; label: string; value: number; type: string; country: string }>;
  timeOptions: Array<{ label: string; value: string }>;
  currency: string;
}

export const BookableForm = ({ form, availableTaxes, timeOptions: _timeOptions, currency }: BookableFormProps) => {
  const [startTimeLocal, setStartTimeLocal] = useState<TimeLocal | null>(null);
  const [endTimeLocal, setEndTimeLocal] = useState<TimeLocal | null>(null);
  const taxOption = form.watch("taxOption");
  const customTaxType = form.watch("customTaxType");
  const customTaxValue = form.watch("customTaxValue");
  const basePrice = form.watch("basePrice");

  const showCustomTaxInput = taxOption === "custom";

  // Calculate tax amount and total
  const calculateTaxAmount = (): number => {
    if (taxOption === "exclude") return 0;
    
    if (taxOption === "custom") {
      if (!customTaxValue) return 0;
      if (customTaxType === TaxType.PERCENTAGE) {
        return (basePrice * customTaxValue) / 100;
      }
      return customTaxValue;
    }
    
    const tax = findTaxById(taxOption);
    if (!tax) return 0;
    
    if (tax.type === "PERCENTAGE") {
      return (basePrice * tax.value) / 100;
    }
    return tax.value;
  };

  const taxAmount = calculateTaxAmount();
  const totalPrice = basePrice + taxAmount;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Basic Information</h3>
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2 flex items-center gap-2">
                  <FormLabel className="font-semibold">Title *</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tooltipContent.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <Input placeholder="Enter bookable title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2 flex items-center gap-2">
                  <FormLabel className="font-semibold">Status</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tooltipContent.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(BookableStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Pricing</h3>
          
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2 flex items-center gap-2">
                  <FormLabel className="font-semibold">Base Price *</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tooltipContent.basePrice}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0"
                    value={field.value ? formatNumberWithPeriods(Math.round(field.value).toString()) : ""}
                    onChange={(e) => {
                      const formatted = formatNumberWithPeriods(e.target.value);
                      const parsed = parseFormattedNumber(formatted);
                      field.onChange(parsed || 0);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxOption"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2 flex items-center gap-2">
                  <FormLabel className="font-semibold">Tax</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tooltipContent.tax}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="exclude">Exclude</SelectItem>
                    <SelectItem value="custom">Service fee custom</SelectItem>
                    {availableTaxes.map((tax) => (
                      <SelectItem key={tax.id} value={tax.id}>
                        {tax.label} - {tax.value}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showCustomTaxInput && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="customTaxType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Type</FormLabel>
                    <Tabs
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as TaxType)
                      }
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value={TaxType.PERCENTAGE} className="flex-1">
                          Percentage
                        </TabsTrigger>
                        <TabsTrigger value={TaxType.FIXED} className="flex-1">
                          Fixed
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customTaxValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Value</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0"
                        value={
                          field.value
                            ? formatNumberWithPeriods(
                                customTaxType === TaxType.PERCENTAGE
                                  ? field.value.toString()
                                  : Math.round(field.value).toString(),
                              )
                            : ""
                        }
                        onChange={(e) => {
                          const formatted = formatNumberWithPeriods(e.target.value);
                          const parsed = parseFormattedNumber(formatted);
                          field.onChange(parsed || null);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {customTaxType === TaxType.PERCENTAGE
                        ? "Percentage value (e.g. 10%)"
                        : "Fixed amount"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Separator />
          {taxOption !== "exclude" && taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax amount:</span>
              <span className="font-medium">{formatCurrency(taxAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium">Total</span>
            <div className="text-right">
              <span className="text-2xl font-bold">
                {formatCurrency(totalPrice, currency)}
              </span>
              <p className="text-xs text-muted-foreground">{currency}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Duration & Availability */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Duration & Availability</h3>
          
          <div className="flex flex-row w-full gap-4">
            <div className="flex flex-col w-full">
              <div className="mb-2 flex items-center gap-2">
                <FormLabel className="font-semibold">Duration *</FormLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{tooltipContent.duration}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex w-full items-center gap-2">
                <FormField
                  control={form.control}
                  name="durationValue"
                  render={({ field }) => (
                    <FormItem className="w-20">
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
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
            </div>

            <div className="flex flex-col w-full">
              <FormField
                control={form.control}
                name="units"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-2 flex items-center gap-2">
                      <FormLabel className="font-semibold">
                        Total Units Available *
                      </FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipContent.units}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <Input
                        className="w-20"
                        type="number"
                        min="1"
                        placeholder="Optional"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value, 10) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => {
                const { hour12, minute, amPm } = parseTimeTo12h(field.value);
                const hourDisplay = startTimeLocal?.hour ?? hour12.toString().padStart(2, "0");
                const minuteDisplay = startTimeLocal?.minute ?? minute.toString().padStart(2, "0");
                const commitStart = (h: string, m: string) => {
                  const hourVal = Math.min(12, Math.max(1, parseInt(h, 10) || 1));
                  const minuteVal = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
                  field.onChange(buildTimeFrom12h(hourVal, minuteVal, amPm));
                  setStartTimeLocal(null);
                };
                return (
                  <FormItem>
                    <div className="mb-2 flex items-center gap-2">
                      <FormLabel className="font-semibold">Start time</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipContent.operatingWindow}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <div className={TIME_WRAPPER_CLASS}>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          className={TIME_INPUT_CLASS}
                          value={hourDisplay}
                          onFocus={() =>
                            setStartTimeLocal({ hour: hourDisplay, minute: minuteDisplay })
                          }
                          onBlur={() => commitStart(hourDisplay, minuteDisplay)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
                            setStartTimeLocal((prev) => ({
                              hour: raw,
                              minute: prev?.minute ?? minute.toString().padStart(2, "0"),
                            }));
                          }}
                        />
                        <span className="text-muted-foreground shrink-0 text-sm">:</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          className={TIME_INPUT_CLASS}
                          value={minuteDisplay}
                          onFocus={() =>
                            setStartTimeLocal({ hour: hourDisplay, minute: minuteDisplay })
                          }
                          onBlur={() => commitStart(hourDisplay, minuteDisplay)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
                            setStartTimeLocal((prev) => ({
                              hour: prev?.hour ?? hour12.toString().padStart(2, "0"),
                              minute: raw,
                            }));
                          }}
                        />
                        <Select
                          value={amPm}
                          onValueChange={(v: "am" | "pm") =>
                            field.onChange(buildTimeFrom12h(hour12, minute, v))
                          }
                        >
                          <SelectTrigger className={TIME_SELECT_TRIGGER_CLASS}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AM_PM_OPTIONS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a === "am" ? "AM" : "PM"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => {
                const { hour12, minute, amPm } = parseTimeTo12h(field.value);
                const hourDisplay = endTimeLocal?.hour ?? hour12.toString().padStart(2, "0");
                const minuteDisplay = endTimeLocal?.minute ?? minute.toString().padStart(2, "0");
                const commitEnd = (h: string, m: string) => {
                  const hourVal = Math.min(12, Math.max(1, parseInt(h, 10) || 1));
                  const minuteVal = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
                  field.onChange(buildTimeFrom12h(hourVal, minuteVal, amPm));
                  setEndTimeLocal(null);
                };
                return (
                  <FormItem>
                    <div className="mb-2 flex items-center gap-2">
                      <FormLabel className="font-semibold">End time</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipContent.operatingWindow}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <div className={TIME_WRAPPER_CLASS}>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          className={TIME_INPUT_CLASS}
                          value={hourDisplay}
                          onFocus={() =>
                            setEndTimeLocal({ hour: hourDisplay, minute: minuteDisplay })
                          }
                          onBlur={() => commitEnd(hourDisplay, minuteDisplay)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
                            setEndTimeLocal((prev) => ({
                              hour: raw,
                              minute: prev?.minute ?? minute.toString().padStart(2, "0"),
                            }));
                          }}
                        />
                        <span className="text-muted-foreground shrink-0 text-sm">:</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          className={TIME_INPUT_CLASS}
                          value={minuteDisplay}
                          onFocus={() =>
                            setEndTimeLocal({ hour: hourDisplay, minute: minuteDisplay })
                          }
                          onBlur={() => commitEnd(hourDisplay, minuteDisplay)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
                            setEndTimeLocal((prev) => ({
                              hour: prev?.hour ?? hour12.toString().padStart(2, "0"),
                              minute: raw,
                            }));
                          }}
                        />
                        <Select
                          value={amPm}
                          onValueChange={(v: "am" | "pm") =>
                            field.onChange(buildTimeFrom12h(hour12, minute, v))
                          }
                        >
                          <SelectTrigger className={TIME_SELECT_TRIGGER_CLASS}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AM_PM_OPTIONS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a === "am" ? "AM" : "PM"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          <FormField
            control={form.control}
            name="bufferValue"
            render={({ field }) => (
              <FormItem>
                <div className="mb-2 flex items-center gap-2">
                  <FormLabel className="font-semibold">Buffer between bookings</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tooltipContent.bufferBetweenBookings}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex w-full items-center gap-2">
                  <FormControl>
                    <Input
                      className="w-20"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Math.max(0, parseInt(e.target.value, 10) || 0),
                        )
                      }
                    />
                  </FormControl>
                  <FormField
                    control={form.control}
                    name="bufferUnit"
                    render={({ field: unitField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Select
                            onValueChange={unitField.onChange}
                            value={unitField.value}
                          >
                            <SelectTrigger>
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

          <FormField
            control={form.control}
            name="allowMultipleDays"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <FormLabel className="font-semibold">Allow booking multiple days</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tooltipContent.allowMultipleDays}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Booking Rules</h3>
            
            <div className="flex flex-row w-full gap-4">
              <FormField
                control={form.control}
                name="minAdvanceValue"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <FormLabel className="font-semibold">
                        Min Advance Booking
                      </FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipContent.minAdvanceBooking}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Optional"
                          className="w-20"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormField
                        control={form.control}
                        name="minAdvanceUnit"
                        render={({ field: unitField }) => (
                          <FormItem className="flex-1 min-w-[100px]">
                            <FormControl>
                              <Select
                                onValueChange={unitField.onChange}
                                value={unitField.value ?? "HOURS"}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MIN_ADVANCE_UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {minAdvanceUnitLabels[unit]}
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

              <FormField
                control={form.control}
                name="maxAdvanceValue"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <FormLabel className="font-semibold">
                        Max Advance Booking
                      </FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{tooltipContent.maxAdvanceBooking}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Optional"
                          className="w-20"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormField
                        control={form.control}
                        name="maxAdvanceUnit"
                        render={({ field: unitField }) => (
                          <FormItem className="flex-1 min-w-[100px]">
                            <FormControl>
                              <Select
                                onValueChange={unitField.onChange}
                                value={unitField.value ?? "DAYS"}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MAX_ADVANCE_UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {maxAdvanceUnitLabels[unit]}
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
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
