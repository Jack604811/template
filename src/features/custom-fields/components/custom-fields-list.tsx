"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  type UniqueIdentifier,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { EmptyView } from "@/components/entity-components";
import { CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { useSuspenseCustomFields, useReorderCustomFields, useCreateCustomField, useUpdateCustomField, useRemoveCustomField, useToggleCustomField } from "../hooks/use-custom-fields";
import { CustomFieldItem } from "./custom-field-item";
import { CustomFieldDialog } from "./custom-field-dialog";
import type { CustomField, CustomFieldType, CustomFieldDisplayLocation } from "@/generated/prisma";
import { CustomFieldDisplayLocation as CustomFieldDisplayLocationEnum } from "@/generated/prisma";
import { useQueryClient } from "@tanstack/react-query";
import { startTransition } from "react";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

// Helper function to reorder array items
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}

export const CustomFieldsList = memo(() => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | undefined>();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [originalOrderOnDragStart, setOriginalOrderOnDragStart] = useState<Array<{ id: string; order: number }> | null>(null);
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { data: initialFields } = useSuspenseCustomFields();
  
  // Get the actual query key from tRPC query options
  const queryOptions = trpc.customFields.getMany.queryOptions();
  const queryKey = queryOptions.queryKey;
  
  // Read from cache to get optimistic updates
  const fields = queryClient.getQueryData<typeof initialFields>(queryKey) ?? initialFields;
  
  const reorderFields = useReorderCustomFields();
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const removeField = useRemoveCustomField();
  const toggleField = useToggleCustomField();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
    
    // Capture original order when drag starts
    const currentData = queryClient.getQueryData<typeof initialFields>(queryKey) ?? initialFields;
    const order = currentData.map((field, index) => ({
      id: field.id,
      order: index,
    }));
    setOriginalOrderOnDragStart(order);
  }, [initialFields, queryClient, queryKey]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || over.id === "empty-list") {
      return;
    }

    // Get current data from cache (may have been updated already)
    const currentData = queryClient.getQueryData<typeof initialFields>(queryKey) ?? initialFields;
    const oldIndex = currentData.findIndex((f) => f.id === active.id);
    const newIndex = currentData.findIndex((f) => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Update cache immediately for visual feedback during drag
        queryClient.setQueryData(
          queryKey,
          (oldData: typeof initialFields | undefined) => {
            if (!oldData) return oldData;
            // Recalculate indices from fresh data to avoid stale updates
            const freshOldIndex = oldData.findIndex((f) => f.id === active.id);
            const freshNewIndex = oldData.findIndex((f) => f.id === over.id);
            if (freshOldIndex !== -1 && freshNewIndex !== -1 && freshOldIndex !== freshNewIndex) {
              return arrayMove(oldData, freshOldIndex, freshNewIndex);
            }
            return oldData;
          },
        );
    }
  }, [initialFields, queryClient, queryKey]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    const originalOrder = originalOrderOnDragStart;
    setActiveId(null);
    setOriginalOrderOnDragStart(null);

    if (!over || active.id === over.id) {
      // Revert optimistic update if no valid drop or dropped on self
      queryClient.invalidateQueries({ queryKey });
      return;
    }

    // Handle dropping into an empty list
    if (over.id === "empty-list") {
      // Revert if dropped into empty list (not a valid reorder operation)
      queryClient.invalidateQueries({ queryKey });
      return;
    }

    // Get current data from cache
    const currentData = queryClient.getQueryData<typeof initialFields>(queryKey) ?? initialFields;
    
    // Filter out temp IDs (optimistic items that haven't been saved yet)
    const validFields = currentData.filter((field) => !field.id.startsWith("temp-"));
    
    // Find the indices for the drag operation
    const activeIndex = validFields.findIndex((f) => f.id === active.id);
    const overIndex = validFields.findIndex((f) => f.id === over.id);

    // If indices are valid and different, perform the move
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      // Move the item to the new position
      const reorderedFields = arrayMove(validFields, activeIndex, overIndex);
      
      // Update cache with the new order
      queryClient.setQueryData(
        queryKey,
        (oldData: typeof initialFields | undefined) => {
          if (!oldData) return oldData;
          
          // Recalculate from fresh data
          const freshValidFields = oldData.filter((field) => !field.id.startsWith("temp-"));
          const freshActiveIndex = freshValidFields.findIndex((f) => f.id === active.id);
          const freshOverIndex = freshValidFields.findIndex((f) => f.id === over.id);
          
          if (freshActiveIndex !== -1 && freshOverIndex !== -1 && freshActiveIndex !== freshOverIndex) {
            const moved = arrayMove(freshValidFields, freshActiveIndex, freshOverIndex);
            
            // Reconstruct the full array including temp items (preserve their positions at the end)
            const tempItems = oldData.filter((field) => field.id.startsWith("temp-"));
            return [...moved, ...tempItems];
          }
          
          return oldData;
        },
      );

      // Build final order for server sync
      const finalOrder = reorderedFields.map((field, index) => ({
        id: field.id,
        order: index,
      }));

      // Sync with server - only if order actually changed
      const orderChanged = originalOrder && originalOrder.length > 0
        ? originalOrder
          .filter((o) => reorderedFields.some((f) => f.id === o.id))
            .map((o) => o.id)
            .join(",") !== finalOrder.map((o) => o.id).join(",")
        : true; // If no original order, assume it changed
        
        if (orderChanged) {
          startTransition(() => {
            reorderFields.mutate(
              {
                fieldOrders: finalOrder,
              },
              {
                onError: () => {
                  // On error, revert optimistic update
                queryClient.invalidateQueries({ queryKey });
              },
            },
          );
        });
      }
    } else {
      // No valid move - revert
      queryClient.invalidateQueries({ queryKey });
    }
  }, [originalOrderOnDragStart, reorderFields, queryClient, initialFields, queryKey]);

  const handleCreate = useCallback(async (values: { name: string; type: CustomFieldType; required: boolean; enabled: boolean; options?: string[]; defaultValue?: string; placeholder?: string; displayLocation: CustomFieldDisplayLocationEnum }) => {
    // Get current data from cache - preserve all existing fields
    const currentData = queryClient.getQueryData<typeof initialFields>(queryKey) ?? initialFields;
    
    // Filter out temp IDs to get valid fields count for order
    const validFields = currentData.filter((field) => !field.id.startsWith("temp-"));
    const currentLength = validFields.length;

    // Create optimistic field
    const tempId = `temp-${Date.now()}`;
    const optimisticField = {
      id: tempId,
      name: values.name,
      type: values.type,
      required: values.required,
      enabled: values.enabled,
      options: values.options || null,
      defaultValue: values.defaultValue || null,
      placeholder: values.placeholder || null,
      displayLocation: values.displayLocation,
      identifier: values.name.toLowerCase().replace(/\s+/g, "-"),
      order: currentLength,
      organizationId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CustomField;

    // Update cache IMMEDIATELY with optimistic field - preserve ALL existing fields
    queryClient.setQueryData(
      queryKey,
      (oldData: typeof initialFields | undefined) => {
        if (!oldData) return [optimisticField];
        // Append to existing array - preserve all fields including any other temp items
        return [...oldData, optimisticField];
      },
    );

    // Actual mutation - mutation hook will replace temp ID with real ID in onSuccess
    // Dialog is closed immediately by dialog component, mutation happens in background
    createField.mutateAsync(values).catch(() => {
      // On error, remove optimistic item from cache - preserve all other fields
      queryClient.setQueryData(
        queryKey,
        (oldData: typeof initialFields | undefined) => {
          if (!oldData) return oldData;
          // Filter out only the failed optimistic item, keep everything else
          return oldData.filter((item) => item.id !== tempId);
        },
      );
      // Error toast is shown by mutation hook's onError handler
    });
  }, [createField, queryClient, initialFields, queryKey]);

  const handleUpdate = useCallback(async (fieldId: string, values: { name: string; type: CustomFieldType; required: boolean; options?: string[]; defaultValue?: string; placeholder?: string; displayLocation: CustomFieldDisplayLocationEnum }) => {
    // Update cache IMMEDIATELY with optimistic update - preserve all fields
    queryClient.setQueryData(
      queryKey,
      (oldData: typeof initialFields | undefined) => {
        if (!oldData) return oldData;
        // Update only the target field, preserve all others
        return oldData.map((f) =>
          f.id === fieldId
            ? { ...f, ...values, options: values.options ?? f.options, defaultValue: values.defaultValue ?? f.defaultValue, placeholder: values.placeholder ?? f.placeholder, displayLocation: values.displayLocation ?? f.displayLocation }
            : f
        );
      },
    );

    // Actual mutation - dialog is closed immediately by dialog component, mutation happens in background
    updateField.mutateAsync({
        id: fieldId,
        ...values,
    }).catch(() => {
      // On error, revert optimistic update by invalidating
      queryClient.invalidateQueries({ queryKey });
      // Error toast is shown by mutation hook's onError handler
    });
  }, [updateField, queryClient, queryKey]);

  const handleDelete = useCallback(async (fieldId: string) => {
    // Update cache IMMEDIATELY - remove item optimistically, preserve all others
    queryClient.setQueryData(
      queryKey,
      (oldData: typeof initialFields | undefined) => {
        if (!oldData) return oldData;
        // Filter out only the target field, keep all others
        return oldData.filter((item) => item.id !== fieldId);
      },
    );

    // Actual mutation
    try {
      await removeField.mutateAsync({ id: fieldId });
    } catch {
      // On error, revert optimistic update by invalidating
      queryClient.invalidateQueries({ queryKey });
      throw new Error("Failed to remove field");
    }
  }, [removeField, queryClient, queryKey]);

  const handleToggle = useCallback(async (fieldId: string, enabled: boolean) => {
    // Update cache IMMEDIATELY with optimistic toggle - preserve all fields
    queryClient.setQueryData(
      queryKey,
      (oldData: typeof initialFields | undefined) => {
        if (!oldData) return oldData;
        // Update only the target field, preserve all others
        return oldData.map((f) => (f.id === fieldId ? { ...f, enabled } : f));
      },
    );

    // Actual mutation
    try {
      await toggleField.mutateAsync({ id: fieldId, enabled });
    } catch {
      // On error, revert optimistic update by invalidating
      queryClient.invalidateQueries({ queryKey });
      throw new Error("Failed to toggle field");
    }
  }, [toggleField, queryClient, queryKey]);

  const handleEdit = (fieldId: string) => {
    setEditingFieldId(fieldId);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingFieldId(undefined);
    setDialogOpen(true);
  };

  // Get active field from fields (may have optimistic updates)
  const activeField = activeId ? fields.find((f) => f.id === activeId) : null;

  // Memoize defaultValues based on editingFieldId to prevent infinite loops
  // Only recalculate when editingFieldId or the actual field data changes
  const dialogDefaultValues = useMemo(() => {
    if (!editingFieldId) return undefined;
    const editingField = fields.find((f) => f.id === editingFieldId);
    if (!editingField) return undefined;
    return {
      name: editingField.name,
      type: editingField.type,
      required: editingField.required,
      options: Array.isArray(editingField.options)
        ? (editingField.options as string[]).join("\n")
        : "",
      defaultValue: editingField.defaultValue || "",
      displayLocation: (editingField.displayLocation ?? CustomFieldDisplayLocationEnum.BOOKING) as CustomFieldDisplayLocation,
    };
  }, [editingFieldId, fields]);

  return (
    <>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>
          Create custom fields to collect additional customer information
        </CardDescription>
        <CardAction>
          <Button onClick={handleAdd} size="sm">
            <PlusIcon className="size-4" />
            Add Field
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {fields.length === 0 ? (
            <EmptyListDropZone activeId={activeId} onAdd={handleAdd} />
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <SortableCustomFieldItem
                  key={field.id}
                  field={field}
                  index={index}
                  totalItems={fields.length}
                  isDragging={activeId === field.id}
                  onEdit={() => handleEdit(field.id)}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          <DragOverlay adjustScale={false} dropAnimation={null}>
            {activeField ? (
              <div className="opacity-90">
                <CustomFieldItem
                  field={activeField}
                  onEdit={() => {}}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  isDragging={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>

      <CustomFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fieldId={editingFieldId}
        defaultValues={dialogDefaultValues}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </>
  );
});

CustomFieldsList.displayName = "CustomFieldsList";

// Empty list drop zone component
interface EmptyListDropZoneProps {
  activeId: UniqueIdentifier | null;
  onAdd: () => void;
}

const EmptyListDropZone = memo(({ activeId, onAdd }: EmptyListDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "empty-list",
    data: { type: "empty", accepts: ["customField"] },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[200px] rounded-lg border-2 border-dashed transition-colors flex items-center justify-center",
        isOver && activeId ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <EmptyView
        onNew={onAdd}
        message="Create custom fields to collect additional customer information"
      />
    </div>
  );
});

EmptyListDropZone.displayName = "EmptyListDropZone";

// Sortable wrapper component using useDraggable and useDroppable
interface SortableCustomFieldItemProps {
  field: CustomField;
  index: number;
  totalItems: number;
  isDragging: boolean;
  onEdit: () => void;
  onToggle: (fieldId: string, enabled: boolean) => void;
  onDelete: (fieldId: string) => void;
}

const SortableCustomFieldItem = memo(({ field, index, totalItems, isDragging, onEdit, onToggle, onDelete }: SortableCustomFieldItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform: _transform, // Unused - we use DragOverlay and React reordering instead
    isDragging: isDraggingItem,
  } = useDraggable({
    id: field.id,
    data: {
      type: "customField",
      field,
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: field.id,
    data: {
      type: "customField",
      accepts: ["customField"],
    },
  });

  const setNodeRef = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <>
      {/* Empty space indicator above item when dragging over */}
      {isOver && !isDraggingItem && (
        <div className="h-16 w-full rounded-md bg-primary/10 border-2 border-dashed border-primary/60 mb-2 transition-all flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Drop here</div>
        </div>
      )}
      
      {/* Wrapper for drag/drop functionality - always rendered for drop detection */}
      {isDraggingItem ? (
        <div ref={setNodeRef} className="h-0 overflow-hidden" />
      ) : (
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          className={cn(
            "transition-all cursor-grab active:cursor-grabbing",
            isOver && "ring-2 ring-primary/30 rounded-md",
          )}
        >
          <CustomFieldItem
            field={field}
            onEdit={onEdit}
            onToggle={onToggle}
            onDelete={onDelete}
            isDragging={isDragging}
          />
        </div>
      )}
      
      {/* Empty space indicator after last item when dragging over */}
      {index === totalItems - 1 && isOver && !isDraggingItem && (
        <div className="h-16 w-full rounded-md bg-primary/10 border-2 border-dashed border-primary/60 mt-2 transition-all flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Drop here</div>
        </div>
      )}
    </>
  );
});

SortableCustomFieldItem.displayName = "SortableCustomFieldItem";
