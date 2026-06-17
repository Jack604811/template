import { startTransition } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBookablesParams } from "./use-bookables-params";

/**
 * Hook to fetch bookables for a collection using suspense
 */
export const useSuspenseBookables = (collectionId: string | null) => {
  const trpc = useTRPC();
  const [{ collectionId: _ignored, ...params }] = useBookablesParams();

  return useSuspenseQuery(
    trpc.bookables.getMany.queryOptions({
      collectionId: collectionId ?? undefined,
      ...params,
    }),
  );
};

/**
 * Hook to fetch a single bookable using suspense
 */
export const useSuspenseBookable = (id: string) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.bookables.getOne.queryOptions({ id }));
};

/**
 * Hook to create a bookable
 */
export const useCreateBookable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookables.create.mutationOptions({
      onSuccess: (data, variables) => {
        toast.success(`Bookable "${data.title}" created`);
        startTransition(() => {
          const collectionIdForQuery = variables.collectionId ?? undefined;
          queryClient.invalidateQueries(
            trpc.bookables.getMany.queryOptions({
              collectionId: collectionIdForQuery,
            }),
          );
          // Invalidate all getMany queries to ensure table updates regardless of active view
          queryClient.invalidateQueries({
            queryKey: [["bookables", "getMany"]],
          });
          // Invalidate collections to update bookableCount counters
          queryClient.invalidateQueries(
            trpc.bookableCollections.getMany.queryOptions(),
          );
          // Invalidate getManyByCollection if collectionId was provided
          if (variables.collectionId) {
            queryClient.invalidateQueries(
              trpc.bookables.getManyByCollection.queryOptions({
                collectionId: variables.collectionId,
              }),
            );
          }
        });
      },
      onError: (error) => {
        toast.error(`Failed to create bookable: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to update a bookable
 */
export const useUpdateBookable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookables.update.mutationOptions({
      onSuccess: (data) => {
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.bookables.getOne.queryOptions({ id: data.id }),
          );
          queryClient.invalidateQueries({
            queryKey: [["bookables", "getMany"]],
          });
        });
      },
      onError: (error) => {
        toast.error(`Failed to update bookable: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to remove a bookable
 */
export const useRemoveBookable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookables.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Bookable removed");
        startTransition(() => {
          queryClient.invalidateQueries({
            queryKey: [["bookables", "getMany"]],
          });
          queryClient.invalidateQueries({
            queryKey: [["bookables", "getManyByCollection"]],
          });
          queryClient.invalidateQueries(
            trpc.bookableCollections.getMany.queryOptions(),
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to remove bookable: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to duplicate a bookable
 */
export const useDuplicateBookable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.bookables.duplicate.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Bookable "${data.title}" duplicated`);
        // Update cache directly to prevent item from disappearing
        // Find and replace optimistic duplicate (with temp ID) with real data
        // This MUST happen before any query invalidation to prevent flicker
        queryClient.setQueriesData(
          { queryKey: [["bookables", "getMany"]] },
          (oldData: unknown) => {
            if (
              !oldData ||
              typeof oldData !== "object" ||
              !("items" in oldData) ||
              !Array.isArray((oldData as { items: unknown }).items)
            ) {
              return oldData;
            }
            
            const typedData = oldData as {
              items: Array<{ id: string; title: string | null }>;
              totalCount: number;
              page: number;
              pageSize: number;
              totalPages: number;
              hasNextPage: boolean;
              hasPreviousPage: boolean;
            };
            
            // Find optimistic duplicate with matching title and temp ID
            const optimisticIndex = typedData.items.findIndex(
              (item) => item.title === data.title && item.id.startsWith("temp-"),
            );
            
            if (optimisticIndex >= 0) {
              // Replace optimistic item with real data, maintaining position
              const updated = { ...typedData };
              updated.items = [...typedData.items];
              updated.items[optimisticIndex] = data as typeof typedData.items[number];
              return updated;
            }
            
            // Check if real item already exists
            if (typedData.items.some((item) => item.id === data.id)) {
              return typedData;
            }
            
            // Add new item at the beginning to match sort order (updatedAt: "desc")
            // The duplicate has a fresh updatedAt, so it should appear first
            return {
              ...typedData,
              items: [data as typeof typedData.items[number], ...typedData.items],
              totalCount: typedData.totalCount + 1,
            };
          },
        );
        
        // Only invalidate collections to update bookableCount
        // Don't invalidate bookables queries - cache update above is sufficient
        startTransition(() => {
          queryClient.invalidateQueries(
            trpc.bookableCollections.getMany.queryOptions(),
          );
        });
      },
      onError: (error) => {
        toast.error(`Failed to duplicate bookable: ${error.message}`);
      },
    }),
  );
};

