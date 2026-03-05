import { useQueryClient } from "@tanstack/react-query";
import { startTransition } from "react";
import { useTRPC } from "@/trpc/client";

/**
 * Hook to invalidate booking queries after mutations.
 * Wraps invalidation in startTransition for non-blocking updates.
 */
export function useBookingInvalidation() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const invalidateBooking = (bookingId: string) => {
    startTransition(() => {
      queryClient.invalidateQueries(trpc.bookings.getOne.queryOptions({ id: bookingId }));
    });
  };

  const invalidateBookings = () => {
    startTransition(() => {
      queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
    });
  };

  return {
    invalidateBooking,
    invalidateBookings,
  };
}
