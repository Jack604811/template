"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon, CopyIcon, EyeIcon, LinkIcon, MoreVerticalIcon, ShareIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Form } from "@/components/ui/form";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Pills } from "@/components/ui/pills";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { findTaxByTypeValueAndCountry, PREDEFINED_TAXES } from "@/config/taxes";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { BookableStatus, DurationUnit, TaxType } from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";
import { formatCurrency, formatTime } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useDuplicateBookable, useSuspenseBookable, useRemoveBookable, useUpdateBookable } from "../hooks/use-bookables";
import { useSuspenseCollections } from "../hooks/use-collections";
import {
  bookableToFormValues,
  formValuesToBookableInput,
  getTaxCountryFromOrgCountry,
} from "../lib/form-utils";
import { type BookableFormValues, bookableFormSchema, durationUnitLabels } from "../lib/schemas";
import { AdvanceSection } from "./advance-section";
import { AvailabilitySection } from "./availability-section";
import { BookableImage } from "./bookable-image";
import {
  BOOKABLE_DETAIL_SECTIONS,
  DEFAULT_BOOKABLE_SECTION,
  type BookableDetailSectionId,
} from "./bookable-details-sidebar";
import { BookingOptionsSection } from "./booking-options-section";
import { BookingSetupSection } from "./booking-setup-section";

const ActionItem = ({
  icon,
  label,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-40",
      className,
    )}
  >
    <span className="flex size-5 items-center justify-center">{icon}</span>
    {label}
  </button>
);

interface BookableDetailsPageProps {
  bookableId: string;
}

export const BookableDetailsPage = ({
  bookableId,
}: BookableDetailsPageProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { handleCancel } = useDetailPageNavigation("/services");
  const { data: bookable } = useSuspenseBookable(bookableId);
  const collectionsQuery = useSuspenseCollections();
  const collections = collectionsQuery.data ?? [];
  const [currentSection, setCurrentSection] =
    useState<BookableDetailSectionId>(DEFAULT_BOOKABLE_SECTION);
  const updateBookable = useUpdateBookable();
  const removeBookable = useRemoveBookable();
  const duplicateBookable = useDuplicateBookable();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency || "USD";
  const dateTimeFormat = (currentOrg?.dateTimeFormat as "12" | "24") || "24";

  const taxCountry = getTaxCountryFromOrgCountry(currentOrg?.country) ?? null;

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

  const watchedValues = form.watch();
  // biome-ignore lint/correctness/useExhaustiveDependencies: watchedValues triggers effect on all field changes
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

  if (!bookable) return null;

  const durationLabel = `${bookable.durationValue} ${durationUnitLabels[bookable.durationUnit as DurationUnit]}`;
  const priceLabel = formatCurrency(Number(bookable.basePrice), currency);
  const collectionName = collections.find((c) => c.id === bookable.collectionId)?.name ?? null;
  const statusLabel = bookable.status === BookableStatus.PUBLISHED ? "Publicado" : bookable.status === BookableStatus.ARCHIVED ? "Archivado" : "Borrador";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="h-1 w-10 rounded-full bg-foreground/20" />
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
            >
              <MoreVerticalIcon className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="rounded-2xl p-1 min-w-52" title="Acciones">
            <ActionItem
              icon={<CopyIcon className="size-4" />}
              label="Duplicar"
              onClick={async () => {
                setActionsOpen(false);
                await duplicateBookable.mutateAsync({ id: bookableId });
              }}
            />
            <ActionItem icon={<LinkIcon className="size-4" />} label="Copiar enlace" disabled />
            <ActionItem icon={<EyeIcon className="size-4" />} label="Vista previa" disabled />
            <ActionItem icon={<ShareIcon className="size-4" />} label="Compartir" disabled />
            <div className="h-px bg-border my-1" />
            <ActionItem
              icon={<Trash2Icon className="size-4 text-destructive" />}
              label="Eliminar"
              className="text-destructive"
              onClick={() => {
                setActionsOpen(false);
                setArchiveConfirmOpen(true);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="flex items-start gap-4 px-5 pt-3 pb-4">
          <BookableImage
            images={bookable.images}
            alt={bookable.title}
            size={80}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[26px] font-bold text-foreground leading-tight truncate">
              {bookable.title || "Sin nombre"}
            </p>
            {collectionName && (
              <p className="text-[14px] text-muted-foreground truncate">
                {collectionName}
              </p>
            )}
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {priceLabel}
              <span className="text-muted-foreground/60"> · {durationLabel}</span>
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-start max-w-lg border-t border-none border-border/40 mb-1">
          {[
            { label: "Precio", value: priceLabel },
            { label: "Duración", value: durationLabel },
            { label: "Estado", value: statusLabel },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 flex items-stretch min-w-[180px]">
              {i > 0 && <div className="w-px bg-border/40 self-stretch" />}
              <div className="flex-1 flex flex-col items-start gap-0.5 px-4 py-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-[16px] font-semibold text-foreground tabular-nums leading-tight">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <Pills
          items={[...BOOKABLE_DETAIL_SECTIONS]}
          value={currentSection}
          onValueChange={(v) => setCurrentSection(v as BookableDetailSectionId)}
          className="overflow-x-auto scrollbar-none px-4 py-3 border-b border-border/40"
        />

        {/* Content */}
        <Form {...form}>
          <form
            id="bookable-form"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className="py-4">
              {currentSection === "booking-setup" && (
                <BookingSetupSection form={form} collections={collections} />
              )}
              {currentSection === "availability" && (
                <AvailabilitySection
                  form={form}
                  timeOptions={timeOptions}
                  dateTimeFormat={dateTimeFormat}
                />
              )}
              {currentSection === "booking-options" && (
                <BookingOptionsSection form={form} />
              )}
              {currentSection === "advance" && (
                <AdvanceSection
                  form={form}
                  availableTaxes={availableTaxes}
                  currency={currency}
                />
              )}
            </div>
          </form>
        </Form>
      </div>

      <Drawer open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DrawerContent>
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground"
              >
                <XIcon className="size-5" />
              </button>
            </DrawerClose>
            <DrawerTitle className="text-[15px] font-semibold">Eliminar servicio</DrawerTitle>
            <div className="size-10" />
          </div>
          <DrawerDescription className="sr-only">Confirmar eliminación</DrawerDescription>
          <div className="px-5 pb-safe-or-6 flex flex-col gap-4">
            <p className="text-sm text-center text-muted-foreground">
              Esta acción eliminará el servicio. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex-1 py-3.5 rounded-2xl border border-border text-[14px] font-medium text-foreground"
                >
                  Cancelar
                </button>
              </DrawerClose>
              <button
                type="button"
                onClick={async () => {
                  await removeBookable.mutateAsync({ id: bookableId });
                  handleCancel();
                }}
                disabled={removeBookable.isPending}
                className="flex-1 py-3.5 rounded-2xl bg-destructive text-destructive-foreground text-[14px] font-semibold transition-opacity disabled:opacity-50"
              >
                {removeBookable.isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
