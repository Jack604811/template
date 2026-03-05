import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startTransition } from "react";

/**
 * Hook to create a payment with optimistic updates
 */
export const useCreatePayment = (bookingId: string) => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookings.createPayment.mutationOptions({
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to create payment", {
          description: errorMessage,
        });
        // Revert optimistic update by invalidating
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getOne.queryOptions({ id: bookingId }));
        });
      },
      onSuccess: (data) => {
        toast.success("Payment recorded");
        // Replace optimistic payment (with temp ID) with real data
        queryClient.setQueryData(
          trpc.bookings.getOne.queryOptions({ id: bookingId }).queryKey,
          (oldData) => {
            if (!oldData) return oldData;

            // Find optimistic payment with temp ID
            const optimisticIndex = oldData.payments.findIndex((p) => p.id.toString().startsWith("temp-"));
            if (optimisticIndex >= 0) {
              // Replace optimistic payment with real data
              const updated = { ...oldData };
              updated.payments = [...oldData.payments];
              updated.payments[optimisticIndex] = data;
              return updated;
            }

            // Check if payment already exists
            if (oldData.payments.some((p) => p.id === data.id)) {
              return oldData;
            }

            // Add new payment if not found
            return {
              ...oldData,
              payments: [...oldData.payments, data],
            };
          },
        );

        // Invalidate related queries
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};

/**
 * Hook to update a payment with optimistic updates
 */
export const useUpdatePayment = (bookingId: string) => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookings.updatePayment.mutationOptions({
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to update payment", {
          description: errorMessage,
        });
        // Revert optimistic update by invalidating
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getOne.queryOptions({ id: bookingId }));
        });
      },
      onSuccess: (data) => {
        toast.success("Payment updated");
        // Update payment in cache
        queryClient.setQueryData(
          trpc.bookings.getOne.queryOptions({ id: bookingId }).queryKey,
          (oldData) => {
            if (!oldData) return oldData;

            const paymentIndex = oldData.payments.findIndex((p) => p.id === data.id);
            if (paymentIndex >= 0) {
              const updated = { ...oldData };
              updated.payments = [...oldData.payments];
              updated.payments[paymentIndex] = data;
              return updated;
            }

            return oldData;
          },
        );

        // Invalidate related queries
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};

/**
 * Hook to remove a payment with optimistic updates
 */
export const useRemovePayment = (bookingId: string) => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookings.removePayment.mutationOptions({
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to remove payment", {
          description: errorMessage,
        });
        // Revert optimistic update by invalidating
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getOne.queryOptions({ id: bookingId }));
        });
      },
      onSuccess: () => {
        toast.success("Payment removed");
        // Invalidate to refresh data
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getOne.queryOptions({ id: bookingId }));
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};
