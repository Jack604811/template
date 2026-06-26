"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PlusIcon, TagIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

// ─── Palette ─────────────────────────────────────────────────────────────────

const TAG_COLORS = [
  { value: "#6366F1", label: "Índigo" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Ámbar" },
  { value: "#EF4444", label: "Rojo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#8B5CF6", label: "Violeta" },
  { value: "#14B8A6", label: "Teal" },
];

const DEFAULT_SUGGESTIONS = [
  { name: "Nueva reserva",   color: "#3B82F6" },
  { name: "Pago pendiente",  color: "#F59E0B" },
  { name: "Pedido completo", color: "#10B981" },
  { name: "Seguimiento",     color: "#8B5CF6" },
  { name: "Cliente potencial", color: "#EC4899" },
];

// ─── TagBadge ─────────────────────────────────────────────────────────────────

export function TagBadge({
  name,
  color,
  onRemove,
  className,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-transparent px-3 py-1 text-[12px] font-medium leading-none text-foreground",
        className,
      )}
    >
      <span
        className="size-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full opacity-40 hover:opacity-100 transition-opacity"
          aria-label={`Quitar etiqueta ${name}`}
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── CreateTagForm ────────────────────────────────────────────────────────────

function CreateTagForm({ onDone }: { onDone: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0].value);

  const create = useMutation(
    trpc.chat.createTag.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.chat.getTags.queryKey() });
        onDone();
      },
    }),
  );

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-border/50 bg-muted/40 p-3">
      <input
        ref={(el) => { el?.focus(); }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            create.mutate({ name: name.trim(), color });
          }
          if (e.key === "Escape") onDone();
        }}
        placeholder="Nombre de la etiqueta"
        maxLength={50}
        className="w-full rounded-lg border border-border/50 bg-background px-3 py-1.5 text-[13px] outline-none focus:border-primary"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {TAG_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className="size-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
              style={{ backgroundColor: c.value }}
              aria-label={c.label}
            >
              {color === c.value && <CheckIcon className="size-3 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-2.5 py-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate({ name: name.trim(), color })}
            className="rounded-lg bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConversationTags ─────────────────────────────────────────────────────────

export function ConversationTags({ conversationId }: { conversationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: allTags = [] } = useQuery(trpc.chat.getTags.queryOptions());
  const { data: activeTags = [] } = useQuery(
    trpc.chat.getConversationTags.queryOptions({ conversationId }),
  );

  const activeIds = new Set(activeTags.map((t) => t.id));

  const invalidateAll = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.chat.getConversationTags.queryKey({ conversationId }),
    });
    void queryClient.invalidateQueries({ queryKey: trpc.chat.getTags.queryKey() });
  };

  const addTag = useMutation(
    trpc.chat.addTagToConversation.mutationOptions({ onSuccess: invalidateAll }),
  );

  const removeTag = useMutation(
    trpc.chat.removeTagFromConversation.mutationOptions({ onSuccess: invalidateAll }),
  );

  const deleteTag = useMutation(
    trpc.chat.deleteTag.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.chat.getTags.queryKey() });
        void queryClient.invalidateQueries({
          queryKey: trpc.chat.getConversationTags.queryKey({ conversationId }),
        });
      },
    }),
  );

  const createFromSuggestion = useMutation(
    trpc.chat.createTag.mutationOptions({
      onSuccess: (tag) => {
        void queryClient.invalidateQueries({ queryKey: trpc.chat.getTags.queryKey() });
        addTag.mutate({ conversationId, tagId: tag.id });
      },
    }),
  );

  return (
    <div>
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setCreating(false); }}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex size-5 items-center justify-center text-muted-foreground">
          <TagIcon className="size-4" />
        </span>
        <span className="flex-1 text-[13px]">Etiquetas</span>
        <span className="text-[12px] text-muted-foreground">
          {activeTags.length > 0 ? `${activeTags.length}` : "Ninguna"}
        </span>
      </button>

      {/* Active tags */}
      {activeTags.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1.5 px-4 pb-2">
          {activeTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onRemove={() => removeTag.mutate({ conversationId, tagId: tag.id })}
            />
          ))}
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="mx-3 mb-2 rounded-xl border border-border/50 bg-card shadow-md">
          {allTags.length === 0 ? (
            <div className="p-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Sugerencias
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_SUGGESTIONS.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => createFromSuggestion.mutate(s)}
                    className="transition-opacity hover:opacity-80"
                  >
                    <TagBadge name={s.name} color={s.color} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto p-1">
              {allTags.map((tag) => {
                const active = activeIds.has(tag.id);
                return (
                  <div
                    key={tag.id}
                    className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 text-left"
                      onClick={() =>
                        active
                          ? removeTag.mutate({ conversationId, tagId: tag.id })
                          : addTag.mutate({ conversationId, tagId: tag.id })
                      }
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded border transition-colors",
                          active ? "border-transparent" : "border-border",
                        )}
                        style={active ? { backgroundColor: tag.color } : {}}
                      >
                        {active && <CheckIcon className="size-2.5 text-white" strokeWidth={3} />}
                      </span>
                      <TagBadge name={tag.name} color={tag.color} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTag.mutate({ tagId: tag.id })}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Eliminar etiqueta"
                    >
                      <Trash2Icon className="size-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {creating ? (
            <div className="border-t border-border/40 p-2">
              <CreateTagForm onDone={() => setCreating(false)} />
            </div>
          ) : (
            <div className="border-t border-border/40 p-1">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Nueva etiqueta
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
