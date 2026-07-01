"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useState } from "react";
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
import type { SendPayload } from "./message-input";
import { QuickReplyCreator } from "./quick-reply-creator";

// ─── Types ────────────────────────────────────────────────────────────────────

type CarouselCard = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  quickReplies?: Array<{ id: string; title: string }>;
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

  return (
    <div className="flex gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs">
        <Icon className={`size-4 ${meta.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            Paso {index + 1} · {meta.label}
          </span>
        </div>
        {step.type === "text" && (
          <p className="line-clamp-3 whitespace-pre-wrap text-[13px] text-foreground/80">{step.text}</p>
        )}
        {step.type === "image" && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */ /* preview only — external URL, no next/image config needed */}
            <img src={step.url} alt="" className="size-12 rounded-lg object-cover" />
            {step.caption && <p className="line-clamp-2 text-[13px] text-foreground/80">{step.caption}</p>}
          </div>
        )}
        {step.type === "carousel" && (
          <div className="flex flex-col gap-1">
            {step.text && <p className="line-clamp-2 text-[13px] text-foreground/80">{step.text}</p>}
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {step.cards.map((card, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={`${card.title}-${i}`} className="flex w-28 shrink-0 flex-col gap-1 rounded-lg border bg-background p-2">
                  {card.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.imageUrl} alt="" className="h-14 w-full rounded-md object-cover" />
                  )}
                  <p className="line-clamp-1 text-[11px] font-medium">{card.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {step.type === "document" && (
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-5 shrink-0 text-orange-500" />
            <p className="truncate text-[13px] text-foreground/80">{step.filename}</p>
          </div>
        )}
        {step.type === "cta_url" && (
          <div className="flex flex-col gap-1.5">
            {step.headerImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={step.headerImageUrl} alt="" className="h-20 w-full rounded-lg object-cover" />
            )}
            <p className="line-clamp-2 text-[13px] text-foreground/80">{step.text}</p>
            <div className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5">
              <LinkIcon className="size-3 text-emerald-500" />
              <span className="text-[12px] font-medium text-emerald-600">{step.displayText}</span>
            </div>
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

  const queryOptions = trpc.quickReplies.getMany.queryOptions();
  const { data: sequences = [] } = useQuery(queryOptions);

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

  const filtered = sequences.filter((qr) => {
    const q = search.toLowerCase();
    return !q || qr.name.toLowerCase().includes(q) || qr.shortcut?.includes(q);
  });

  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose();
      setSearch("");
    }
  }

  function handleDelete() {
    if (!deletingId) return;
    deleteReply.mutate({ id: deletingId });
    setDeletingId(null);
  }

  // ── List view ──
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Respuestas rápidas</DialogTitle>
          <DialogDescription>
            Selecciona una secuencia de mensajes para enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Search
              value={search}
              onChange={setSearch}
              placeholder="Buscar respuesta rápida"
            />
            <Button
              variant="outline"
              size="icon-sm"
              className="shrink-0 rounded-full"
              onClick={() => setCreatorOpen(true)}
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>

          <QuickReplyCreator
            open={creatorOpen || editingQr !== null}
            initialValue={editingQr}
            onClose={() => { setCreatorOpen(false); setEditingQr(null); }}
            onSave={() => {
              void queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
              setCreatorOpen(false);
              setEditingQr(null);
            }}
          />

          <DeleteItem
            open={deletingId !== null}
            onOpenChange={(v) => { if (!v) setDeletingId(null); }}
            onConfirm={handleDelete}
            title="Eliminar respuesta rápida"
            description="Esta acción no se puede deshacer."
          />

          <div className="h-72 -mx-6 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? "Sin resultados." : "No hay respuestas rápidas todavía."}
              </p>
            ) : (
              <div className="divide-y divide-border/40 px-6">
                {filtered.map((qr) => {
                  const stepTypeCounts = qr.steps.reduce<Record<string, number>>((acc, s) => {
                    acc[s.type] = (acc[s.type] ?? 0) + 1;
                    return acc;
                  }, {});
                  return (
                    <div key={qr.id} className="group flex cursor-pointer items-center gap-3 py-3">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() => setEditingQr(qr)}
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <MessageSquareQuoteIcon className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{qr.name}</p>
                            {qr.shortcut && (
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                {qr.shortcut}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(stepTypeCounts).map(([type, count]) => {
                              const m = STEP_META[type as QuickReplyStep["type"]];
                              const Icon = m.icon;
                              return (
                                <span key={type} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Icon className={`size-3 ${m.color}`} />
                                  {count} {m.label.toLowerCase()}{count > 1 ? "s" : ""}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(qr.id)}
                        className="h-8 flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        aria-label="Eliminar respuesta rápida"
                      >
                        <Trash2Icon className="size-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

  function handleSend() {
    if (!sequence) return;
    for (const step of sequence.steps) {
      onSend(stepToPayload(step));
    }
    onClose();
  }

  const stepCount = sequence?.steps.length ?? 0;

  const steps = (
    <div className="flex flex-col gap-2 py-2">
      {stepCount === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Esta secuencia no tiene mensajes todavía.
        </p>
      ) : (
        sequence?.steps.map((step, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <StepCard key={`${step.type}-${i}`} step={step} index={i} />
        ))
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

        <div className="-mx-6 max-h-[55vh] overflow-y-auto px-6">{steps}</div>

        <DialogFooter>
          {sendButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
