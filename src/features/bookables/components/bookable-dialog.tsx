"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useCreateBookable } from "../hooks/use-bookables";
import { formatTime } from "@/lib/format-utils";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { BookableForm } from "./bookable-form";
import { bookableFormSchema, type BookableFormValues } from "../lib/schemas";
import { formValuesToBookableInput, getTaxCountryFromOrgCountry } from "../lib/form-utils";
import { PREDEFINED_TAXES } from "@/config/taxes";
import { BookableStatus, DurationUnit, TaxType } from "@/generated/prisma";

interface BookableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string | null;
}

export const BookableDialog = ({
  open,
  onOpenChange,
  collectionId,
}: BookableDialogProps) => {
  const createBookable = useCreateBookable();
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency || "USD";
  const dateTimeFormat = (currentOrg?.dateTimeFormat as "12" | "24") || "24";

  // Filter taxes based on organization country
  const availableTaxes = useMemo(() => {
    const taxCountry = getTaxCountryFromOrgCountry(currentOrg?.country);
    if (!taxCountry) {
      return PREDEFINED_TAXES;
    }
    return PREDEFINED_TAXES.filter((tax) => tax.country === taxCountry);
  }, [currentOrg?.country]);

  // Generate time options for availability pickers
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const value = `${formattedHour}:${formattedMinute}`;
        const date = new Date(2000, 0, 1, hour, minute);
        const label = formatTime(date, dateTimeFormat);
        options.push({ label, value });
      }
    }
    return options;
  }, [dateTimeFormat]);

  const form = useForm<BookableFormValues>({
    resolver: zodResolver(bookableFormSchema) as Resolver<BookableFormValues>,
    defaultValues: {
      title: "",
      basePrice: 0,
      units: 1,
      status: BookableStatus.DRAFT,
      durationValue: 1,
      durationUnit: DurationUnit.HOURS,
      minAdvanceValue: null,
      minAdvanceUnit: "HOURS",
      maxAdvanceValue: null,
      maxAdvanceUnit: "DAYS",
      taxOption: "exclude",
      customTaxType: TaxType.PERCENTAGE,
      customTaxValue: null,
      images: [],
      priceTiers: null,
      blockedDates: [],
      availability: [],
      startTime: "09:00",
      endTime: "17:00",
      bufferValue: 0,
      bufferUnit: DurationUnit.MINUTES,
      allowMultipleDays: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
        form.reset({
          title: "",
          basePrice: 0,
          units: 1,
          status: BookableStatus.DRAFT,
          durationValue: 1,
          durationUnit: DurationUnit.HOURS,
          minAdvanceValue: null,
          minAdvanceUnit: "HOURS",
          maxAdvanceValue: null,
          maxAdvanceUnit: "DAYS",
          taxOption: "exclude",
          customTaxType: TaxType.PERCENTAGE,
          customTaxValue: null,
          images: [],
          priceTiers: null,
          blockedDates: [],
          availability: [],
          startTime: "09:00",
          endTime: "17:00",
          bufferValue: 0,
          bufferUnit: DurationUnit.MINUTES,
          allowMultipleDays: false,
        });
      }
  }, [open, form]);

  const handleSubmit = async (values: BookableFormValues) => {
    try {
        await createBookable.mutateAsync({
          collectionId,
        ...formValuesToBookableInput(values),
      });
      onOpenChange(false);
    } catch {
      // Error is handled by the mutation hook (toast notification)
    }
  };

  return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader className="space-y-3 flex-shrink-0">
                <SheetTitle className="text-lg font-semibold tracking-tight">
            New Bookable
                </SheetTitle>
            <SheetDescription>
            Create a new bookable item in this collection.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            <Form {...form}>
              <form
                id="bookable-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
              <BookableForm
                form={form}
                availableTaxes={availableTaxes}
                timeOptions={timeOptions}
                currency={currency}
              />
              </form>
            </Form>
          </div>

          <SheetFooter className="flex-shrink-0 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            disabled={createBookable.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="bookable-form"
            disabled={createBookable.isPending}
            >
            Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );
};
