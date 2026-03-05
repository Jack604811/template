"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BookableForm } from "./bookable-form";
import { useCreateBookable } from "../hooks/use-bookables";
import { bookableFormSchema, type BookableFormValues } from "../lib/schemas";
import { formValuesToBookableInput, getTaxCountryFromOrgCountry } from "../lib/form-utils";
import { PREDEFINED_TAXES } from "@/config/taxes";
import { formatTime } from "@/lib/format-utils";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { BookableStatus, DurationUnit, TaxType } from "@/generated/prisma";
import Link from "next/link";

export const NewBookablePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionId = searchParams.get("collectionId");
  const { handleBreadcrumbClick, handleCancel } = useDetailPageNavigation("/catalog");
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

  const handleSubmit = async (values: BookableFormValues) => {
    try {
      const newBookable = await createBookable.mutateAsync({
        collectionId: collectionId || null,
        ...formValuesToBookableInput(values),
      });
      router.push(`/catalog/${newBookable.id}`);
    } catch {
      // Error is handled by the mutation hook (toast notification)
    }
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
        <SidebarTrigger />
        <div className="flex flex-row items-center justify-between gap-x-4 w-full">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link 
                    prefetch 
                    href="/catalog"
                    onClick={(e) => {
                      e.preventDefault();
                      handleBreadcrumbClick();
                    }}
                  >
                    Catalog
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>New Bookable</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={createBookable.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => form.handleSubmit(handleSubmit)()}
              disabled={createBookable.isPending}
            >
              {createBookable.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="max-w-2xl mx-auto">
            <Form {...form}>
              <form
                id="bookable-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                <div className="bg-card rounded-lg border p-6">
                  <BookableForm
                    form={form}
                    availableTaxes={availableTaxes}
                    timeOptions={timeOptions}
                    currency={currency}
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </>
  );
};
