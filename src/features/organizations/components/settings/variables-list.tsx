"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  HashIcon,
  ListIcon,
  ToggleLeftIcon,
  TypeIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomFieldDetails } from "@/features/custom-fields/components/custom-field-details";
import {
  useReorderCustomFields,
  useSuspenseCustomFields,
} from "@/features/custom-fields/hooks/use-custom-fields";
import { CustomFieldDisplayLocation, CustomFieldType } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_LABELS_ES, type FieldItem } from "./types";

function FieldTypeIcon({ type }: { type: CustomFieldType }) {
  switch (type) {
    case CustomFieldType.TEXT:
    case CustomFieldType.TEXTAREA:
      return <TypeIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.NUMBER:
      return <HashIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.DATE:
      return <CalendarIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.BOOLEAN:
      return <ToggleLeftIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.TIME:
      return <ClockIcon className="size-4 text-muted-foreground" />;
    case CustomFieldType.OPTIONS:
    case CustomFieldType.MULTISELECT:
      return <ListIcon className="size-4 text-muted-foreground" />;
  }
}

function SortableVariableRow({
  field,
  onEdit,
}: {
  field: FieldItem;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      className={cn(
        "flex items-center gap-3 py-3.5",
        isDragging && "opacity-50",
      )}
    >
      <span
        {...listeners}
        className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg bg-muted active:cursor-grabbing"
      >
        <FieldTypeIcon type={field.type} />
      </span>
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left text-[15px] text-foreground/90"
        onClick={onEdit}
      >
        {field.name}
      </button>
      {field.required && (
        <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Requerido
        </span>
      )}
      <span className="shrink-0 text-[12px] text-muted-foreground">
        {FIELD_TYPE_LABELS_ES[field.type]}
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-foreground/20" />
    </div>
  );
}

export function VariablesList({
  addOpen,
  onAddOpenChange,
  onEdit,
}: {
  addOpen: boolean;
  onAddOpenChange: (v: boolean) => void;
  onEdit: (field: FieldItem) => void;
}) {
  const { data: fields } = useSuspenseCustomFields();
  const reorderFields = useReorderCustomFields();
  const [items, setItems] = useState<FieldItem[]>([]);

  const customerFields = useMemo(
    () => (fields as FieldItem[]).filter((f) => f.displayLocation === CustomFieldDisplayLocation.CUSTOMER),
    [fields],
  );

  useEffect(() => {
    setItems(customerFields);
  }, [customerFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((f) => f.id === active.id);
    const newIndex = items.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    reorderFields.mutate({ fieldOrders: reordered.map((f, i) => ({ id: f.id, order: i })) });
  }

  return (
    <>
      {customerFields.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Sin campos</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border/40">
              {items.map((field) => (
                <SortableVariableRow key={field.id} field={field} onEdit={() => onEdit(field)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CustomFieldDetails
        open={addOpen}
        onOpenChange={onAddOpenChange}
        hideDisplayLocation
        defaultValues={{ displayLocation: CustomFieldDisplayLocation.CUSTOMER }}
      />
    </>
  );
}
