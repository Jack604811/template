import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { startTransition } from "react";
import { useBookingsParams } from "./use-bookings-params";
import { dedupeSuccessToast } from "../utils/toast-dedupe";

/**
 * Hook to fetch all bookings using suspense
 */
export const useSuspenseBookings = () => {
  const trpc = useTRPC();
  const [params] = useBookingsParams();

  return useSuspenseQuery(trpc.bookings.getMany.queryOptions(params));
};

/**
 * Hook to create a new booking
 */
export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookings.create.mutationOptions({
      // No onMutate - optimistic updates use React Query cache in components (see docs/OPTIMISTIC_UPDATES.md)
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to create booking", {
          description: errorMessage,
        });
        // Component reverts by invalidating on catch if it updated cache
      },
      onSuccess: (data) => {
        const customerName = (data as { customer?: { name: string } | null }).customer?.name || "Booking";
        const startDate = new Date(data.startTime);
        dedupeSuccessToast(`booking-created-${(data as { id: string }).id}`, () => {
          toast.success(`${customerName} created`, {
            description: format(startDate, "MMM d, yyyy"),
          });
        });
        // Use startTransition to make query invalidation non-blocking
        // This prevents blocking the optimistic update render
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};

/**
 * Hook to remove a booking
 */
export const useRemoveBooking = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.bookings.remove.mutationOptions({
      onSuccess: () => {
        toast.success(`Booking removed`);
        // Use startTransition to make query invalidation non-blocking
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to remove booking", {
          description: errorMessage,
        });
      },
    }),
  );
};

/**
 * Hook to fetch a single booking using suspense
 */
export const useSuspenseBooking = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.bookings.getOne.queryOptions({ id }));
};

/**
 * Hook to update a booking
 */
export const useUpdateBooking = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookings.update.mutationOptions({
      // No onMutate - optimistic updates are done in the component via queryClient.setQueryData (see docs/OPTIMISTIC_UPDATES.md)
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to update booking", {
          description: errorMessage,
        });
        // Component reverts optimistic update by invalidating on catch
      },
      onSuccess: (data) => {
        const customerName = (data as { customer?: { name: string } | null }).customer?.name || "Booking";
        const startDate = new Date(data.startTime);
        dedupeSuccessToast(`booking-updated-${(data as { id: string }).id}`, () => {
          toast.success(`${customerName} updated`, {
            description: format(startDate, "MMM d, yyyy"),
          });
        });
        // Use startTransition to make query invalidation non-blocking
        // This prevents blocking the optimistic update render
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};

