"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useSuspenseBookables } from "@/features/bookables/hooks/use-bookables";
import { getTaxCountryFromOrgCountry } from "@/features/bookables/lib/form-utils";
import { generateSlotsForDate } from "@/features/bookables/lib/timeslot-generator";
import { buildSlotConfig } from "@/features/bookings/utils/slot-config";
import { BookingHeader } from "@/features/bookings/components/booking-header";
import { BookingInfoCard } from "@/features/bookings/components/booking-info-card";
import { CheckoutCard } from "@/features/bookings/components/checkout-card";
import { CustomerDetailsCard } from "@/features/bookings/components/customer-details-card";
import { PaymentsCard } from "@/features/bookings/components/payments-card";
import { TimelineCard } from "@/features/bookings/components/timeline-card";
import { useBookingInvalidation } from "@/features/bookings/hooks/use-booking-invalidation";
import { useBookingRealtime } from "@/features/bookings/hooks/use-booking-realtime";
import {
  useSuspenseBooking,
  useUpdateBooking,
} from "@/features/bookings/hooks/use-bookings";
import { useUpdateCustomer } from "@/features/bookings/hooks/use-customers";
import type { Payment } from "@/features/bookings/types";
import {
  computeBookableTax,
  getBookableTaxLabel,
} from "@/features/bookings/utils/compute-bookable-tax";
import { addDurationToDate } from "@/features/bookings/utils/format-booking-duration";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { useDebounce } from "@/hooks/use-debounce";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";
import { useTRPC } from "@/trpc/client";

interface BookingDetailsPageProps {
  bookingId: string;
}

export const BookingDetailsPage = ({ bookingId }: BookingDetailsPageProps) => {
  const { handleCancel } = useDetailPageNavigation("/calendar");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: booking } = useSuspenseBooking(bookingId);
  const updateBooking = useUpdateBooking();
  const updateCustomer = useUpdateCustomer();
  const allBookablesQuery = useSuspenseBookables(null);
  const allBookables = allBookablesQuery.data.items;
  const { invalidateBooking } = useBookingInvalidation();
  const currentOrg = useCurrentOrganizationWithSettings();
  const taxCountry = getTaxCountryFromOrgCountry(currentOrg?.country) ?? null;

  // Subscribe to real-time booking updates
  useBookingRealtime(bookingId);

  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Derive custom fields from booking (already Records from server)
  const bookingCustomFields = useMemo(() => {
    if (
      !booking?.customFields ||
      typeof booking.customFields !== "object" ||
      Array.isArray(booking.customFields) ||
      booking.customFields === null
    ) {
      return undefined;
    }
    return booking.customFields as Record<string, unknown>;
  }, [booking?.customFields]);

  const customerCustomFields = useMemo(() => {
    if (
      !booking?.customer?.customFields ||
      typeof booking.customer.customFields !== "object" ||
      Array.isArray(booking.customer.customFields) ||
      booking.customer.customFields === null
    ) {
      return undefined;
    }
    return booking.customer.customFields as Record<string, unknown>;
  }, [booking?.customer?.customFields]);

  // Derive values from booking (React Query cache; updated optimistically on bookable change)
  const basePrice = booking?.basePrice ?? 0;
  const upsellsTotal = booking?.upsellsTotal ?? 0;

  // Derive payments from booking data for CheckoutCard
  const payments = useMemo<Payment[]>(() => {
    if (!booking?.payments) return [];
    return booking.payments.map((p) => ({
      id: p.id,
      method: p.method || "Cash",
      amount: p.amount,
      date: p.date
        ? new Date(p.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : new Date().toLocaleDateString(),
      status: (p.status === "completed"
        ? "completed"
        : "pending") as Payment["status"],
      type: "Payment",
    }));
  }, [booking?.payments]);

  const handleBookableChange = useCallback(
    async (bookableId: string) => {
      if (!booking?.id) return;
      const selectedBookable = allBookables.find((b) => b.id === bookableId);
      if (!selectedBookable) return;

      const baseDate =
        booking.startTime != null ? new Date(booking.startTime) : new Date();
      const slots = generateSlotsForDate(
        buildSlotConfig(selectedBookable),
        baseDate,
      );
      const firstSlot = slots[0];
      const startTime = firstSlot != null ? firstSlot.start : baseDate;
      const newEndTime =
        firstSlot != null
          ? firstSlot.end
          : addDurationToDate(
              baseDate,
              selectedBookable.durationValue,
              selectedBookable.durationUnit,
            );

      const newBasePrice = selectedBookable.basePrice || 0;
      const subtotal = newBasePrice + upsellsTotal;
      const newTax = computeBookableTax(selectedBookable, subtotal);
      const newTotal = subtotal + newTax - (booking.discount || 0);

      const queryOptions = trpc.bookings.getOne.queryOptions({
        id: booking.id,
      });
      // Update cache immediately so UI shows new bookable, amounts, and end time (Pattern 1: React Query cache)
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof booking | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            bookable: selectedBookable,
            basePrice: newBasePrice,
            tax: newTax,
            total: newTotal,
            startTime,
            endTime: newEndTime,
          };
        },
      );

      try {
        await updateBooking.mutateAsync({
          id: booking.id,
          bookableId: selectedBookable.id,
          basePrice: newBasePrice,
          serviceFee: 0,
          tax: newTax,
          total: newTotal,
          startTime,
          endTime: newEndTime,
        });
        invalidateBooking(booking.id);
      } catch {
        // Revert optimistic update by invalidating
        queryClient.invalidateQueries(queryOptions);
        // Error handling is done by the mutation hook (toast notification)
      }
    },
    [
      booking,
      allBookables,
      upsellsTotal,
      updateBooking,
      invalidateBooking,
      trpc,
      queryClient,
    ],
  );

  const handleStatusChange = useCallback(
    async (
      newStatus:
        | "pending"
        | "approved"
        | "in_progress"
        | "canceled"
        | "completed",
    ) => {
      if (!booking?.id) return;

      const queryOptions = trpc.bookings.getOne.queryOptions({
        id: booking.id,
      });
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof booking | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, status: newStatus };
        },
      );

      try {
        await updateBooking.mutateAsync({
          id: booking.id,
          status: newStatus,
        });
        invalidateBooking(booking.id);
      } catch {
        queryClient.invalidateQueries(queryOptions);
      }
    },
    [booking?.id, updateBooking, invalidateBooking, trpc, queryClient],
  );

  const handleDateTimeChange = useCallback(
    async (newStartTime: Date, newEndTime: Date) => {
      if (
        !booking?.id ||
        !(
          newStartTime instanceof Date && !Number.isNaN(newStartTime.getTime())
        ) ||
        !(newEndTime instanceof Date && !Number.isNaN(newEndTime.getTime()))
      ) {
        return;
      }

      const queryOptions = trpc.bookings.getOne.queryOptions({
        id: booking.id,
      });
      // Update cache immediately so UI shows new dates (Pattern 1: docs/OPTIMISTIC_UPDATES.md)
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof booking | undefined) => {
          if (!oldData) return oldData;
          return { ...oldData, startTime: newStartTime, endTime: newEndTime };
        },
      );

      try {
        await updateBooking.mutateAsync({
          id: booking.id,
          startTime: newStartTime,
          endTime: newEndTime,
        });
        invalidateBooking(booking.id);
      } catch {
        queryClient.invalidateQueries(queryOptions);
      }
    },
    [booking?.id, updateBooking, invalidateBooking, trpc, queryClient],
  );

  const handleCustomFieldsChange = useCallback(
    async (newCustomFields: Record<string, string>) => {
      if (!booking?.id) return;

      try {
        await updateBooking.mutateAsync({
          id: booking.id,
          customFields: newCustomFields,
        });
        invalidateBooking(booking.id);
      } catch {
        // Error handling is done by the mutation hook (toast notification)
      }
    },
    [booking?.id, updateBooking, invalidateBooking],
  );

  const debouncedNotesChange = useDebounce((newNotes: string) => {
    if (!booking?.id) return;
    const trimmedNotes = newNotes.trim();
    updateBooking.mutate(
      {
        id: booking.id,
        notes: trimmedNotes || undefined,
      },
      {
        onSuccess: () => {
          invalidateBooking(booking.id);
        },
      },
    );
  }, 500);

  const handleNotesChange = useCallback(
    (newNotes: string) => {
      debouncedNotesChange(newNotes);
    },
    [debouncedNotesChange],
  );

  const debouncedCustomerChange = useDebounce(
    (field: string, value: string) => {
      if (!booking?.customer?.id) return;
      updateCustomer.mutate(
        {
          id: booking.customer.id,
          [field]: value || null,
        },
        {
          onSuccess: () => {
            invalidateBooking(booking.id);
          },
        },
      );
    },
    500,
  );

  const handleCustomerChange = useCallback(
    (field: string, value: string) => {
      debouncedCustomerChange(field, value);
    },
    [debouncedCustomerChange],
  );

  const handleCustomerCustomFieldsChange = useCallback(
    async (customFields: Record<string, string>) => {
      if (!booking?.customer?.id) return;

      try {
        await updateCustomer.mutateAsync({
          id: booking.customer.id,
          customFields,
        });
        invalidateBooking(booking.id);
      } catch {
        // Error handling is done by the mutation hook (toast notification)
      }
    },
    [booking?.customer?.id, booking?.id, updateCustomer, invalidateBooking],
  );

  const handleSave = useCallback(async () => {
    if (!booking?.id) return;

    // Trigger a refresh to ensure all pending changes are saved
    // Since we use auto-save, this mainly provides visual feedback
    invalidateBooking(booking.id);
  }, [booking?.id, invalidateBooking]);

  // Validate booking data exists (after all hooks)
  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Booking Not Found</h2>
          <p className="text-muted-foreground">
            The booking you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BookingHeader
        bookingId={bookingId}
        status={booking.status}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={updateBooking.isPending}
        baseRoute="/calendar"
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mx-auto">
            <div className="lg:col-span-7 space-y-6">
              {booking.bookable && booking.startTime && booking.endTime && (
                <BookingInfoCard
                  bookable={booking.bookable}
                  bookingId={booking.id}
                  status={
                    (booking.status as
                      | "pending"
                      | "approved"
                      | "in_progress"
                      | "canceled"
                      | "completed") ?? "pending"
                  }
                  startTime={new Date(booking.startTime)}
                  endTime={new Date(booking.endTime)}
                  customFields={bookingCustomFields}
                  notes={booking.notes || undefined}
                  onBookableChange={handleBookableChange}
                  onStatusChange={handleStatusChange}
                  onDateTimeChange={handleDateTimeChange}
                  onCustomFieldsChange={handleCustomFieldsChange}
                  onNotesChange={handleNotesChange}
                />
              )}
              <TimelineCard className="hidden lg:block" />
            </div>

            <div className="lg:col-span-5 space-y-6">
              {booking.customer && (
                <CustomerDetailsCard
                  customer={{
                    id: booking.customer.id,
                    name: booking.customer.name,
                    email: booking.customer.email,
                    phone: booking.customer.phone,
                    streetAddress: booking.customer.streetAddress,
                    cityCountry: booking.customer.cityCountry,
                    customFields: customerCustomFields,
                  }}
                  bookingCount={booking.customer.bookingCount || 0}
                  onCustomerChange={handleCustomerChange}
                  onCustomerCustomFieldsChange={
                    handleCustomerCustomFieldsChange
                  }
                />
              )}
              <CheckoutCard
                basePrice={basePrice}
                upsellsTotal={upsellsTotal}
                tax={booking.tax ?? 0}
                taxLabel={
                  booking.bookable
                    ? getBookableTaxLabel(booking.bookable, taxCountry)
                    : undefined
                }
                discount={booking.discount ?? 0}
                total={booking.total ?? 0}
                payments={payments}
                bookable={booking.bookable?.title || ""}
                onRecordPayment={() => {
                  setEditingPayment(null);
                  setRecordPaymentDialogOpen(true);
                }}
                onEditPayment={(payment) => {
                  setEditingPayment(payment);
                  setRecordPaymentDialogOpen(true);
                }}
              />
              <PaymentsCard
                bookingId={bookingId}
                dialogOpen={recordPaymentDialogOpen}
                onDialogOpenChange={(open) => {
                  setRecordPaymentDialogOpen(open);
                  if (!open) setEditingPayment(null);
                }}
                editingPaymentWhenOpened={
                  recordPaymentDialogOpen
                    ? (editingPayment ?? undefined)
                    : undefined
                }
              />
            </div>

            <div className="lg:hidden lg:col-span-7">
              <TimelineCard />
            </div>
          </div>
        </div>
      </main>
    </>
  );
};
