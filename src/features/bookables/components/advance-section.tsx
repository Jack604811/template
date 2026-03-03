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
import { Textarea } from "@/components/ui/textarea";
import { TaxType } from "@/generated/prisma";
import { formatNumberWithPeriods, parseFormattedNumber } from "@/lib/utils";
import type { BookableFormValues } from "../lib/schemas";

interface AdvanceSectionProps {
  form: UseFormReturn<BookableFormValues>;
  availableTaxes: Array<{
    id: string;
    label: string;
    value: number;
    type: string;
    country: string;
  }>;
  currency: string;
}

export const AdvanceSection = ({
  form,
  availableTaxes,
  currency,
}: AdvanceSectionProps) => {
  const requirePayment = form.watch("requirePayment");
  const requireDeposit = form.watch("requireDeposit");
  const taxOption = form.watch("taxOption");
  const customTaxType = form.watch("customTaxType");
  const showCustomTaxInput = taxOption === "custom";

  return (
    <div className="space-y-6">
      {/* Payment Settings */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Payment Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure pricing and payment options.
          </p>
        </div>
        <FormField
            control={form.control}
            name="requirePayment"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Payment</FormLabel>
                  <FormDescription>
                    Collect payment at time of booking
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

          {requirePayment && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <div className="flex gap-2">
                        <div className="flex h-9 min-w-[4.5rem] items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                          {currency}
                        </div>
                        <FormControl className="flex-1">
                          <Input
                            type="text"
                            placeholder="0"
                            value={
                              field.value
                                ? formatNumberWithPeriods(
                                    Math.round(field.value).toString(),
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              const formatted = formatNumberWithPeriods(
                                e.target.value,
                              );
                              const parsed = parseFormattedNumber(formatted);
                              field.onChange(parsed ?? 0);
                            }}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax</FormLabel>
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
              </div>
              {showCustomTaxInput && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="customTaxType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax type</FormLabel>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v as TaxType)
                          }
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={TaxType.PERCENTAGE}>
                              Percentage
                            </SelectItem>
                            <SelectItem value={TaxType.FIXED}>
                              Fixed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customTaxValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
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
                              const formatted = formatNumberWithPeriods(
                                e.target.value,
                              );
                              const parsed = parseFormattedNumber(formatted);
                              field.onChange(parsed ?? null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          )}

          <FormField
            control={form.control}
            name="requireDeposit"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Deposit</FormLabel>
                  <FormDescription>
                    Collect partial payment upfront
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

          {requireDeposit && (
            <FormField
              control={form.control}
              name="depositPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Amount (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="50"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(
                          v === "" ? null : Math.min(100, Math.max(0, Number(v))),
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
      </div>

      {/* Booking Redirect */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Booking Redirect
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Where to send guests after booking.
          </p>
        </div>
        <FormField
            control={form.control}
            name="successRedirectUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Success URL (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://yoursite.com/thank-you"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                </FormControl>
                <FormDescription>
                  Redirect guests to this page after successful booking.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancelRedirectUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancel URL (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://yoursite.com/cancelled"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
      </div>

      {/* Additional Settings */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Additional Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Other configuration options
          </p>
        </div>
        <FormField
          control={form.control}
          name="hideBookingType"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Hide Booking Type</FormLabel>
                <FormDescription>
                  Make this booking type private
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
        <FormField
          control={form.control}
          name="internalNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Private notes for staff only..."
                  className="min-h-[100px] resize-y"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value || null)
                  }
                />
              </FormControl>
              <FormDescription>
                Only visible to administrators
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
