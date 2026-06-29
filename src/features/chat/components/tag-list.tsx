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
import { Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteItem } from "@/components/ui/delete-item";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TagItem {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  conversationCount: number;
}

const TAG_COLORS = [
  "#6366F1", "#8B5CF6", "#A855F7", "#EC4899",
  "#F43F5E", "#EF4444", "#F97316", "#F59E0B",
  "#EAB308", "#84CC16", "#22C55E", "#10B981",
  "#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6",
  "#64748B", "#78716C",
];

interface TagListProps {
  tags: TagItem[];
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onUpdate: (id: string, changes: { name?: string; color?: string }) => void;
  usedColors?: string[];
  height?: string;
  emptyMessage?: string;
}

function SortableTagRow({
  tag,
  usedColors = [],
  onDelete,
  onUpdate,
}: {
  tag: TagItem;
  usedColors?: string[];
  onDelete: () => void;
  onUpdate: (changes: { name?: string; color?: string }) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [nameValue, setNameValue] = useState(tag.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) inputRef.current?.focus();
  }, [editingName]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  function cycleColor() {
    const available = TAG_COLORS.filter((c) => c === tag.color || !usedColors.includes(c));
    const idx = available.indexOf(tag.color);
    const next = available[(idx + 1) % available.length];
    if (next) onUpdate({ color: next });
  }

  function commitName() {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== tag.name) onUpdate({ name: trimmed });
    else setNameValue(tag.name);
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`group flex cursor-grab items-center gap-3 py-3 active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
        {...attributes}
        {...listeners}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={cycleColor}
          className="size-10 shrink-0 rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: tag.color }}
        />
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={inputRef}
              size={Math.max(nameValue.length + 1, 4)}
              className="h-5 w-auto border-0 p-0 bg-transparent text-sm font-medium outline-none leading-none"
              spellCheck={false}
              value={nameValue}
              maxLength={50}
              onChange={(e) => setNameValue(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setEditingName(false); setNameValue(tag.name); }
              }}
            />
          ) : (
            <p
              className="truncate text-sm font-medium cursor-text h-5 leading-none"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setEditingName(true)}
              onKeyDown={(e) => { if (e.key === "Enter") setEditingName(true); }}
            >
              {tag.name}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {tag.conversationCount === 1
              ? "1 conversación"
              : `${tag.conversationCount} conversaciones`}
          </p>
        </div>
        {editingName ? (
          <Button
            size="sm"
            className={inputFocused ? "" : "invisible pointer-events-none"}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={commitName}
            disabled={!nameValue.trim() || nameValue.trim() === tag.name}
          >
            Guardar
          </Button>
        ) : (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setConfirmOpen(true)}
            className="h-8 flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            aria-label="Eliminar etiqueta"
          >
            <Trash2Icon className="size-4 text-muted-foreground hover:text-destructive transition-colors" />
          </button>
        )}
      </div>

      <DeleteItem
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={onDelete}
        title="Eliminar etiqueta"
        description={
          <>
            ¿Estás seguro de que quieres eliminar{" "}
            <span className="font-medium text-foreground">{tag.name}</span>?
            Esta acción no se puede deshacer.
          </>
        }
      />
    </>
  );
}

export function TagList({
  tags,
  onDelete,
  onReorder,
  onUpdate,
  usedColors,
  height = "h-72",
  emptyMessage = "No hay etiquetas todavía.",
}: TagListProps) {
  const allUsedColors = usedColors ?? tags.map((t) => t.color);
  const [items, setItems] = useState<TagItem[]>(tags);

  useEffect(() => {
    setItems(tags);
  }, [tags]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    onReorder(reordered.map((t) => t.id));
  }

  return (
    <ScrollArea className={`${height} -mx-6`}>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-border/40 px-6">
              {items.map((tag) => (
                <SortableTagRow
                  key={tag.id}
                  tag={tag}
                  usedColors={allUsedColors}
                  onDelete={() => onDelete(tag.id)}
                  onUpdate={(changes) => onUpdate(tag.id, changes)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </ScrollArea>
  );
}
