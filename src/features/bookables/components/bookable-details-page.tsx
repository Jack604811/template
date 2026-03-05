"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { findTaxByTypeValueAndCountry, PREDEFINED_TAXES } from "@/config/taxes";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { BookableStatus, DurationUnit, TaxType } from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";
import { formatTime } from "@/lib/format-utils";
import { useTRPC } from "@/trpc/client";
import { useSuspenseBookable, useUpdateBookable } from "../hooks/use-bookables";
import {
  bookableToFormValues,
  formValuesToBookableInput,
  getTaxCountryFromOrgCountry,
} from "../lib/form-utils";
import { type BookableFormValues, bookableFormSchema } from "../lib/schemas";
import { AdvanceSection } from "./advance-section";
import {
  BookableDetailsSidebar,
  DEFAULT_BOOKABLE_SECTION,
  type BookableDetailSectionId,
} from "./bookable-details-sidebar";
import { AvailabilitySection } from "./availability-section";
import { BookableForm } from "./bookable-form";
import { BookableHeader } from "./bookable-header";
import { BookingOptionsSection } from "./booking-options-section";
import { BookingSetupSection } from "./booking-setup-section";
import { useSuspenseCollections } from "../hooks/use-collections";

interface BookableDetailsPageProps {
  bookableId: string;
}

export const BookableDetailsPage = ({
  bookableId,
}: BookableDetailsPageProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { handleCancel } = useDetailPageNavigation("/catalog");
  const { data: bookable } = useSuspenseBookable(bookableId);
  const collectionsQuery = useSuspenseCollections();
  const collections = collectionsQuery.data ?? [];
  const [currentSection, setCurrentSection] =
    useState<BookableDetailSectionId>(DEFAULT_BOOKABLE_SECTION);
  const updateBookable = useUpdateBookable();
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency || "USD";
  const dateTimeFormat = (currentOrg?.dateTimeFormat as "12" | "24") || "24";

  const taxCountry = getTaxCountryFromOrgCountry(currentOrg?.country) ?? null;

  // Filter taxes by org country so only relevant taxes (e.g. IVA for Colombia) appear; include current bookable's tax so the Select can display it when loading
  const availableTaxes = useMemo(() => {
    const base =
      taxCountry == null
        ? PREDEFINED_TAXES
        : PREDEFINED_TAXES.filter((t) => t.country === taxCountry);
    if (!bookable?.taxType || bookable.taxValue == null) return base;
    const rounded = Math.round(Number(bookable.taxValue) * 100) / 100;
    const current = findTaxByTypeValueAndCountry(
      bookable.taxType as "PERCENTAGE" | "FIXED",
      rounded,
      taxCountry,
    );
    if (current && !base.some((t) => t.id === current.id)) {
      return [current, ...base];
    }
    return base;
  }, [taxCountry, bookable?.taxType, bookable?.taxValue]);

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

  // Initialize form with loaded bookable so Status and Tax dropdowns show correct values on first paint
  const form = useForm<BookableFormValues>({
    resolver: zodResolver(bookableFormSchema) as Resolver<BookableFormValues>,
    defaultValues: bookable
      ? bookableToFormValues(bookable, taxCountry)
      : {
          title: "",
          description: null,
          collectionId: null,
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
          allowMultipleGuests: false,
          minGuests: 1,
          maxGuestsPerBooking: 4,
          requirePayment: false,
          requireDeposit: false,
          depositPercent: null,
          successRedirectUrl: null,
          cancelRedirectUrl: null,
          hideBookingType: false,
          internalNotes: null,
        },
  });

  // Reset form when bookable changes (e.g. navigating to another bookable)
  useEffect(() => {
    if (bookable) {
      form.reset(bookableToFormValues(bookable, taxCountry));
    }
  }, [bookable, form, taxCountry]);

  const performSave = useCallback(
    async (vals: BookableFormValues) => {
      if (!bookable) return;

      const input = formValuesToBookableInput(vals);
      const queryOptions = trpc.bookables.getOne.queryOptions({
        id: bookableId,
      });

      // Optimistic update (Pattern 1: React Query cache - docs/OPTIMISTIC_UPDATES.md)
      queryClient.setQueryData(
        queryOptions.queryKey,
        (old: typeof bookable | undefined) => {
          if (!old) return old;
          return { ...old, ...input, updatedAt: new Date() };
        },
      );

      try {
        await updateBookable.mutateAsync({ id: bookableId, ...input });
      } catch {
        queryClient.invalidateQueries(queryOptions);
      }
    },
    [bookable, bookableId, queryClient, trpc, updateBookable],
  );

  const debouncedSave = useDebounce(() => {
    if (!form.formState.isDirty) return;
    performSave(form.getValues());
  }, 500);

  // Use watch() instead of subscribe() - subscribe doesn't reliably fire for Controller/FormField
  // (units, allowMultipleDays, Switch, Select). watch() correctly detects all field changes.
  const watchedValues = form.watch();

  // biome-ignore lint/correctness/useExhaustiveDependencies: watchedValues triggers effect on units, allowMultipleDays changes
  useEffect(() => {
    if (!form.formState.isDirty || !bookable) return;
    debouncedSave();
  }, [watchedValues, form.formState.isDirty, bookable, debouncedSave]);

  const handleSubmit = useCallback(
    async (vals: BookableFormValues) => {
      await performSave(vals);
    },
    [performSave],
  );

  if (!bookable) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <BookableDetailsSidebar
          className="w-64 flex-shrink-0"
          bookableId={bookableId}
          section={currentSection}
          onSectionChange={setCurrentSection}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <BookableHeader
            title={bookable.title || "Bookable"}
            onSave={() => form.handleSubmit(handleSubmit)()}
            onCancel={handleCancel}
            isSaving={updateBookable.isPending}
            baseRoute="/catalog"
          />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 lg:px-8 py-6">
              <div className="max-w-2xl mx-auto">
                <Form {...form}>
                  <form
                    id="bookable-form"
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="space-y-6"
                  >
                    <div
                      className={
                        currentSection === "booking-options" ||
                        currentSection === "advance" ||
                        currentSection === "availability"
                          ? ""
                          : "bg-card rounded-lg border p-6"
                      }
                    >
                      {currentSection === "booking-setup" ? (
                        <BookingSetupSection
                          form={form}
                          collections={collections}
                        />
                      ) : currentSection === "availability" ? (
                        <AvailabilitySection
                          form={form}
                          timeOptions={timeOptions}
                          dateTimeFormat={dateTimeFormat}
                        />
                      ) : currentSection === "booking-options" ? (
                        <BookingOptionsSection form={form} />
                      ) : currentSection === "advance" ? (
                        <AdvanceSection
                          form={form}
                          availableTaxes={availableTaxes}
                          currency={currency}
                        />
                      ) : (
                        <BookableForm
                          form={form}
                          availableTaxes={availableTaxes}
                          timeOptions={timeOptions}
                          currency={currency}
                        />
                      )}
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
