"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ExternalLinkIcon,
  LinkIcon,
  MessageSquareIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

// ─── CarouselCardBubble ───────────────────────────────────────────────────────
// Mirrors InteractiveCard layout from message-bubble.tsx but with editable fields.

type CarouselCard = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  quickReplies?: Array<{ id: string; title: string; sequenceId?: string }>;
};

type Sequence = { id: string; name: string; shortcut?: string | null };

// ─── ButtonForm ───────────────────────────────────────────────────────────────
// Shared form used inside every button popover (add or edit).

function ButtonForm({
  initialType,
  initialName,
  initialUrl,
  initialSequenceId,
  sequences,
  onSave,
  onClose,
  saveLabel,
}: {
  initialType: "url" | "quickreply";
  initialName: string;
  initialUrl: string;
  initialSequenceId: string | null;
  sequences: Sequence[];
  onSave: (
    type: "url" | "quickreply",
    name: string,
    url: string,
    seqId: string | null,
  ) => void;
  onClose: () => void;
  saveLabel: string;
}) {
  const [draftType, setDraftType] = useState(initialType);
  const [draftName, setDraftName] = useState(initialName);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(
    initialSequenceId,
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 0);
  }, []);

  const canSave =
    draftName.trim().length > 0 &&
    (draftType === "url" || selectedSeqId !== null);

  function handleSave() {
    if (!canSave) return;
    onSave(draftType, draftName.trim(), draftUrl.trim(), selectedSeqId);
    onClose();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {(["url", "quickreply"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setDraftType(t)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[12px] font-medium transition-colors",
              draftType === t
                ? "border-primary bg-primary/8 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t === "url" ? (
              <>
                <LinkIcon className="size-3" /> URL
              </>
            ) : (
              <>
                <MessageSquareIcon className="size-3" /> Respuesta
              </>
            )}
          </button>
        ))}
      </div>

      <Input
        ref={nameRef}
        placeholder="Nombre del botón"
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        className="h-8 text-[13px]"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
      />

      {draftType === "url" ? (
        <Input
          placeholder="https://..."
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          className="h-8 text-[13px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
      ) : (
        <div className="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-border/60">
          {sequences.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
              No hay respuestas rápidas
            </p>
          ) : (
            sequences.map((seq) => (
              <button
                key={seq.id}
                type="button"
                onClick={() =>
                  setSelectedSeqId(seq.id === selectedSeqId ? null : seq.id)
                }
                className={cn(
                  "flex flex-col border-b border-border/40 px-3 py-2 text-left last:border-b-0 transition-colors",
                  selectedSeqId === seq.id
                    ? "bg-primary/8 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <p className="truncate text-[13px] font-medium">{seq.name}</p>
                {seq.shortcut && (
                  <p className="text-[11px] text-muted-foreground">
                    {seq.shortcut}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        className="h-8 w-full text-[13px]"
        disabled={!canSave}
        onClick={handleSave}
      >
        {saveLabel}
      </Button>
    </div>
  );
}

// ─── CarouselCardBubble ───────────────────────────────────────────────────────

interface CarouselCardBubbleProps {
  card: CarouselCard;
  onChange: (card: CarouselCard) => void;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<string>;
  onDeleteImage: (url: string) => Promise<void>;
  excludeSequenceId?: string;
}

export function CarouselCardBubble({
  card,
  onChange,
  onUpload,
  onDeleteImage,
  excludeSequenceId,
}: CarouselCardBubbleProps) {
  const trpc = useTRPC();
  const { data: allSequences = [] } = useQuery(
    trpc.quickReplies.getMany.queryOptions(),
  );
  const sequences = excludeSequenceId
    ? allSequences.filter((s) => s.id !== excludeSequenceId)
    : allSequences;

  const [ctaPopoverOpen, setCtaPopoverOpen] = useState(false);
  const [qrPopoverOpen, setQrPopoverOpen] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const hasCtaButton = Boolean(card.buttonUrl);
  const quickReplies = card.quickReplies ?? [];
  const canAddMore = !hasCtaButton && quickReplies.length < 2;

  function set<K extends keyof CarouselCard>(key: K, value: CarouselCard[K]) {
    onChange({ ...card, [key]: value });
  }

  function removeCtaButton(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ ...card, buttonText: undefined, buttonUrl: undefined });
  }

  function removeQuickReply(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onChange({
      ...card,
      quickReplies: quickReplies.filter((q) => q.id !== id),
    });
  }

  return (
    <div className="w-64 overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground">
      <FileUpload
        value={card.imageUrl ?? ""}
        accept="image/*"
        onChange={(v) => set("imageUrl", v || undefined)}
        onUpload={onUpload}
        onRemove={onDeleteImage}
        previewHeight="h-40"
        zoneClassName="border-0 rounded-none"
      />

      <div className="space-y-0.5 px-3 pb-2 pt-2.5">
        <input
          type="text"
          value={card.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Título de la tarjeta"
          className="w-full bg-transparent text-[13px] font-semibold leading-tight text-foreground outline-none placeholder:text-foreground/25"
        />
        <textarea
          value={card.description ?? ""}
          onChange={(e) => set("description", e.target.value || undefined)}
          placeholder="Descripción breve..."
          rows={2}
          className="w-full resize-none bg-transparent text-[13px] leading-snug text-foreground outline-none placeholder:text-foreground/25 [field-sizing:content]"
        />
      </div>

      <div className="border-t border-border/40">
        {/* CTA button row — click text to edit, X to delete */}
        {hasCtaButton && (
          <div className="group flex items-center gap-1.5 px-3 py-2.5">
            <ExternalLinkIcon className="size-3.5 shrink-0 text-primary/60" />
            <Popover open={ctaPopoverOpen} onOpenChange={setCtaPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex-1 truncate text-center text-[13px] font-medium text-primary hover:opacity-70"
                >
                  {card.buttonText}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="w-64 p-3">
                <ButtonForm
                  initialType="url"
                  initialName={card.buttonText ?? ""}
                  initialUrl={card.buttonUrl ?? ""}
                  initialSequenceId={null}
                  sequences={sequences}
                  saveLabel="Guardar"
                  onClose={() => setCtaPopoverOpen(false)}
                  onSave={(type, name, url, seqId) => {
                    if (type === "url") {
                      onChange({
                        ...card,
                        buttonText: name,
                        buttonUrl: url || "#",
                      });
                    } else {
                      onChange({
                        ...card,
                        buttonText: undefined,
                        buttonUrl: undefined,
                        quickReplies: [
                          {
                            id: crypto.randomUUID(),
                            title: name,
                            sequenceId: seqId ?? undefined,
                          },
                        ],
                      });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={removeCtaButton}
              className="flex size-4 items-center justify-center rounded text-muted-foreground/30 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )}

        {/* Quick reply rows — click text to edit, X to delete */}
        {quickReplies.map((qr) => (
          <div
            key={qr.id}
            className="group flex items-center border-t border-border/40 px-3 py-2"
          >
            <Popover
              open={qrPopoverOpen === qr.id}
              onOpenChange={(open) => setQrPopoverOpen(open ? qr.id : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex-1 truncate text-center text-[13px] font-medium text-primary hover:opacity-70"
                >
                  {qr.title}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="w-64 p-3">
                <ButtonForm
                  initialType="quickreply"
                  initialName={qr.title}
                  initialUrl=""
                  initialSequenceId={qr.sequenceId ?? null}
                  sequences={sequences}
                  saveLabel="Guardar"
                  onClose={() => setQrPopoverOpen(null)}
                  onSave={(type, name, url, seqId) => {
                    if (type === "quickreply") {
                      onChange({
                        ...card,
                        quickReplies: quickReplies.map((q) =>
                          q.id === qr.id
                            ? {
                                ...q,
                                title: name,
                                sequenceId: seqId ?? undefined,
                              }
                            : q,
                        ),
                      });
                    } else {
                      onChange({
                        ...card,
                        quickReplies: undefined,
                        buttonText: name,
                        buttonUrl: url || "#",
                      });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={(e) => removeQuickReply(e, qr.id)}
              className="flex size-4 items-center justify-center rounded text-muted-foreground/30 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}

        {/* Add button trigger */}
        {canAddMore && (
          <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] text-muted-foreground/60 transition-colors hover:text-muted-foreground",
                  (hasCtaButton || quickReplies.length > 0) &&
                    "border-t border-border/40",
                )}
              >
                <PlusIcon className="size-3.5" />
                Agregar botón
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="center" className="w-64 p-3">
              <ButtonForm
                initialType="url"
                initialName=""
                initialUrl=""
                initialSequenceId={null}
                sequences={sequences}
                saveLabel="Agregar"
                onClose={() => setAddPopoverOpen(false)}
                onSave={(type, name, url, seqId) => {
                  if (type === "url") {
                    onChange({
                      ...card,
                      buttonText: name,
                      buttonUrl: url || "#",
                      quickReplies: undefined,
                    });
                  } else {
                    onChange({
                      ...card,
                      quickReplies: [
                        ...quickReplies,
                        {
                          id: crypto.randomUUID(),
                          title: name,
                          sequenceId: seqId ?? undefined,
                        },
                      ],
                      buttonText: undefined,
                      buttonUrl: undefined,
                    });
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// ─── CtaUrlBubble ─────────────────────────────────────────────────────────────
// Mirrors InteractiveCard layout for CTA URL steps.

type CtaUrlStep = {
  type: "cta_url";
  text: string;
  buttonUrl: string;
  displayText: string;
  headerImageUrl?: string;
  footer?: string;
};

interface CtaUrlBubbleProps {
  step: CtaUrlStep;
  onChange: (step: CtaUrlStep) => void;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<string>;
  onDeleteImage: (url: string) => Promise<void>;
}

export function CtaUrlBubble({
  step,
  onChange,
  onUpload,
  onDeleteImage,
}: CtaUrlBubbleProps) {
  return (
    <div className="w-64 overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground">
      <FileUpload
        value={step.headerImageUrl ?? ""}
        accept="image/*"
        onChange={(v) => onChange({ ...step, headerImageUrl: v || undefined })}
        onUpload={onUpload}
        onRemove={onDeleteImage}
        previewHeight="h-40"
        zoneClassName="border-0 rounded-none"
      />

      <div className="space-y-0.5 px-3 pb-2 pt-2.5">
        <textarea
          value={step.text}
          onChange={(e) => onChange({ ...step, text: e.target.value })}
          placeholder="Texto del mensaje..."
          rows={3}
          className="w-full resize-none bg-transparent text-[13px] leading-snug text-foreground outline-none placeholder:text-foreground/25 [field-sizing:content]"
        />
        <input
          type="text"
          value={step.footer ?? ""}
          onChange={(e) =>
            onChange({ ...step, footer: e.target.value || undefined })
          }
          placeholder="Pie de mensaje (opcional)"
          className="w-full bg-transparent text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t border-border/50 px-3 py-2.5">
        <ExternalLinkIcon className="size-3.5 shrink-0 text-primary/60" />
        <input
          type="text"
          value={step.displayText}
          onChange={(e) => onChange({ ...step, displayText: e.target.value })}
          placeholder="Texto del botón"
          className="min-w-0 flex-1 bg-transparent text-center text-[13px] font-medium text-primary outline-none placeholder:text-primary/30"
        />
        <input
          type="text"
          value={step.buttonUrl}
          onChange={(e) => onChange({ ...step, buttonUrl: e.target.value })}
          placeholder="https://..."
          className="min-w-0 flex-1 bg-transparent text-right text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/30"
        />
      </div>
    </div>
  );
}
