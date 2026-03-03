import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook to fetch all organization custom fields using suspense
 */
export const useSuspenseCustomFields = () => {
  const trpc = useTRPC();

  return useSuspenseQuery(
    trpc.customFields.getMany.queryOptions(),
  );
};

/**
 * Hook to create a custom field
 */
export const useCreateCustomField = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.customFields.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Custom field "${data.name}" created`);
        queryClient.invalidateQueries(
          trpc.customFields.getMany.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create field: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to update a custom field
 */
export const useUpdateCustomField = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.customFields.update.mutationOptions({
      onSuccess: () => {
        toast.success("Custom field updated");
        queryClient.invalidateQueries(
          trpc.customFields.getMany.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update field: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to remove a custom field
 */
export const useRemoveCustomField = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.customFields.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Custom field removed");
        queryClient.invalidateQueries(
          trpc.customFields.getMany.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to remove field: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to reorder custom fields
 */
export const useReorderCustomFields = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.customFields.reorder.mutationOptions({
      onSuccess: () => {
        toast.success("Fields reordered");
        queryClient.invalidateQueries(
          trpc.customFields.getMany.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to reorder fields: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to toggle custom field enabled state
 */
export const useToggleCustomField = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.customFields.toggleEnabled.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.customFields.getMany.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to toggle field: ${error.message}`);
      },
    }),
  );
};

