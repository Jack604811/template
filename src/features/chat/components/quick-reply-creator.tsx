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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  GripVerticalIcon,
  ImageIcon,
  LayoutListIcon,
  LinkIcon,
  MapPinIcon,
  PlusIcon,
  TextIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerNavHeader } from "@/components/ui/drawer";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { compressImage } from "../lib/compress"; // eslint-disable-line import/order
import { CarouselCardBubble, CtaUrlBubble } from "./card-bubble"; // eslint-disable-line import/order
import type { QuickReplyStep } from "./quick-reply-picker"; // eslint-disable-line import/order

// ─── Upload / delete helpers ──────────────────────────────────────────────────

function stepImageUrls(step: QuickReplyStep): string[] {
  if (step.type === "image") return step.url ? [step.url] : [];
  if (step.type === "cta_url")
    return step.headerImageUrl ? [step.headerImageUrl] : [];
  if (step.type === "carousel")
    return step.cards.flatMap((c) => (c.imageUrl ? [c.imageUrl] : []));
  return [];
}

async function deleteQuickReplyImage(url: string): Promise<void> {
  await fetch("/api/quick-replies/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url }),
  });
}

async function uploadQuickReplyImage(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  const compressed = file.type.startsWith("image/")
    ? await compressImage(file)
    : file;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((JSON.parse(xhr.responseText) as { url: string }).url);
        } catch {
          reject(new Error("Invalid response"));
        }
      } else {
        reject(new Error(`Error ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    const form = new FormData();
    form.set("file", compressed);
    xhr.open("POST", "/api/quick-replies/upload");
    xhr.withCredentials = true;
    xhr.send(form);
  });
}

// ─── Step meta ────────────────────────────────────────────────────────────────

const STEP_TYPE_OPTIONS: Array<{
  type: QuickReplyStep["type"];
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = [
  {
    type: "text",
    label: "Texto",
    icon: TextIcon,
    color: "text-foreground",
    bg: "bg-muted",
  },
  {
    type: "image",
    label: "Imagen",
    icon: ImageIcon,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    type: "carousel",
    label: "Carrusel",
    icon: LayoutListIcon,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/40",
  },
  {
    type: "document",
    label: "Documento",
    icon: FileTextIcon,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
  },
  {
    type: "cta_url",
    label: "CTA URL",
    icon: LinkIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    type: "location",
    label: "Ubicación",
    icon: MapPinIcon,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
];

function createEmptyStep(type: QuickReplyStep["type"]): QuickReplyStep {
  switch (type) {
    case "text":
      return { type: "text", text: "" };
    case "image":
      return { type: "image", url: "" };
    case "carousel":
      return {
        type: "carousel",
        cards: [{ id: crypto.randomUUID(), title: "" }],
      };
    case "document":
      return { type: "document", url: "", filename: "" };
    case "cta_url":
      return { type: "cta_url", text: "", buttonUrl: "", displayText: "" };
    case "location":
      return { type: "location", latitude: 0, longitude: 0 };
  }
}

// ─── Location step form ───────────────────────────────────────────────────────

function parseGoogleMapsUrl(
  url: string,
): { latitude: number; longitude: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch)
    return {
      latitude: parseFloat(atMatch[1]),
      longitude: parseFloat(atMatch[2]),
    };
  const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch)
    return {
      latitude: parseFloat(qMatch[1]),
      longitude: parseFloat(qMatch[2]),
    };
  return null;
}

type LocationStep = Extract<QuickReplyStep, { type: "location" }>;

function LocationStepForm({
  step,
  onChange,
  id1,
  id2,
  id3,
  id4,
}: {
  step: LocationStep;
  onChange: (s: QuickReplyStep) => void;
  id1: string;
  id2: string;
  id3: string;
  id4: string;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleUrlChange(raw: string) {
    setUrlInput(raw);
    const direct = parseGoogleMapsUrl(raw);
    if (direct) {
      onChange({
        ...step,
        latitude: direct.latitude,
        longitude: direct.longitude,
      });
      return;
    }
    if (raw.includes("goo.gl") || raw.includes("maps.app")) {
      setResolving(true);
      try {
        const res = await fetch(
          `/api/resolve-maps-url?url=${encodeURIComponent(raw)}`,
        );
        if (res.ok) {
          const { resolved } = (await res.json()) as { resolved: string };
          const coords = parseGoogleMapsUrl(resolved);
          if (coords)
            onChange({
              ...step,
              latitude: coords.latitude,
              longitude: coords.longitude,
            });
        }
      } catch {}
      setResolving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-muted-foreground">
          URL de Google Maps{" "}
          <span className="font-normal opacity-60">
            (extrae coordenadas automáticamente)
          </span>
        </Label>
        <div className="relative">
          <Input
            placeholder="https://maps.google.com/... o maps.app.goo.gl/..."
            value={urlInput}
            onChange={(e) => {
              void handleUrlChange(e.target.value);
            }}
          />
          {resolving && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              Resolviendo…
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id1} className="text-[12px] text-muted-foreground">
            Latitud
          </Label>
          <Input
            id={id1}
            type="number"
            placeholder="0.000000"
            value={step.latitude || ""}
            onChange={(e) =>
              onChange({ ...step, latitude: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id2} className="text-[12px] text-muted-foreground">
            Longitud
          </Label>
          <Input
            id={id2}
            type="number"
            placeholder="0.000000"
            value={step.longitude || ""}
            onChange={(e) =>
              onChange({ ...step, longitude: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id3} className="text-[12px] text-muted-foreground">
          Nombre <span className="font-normal opacity-60">(opcional)</span>
        </Label>
        <Input
          id={id3}
          placeholder="Ej. Oficina central"
          value={step.name ?? ""}
          onChange={(e) =>
            onChange({ ...step, name: e.target.value || undefined })
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id4} className="text-[12px] text-muted-foreground">
          Dirección <span className="font-normal opacity-60">(opcional)</span>
        </Label>
        <Input
          id={id4}
          placeholder="Ej. Av. Reforma 123, CDMX"
          value={step.address ?? ""}
          onChange={(e) =>
            onChange({ ...step, address: e.target.value || undefined })
          }
        />
      </div>
    </div>
  );
}

// ─── Carousel step bubble ─────────────────────────────────────────────────────

type CarouselStep = Extract<QuickReplyStep, { type: "carousel" }>;

// Card width (w-64 = 256px) + gap (12px)
const CARD_STRIDE = 268;

function CarouselStepBubble({
  step,
  onChange,
  id1,
  excludeSequenceId,
}: {
  step: CarouselStep;
  onChange: (step: CarouselStep) => void;
  id1: string;
  excludeSequenceId?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isFirst = activeIdx === 0;
  const isLast = activeIdx >= step.cards.length - 1;
  const atMaxCards = step.cards.length >= 10;

  function scrollTo(idx: number) {
    const clamped = Math.max(0, Math.min(idx, step.cards.length - 1));
    setActiveIdx(clamped);
    scrollRef.current?.scrollTo({
      left: clamped * CARD_STRIDE,
      behavior: "smooth",
    });
  }

  function updateCard(i: number, card: CarouselStep["cards"][number]) {
    onChange({
      ...step,
      cards: step.cards.map((c, idx) => (idx === i ? card : c)),
    });
  }

  function addCard() {
    if (step.cards.length >= 10) return;
    const newCard = { id: crypto.randomUUID(), title: "" };
    const nextCards = [...step.cards, newCard];
    onChange({ ...step, cards: nextCards });
    const nextIdx = nextCards.length - 1;
    setActiveIdx(nextIdx);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        left: nextIdx * CARD_STRIDE,
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-block rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
        <input
          id={id1}
          type="text"
          placeholder="Mensaje introductorio (opcional)..."
          value={step.text ?? ""}
          onChange={(e) =>
            onChange({ ...step, text: e.target.value || undefined })
          }
          className="bg-transparent text-[14px] leading-relaxed text-foreground outline-none placeholder:text-foreground/30"
        />
      </div>

      <div className="relative">
        {/* Scroll container — all cards visible, snaps per card */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {step.cards.map((card, i) => (
            <div
              key={card.id}
              className="shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              <CarouselCardBubble
                card={card}
                onChange={(c) => updateCard(i, c)}
                onUpload={uploadQuickReplyImage}
                onDeleteImage={deleteQuickReplyImage}
                excludeSequenceId={excludeSequenceId}
              />
            </div>
          ))}
        </div>

        {/* Left arrow — hidden on first card */}
        {!isFirst && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -left-3 top-1/2 size-9 -translate-y-1/2 rounded-full shadow-sm"
            onClick={() => scrollTo(activeIdx - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        )}

        {/* Right arrow — shows + on last card (unless at max), > otherwise */}
        {(!isLast || !atMaxCards) && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -right-3 top-1/2 size-9 -translate-y-1/2 rounded-full shadow-sm"
            onClick={isLast ? addCard : () => scrollTo(activeIdx + 1)}
          >
            {isLast ? (
              <PlusIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
        )}
      </div>

      <div className="text-center text-[11px] text-muted-foreground">
        {activeIdx + 1} / {step.cards.length}
      </div>
    </div>
  );
}

// ─── Step bubble (renders each step as actual message preview) ───────────────

function StepBubble({
  step,
  onChange,
  excludeSequenceId,
}: {
  step: QuickReplyStep;
  onChange: (step: QuickReplyStep) => void;
  excludeSequenceId?: string;
}) {
  const id1 = useId();
  const id2 = useId();
  const id3 = useId();
  const id4 = useId();

  if (step.type === "text") {
    return (
      <div className="inline-block max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <Textarea
          autoFocus
          placeholder="Escribe el mensaje..."
          className="min-h-[52px] w-48 resize-none border-0 bg-transparent p-0 text-[14px] leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-foreground/30"
          value={step.text}
          onChange={(e) => onChange({ ...step, text: e.target.value })}
        />
      </div>
    );
  }

  if (step.type === "image") {
    return (
      <div className="w-64 overflow-hidden rounded-2xl rounded-bl-sm border border-border/70">
        <FileUpload
          value={step.url}
          accept="image/*"
          onChange={(url) => onChange({ ...step, url })}
          onUpload={uploadQuickReplyImage}
          onRemove={deleteQuickReplyImage}
          previewHeight="h-48"
          zoneClassName="border-0 rounded-none"
        />
        <div className="bg-muted px-3 py-2">
          <input
            id={id1}
            type="text"
            placeholder="Descripción (opcional)"
            value={step.caption ?? ""}
            onChange={(e) =>
              onChange({ ...step, caption: e.target.value || undefined })
            }
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/30"
          />
        </div>
      </div>
    );
  }

  if (step.type === "carousel") {
    return (
      <CarouselStepBubble
        step={step}
        onChange={onChange as (s: CarouselStep) => void}
        id1={id1}
        excludeSequenceId={excludeSequenceId}
      />
    );
  }

  if (step.type === "document") {
    return (
      <div className="w-64 overflow-hidden rounded-2xl rounded-bl-sm bg-muted">
        <FileUpload
          value={step.url}
          filename={step.filename}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,application/vnd.ms-*"
          onChange={(url, meta) =>
            onChange({
              ...step,
              url,
              filename: meta?.filename ?? step.filename,
            })
          }
          onUpload={uploadQuickReplyImage}
          onRemove={deleteQuickReplyImage}
          maxSizeMb={10}
          className="rounded-none border-0 border-b border-border/40"
        />
        <div className="flex flex-col gap-1 px-3 py-2">
          <input
            id={id1}
            type="text"
            placeholder="Nombre del archivo"
            value={step.filename}
            onChange={(e) => onChange({ ...step, filename: e.target.value })}
            className="w-full bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-foreground/30"
          />
          <input
            id={id2}
            type="text"
            placeholder="Descripción (opcional)"
            value={step.caption ?? ""}
            onChange={(e) =>
              onChange({ ...step, caption: e.target.value || undefined })
            }
            className="w-full bg-transparent text-[12px] text-muted-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    );
  }

  if (step.type === "cta_url") {
    return (
      <CtaUrlBubble
        step={step}
        onChange={onChange}
        onUpload={uploadQuickReplyImage}
        onDeleteImage={deleteQuickReplyImage}
      />
    );
  }

  if (step.type === "location") {
    return (
      <div className="w-full rounded-2xl rounded-bl-sm border bg-card p-4">
        <LocationStepForm
          step={step}
          onChange={onChange}
          id1={id1}
          id2={id2}
          id3={id3}
          id4={id4}
        />
      </div>
    );
  }

  return null;
}

// ─── Step row (ManyChat-style: grip · bubble · delete) ────────────────────────

type StepEntry = { id: string; step: QuickReplyStep };

function StepRow({
  entry,
  isNew,
  onChange,
  onDelete,
  excludeSequenceId,
}: {
  entry: StepEntry;
  isNew: boolean;
  onChange: (step: QuickReplyStep) => void;
  onDelete: () => void;
  excludeSequenceId?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  useEffect(() => {
    if (isNew)
      scrollRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [isNew]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        scrollRef.current = node;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-start gap-2", isDragging && "opacity-40")}
    >
      <button
        type="button"
        className="mt-3 shrink-0 cursor-grab text-muted-foreground/25 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
      >
        <GripVerticalIcon className="size-4" />
      </button>

      <div
        className={cn(
          "min-w-0 flex-1",
          isNew && "animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
        )}
      >
        <StepBubble
          step={entry.step}
          onChange={onChange}
          excludeSequenceId={excludeSequenceId}
        />
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="Eliminar paso"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );
}

// ─── QuickReplyCreator ────────────────────────────────────────────────────────

const MAX_STEPS = 3;

interface QuickReplyInitialValue {
  id: string;
  name: string;
  shortcut?: string;
  steps: QuickReplyStep[];
}

interface QuickReplyCreatorProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  initialValue?: QuickReplyInitialValue | null;
}

export function QuickReplyCreator({
  open,
  onClose,
  onSave,
  initialValue,
}: QuickReplyCreatorProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQueryOptions = trpc.quickReplies.getMany.queryOptions();
  const isEditing = !!initialValue?.id;

  const createReply = useMutation(
    trpc.quickReplies.create.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({
          queryKey: listQueryOptions.queryKey,
        });
        const prev = queryClient.getQueryData(listQueryOptions.queryKey);
        const optimistic = {
          id: `optimistic-${crypto.randomUUID()}`,
          name: input.name,
          shortcut: input.shortcut as string | undefined,
          steps: input.steps as QuickReplyStep[],
        };
        queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
          old ? [optimistic, ...old] : [optimistic],
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev)
          queryClient.setQueryData(listQueryOptions.queryKey, ctx.prev);
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
    }),
  );

  const updateReply = useMutation(
    trpc.quickReplies.update.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({
          queryKey: listQueryOptions.queryKey,
        });
        const prev = queryClient.getQueryData(listQueryOptions.queryKey);
        queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
          old
            ? old.map((qr) =>
                qr.id === input.id
                  ? {
                      ...qr,
                      name: input.name,
                      shortcut: input.shortcut,
                      steps: input.steps as QuickReplyStep[],
                    }
                  : qr,
              )
            : old,
        );
        return { prev };
      },
      onError: (e, _v, ctx) => {
        if (ctx?.prev)
          queryClient.setQueryData(listQueryOptions.queryKey, ctx.prev);
        toast.error(e.message);
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
    }),
  );

  const [name, setName] = useState(initialValue?.name ?? "");
  const [shortcut, setShortcut] = useState(
    initialValue?.shortcut?.replace(/^\//, "") ?? "",
  );
  const [entries, setEntries] = useState<StepEntry[]>(() =>
    (initialValue?.steps ?? []).map((step) => ({
      id: crypto.randomUUID(),
      step,
    })),
  );
  const [newestId, setNewestId] = useState<string | null>(null);
  const nameId = useId();
  const shortcutId = useId();

  // Sync state when initialValue changes (e.g. switching between quick replies)
  const prevInitialId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (initialValue?.id !== prevInitialId.current) {
      prevInitialId.current = initialValue?.id;
      setName(initialValue?.name ?? "");
      setShortcut(initialValue?.shortcut?.replace(/^\//, "") ?? "");
      setEntries(
        (initialValue?.steps ?? []).map((step) => ({
          id: crypto.randomUUID(),
          step,
        })),
      );
      setNewestId(null);
    }
  }, [initialValue]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose();
      setName("");
      setShortcut("");
      setEntries([]);
      setNewestId(null);
    }
  }

  const addStepOfType = useCallback((type: QuickReplyStep["type"]) => {
    setEntries((prev) => {
      if (prev.length >= MAX_STEPS) return prev;
      const id = crypto.randomUUID();
      setNewestId(id);
      return [...prev, { id, step: createEmptyStep(type) }];
    });
  }, []);

  function updateStep(id: string, step: QuickReplyStep) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, step } : e)));
  }

  function removeStep(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      const urls = stepImageUrls(entry.step);
      for (const url of urls)
        void deleteQuickReplyImage(url).catch(() => undefined);
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setNewestId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEntries((prev) => {
      const oldIdx = prev.findIndex((e) => e.id === active.id);
      const newIdx = prev.findIndex((e) => e.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  function handleSave() {
    if (!name.trim() || entries.length === 0) return;
    const sc = shortcut.trim();
    const payload = {
      name: name.trim(),
      shortcut: sc ? (sc.startsWith("/") ? sc : `/${sc}`) : undefined,
      steps: entries.map((e) => e.step),
    };
    if (isEditing && initialValue?.id) {
      updateReply.mutate({ id: initialValue.id, ...payload });
    } else {
      createReply.mutate(payload);
    }
    onSave();
    handleOpenChange(false);
  }

  const isMobile = useIsMobile();
  const atMax = entries.length >= MAX_STEPS;
  const canSave = name.trim().length > 0 && entries.length > 0;

  const formInner = (
    <div className="flex flex-col gap-4 px-6 py-5">
      <div className="grid grid-cols-[7fr_3fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameId}>Nombre</Label>
          <Input
            id={nameId}
            placeholder="Ej. Bienvenida"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={shortcutId}>
            Atajo{" "}
            <span className="font-normal text-muted-foreground">(opc.)</span>
          </Label>
          <div className="flex items-center rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="pl-3 font-mono text-[13px] text-muted-foreground select-none">
              /
            </span>
            <input
              id={shortcutId}
              placeholder="hola"
              value={shortcut.replace(/^\//, "")}
              maxLength={19}
              className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[13px] outline-none placeholder:text-muted-foreground/60"
              onChange={(e) => setShortcut(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-4">
            {entries.map((entry) => (
              <StepRow
                key={entry.id}
                entry={entry}
                isNew={newestId === entry.id}
                onChange={(s) => updateStep(entry.id, s)}
                onDelete={() => removeStep(entry.id)}
                excludeSequenceId={initialValue?.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div
        className={cn(
          "rounded-2xl border-2 border-dashed p-4 transition-opacity",
          entries.length === 0 ? "border-border" : "border-border/50",
          atMax && "pointer-events-none opacity-40",
        )}
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {entries.length === 0
            ? "Elige un tipo de mensaje para comenzar"
            : `Agregar mensaje (${entries.length}/${MAX_STEPS})`}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STEP_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                type="button"
                disabled={atMax}
                onClick={() => addStepOfType(opt.type)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-left transition-all",
                  "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:scale-[0.98]",
                  "disabled:cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    opt.bg,
                  )}
                >
                  <Icon className={cn("size-3.5", opt.color)} />
                </div>
                <span className="text-[13px] font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const title = isEditing
    ? "Editar respuesta rápida"
    : "Nueva respuesta rápida";
  const subtitle = isEditing
    ? "Modifica la secuencia de mensajes."
    : `Crea una secuencia de hasta ${MAX_STEPS} mensajes para enviar de forma rápida.`;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[100vh]">
          <DrawerNavHeader
            title={title}
            onBack={() => handleOpenChange(false)}
            onClose={() => handleOpenChange(false)}
          />
          <div className="overflow-y-auto">
            <div className="flex flex-col gap-4 px-3 pb-2 pt-1">
              {/* Name + Shortcut */}
              <div className="grid grid-cols-[7fr_3fr] gap-2">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={nameId}
                    className="text-xs text-muted-foreground"
                  >
                    Nombre
                  </Label>
                  <Input
                    id={nameId}
                    placeholder="Ej. Bienvenida"
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={shortcutId}
                    className="text-xs text-muted-foreground"
                  >
                    Atajo
                  </Label>
                  <div className="flex items-center rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span className="pl-3 font-mono text-[13px] text-muted-foreground select-none">
                      /
                    </span>
                    <input
                      id={shortcutId}
                      placeholder="hola"
                      value={shortcut.replace(/^\//, "")}
                      maxLength={19}
                      className="h-9 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[13px] outline-none placeholder:text-muted-foreground/60"
                      onChange={(e) => setShortcut(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Steps */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={entries.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-4">
                    {entries.map((entry) => (
                      <StepRow
                        key={entry.id}
                        entry={entry}
                        isNew={newestId === entry.id}
                        onChange={(s) => updateStep(entry.id, s)}
                        onDelete={() => removeStep(entry.id)}
                        excludeSequenceId={initialValue?.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add message row */}
              <div
                className={cn(
                  "transition-opacity",
                  atMax && "pointer-events-none opacity-40",
                )}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {entries.length === 0
                    ? "Tipo de mensaje"
                    : `Agregar (${entries.length}/${MAX_STEPS})`}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {STEP_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={atMax}
                        onClick={() => addStepOfType(opt.type)}
                        className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border bg-background px-4 py-3 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-xl",
                            opt.bg,
                          )}
                        >
                          <Icon className={cn("size-4", opt.color)} />
                        </div>
                        <span className="text-[11px] font-medium">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="p-3">
            <Button className="w-full" disabled={!canSave} onClick={handleSave}>
              {isEditing ? "Guardar cambios" : "Guardar respuesta rápida"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{formInner}</div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSave} onClick={handleSave}>
            {isEditing ? "Guardar cambios" : "Guardar respuesta rápida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
