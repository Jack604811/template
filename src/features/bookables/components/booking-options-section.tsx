"use client";

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
import { Switch } from "@/components/ui/switch";
import {
  MAX_ADVANCE_UNITS,
  maxAdvanceUnitLabels,
  MIN_ADVANCE_UNITS,
  minAdvanceUnitLabels,
} from "../lib/schemas";
import type { BookableFormValues } from "../lib/schemas";

interface BookingOptionsSectionProps {
  form: UseFormReturn<BookableFormValues>;
}

export const BookingOptionsSection = ({ form }: BookingOptionsSectionProps) => {
  const allowMultipleGuests = form.watch("allowMultipleGuests");

  return (
    <div className="space-y-6">
      {/* Booking Window */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Booking Window
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control how far in advance bookings can be made
          </p>
        </div>
        <div className="space-y-2">
          <FormLabel>Minimum Notice</FormLabel>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="minAdvanceValue"
              render={({ field }) => (
                <FormItem className="w-full max-w-[120px]">
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      className="w-full"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value, 10) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minAdvanceUnit"
              render={({ field: unitField }) => (
                <FormItem className="flex-1 min-w-[140px]">
                  <FormControl>
                    <Select
                      onValueChange={unitField.onChange}
                      value={unitField.value ?? "HOURS"}
                    >
                      <SelectTrigger className="w-full">
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
          <FormDescription>
            How much notice do you need before a booking?
          </FormDescription>
        </div>
        <div className="space-y-2">
          <FormLabel>Maximum Advance Booking</FormLabel>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="maxAdvanceValue"
              render={({ field }) => (
                <FormItem className="w-full max-w-[120px]">
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Optional"
                      className="w-full"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value, 10) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxAdvanceUnit"
              render={({ field: unitField }) => (
                <FormItem className="flex-1 min-w-[140px]">
                  <FormControl>
                    <Select
                      onValueChange={unitField.onChange}
                      value={unitField.value ?? "DAYS"}
                    >
                      <SelectTrigger className="w-full">
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
          <FormDescription>
            How far into the future can guests book?
          </FormDescription>
        </div>
      </div>

      {/* Capacity Settings */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Capacity Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage guest capacity for this booking
          </p>
        </div>
        <FormField
          control={form.control}
          name="allowMultipleGuests"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Allow Multiple Guests
                </FormLabel>
                <FormDescription>
                  Enable bookings for groups or multiple people
                </FormDescription>
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
        {allowMultipleGuests && (
          <>
            <FormField
              control={form.control}
              name="minGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Guests</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      className="w-full max-w-[120px]"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value, 10) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxGuestsPerBooking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Guests per Booking</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="w-full max-w-[120px]"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value, 10) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <FormField
          control={form.control}
          name="units"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Simultaneous Bookings</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  className="w-full max-w-[120px]"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseInt(e.target.value, 10) : 1,
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                How many bookings can happen at the same time?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
