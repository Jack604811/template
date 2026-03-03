"use client";

import { memo, useState, useContext, useMemo, useCallback } from "react";
import { Folder, Plus, MoreVertical, Copy, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { SelectedCollectionContext } from "./bookables";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSuspenseCollections } from "../hooks/use-collections";
import {
  useCreateCollection,
  useUpdateCollection,
  useRemoveCollection,
  useDuplicateCollection,
} from "../hooks/use-collections";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";

interface BookablesSidebarProps {
  className?: string;
}

export const BookablesSidebar = memo(({ className }: BookablesSidebarProps) => {
  const collectionContext = useContext(SelectedCollectionContext);
  if (!collectionContext) {
    throw new Error("BookablesSidebar must be used within SelectedCollectionContext");
  }
  const { selectedCollectionId, setSelectedCollectionId } = collectionContext;

  const collectionsQuery = useSuspenseCollections();
  const baseCollections: typeof collectionsQuery.data = collectionsQuery.data;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [hoveredCollectionId, setHoveredCollectionId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const removeCollection = useRemoveCollection();
  const duplicateCollection = useDuplicateCollection();

  /**
   * Fetch total count of ALL bookables (including those without a collection)
   * Only fetch totalCount, not the items
   */
  const allBookablesQuery = useQuery(
    trpc.bookables.getMany.queryOptions({
      collectionId: undefined,
      page: 1,
      pageSize: 1,
      search: "",
    }),
  );

  const totalBookablesCount = useMemo(() => {
    if (allBookablesQuery.data?.totalCount !== undefined) {
      return allBookablesQuery.data.totalCount;
    }
    // Fallback to summing collection counts (for initial load)
    return baseCollections.reduce((sum, collection) => sum + (collection.bookableCount || 0), 0);
  }, [allBookablesQuery.data?.totalCount, baseCollections]);

  // ============================================================================
  // Collection Selection Handlers
  // ============================================================================

  /**
   * Handle collection selection
   */
  const handleCollectionClick = useCallback((collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
  }, [setSelectedCollectionId]);

  // ============================================================================
  // Collection Edit Handlers
  // ============================================================================

  /**
   * Start editing a collection name
   */
  const handleCollectionEdit = useCallback((collectionId: string, currentName: string) => {
    setEditingCollectionId(collectionId);
    setEditingValue(currentName);
    setOpenDropdown(null);
  }, []);

  /**
   * Save collection name changes with optimistic update
   */
  const handleCollectionSave = useCallback(async (collectionId: string) => {
    if (editingValue.trim()) {
      const trimmedName = editingValue.trim();
      
      setEditingCollectionId(null);
      setEditingValue("");
      
      // Update cache optimistically before mutation
      const queryOptions = trpc.bookableCollections.getMany.queryOptions();
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof baseCollections | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((item) =>
            item.id === collectionId ? { ...item, name: trimmedName } : item,
          );
        },
      );
      
      try {
        await updateCollection.mutateAsync({
          id: collectionId,
          name: trimmedName,
        });
      } catch {
        // Revert optimistic update on error
        queryClient.invalidateQueries(queryOptions);
      }
    } else {
      setEditingCollectionId(null);
      setEditingValue("");
    }
  }, [editingValue, updateCollection, trpc, queryClient]);

  /**
   * Handle double-click to edit collection name
   */
  const handleCollectionDoubleClick = useCallback((collectionId: string, currentName: string) => {
    handleCollectionEdit(collectionId, currentName);
  }, [handleCollectionEdit]);

  // ============================================================================
  // Collection Create Handlers
  // ============================================================================

  /**
   * Start creating a new collection
   */
  const handleCreateCollection = useCallback((): void => {
    setIsCreatingCollection(true);
    setNewCollectionName("");
  }, []);

  /**
   * Save new collection with optimistic update
   * Appends at end of list
   */
  const handleNewCollectionSave = useCallback(async () => {
    if (newCollectionName.trim()) {
      const trimmedName = newCollectionName.trim();
      
      setIsCreatingCollection(false);
      setNewCollectionName("");
      
      const tempId = `temp-${Date.now()}`;
      const optimisticCollection: typeof baseCollections[number] = {
        id: tempId,
        name: trimmedName,
        icon: null,
        order: baseCollections.length,
        bookableCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { bookables: 0 },
        organizationId: baseCollections[0]?.organizationId || "",
      } as typeof baseCollections[number];
      
      // Update cache immediately with optimistic item (append at end)
      const queryOptions = trpc.bookableCollections.getMany.queryOptions();
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof baseCollections | undefined) => {
          if (!oldData) return [optimisticCollection];
          return [...oldData, optimisticCollection];
        },
      );
      
      try {
        // Mutation hook will replace temp ID with real ID
        await createCollection.mutateAsync({
          name: trimmedName,
        });
      } catch {
        // Remove optimistic item on error
        queryClient.setQueryData(
          queryOptions.queryKey,
          (oldData: typeof baseCollections | undefined) => {
            if (!oldData) return [];
            return oldData.filter((item) => item.id !== tempId);
          },
        );
      }
    } else {
      setIsCreatingCollection(false);
      setNewCollectionName("");
    }
  }, [newCollectionName, createCollection, trpc, queryClient, baseCollections]);

  /**
   * Cancel creating a new collection
   */
  const handleNewCollectionCancel = useCallback(() => {
    setIsCreatingCollection(false);
    setNewCollectionName("");
  }, []);

  // ============================================================================
  // Collection Action Handlers
  // ============================================================================

  /**
   * Start renaming a collection
   */
  const handleRenameCollection = useCallback((collectionId: string, currentName: string) => {
    handleCollectionEdit(collectionId, currentName);
  }, [handleCollectionEdit]);

  /**
   * Duplicate a collection with optimistic update
   * Inserts at beginning to match sort order (updatedAt: "desc")
   */
  const handleDuplicateCollection = useCallback(async (collectionId: string) => {
    setOpenDropdown(null);
    
    const original = baseCollections.find((col) => col.id === collectionId);
    if (!original) return;
    
    const tempId = `temp-${Date.now()}`;
    const duplicatedCollection: typeof baseCollections[number] = {
      ...original,
      id: tempId,
      name: `${original.name} Copy`,
      bookableCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as typeof baseCollections[number];
    
    // Update cache immediately with optimistic duplicate (insert at beginning to match sort order)
    const queryOptions = trpc.bookableCollections.getMany.queryOptions();
    queryClient.setQueryData(
      queryOptions.queryKey,
      (oldData: typeof baseCollections | undefined) => {
        if (!oldData) return [duplicatedCollection];
        return [duplicatedCollection, ...oldData];
      },
    );
    
    try {
      // Mutation hook will replace temp ID with real ID
      await duplicateCollection.mutateAsync({ id: collectionId });
    } catch {
      // Remove optimistic item on error
      queryClient.setQueryData(
        queryOptions.queryKey,
        (oldData: typeof baseCollections | undefined) => {
          if (!oldData) return [];
          return oldData.filter((item) => item.id !== tempId);
        },
      );
    }
  }, [duplicateCollection, baseCollections, trpc, queryClient]);

  /**
   * Delete a collection with optimistic update
   */
  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    setOpenDropdown(null);
    
    if (selectedCollectionId === collectionId) {
      setSelectedCollectionId(null);
    }
    
    // Update cache optimistically before mutation
    const queryOptions = trpc.bookableCollections.getMany.queryOptions();
    queryClient.setQueryData(
      queryOptions.queryKey,
      (oldData: typeof baseCollections | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((item) => item.id !== collectionId);
      },
    );
    
    try {
      await removeCollection.mutateAsync({ id: collectionId });
    } catch {
      // Revert optimistic update on error
      queryClient.invalidateQueries(queryOptions);
    }
  }, [removeCollection, selectedCollectionId, setSelectedCollectionId, trpc, queryClient]);

  return (
    <div className={cn("flex flex-col h-full border-r bg-background", className)}>
      <nav className="flex-1 p-4 py-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-sm font-medium text-foreground">Collections</span>
          <button
            type="button"
            onClick={handleCreateCollection}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Add new folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleCollectionClick(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-sm",
              selectedCollectionId === null
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-accent",
            )}
          >
            <Folder className="h-4 w-4" />
            <span className="flex-1 text-left">All</span>
            <span className="text-xs text-muted-foreground">{totalBookablesCount}</span>
          </button>

          {baseCollections.map((collection) => {
            const isActive = selectedCollectionId === collection.id;
            const isEditing = editingCollectionId === collection.id;
            const isHovered = hoveredCollectionId === collection.id;
            const isDropdownOpen = openDropdown === collection.id;

            return (
              /* biome-ignore lint/a11y/noStaticElementInteractions: Container div with hover handlers for visual feedback only */
              <div
                key={collection.id}
                className="relative"
                onMouseEnter={() => setHoveredCollectionId(collection.id)}
                onMouseLeave={() => {
                  if (!isDropdownOpen) {
                    setHoveredCollectionId(null);
                  }
                }}
              >
                {isEditing ? (
                  <div className="bg-primary/10 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-primary shrink-0" />
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleCollectionSave(collection.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCollectionSave(collection.id);
                          }
                          if (e.key === "Escape") {
                            setEditingCollectionId(null);
                            setEditingValue("");
                          }
                        }}
                        className="bg-background border-0 text-sm h-6 px-2 flex-1"
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-between px-2 py-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleCollectionClick(collection.id)}
                      onDoubleClick={() =>
                        handleCollectionDoubleClick(collection.id, collection.name)
                      }
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <Folder className="h-4 w-4" />
                      <span className="text-sm font-medium">{collection.name}</span>
                    </button>
                    {isHovered || isDropdownOpen ? (
                      <DropdownMenu
                        open={isDropdownOpen}
                        onOpenChange={(open) => {
                          setOpenDropdown(open ? collection.id : null);
                          if (!open) {
                            setHoveredCollectionId(null);
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 hover:bg-innerit"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                          className="[--radius:1rem]"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRenameCollection(collection.id, collection.name)
                              }
                            >
                              <Edit3 className="size-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateCollection(collection.id)}
                            >
                              <Copy className="size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCollection(collection.id)}
                              variant="destructive"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {collection.bookableCount || 0}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isCreatingCollection && (
            <div className="relative">
              <div className="bg-primary/10 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary shrink-0" />
                  <Input
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onBlur={handleNewCollectionSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleNewCollectionSave();
                      }
                      if (e.key === "Escape") {
                        handleNewCollectionCancel();
                      }
                    }}
                    placeholder="Collection"
                    className="bg-background border-0 text-sm h-6 px-2 flex-1"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {baseCollections.length === 0 && !isCreatingCollection && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No collections yet. Create one to get started.
            </div>
          )}
        </div>
      </nav>
    </div>
  );
});

BookablesSidebar.displayName = "BookablesSidebar";
