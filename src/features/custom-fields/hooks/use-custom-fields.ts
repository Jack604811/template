import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

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
        // Get the exact query key from queryOptions
        const queryOptions = trpc.customFields.getMany.queryOptions();
        const queryKey = queryOptions.queryKey;
        
        // Replace temp item with real data in cache - preserve ALL fields
        queryClient.setQueryData(
          queryKey,
          (oldData: unknown) => {
            if (!oldData || !Array.isArray(oldData)) {
              return [data];
            }
            
            // Find optimistic item with matching name and temp ID
            const optimisticIndex = oldData.findIndex(
              (field: { name: string; id: string }) => field.name === data.name && field.id.startsWith("temp-"),
            );
            
            if (optimisticIndex >= 0) {
              // Replace optimistic item with real data - preserve all other fields
              const updated = [...oldData];
              updated[optimisticIndex] = data;
              return updated;
            }
            
            // Check if real item already exists (shouldn't happen, but be safe)
            if (oldData.some((field: { id: string }) => field.id === data.id)) {
              return oldData;
            }
            
            // If no optimistic item found, add at end (shouldn't happen, but be safe)
            // Preserve all existing fields
            return [...oldData, data];
          },
        );
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
      onSuccess: (data) => {
        // Get the exact query key from queryOptions
        const queryOptions = trpc.customFields.getMany.queryOptions();
        const queryKey = queryOptions.queryKey;
        
        // Update cache with real data - preserve ALL fields
        queryClient.setQueryData(
          queryKey,
          (oldData: unknown): typeof data[] | undefined => {
            if (!oldData || !Array.isArray(oldData)) {
              return oldData as typeof data[] | undefined;
            }
            // Update only the target field, preserve all others including temp items
            return oldData.map((field: { id: string }) => (field.id === data.id ? data : field)) as typeof data[];
          },
        );
      },
    }),
  );
};

/**
 * Hook to remove a custom field
 */
export const useRemoveCustomField = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.customFields.remove.mutationOptions({}),
  );
};

/**
 * Hook to reorder custom fields
 */
export const useReorderCustomFields = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.customFields.reorder.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.customFields.getMany.queryOptions().queryKey }),
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
      onSuccess: (data) => {
        // Get the exact query key from queryOptions
        const queryOptions = trpc.customFields.getMany.queryOptions();
        const queryKey = queryOptions.queryKey;
        
        // Update cache with real data - preserve ALL fields
        queryClient.setQueryData(
          queryKey,
          (oldData: unknown): typeof data[] | undefined => {
            if (!oldData || !Array.isArray(oldData)) {
              return oldData as typeof data[] | undefined;
            }
            // Update only the target field, preserve all others including temp items
            return oldData.map((field: { id: string }) => (field.id === data.id ? data : field)) as typeof data[];
          },
        );
      },
    }),
  );
};
