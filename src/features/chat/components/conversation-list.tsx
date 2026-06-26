"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Pills } from "@/components/ui/pills";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "@/components/ui/search";
import { Toggle } from "@/components/ui/toggle";
import { useTRPC } from "@/trpc/client";
import type { ChatFilter, Conversation } from "../types";
import { ConversationItem } from "./conversation-item";
import { type TagItem, TagList } from "./tag-list";

const CHAT_FILTERS: { id: ChatFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "unread", label: "No leídos" },
  { id: "joined", label: "Asignados" },
];

const TAG_COLORS = [
  "#6366F1", "#8B5CF6", "#A855F7", "#EC4899",
  "#F43F5E", "#EF4444", "#F97316", "#F59E0B",
  "#EAB308", "#84CC16", "#22C55E", "#10B981",
  "#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6",
  "#64748B", "#78716C",
];

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  conversationCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  filter: ChatFilter;
  search: string;
  tagId: string | null;
  tags: Tag[];
  onSelect: (id: string) => void;
  onFilterChange: (filter: ChatFilter) => void;
  onSearchChange: (search: string) => void;
  onTagChange: (tagId: string | null) => void;
}

// ─── Tag management dialog ────────────────────────────────────────────────────

function TagDialog({
  open,
  onOpenChange,
  tags,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tags: Tag[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [tagSearch, setTagSearch] = useState("");
  const [pendingTag, setPendingTag] = useState<TagItem | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.chat.getTags.queryKey() });

  const createTag = useMutation(
    trpc.chat.createTag.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        setPendingTag(null);
      },
      onError: () => setPendingTag(null),
    }),
  );

  const updateTag = useMutation(
    trpc.chat.updateTag.mutationOptions({
      onMutate: async ({ tagId, name, color }) => {
        await queryClient.cancelQueries({ queryKey: trpc.chat.getTags.queryKey() });
        const previous = queryClient.getQueryData(trpc.chat.getTags.queryKey());
        queryClient.setQueryData(trpc.chat.getTags.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id === tagId
              ? { ...t, ...(name ? { name } : {}), ...(color ? { color } : {}) }
              : t,
          );
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous)
          queryClient.setQueryData(trpc.chat.getTags.queryKey(), ctx.previous);
      },
      onSettled: () => void invalidate(),
    }),
  );

  const deleteTag = useMutation(
    trpc.chat.deleteTag.mutationOptions({ onSuccess: () => void invalidate() }),
  );

  const reorderTags = useMutation(
    trpc.chat.reorderTags.mutationOptions({
      onMutate: async ({ ids }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.chat.getTags.queryKey(),
        });
        const previous = queryClient.getQueryData(trpc.chat.getTags.queryKey());
        queryClient.setQueryData(trpc.chat.getTags.queryKey(), (old) => {
          if (!old) return old;
          return ids
            .map((id) => old.find((t) => t.id === id))
            .filter((t): t is NonNullable<typeof t> => t != null);
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous)
          queryClient.setQueryData(trpc.chat.getTags.queryKey(), ctx.previous);
      },
      onSettled: () => void invalidate(),
    }),
  );

  function handleCreate() {
    if (!newName.trim()) return;
    const temp: TagItem = {
      id: `temp-${Date.now()}`,
      name: newName.trim(),
      color: newColor,
      createdAt: new Date(),
      conversationCount: 0,
    };
    setPendingTag(temp);
    setNewName("");
    setIsCreating(false);
    createTag.mutate({ name: temp.name, color: temp.color });
  }

  function handleClose() {
    onOpenChange(false);
    setIsCreating(false);
    setNewName("");
    setTagSearch("");
  }

  function cycleColor() {
    const usedColors = tags.map((t) => t.color);
    const available = TAG_COLORS.filter((c) => c === newColor || !usedColors.includes(c));
    const idx = available.indexOf(newColor);
    const next = available[(idx + 1) % available.length];
    if (next) setNewColor(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiquetas</DialogTitle>
          <DialogDescription>
            Crea y gestiona las etiquetas de tu organización.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Search
              value={tagSearch}
              onChange={setTagSearch}
              placeholder="Buscar etiqueta"
            />
            <Button
              variant="outline"
              size="icon-sm"
              className="shrink-0 rounded-full"
              onClick={() => {
                setIsCreating(true);
                setTagSearch("");
              }}
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>

          {isCreating && (
            <div className="flex items-center gap-3 -mx-6 border-y border-border/40 bg-muted/30 px-7 py-2">
              <button
                type="button"
                onClick={cycleColor}
                className="size-10 shrink-0 rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: newColor }}
                title="Cambiar color"
              />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                placeholder="Nombre de la etiqueta"
                value={newName}
                maxLength={50}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewName("");
                  }
                }}
              />
              {newName.trim() && (
                <Button size="sm" onClick={handleCreate}>
                  Crear
                </Button>
              )}
            </div>
          )}

          <TagList
            tags={[
              ...(pendingTag ? [pendingTag] : []),
              ...tags.filter(
                (t) =>
                  t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
                  t.name.toLowerCase() !==
                    (pendingTag?.name.toLowerCase() ?? ""),
              ),
            ]}
            onDelete={(id) => deleteTag.mutate({ tagId: id })}
            onReorder={(ids) => reorderTags.mutate({ ids })}
            onUpdate={(tagId, changes) =>
              updateTag.mutate({ tagId, ...changes })
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ConversationList ─────────────────────────────────────────────────────────

export function ConversationList({
  conversations,
  selectedId,
  filter,
  search,
  tagId,
  tags,
  onSelect,
  onFilterChange,
  onSearchChange,
  onTagChange,
}: ConversationListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = conversations.filter((c) => {
    if (filter === "unread" && c.unreadCount === 0) return false;
    if (tagId && !c.tagIds.includes(tagId)) return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.lastMessage.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-4 pt-5 pb-3">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Mensajes</h1>
        <Search
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar conversación"
        />
      </header>

      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto px-3 pb-3 scrollbar-none">
        <Pills
          items={CHAT_FILTERS}
          value={filter}
          onValueChange={(v) => onFilterChange(v as ChatFilter)}
          className="flex-nowrap gap-1.5"
        />

        {tags.map((tag) => (
          <Toggle
            key={tag.id}
            pressed={tagId === tag.id}
            onPressedChange={(on) => onTagChange(on ? tag.id : null)}
            variant="pill"
            size="sm"
            className="shrink-0"
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </Toggle>
        ))}

        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0 rounded-full"
          onClick={() => setDialogOpen(true)}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <TagDialog open={dialogOpen} onOpenChange={setDialogOpen} tags={tags} />

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <Empty className="border-none py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>Sin conversaciones</EmptyTitle>
              <EmptyDescription>
                Los mensajes de WhatsApp aparecerán aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              selected={c.id === selectedId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
