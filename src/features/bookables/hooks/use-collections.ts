import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { startTransition } from "react";
import { toast } from "sonner";

/**
 * Hook to fetch all collections using suspense
 */
export const useSuspenseCollections = () => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.bookableCollections.getMany.queryOptions());
};

/**
 * Hook to fetch a single collection using suspense
 */
export const useSuspenseCollection = (id: string) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.bookableCollections.getOne.queryOptions({ id }));
};

/**
 * Hook to create a new collection
 */
export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookableCollections.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Collection "${data.name}" created`);
        // Replace optimistic item (with temp ID) with real data
        const queryOptions = trpc.bookableCollections.getMany.queryOptions();
        queryClient.setQueryData(
          queryOptions.queryKey,
          (oldData: unknown) => {
            if (!oldData || !Array.isArray(oldData)) {
              return [{ ...data, bookableCount: 0 }];
            }
            
            // Find and replace optimistic item (temp ID) with real data
            const optimisticIndex = oldData.findIndex(
              (item: { name: string; id: string }) => item.name === data.name && item.id.startsWith("temp-"),
            );
            
            if (optimisticIndex >= 0) {
              // Replace optimistic item with real data, maintaining position
              const updated = [...oldData];
              updated[optimisticIndex] = { ...data, bookableCount: 0 };
              return updated;
            }
            
            // If no optimistic item found, check if real item exists
            if (oldData.some((item: { id: string }) => item.id === data.id)) {
              return oldData;
            }
            
            // Add new item at the end
            return [...oldData, { ...data, bookableCount: 0 }];
          },
        );
      },
      onError: (error) => {
        toast.error(`Failed to create collection: ${error.message}`);
        // The optimistic update will be reverted when query refetches
      },
    }),
  );
};

/**
 * Hook to update a collection
 */
export const useUpdateCollection = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookableCollections.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Collection "${data.name}" updated`);
        // Use startTransition to make query invalidation non-blocking
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.bookableCollections.getMany.queryOptions(),
          );
          queryClient.invalidateQueries(
            trpc.bookableCollections.getOne.queryOptions({ id: data.id }),
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to update collection: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to remove a collection
 */
export const useRemoveCollection = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookableCollections.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Collection removed");
        // Use startTransition to make query invalidation non-blocking
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.bookableCollections.getMany.queryOptions(),
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to remove collection: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to duplicate a collection
 */
export const useDuplicateCollection = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookableCollections.duplicate.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Collection "${data.name}" duplicated`);
        // Update cache directly to prevent item from disappearing
        // Find and replace optimistic duplicate (with temp ID) with real data
        const queryOptions = trpc.bookableCollections.getMany.queryOptions();
        queryClient.setQueryData(
          queryOptions.queryKey,
          (oldData: unknown) => {
            if (!oldData || !Array.isArray(oldData)) {
              return [{ ...data, bookableCount: 0 }];
            }
            
            // Find optimistic duplicate with matching name and temp ID
            const optimisticIndex = oldData.findIndex(
              (item: { name: string; id: string }) => item.name === data.name && item.id.startsWith("temp-"),
            );
            
            if (optimisticIndex >= 0) {
              // Replace optimistic item with real data
              const updated = [...oldData];
              updated[optimisticIndex] = { ...data, bookableCount: 0 };
              return updated;
            }
            
            // Check if real item already exists
            if (oldData.some((item: { id: string }) => item.id === data.id)) {
              return oldData;
            }
            
            // Add new item at the beginning to match sort order (updatedAt: "desc")
            return [{ ...data, bookableCount: 0 }, ...oldData];
          },
        );
      },
      onError: (error) => {
        toast.error(`Failed to duplicate collection: ${error.message}`);
      },
    }),
  );
};

