"use client";

import { memo, useEffect, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { SelectedCollectionContext, NewItemHandlerContext } from "./bookables";
import { EntityList, EntityItem, EmptyView, type EntityMenuItem } from "@/components/entity-components";
import { useSuspenseBookables, useDuplicateBookable, useRemoveBookable } from "../hooks/use-bookables";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format-utils";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { CopyIcon, TrashIcon } from "lucide-react";
import { formatDuration, getStatusColor, getStatusLabel } from "../lib/utils";
import { BookableImage } from "./bookable-image";
import type { BookableWithRelations } from "../types";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useBookablesParams } from "../hooks/use-bookables-params";

export const BookablesTable = memo(() => {
  const router = useRouter();
  const collectionContext = useContext(SelectedCollectionContext);
  const newItemContext = useContext(NewItemHandlerContext);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [params] = useBookablesParams();
  
  if (!collectionContext) {
    throw new Error("BookablesTable must be used within SelectedCollectionContext");
  }
  
  const { selectedCollectionId } = collectionContext;
  const bookables = useSuspenseBookables(selectedCollectionId);
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency || "USD";
  
  const duplicateBookable = useDuplicateBookable();
  const removeBookable = useRemoveBookable();

  const handleNewItem = useCallback(() => {
    const url = selectedCollectionId 
      ? `/catalog/new?collectionId=${selectedCollectionId}`
      : "/catalog/new";
    router.push(url);
  }, [router, selectedCollectionId]);

  // Expose handler to parent via context
  useEffect(() => {
    if (newItemContext) {
      newItemContext.setHandler(handleNewItem);
    }
  }, [newItemContext, handleNewItem]);

  const handleItemClick = useCallback((bookableId: string) => {
    router.push(`/catalog/${bookableId}`);
  }, [router]);

  const handleDuplicate = useCallback(async (bookableId: string) => {
    // Find the bookable to duplicate
    const baseItems = bookables.data.items as BookableWithRelations[];
    const originalBookable = baseItems.find((b) => b.id === bookableId);
    
    if (!originalBookable) return;
    
    const tempId = `temp-${Date.now()}`;
    const optimisticDuplicate = {
      ...originalBookable,
      id: tempId,
      title: `${originalBookable.title} Copy`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Update cache IMMEDIATELY with optimistic duplicate
    // This ensures it's part of base data from the start
    const queryOptions = trpc.bookables.getMany.queryOptions({
      collectionId: selectedCollectionId ?? undefined,
      ...params,
    });
    
    queryClient.setQueryData(
      queryOptions.queryKey,
      (oldData: typeof bookables.data | undefined) => {
        if (!oldData) {
          const newData: typeof bookables.data = {
            items: [optimisticDuplicate as typeof bookables.data.items[number]],
            page: 1,
            pageSize: params.pageSize,
            totalCount: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          };
          return newData;
        }
        // Insert at the beginning to match sort order (updatedAt: "desc")
        // The duplicate has a fresh updatedAt, so it should appear first
        return {
          ...oldData,
          items: [optimisticDuplicate as typeof oldData.items[number], ...oldData.items],
          totalCount: oldData.totalCount + 1,
        };
      },
    );
    
    // Perform actual duplicate - mutation hook will replace temp ID with real ID
    try {
      await duplicateBookable.mutateAsync({ id: bookableId });
    } catch {
      // On error, remove optimistic item from cache
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof bookables.data | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.filter((item) => item.id !== tempId),
            totalCount: Math.max(0, oldData.totalCount - 1),
          };
        },
      );
    }
  }, [duplicateBookable, selectedCollectionId, params, trpc, queryClient, bookables.data]);

  const handleDelete = useCallback(async (bookableId: string) => {
    // Update cache optimistically - remove immediately
    const queryOptions = trpc.bookables.getMany.queryOptions({
      collectionId: selectedCollectionId ?? undefined,
      ...params,
    });
    
    queryClient.setQueryData(
      queryOptions.queryKey,
      (oldData: typeof bookables.data | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((item) => item.id !== bookableId),
          totalCount: Math.max(0, oldData.totalCount - 1),
        };
      },
    );
    
    // Perform actual delete
    try {
      await removeBookable.mutateAsync({ id: bookableId });
    } catch {
      // On error, revert optimistic update by invalidating
      queryClient.invalidateQueries(queryOptions);
    }
  }, [removeBookable, selectedCollectionId, params, trpc, queryClient]);

  const items = bookables.data.items as BookableWithRelations[];

  return (
    // biome-ignore lint/complexity/noUselessFragments: <explanation>
    <>
      <EntityList
        items={items}
        getKey={(bookable) => bookable.id}
        renderItem={(bookable) => {
          const menuItems: EntityMenuItem[] = [
            {
              icon: CopyIcon,
              label: "Duplicate",
              onClick: () => handleDuplicate(bookable.id),
            },
            {
              icon: TrashIcon,
              label: "Delete",
              onClick: () => handleDelete(bookable.id),
              variant: "destructive",
            },
          ];

          return (
            // biome-ignore lint/a11y/useSemanticElements: Cannot use button here due to nested buttons in EntityItem
            <div
              onClick={(e) => {
                // Don't trigger if clicking on menu or other interactive elements
                const target = e.target as HTMLElement;
                if (target.closest("button") || target.closest("[role='menu']") || target.closest("[role='menuitem']")) {
                  return;
                }
                handleItemClick(bookable.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleItemClick(bookable.id);
                }
              }}
              role="button"
              tabIndex={0}
              className="cursor-pointer"
            >
              <EntityItem
                title={
                  <div className="flex items-center gap-2">
                    <span>{bookable.title}</span>
                    <Badge variant="secondary" className={getStatusColor(bookable.status)}>
                      {getStatusLabel(bookable.status)}
                    </Badge>
                  </div>
                }
                subtitle={
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatCurrency(bookable.basePrice, currency)}</span>
                    <span>{formatDuration(bookable.durationValue, bookable.durationUnit)}</span>
                  </div>
                }
                image={<BookableImage images={bookable.images} alt={bookable.title} />}
                menuItems={menuItems}
                onRemove={() => handleDelete(bookable.id)}
              />
            </div>
          );
        }}
        emptyView={
          <EmptyView
            message="No bookables yet. Create one to get started."
            onNew={handleNewItem}
          />
        }
      />
    </>
  );
});

BookablesTable.displayName = "BookablesTable";
