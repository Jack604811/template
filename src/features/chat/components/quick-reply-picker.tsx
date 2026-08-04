"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftIcon,
  FileTextIcon,
  ImageIcon,
  LayoutListIcon,
  LinkIcon,
  MapPinIcon,
  MessageSquareQuoteIcon,
  PlusIcon,
  SendHorizontalIcon,
  TextIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerNavHeader,
} from "@/components/ui/drawer";
import { DeleteItem } from "@/components/ui/delete-item";
import { Search } from "@/components/ui/search";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTRPC } from "@/trpc/client";
import type { SendPayload } from "./chat-input";
import { InteractiveCard } from "./message-bubble";
import { QuickReplyCreator } from "./quick-reply-creator";

// ─── Types ────────────────────────────────────────────────────────────────────

type CarouselCard = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  quickReplies?: Array<{ id: string; title: string; sequenceId?: string }>;
};

export type QuickReplyStep =
  | { type: "text"; text: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "carousel"; text?: string; cards: CarouselCard[] }
  | { type: "document"; url: string; filename: string; caption?: string }
  | { type: "cta_url"; text: string; buttonUrl: string; displayText: string; headerImageUrl?: string; footer?: string }
  | { type: "location"; latitude: number; longitude: number; name?: string; address?: string };

export interface QuickReplySequence {
  id: string;
  name: string;
  shortcut?: string;
  description?: string;
  steps: QuickReplyStep[];
}


// ─── Step helpers ──────────────────────────────────────────────────────────────

export function stepToPayload(step: QuickReplyStep): SendPayload {
  switch (step.type) {
    case "text":
      return { text: step.text };
    case "image":
      return { text: step.caption ?? "", mediaUrl: step.url, mediaType: "image" };
    case "carousel":
      return {
        text: step.text ?? "",
        mediaType: "interactive_carousel",
        mediaFilename: JSON.stringify({ cards: step.cards }),
      };
    case "document":
      return { text: step.caption ?? "", mediaUrl: step.url, mediaType: "document", mediaFilename: step.filename };
    case "cta_url":
      return {
        text: step.text,
        mediaType: "interactive_cta_url",
        mediaUrl: step.buttonUrl,
        mediaFilename: JSON.stringify({
          displayText: step.displayText,
          ...(step.footer && { footer: step.footer }),
          ...(step.headerImageUrl && { headerImageUrl: step.headerImageUrl }),
        }),
      };
    case "location":
      return {
        text: "",
        mediaType: "location",
        mediaFilename: JSON.stringify({
          latitude: step.latitude,
          longitude: step.longitude,
          ...(step.name && { name: step.name }),
          ...(step.address && { address: step.address }),
        }),
      };
  }
}

const STEP_META: Record<QuickReplyStep["type"], { label: string; icon: React.ElementType; color: string }> = {
  text:      { label: "Texto",      icon: TextIcon,        color: "text-foreground"   },
  image:     { label: "Imagen",     icon: ImageIcon,       color: "text-blue-500"     },
  carousel:  { label: "Carrusel",   icon: LayoutListIcon,  color: "text-violet-500"   },
  document:  { label: "Documento",  icon: FileTextIcon,    color: "text-orange-500"   },
  cta_url:   { label: "CTA URL",    icon: LinkIcon,        color: "text-emerald-500"  },
  location:  { label: "Ubicación",  icon: MapPinIcon,      color: "text-rose-500"     },
};

// ─── Step preview card ────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: QuickReplyStep; index: number }) {
  const meta = STEP_META[step.type];
  const Icon = meta.icon;
  const label = (
    <span className="text-[11px] font-medium text-muted-foreground">
      Paso {index + 1} · {meta.label}
    </span>
  );

  // Bubble-type steps: render cards directly without the constrained wrapper
  // w-full is required because the parent uses items-end (align-items: flex-end)
  // which would otherwise shrink these to fit-content and pin them right, clipping the left edge
  if (step.type === "carousel") {
    return (
      <div className="flex w-full flex-col gap-2">
        {step.text && (
          <div className="self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2">
            <p className="text-[13px] leading-relaxed text-primary-foreground">{step.text}</p>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {step.cards.map((card, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={`${card.id}-${i}`} className="shrink-0">
              <InteractiveCard
                imageUrl={card.imageUrl}
                title={card.title}
                description={card.description}
                buttonUrl={card.buttonUrl}
                buttonText={card.buttonText}
                quickReplies={card.quickReplies}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.type === "cta_url") {
    return (
      <div className="flex w-full flex-col gap-2">
        <InteractiveCard
          imageUrl={step.headerImageUrl}
          description={step.text}
          footer={step.footer}
          buttonUrl={step.buttonUrl}
          buttonText={step.displayText}
        />
      </div>
    );
  }

  if (step.type === "image") {
    return (
      <div className="flex w-full flex-col gap-2">
        {label}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.url} alt="" className="h-48 w-64 rounded-xl object-cover" />
        {step.caption && <p className="line-clamp-2 text-[13px] text-foreground/80">{step.caption}</p>}
      </div>
    );
  }

  // Inline steps: use the compact card wrapper
  return (
    <div className="flex w-full gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs">
        <Icon className={`size-4 ${meta.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1">{label}</div>
        {step.type === "text" && (
          <p className="line-clamp-3 whitespace-pre-wrap text-[13px] text-foreground/80">{step.text}</p>
        )}
        {step.type === "document" && (
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-5 shrink-0 text-orange-500" />
            <p className="truncate text-[13px] text-foreground/80">{step.filename}</p>
          </div>
        )}
        {step.type === "location" && (
          <div className="flex items-center gap-2">
            <MapPinIcon className="size-4 shrink-0 text-rose-500" />
            <div className="min-w-0">
              {step.name && <p className="truncate text-[13px] font-medium">{step.name}</p>}
              <p className="truncate text-[12px] text-muted-foreground">{step.latitude}, {step.longitude}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable list row ────────────────────────────────────────────────────────

function SortableQuickReplyRow({
  qr,
  onEdit,
  onDelete,
}: {
  qr: QuickReplySequence;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: qr.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex cursor-grab items-center gap-2 py-3 active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <MessageSquareQuoteIcon className="size-4 text-primary" />
      </div>
      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col text-left"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onEdit}
      >
        <p className="truncate text-sm font-medium">{qr.name}</p>
        {qr.shortcut && (
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{qr.shortcut}</p>
        )}
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        className="flex h-8 shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Eliminar respuesta rápida"
      >
        <Trash2Icon className="size-4 text-muted-foreground transition-colors hover:text-destructive" />
      </button>
    </div>
  );
}

// ─── QuickReplyPicker ─────────────────────────────────────────────────────────

interface QuickReplyPickerProps {
  open: boolean;
  onClose: () => void;
}

export function QuickReplyPicker({ open, onClose }: QuickReplyPickerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingQr, setEditingQr] = useState<QuickReplySequence | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const queryOptions = trpc.quickReplies.getMany.queryOptions();
  const { data: sequences = [] } = useQuery(queryOptions);

  const items: QuickReplySequence[] = dragOrder
    ? (dragOrder.map((id) => sequences.find((s) => s.id === id)).filter(Boolean) as QuickReplySequence[])
    : (sequences as unknown as QuickReplySequence[]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderReply = useMutation(
    trpc.quickReplies.reorder.mutationOptions({
      onSettled: () => { setDragOrder(null); queryClient.invalidateQueries({ queryKey: queryOptions.queryKey }); },
    }),
  );

  const deleteReply = useMutation(
    trpc.quickReplies.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: queryOptions.queryKey });
        const prev = queryClient.getQueryData(queryOptions.queryKey);
        queryClient.setQueryData(queryOptions.queryKey, (old: typeof sequences | undefined) =>
          (old ?? []).filter((qr) => qr.id !== id),
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) queryClient.setQueryData(queryOptions.queryKey, ctx.prev);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: queryOptions.queryKey }),
    }),
  );

  const filtered = search
    ? sequences.filter((qr) => {
        const q = search.toLowerCase();
        return qr.name.toLowerCase().includes(q) || qr.shortcut?.includes(q);
      })
    : items;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((qr) => qr.id === active.id);
    const newIndex = items.findIndex((qr) => qr.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setDragOrder(reordered.map((qr) => qr.id));
    reorderReply.mutate({ ids: reordered.map((qr) => qr.id) });
  }

  function handleOpenChange(v: boolean) {
    if (!v) { onClose(); setSearch(""); }
  }

  function handleDelete() {
    if (!deletingId) return;
    deleteReply.mutate({ id: deletingId });
    setDeletingId(null);
  }

  const isMobile = useIsMobile();
  const creatorIsOpen = creatorOpen || editingQr !== null;

  function handleCreatorClose() {
    setCreatorOpen(false);
    setEditingQr(null);
  }

  const creator = (
    <QuickReplyCreator
      open={creatorIsOpen}
      initialValue={editingQr}
      onClose={handleCreatorClose}
      onSave={() => {
        void queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
        handleCreatorClose();
      }}
    />
  );

  const deleteDialog = (
    <DeleteItem
      open={deletingId !== null}
      onOpenChange={(v) => { if (!v) setDeletingId(null); }}
      onConfirm={handleDelete}
      title="Eliminar respuesta rápida"
      description="Esta acción no se puede deshacer."
    />
  );

  const listBody = filtered.length === 0 ? (
    <p className="py-8 text-center text-sm text-muted-foreground">
      {search ? "Sin resultados." : "No hay respuestas rápidas todavía."}
    </p>
  ) : search ? (
    <div className="divide-y divide-border/40">
      {filtered.map((qr) => (
        <SortableQuickReplyRow
          key={qr.id}
          qr={qr}
          onEdit={() => setEditingQr(qr)}
          onDelete={() => setDeletingId(qr.id)}
        />
      ))}
    </div>
  ) : (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((qr) => qr.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border/40">
          {items.map((qr) => (
            <SortableQuickReplyRow
              key={qr.id}
              qr={qr}
              onEdit={() => setEditingQr(qr)}
              onDelete={() => setDeletingId(qr.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  const listContent = (
    <div className="space-y-3 px-4 pb-4 pt-1">
      <div className="flex items-center gap-2">
        <Search value={search} onChange={setSearch} placeholder="Buscar respuesta rápida" />
        <Button variant="outline" size="icon-sm" className="shrink-0 rounded-full" onClick={() => setCreatorOpen(true)}>
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
      {listBody}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {deleteDialog}
        {creator}
        <Drawer open={open && !creatorIsOpen} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[100vh]">
            <DrawerNavHeader title="Respuestas rápidas" onBack={onClose} onClose={onClose} />
            <div className="mt-2 overflow-y-auto">
              {listContent}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {deleteDialog}
      {creator}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Respuestas rápidas</DialogTitle>
          </DialogHeader>
          <div className="mt-2 h-72 -mx-6 overflow-y-auto">
            {listContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── QuickReplyDetailDialog ───────────────────────────────────────────────────

interface QuickReplyDetailDialogProps {
  sequence: QuickReplySequence | null;
  onClose: () => void;
  onSend: (payload: SendPayload) => void;
}

export function QuickReplyDetailDialog({ sequence, onClose, onSend }: QuickReplyDetailDialogProps) {
  const isMobile = useIsMobile();
  const [localSteps, setLocalSteps] = useState<QuickReplyStep[]>([]);

  useEffect(() => {
    setLocalSteps(sequence?.steps ?? []);
  }, [sequence]);

  const updateTextStep = useCallback((index: number, text: string) => {
    setLocalSteps((prev) => prev.map((s, i) => i === index && s.type === "text" ? { ...s, text } : s));
  }, []);

  function handleSend() {
    if (!sequence) return;
    for (const step of localSteps) {
      onSend(stepToPayload(step));
    }
    onClose();
  }

  const stepCount = localSteps.length;

  const steps = (
    <div className="flex flex-col items-end gap-2 py-2">
      {stepCount === 0 ? (
        <p className="w-full py-6 text-center text-sm text-muted-foreground">
          Esta secuencia no tiene mensajes todavía.
        </p>
      ) : (
        localSteps.map((step, i) => {
          if (step.type === "text") {
            return (
              <div key={`text-${i}-${step.text.slice(0, 8)}`} className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2">
                <textarea
                  value={step.text}
                  onChange={(e) => updateTextStep(i, e.target.value)}
                  className="resize-none bg-transparent text-[13px] leading-relaxed text-primary-foreground outline-none [field-sizing:content]"
                />
              </div>
            );
          }
          if (step.type === "image") {
            return (
              <div key={`image-${step.url.slice(-12)}`} className="max-w-[85%] overflow-hidden rounded-2xl rounded-br-sm bg-primary">
                {/* biome-ignore lint/performance/noImgElement: preview */}
                <img src={step.url} alt="" className="max-h-48 w-full object-cover" />
                {step.caption && (
                  <p className="px-3 py-2 text-[13px] leading-relaxed text-primary-foreground">{step.caption}</p>
                )}
              </div>
            );
          }
          if (step.type === "document") {
            return (
              <div key={`doc-${step.filename}`} className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-br-sm bg-primary px-3 py-2.5">
                <FileTextIcon className="size-4 shrink-0 text-primary-foreground/70" />
                <p className="truncate text-[13px] text-primary-foreground">{step.filename}</p>
              </div>
            );
          }
          if (step.type === "cta_url") {
            return (
              <div key={`cta-${step.buttonUrl.slice(-12)}`} className="self-end">
                <InteractiveCard
                  imageUrl={step.headerImageUrl}
                  description={step.text}
                  footer={step.footer}
                  buttonUrl={step.buttonUrl}
                  buttonText={step.displayText}
                />
              </div>
            );
          }
          if (step.type === "location") {
            return (
              <div key={`loc-${step.latitude}-${step.longitude}`} className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-br-sm bg-primary px-3 py-2.5">
                <MapPinIcon className="size-4 shrink-0 text-primary-foreground/70" />
                <div className="min-w-0">
                  {step.name && <p className="truncate text-[13px] font-medium text-primary-foreground">{step.name}</p>}
                  <p className="text-[11px] text-primary-foreground/70">{step.latitude}, {step.longitude}</p>
                </div>
              </div>
            );
          }
          return <StepCard key={`${step.type}-${i}`} step={step} index={i} />;
        })
      )}
    </div>
  );

  const sendButton = (
    <Button className="w-full" onClick={handleSend} disabled={stepCount === 0}>
      <SendHorizontalIcon className="size-3.5" />
      Enviar al chat
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={!!sequence} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent
          action={{
            label: "Enviar al chat",
            icon: <SendHorizontalIcon className="size-3.5" />,
            onClick: handleSend,
            disabled: stepCount === 0,
          }}
        >
          <DrawerNavHeader
            title={
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold">{sequence?.name}</span>
                {sequence?.shortcut && (
                  <span className="text-[11px] text-muted-foreground">{sequence.shortcut}</span>
                )}
              </div>
            }
            onBack={onClose}
            onClose={onClose}
          />
          <div className="h-px w-full bg-border/50" />
          <div className="overflow-y-auto px-4">{steps}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!sequence} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Volver"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm">{sequence?.name}</DialogTitle>
              {sequence?.shortcut && (
                <DialogDescription className="text-[11px]">{sequence.shortcut}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="-mx-6 h-px bg-border/50" />
        <div className="-mx-6 max-h-[55vh] overflow-y-auto px-6">{steps}</div>

        <DialogFooter>
          {sendButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
