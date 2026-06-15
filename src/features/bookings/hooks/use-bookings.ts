import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { startTransition } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { dedupeSuccessToast } from "../utils/toast-dedupe";
import { useBookingsParams } from "./use-bookings-params";

export const useSuspenseBookings = () => {
  const trpc = useTRPC();
  const [params] = useBookingsParams();
  return useSuspenseQuery(
    trpc.bookings.getMany.queryOptions({
      ...params,
      startDate: params.startDate ?? undefined,
      endDate: params.endDate ?? undefined,
    }),
  );
};

export const useSuspenseBooking = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.bookings.getOne.queryOptions({ id }));
};

export const useCreateBooking = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.bookings.create.mutationOptions({
      // No onMutate — optimistic updates handled in components via queryClient.setQueryData
      onError: (error) => {
        toast.error("Failed to create booking", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
      onSuccess: (data) => {
        const name =
          (data as { customer?: { name: string } | null }).customer?.name ??
          "Booking";
        dedupeSuccessToast(
          `booking-created-${(data as { id: string }).id}`,
          () => {
            toast.success(`${name} created`, {
              description: format(new Date(data.startTime), "MMM d, yyyy"),
            });
          },
        );
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};

export const useUpdateBooking = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.bookings.update.mutationOptions({
      // No onMutate — optimistic updates handled in components via queryClient.setQueryData
      onError: (error) => {
        toast.error("Failed to update booking", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
      onSuccess: (data) => {
        const name =
          (data as { customer?: { name: string } | null }).customer?.name ??
          "Booking";
        dedupeSuccessToast(
          `booking-updated-${(data as { id: string }).id}`,
          () => {
            toast.success(`${name} updated`, {
              description: format(new Date(data.startTime), "MMM d, yyyy"),
            });
          },
        );
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
    }),
  );
};

export const useRemoveBooking = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.bookings.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Booking removed");
        startTransition(() => {
          queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        });
      },
      onError: (error) => {
        toast.error("Failed to remove booking", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
    }),
  );
};
