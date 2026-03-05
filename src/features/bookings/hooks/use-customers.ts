import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startTransition } from "react";
import { dedupeSuccessToast } from "../utils/toast-dedupe";

/**
 * Hook to find or create a customer
 */
export const useFindOrCreateCustomer = () => {
  const trpc = useTRPC();

  return useMutation(trpc.customers.findOrCreate.mutationOptions());
};

/**
 * Hook to update a customer
 */
export const useUpdateCustomer = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.customers.update.mutationOptions({
      onSuccess: () => {
        dedupeSuccessToast("customer-updated", () => {
          toast.success("Customer updated");
        });
        // Invalidate bookings query to refresh customer data
        startTransition(() => {
          queryClient.invalidateQueries({
            queryKey: [["bookings"]],
          });
        });
      },
      onError: (error) => {
        toast.error(`Failed to update customer: ${error.message}`);
      },
    }),
  );
};
