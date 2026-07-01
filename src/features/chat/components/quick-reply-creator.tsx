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
  FileTextIcon,
  GripVerticalIcon,
  ImageIcon,
  LayoutListIcon,
  LinkIcon,
  MapPinIcon,
  PlusIcon,
  TextIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { compressImage } from "../lib/compress"; // eslint-disable-line import/order
import type { QuickReplySequence, QuickReplyStep } from "./quick-reply-picker"; // eslint-disable-line import/order

// ─── Upload / delete helpers ──────────────────────────────────────────────────

function stepImageUrls(step: QuickReplyStep): string[] {
  if (step.type === "image") return step.url ? [step.url] : [];
  if (step.type === "cta_url") return step.headerImageUrl ? [step.headerImageUrl] : [];
  if (step.type === "carousel") return step.cards.flatMap((c) => c.imageUrl ? [c.imageUrl] : []);
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

// ─── Carousel card type ───────────────────────────────────────────────────────

type CarouselCard = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  quickReplies?: Array<{ id: string; title: string }>;
};

type CardButtonType = "none" | "cta" | "quickreplies";

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

const STEP_META = Object.fromEntries(
  STEP_TYPE_OPTIONS.map((o) => [o.type, o]),
) as Record<QuickReplyStep["type"], (typeof STEP_TYPE_OPTIONS)[number]>;

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

// ─── Carousel card editor ─────────────────────────────────────────────────────

function CarouselCardEditor({
  index,
  card,
  onChange,
  onRemove,
}: {
  index: number;
  card: CarouselCard;
  onChange: (card: CarouselCard) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [buttonType, setButtonType] = useState<CardButtonType>(
    card.quickReplies?.length
      ? "quickreplies"
      : card.buttonUrl
        ? "cta"
        : "none",
  );
  const [newQrTitle, setNewQrTitle] = useState("");
  const titleId = useId();
  const descId = useId();
  const imgId = useId();
  const btnTextId = useId();
  const btnUrlId = useId();

  function setField<K extends keyof CarouselCard>(
    key: K,
    value: CarouselCard[K],
  ) {
    onChange({ ...card, [key]: value });
  }

  function changeButtonType(t: CardButtonType) {
    setButtonType(t);
    if (t === "none")
      onChange({
        ...card,
        buttonText: undefined,
        buttonUrl: undefined,
        quickReplies: undefined,
      });
    if (t === "cta") onChange({ ...card, quickReplies: undefined });
    if (t === "quickreplies")
      onChange({ ...card, buttonText: undefined, buttonUrl: undefined });
  }

  function addQuickReply() {
    if (!newQrTitle.trim()) return;
    const qr = {
      id: newQrTitle.toLowerCase().replace(/\s+/g, "-"),
      title: newQrTitle.trim(),
    };
    onChange({ ...card, quickReplies: [...(card.quickReplies ?? []), qr] });
    setNewQrTitle("");
  }

  return (
    <div className="rounded-xl border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <span className="flex-1 truncate text-[13px] font-medium">
          {card.title || (
            <span className="text-muted-foreground">Tarjeta {index + 1}</span>
          )}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
          aria-label="Eliminar tarjeta"
        >
          <XIcon className="size-3.5" />
        </button>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t px-3 pb-3 pt-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId}>Título</Label>
            <Input
              id={titleId}
              placeholder="Título de la tarjeta"
              value={card.title}
              onChange={(e) => setField("title", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={descId}>
              Descripción{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id={descId}
              placeholder="Descripción breve..."
              className="min-h-0 resize-none text-sm"
              rows={2}
              value={card.description ?? ""}
              onChange={(e) =>
                setField("description", e.target.value || undefined)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={imgId}>
              Imagen{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <FileUpload
              value={card.imageUrl ?? ""}
              accept="image/*"
              onChange={(v) => setField("imageUrl", v || undefined)}
              onUpload={uploadQuickReplyImage}
              onRemove={deleteQuickReplyImage}
              previewHeight="h-28"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Botón de acción</Label>
            <div className="flex gap-1.5">
              {(["none", "cta", "quickreplies"] as CardButtonType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeButtonType(t)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                      buttonType === t
                        ? "border-primary bg-primary/8 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {
                      {
                        none: "Ninguno",
                        cta: "Enlace",
                        quickreplies: "Opciones",
                      }[t]
                    }
                  </button>
                ),
              )}
            </div>
          </div>

          {buttonType === "cta" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={btnTextId}>Texto del botón</Label>
                <Input
                  id={btnTextId}
                  placeholder="Ver más"
                  value={card.buttonText ?? ""}
                  onChange={(e) =>
                    setField("buttonText", e.target.value || undefined)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={btnUrlId}>URL destino</Label>
                <Input
                  id={btnUrlId}
                  placeholder="https://..."
                  value={card.buttonUrl ?? ""}
                  onChange={(e) =>
                    setField("buttonUrl", e.target.value || undefined)
                  }
                />
              </div>
            </div>
          )}

          {buttonType === "quickreplies" && (
            <div className="flex flex-col gap-2">
              <Label>Opciones rápidas</Label>
              {(card.quickReplies ?? []).map((qr, i) => (
                <div key={`${qr.id}-${i}`} className="flex items-center gap-2">
                  <span className="flex-1 rounded-lg border bg-muted/30 px-3 py-1.5 text-[13px]">
                    {qr.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...card,
                        quickReplies: card.quickReplies?.filter(
                          (_, idx) => idx !== i,
                        ),
                      })
                    }
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Ej. Saber más"
                  value={newQrTitle}
                  className="text-sm"
                  onChange={(e) => setNewQrTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addQuickReply();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuickReply}
                  disabled={!newQrTitle.trim()}
                >
                  <PlusIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Location step form ───────────────────────────────────────────────────────

function parseGoogleMapsUrl(url: string): { latitude: number; longitude: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { latitude: parseFloat(qMatch[1]), longitude: parseFloat(qMatch[2]) };
  return null;
}

type LocationStep = Extract<QuickReplyStep, { type: "location" }>;

function LocationStepForm({
  step,
  onChange,
  id1, id2, id3, id4,
}: {
  step: LocationStep;
  onChange: (s: QuickReplyStep) => void;
  id1: string; id2: string; id3: string; id4: string;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleUrlChange(raw: string) {
    setUrlInput(raw);
    const direct = parseGoogleMapsUrl(raw);
    if (direct) {
      onChange({ ...step, latitude: direct.latitude, longitude: direct.longitude });
      return;
    }
    if (raw.includes("goo.gl") || raw.includes("maps.app")) {
      setResolving(true);
      try {
        const res = await fetch(`/api/resolve-maps-url?url=${encodeURIComponent(raw)}`);
        if (res.ok) {
          const { resolved } = await res.json() as { resolved: string };
          const coords = parseGoogleMapsUrl(resolved);
          if (coords) onChange({ ...step, latitude: coords.latitude, longitude: coords.longitude });
        }
      } catch {}
      setResolving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-muted-foreground">
          URL de Google Maps <span className="font-normal opacity-60">(extrae coordenadas automáticamente)</span>
        </Label>
        <div className="relative">
          <Input
            placeholder="https://maps.google.com/... o maps.app.goo.gl/..."
            value={urlInput}
            onChange={(e) => { void handleUrlChange(e.target.value); }}
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
          <Label htmlFor={id1} className="text-[12px] text-muted-foreground">Latitud</Label>
          <Input
            id={id1}
            type="number"
            placeholder="0.000000"
            value={step.latitude || ""}
            onChange={(e) => onChange({ ...step, latitude: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id2} className="text-[12px] text-muted-foreground">Longitud</Label>
          <Input
            id={id2}
            type="number"
            placeholder="0.000000"
            value={step.longitude || ""}
            onChange={(e) => onChange({ ...step, longitude: parseFloat(e.target.value) || 0 })}
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
          onChange={(e) => onChange({ ...step, name: e.target.value || undefined })}
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
          onChange={(e) => onChange({ ...step, address: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

// ─── Inline step form body ────────────────────────────────────────────────────

function StepFormBody({
  step,
  onChange,
}: {
  step: QuickReplyStep;
  onChange: (step: QuickReplyStep) => void;
}) {
  const id1 = useId();
  const id2 = useId();
  const id3 = useId();
  const id4 = useId();
  const id5 = useId();

  if (step.type === "text") {
    return (
      <Textarea
        autoFocus
        placeholder="Escribe el mensaje de texto..."
        className="min-h-24 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
        value={step.text}
        onChange={(e) => onChange({ ...step, text: e.target.value })}
      />
    );
  }

  if (step.type === "image") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id1} className="text-[12px] text-muted-foreground">
            Imagen
          </Label>
          <FileUpload
            value={step.url}
            accept="image/*"
            onChange={(url) => onChange({ ...step, url })}
            onUpload={uploadQuickReplyImage}
            onRemove={deleteQuickReplyImage}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id2} className="text-[12px] text-muted-foreground">
            Descripción <span className="font-normal opacity-60">(opcional)</span>
          </Label>
          <Input
            id={id2}
            placeholder="Descripción de la imagen"
            value={step.caption ?? ""}
            onChange={(e) =>
              onChange({ ...step, caption: e.target.value || undefined })
            }
          />
        </div>
      </div>
    );
  }

  if (step.type === "carousel") {
    const updateCard = (i: number, card: CarouselCard) =>
      onChange({
        ...step,
        cards: step.cards.map((c, idx) => (idx === i ? card : c)),
      });
    const addCard = () =>
      onChange({
        ...step,
        cards: [...step.cards, { id: crypto.randomUUID(), title: "" }],
      });
    const removeCard = (i: number) => {
      const card = step.cards[i];
      if (card?.imageUrl) void deleteQuickReplyImage(card.imageUrl).catch(() => undefined);
      onChange({ ...step, cards: step.cards.filter((_, idx) => idx !== i) });
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id1} className="text-[12px] text-muted-foreground">
            Mensaje introductorio{" "}
            <span className="font-normal opacity-60">(opcional)</span>
          </Label>
          <Input
            id={id1}
            placeholder="Ej. Mira nuestras opciones disponibles..."
            value={step.text ?? ""}
            onChange={(e) =>
              onChange({ ...step, text: e.target.value || undefined })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-[12px] text-muted-foreground">
            Tarjetas ({step.cards.length})
          </Label>
          {step.cards.map((card, i) => (
            <CarouselCardEditor
              key={card.id}
              index={i}
              card={card}
              onChange={(c) => updateCard(i, c)}
              onRemove={() => removeCard(i)}
            />
          ))}
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/30 hover:text-foreground"
          >
            <PlusIcon className="size-4" />
            Agregar tarjeta
          </button>
        </div>
      </div>
    );
  }

  if (step.type === "document") {
    return (
      <div className="flex flex-col gap-3">
        <FileUpload
          value={step.url}
          filename={step.filename}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,application/vnd.ms-*"
          onChange={(url, meta) =>
            onChange({ ...step, url, filename: meta?.filename ?? step.filename })
          }
          onUpload={uploadQuickReplyImage}
          onRemove={deleteQuickReplyImage}
          maxSizeMb={10}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id1} className="text-[12px] text-muted-foreground">
            Nombre del archivo
          </Label>
          <Input
            id={id1}
            placeholder="Guía de usuario.pdf"
            value={step.filename}
            onChange={(e) => onChange({ ...step, filename: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id2} className="text-[12px] text-muted-foreground">
            Descripción <span className="font-normal opacity-60">(opcional)</span>
          </Label>
          <Input
            id={id2}
            placeholder="Descripción del documento"
            value={step.caption ?? ""}
            onChange={(e) =>
              onChange({ ...step, caption: e.target.value || undefined })
            }
          />
        </div>
      </div>
    );
  }

  if (step.type === "cta_url") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id1} className="text-[12px] text-muted-foreground">
            Mensaje
          </Label>
          <Textarea
            id={id1}
            placeholder="Texto que acompaña al botón..."
            className="min-h-20 resize-none text-sm"
            value={step.text}
            onChange={(e) => onChange({ ...step, text: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id2} className="text-[12px] text-muted-foreground">
              Texto del botón
            </Label>
            <Input
              id={id2}
              placeholder="Ver más"
              value={step.displayText}
              onChange={(e) =>
                onChange({ ...step, displayText: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id3} className="text-[12px] text-muted-foreground">
              URL destino
            </Label>
            <Input
              id={id3}
              placeholder="https://..."
              value={step.buttonUrl}
              onChange={(e) => onChange({ ...step, buttonUrl: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id4} className="text-[12px] text-muted-foreground">
            Imagen de cabecera{" "}
            <span className="font-normal opacity-60">(opcional)</span>
          </Label>
          <FileUpload
            value={step.headerImageUrl ?? ""}
            accept="image/*"
            onChange={(v) =>
              onChange({ ...step, headerImageUrl: v || undefined })
            }
            onUpload={uploadQuickReplyImage}
            onRemove={deleteQuickReplyImage}
            previewHeight="h-28"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id5} className="text-[12px] text-muted-foreground">
            Footer <span className="font-normal opacity-60">(opcional)</span>
          </Label>
          <Input
            id={id5}
            placeholder="Texto de pie de mensaje"
            value={step.footer ?? ""}
            onChange={(e) =>
              onChange({ ...step, footer: e.target.value || undefined })
            }
          />
        </div>
      </div>
    );
  }

  if (step.type === "location") {
    return <LocationStepForm step={step} onChange={onChange} id1={id1} id2={id2} id3={id3} id4={id4} />;
  }

  return null;
}

// ─── Step card (the node) ─────────────────────────────────────────────────────

type StepEntry = { id: string; step: QuickReplyStep };

function StepCard({
  entry,
  index,
  isNew,
  onChange,
  onDelete,
}: {
  entry: StepEntry;
  index: number;
  isNew: boolean;
  onChange: (step: QuickReplyStep) => void;
  onDelete: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const meta = STEP_META[entry.step.type];
  const Icon = meta.icon;

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
      className={cn(
        "rounded-2xl border bg-card shadow-xs",
        isNew && "ring-2 ring-primary/40 ring-offset-1",
        isDragging && "opacity-50",
      )}
    >
      {/* Header is the drag handle */}
      <div
        className="flex cursor-grab items-center gap-2 px-4 py-3 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground/30" />
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            meta.bg,
          )}
        >
          <Icon className={cn("size-3.5", meta.color)} />
        </div>
        <span className="flex-1 text-[13px] font-semibold text-foreground/80">
          {meta.label}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          #{index + 1}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="ml-1 flex size-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Eliminar paso"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>

      {/* Card body — inputs naturally don't bubble pointer events to header */}
      <div className="border-t px-4 pb-4 pt-3">
        <StepFormBody step={entry.step} onChange={onChange} />
      </div>
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
        await queryClient.cancelQueries({ queryKey: listQueryOptions.queryKey });
        const prev = queryClient.getQueryData(listQueryOptions.queryKey);
        const optimistic = { id: `optimistic-${crypto.randomUUID()}`, name: input.name, shortcut: input.shortcut as string | undefined, steps: input.steps as QuickReplyStep[] };
        queryClient.setQueryData(listQueryOptions.queryKey, (old) =>
          old ? [optimistic, ...old] : [optimistic],
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) queryClient.setQueryData(listQueryOptions.queryKey, ctx.prev);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
    }),
  );

  const updateReply = useMutation(
    trpc.quickReplies.update.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
    }),
  );

  const [name, setName] = useState(initialValue?.name ?? "");
  const [shortcut, setShortcut] = useState(initialValue?.shortcut?.replace(/^\//, "") ?? "");
  const [entries, setEntries] = useState<StepEntry[]>(
    () => (initialValue?.steps ?? []).map((step) => ({ id: crypto.randomUUID(), step })),
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
      setEntries((initialValue?.steps ?? []).map((step) => ({ id: crypto.randomUUID(), step })));
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
      for (const url of urls) void deleteQuickReplyImage(url).catch(() => undefined);
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

  const atMax = entries.length >= MAX_STEPS;
  const canSave = name.trim().length > 0 && entries.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEditing ? "Editar respuesta rápida" : "Nueva respuesta rápida"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica la secuencia de mensajes." : `Crea una secuencia de hasta ${MAX_STEPS} mensajes para enviar de forma rápida.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-6 py-5">
            {/* Name + Shortcut */}
            <div className="flex gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor={nameId}>Nombre</Label>
                <Input
                  id={nameId}
                  placeholder="Ej. Bienvenida"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex w-32 shrink-0 flex-col gap-1.5">
                <Label htmlFor={shortcutId}>
                  Atajo{" "}
                  <span className="font-normal text-muted-foreground">
                    (opc.)
                  </span>
                </Label>
                <div className="flex items-center rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <span className="pl-3 font-mono text-[13px] text-muted-foreground select-none">/</span>
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

            {/* Sortable step cards */}
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
                  {entries.map((entry, i) => (
                    <StepCard
                      key={entry.id}
                      entry={entry}
                      index={i}
                      isNew={newestId === entry.id}
                      onChange={(s) => updateStep(entry.id, s)}
                      onDelete={() => removeStep(entry.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add message type buttons */}
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
                      <span className="text-[13px] font-medium">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

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
