"use client";

import {
  BookOpenIcon,
  ImageIcon,
  LayoutTemplateIcon,
  LoaderIcon,
  MapPinIcon,
  MessageSquareQuoteIcon,
  MicIcon,
  PlusIcon,
  SendHorizonalIcon,
  ShoppingBagIcon,
  SmileIcon,
  SquareIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { compressImage } from "../lib/compress";
import { CatalogPicker } from "./catalog-picker";
import type { ReplyTarget } from "./replied-message";
import { ReplyInputPreview } from "./reply-input-preview";
import { TemplatePicker } from "./template-picker";

export interface SendPayload {
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
  replyTo?: ReplyTarget;
}

const MAX_BYTES = 25 * 1024 * 1024;

interface PendingImage {
  id: string;
  file: File;
  objectUrl: string;
}

interface MessageInputProps {
  conversationId?: string;
  credentialId?: string | null;
  replyTo?: ReplyTarget;
  onCancelReply?: () => void;
  onSend?: (payload: SendPayload) => void;
  onSendMedia?: (file: File, caption: string) => void;
}

const ACTION_OPTIONS = [
  { id: "location",      label: "Ubicación",         icon: MapPinIcon              },
  { id: "quick-replies", label: "Respuestas rápidas", icon: MessageSquareQuoteIcon  },
  { id: "catalog",       label: "Catálogo",           icon: ShoppingBagIcon         },
  { id: "templates",     label: "Plantillas",         icon: LayoutTemplateIcon      },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Voice recorder hook ──────────────────────────────────────────────────────

type RecordState = "idle" | "requesting" | "recording";

function useVoiceRecorder(onStop: (file: File) => void) {
  const [state, setState] = useState<RecordState>("idle");
  const [duration, setDuration] = useState(0);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create AudioContext immediately after getUserMedia (still in the user-gesture
      // async chain) so Chrome doesn't suspend it.
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/mp4";
      mimeTypeRef.current = mimeType;

      const mr = new MediaRecorder(stream, { mimeType });
      mrRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const ext = mimeTypeRef.current.includes("ogg") ? "ogg"
          : mimeTypeRef.current.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeTypeRef.current });
        onStopRef.current(file);
        stream.getTracks().forEach((t) => { t.stop(); });
      };

      mr.start(100);
      setState("recording");

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } catch {
      setState("idle");
    }
  }, [state]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    const mr = mrRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    mrRef.current = null;
    setState("idle");
    setDuration(0);
  }, []);

  const cancel = useCallback(() => {
    clearInterval(timerRef.current);
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    const mr = mrRef.current;
    if (mr) {
      mr.ondataavailable = null;
      mr.onstop = null;
      if (mr.state !== "inactive") mr.stop();
      mrRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => { t.stop(); });
    streamRef.current = null;
    setState("idle");
    setDuration(0);
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { state, duration, start, stop, cancel, analyserRef };
}

// ─── Recording bar ────────────────────────────────────────────────────────────

function RecordingBar({
  duration,
  analyserRef,
  onCancel,
  onStop,
}: {
  duration: number;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onCancel: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Cancelar grabación"
      >
        <Trash2Icon className="size-4" />
      </button>

      <LiveWaveform
        analyserRef={analyserRef}
        height={32}
        barWidth={3}
        barGap={2}
        speed={35}
        fadeEdges={true}
        barColor="primary"
        mode="scrolling"
        className="flex-1"
      />

      <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
        {formatDuration(duration)}
      </span>

      <button
        type="button"
        onClick={onStop}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        aria-label="Detener y enviar"
      >
        <SquareIcon className="size-[14px] fill-current" />
      </button>
    </div>
  );
}

// ─── MessageInput ─────────────────────────────────────────────────────────────

export function MessageInput({
  conversationId,
  credentialId,
  replyTo,
  onCancelReply,
  onSend,
  onSendMedia,
}: MessageInputProps) {
  const { textInput } = usePromptInputController();
  const hasText = textInput.value.trim().length > 0;

  const formRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  useEffect(() => {
    return () => { pendingImagesRef.current.forEach((p) => { URL.revokeObjectURL(p.objectUrl); }); };
  }, []);

  const recorder = useVoiceRecorder(useCallback((file: File) => {
    onSendMedia?.(file, "");
  }, [onSendMedia]));

  const isRequesting = recorder.state === "requesting";
  const isRecording  = recorder.state === "recording";

  const hasPending = pendingImages.length > 0;
  const canSend = hasText || hasPending;

  async function handleTextSubmit({ text }: { text: string }) {
    if (!canSend) return;
    for (const pending of pendingImages) {
      await onSendMedia?.(pending.file, "");
      URL.revokeObjectURL(pending.objectUrl);
    }
    setPendingImages([]);
    if (text.trim()) {
      onSend?.({ text, replyTo });
      onCancelReply?.();
    }
    formRef.current?.querySelector("textarea")?.focus();
  }

  async function handleImageFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !conversationId) return;

    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) { alert("El archivo no puede superar 25 MB."); return; }

    const compressed = await Promise.all(
      files.map((f) => f.type.startsWith("image/") ? compressImage(f) : Promise.resolve(f)),
    );

    const next: PendingImage[] = compressed.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      objectUrl: URL.createObjectURL(file),
    }));

    setPendingImages((prev) => [...prev, ...next]);
    setPopoverOpen(false);
  }

  async function handleDocFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw || !conversationId) return;
    if (raw.size > MAX_BYTES) { alert("El archivo no puede superar 25 MB."); return; }
    onSendMedia?.(raw, "");
    formRef.current?.querySelector("textarea")?.focus();
  }

  function removePendingImage(id: string) {
    setPendingImages((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handleActionClick(id: string) {
    setPopoverOpen(false);
    if (id === "templates") setTemplateOpen(true);
    if (id === "catalog") setCatalogOpen(true);
  }

  return (
    <div ref={formRef} className="pb-8 pt-1 md:py-4">
      {replyTo && <ReplyInputPreview reply={replyTo} onCancel={() => onCancelReply?.()} />}
      <div className="px-4">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleImageFilesChange}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,audio/*"
          className="hidden"
          onChange={handleDocFileChange}
        />

        {conversationId && credentialId && (
          <>
            <TemplatePicker
              open={templateOpen}
              onClose={() => setTemplateOpen(false)}
              conversationId={conversationId}
              credentialId={credentialId}
            />
            <CatalogPicker
              open={catalogOpen}
              onClose={() => setCatalogOpen(false)}
              conversationId={conversationId}
              credentialId={credentialId}
            />
          </>
        )}

        {isRecording ? (
          <RecordingBar
            duration={recorder.duration}
            analyserRef={recorder.analyserRef}
            onCancel={recorder.cancel}
            onStop={recorder.stop}
          />
        ) : (
          <PromptInput onSubmit={handleTextSubmit} className="[&_[data-slot=input-group]]:rounded-2xl">
            {hasPending && (
              <div className="flex w-full gap-2 overflow-x-auto px-1 pb-1 pt-2 scrollbar-none">
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.objectUrl}
                      alt={img.file.name}
                      className="size-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingImage(img.id)}
                      className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background shadow"
                      aria-label="Quitar imagen"
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <PromptInputTextarea
              placeholder="Mensaje..."
              className="min-h-0! max-h-32 py-2 text-sm"
            />
            <PromptInputFooter className="pt-1">
              <div className="flex items-center gap-1">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85"
                    >
                      <PlusIcon className="size-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" sideOffset={10} className="p-1.5 md:mb-12">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); imageInputRef.current?.click(); }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                        Imágenes
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPopoverOpen(false); docInputRef.current?.click(); }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <BookOpenIcon className="size-4 shrink-0 text-muted-foreground" />
                        Archivos
                      </button>
                      <div className="my-1 h-px bg-border" />
                      {ACTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleActionClick(opt.id)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                        >
                          <opt.icon className="size-4 shrink-0 text-muted-foreground" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <PromptInputButton tooltip="Emoji">
                  <SmileIcon className="size-6" />
                </PromptInputButton>
              </div>

              {canSend ? (
                <PromptInputSubmit className="size-10 rounded-full">
                  <SendHorizonalIcon className="size-4" />
                </PromptInputSubmit>
              ) : (
                <button
                  type="button"
                  onClick={() => { void recorder.start(); }}
                  disabled={isRequesting}
                  className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  aria-label="Grabar nota de voz"
                >
                  {isRequesting
                    ? <LoaderIcon className="size-4 animate-spin" />
                    : <MicIcon className="size-4" />}
                </button>
              )}
            </PromptInputFooter>
          </PromptInput>
        )}
      </div>
    </div>
  );
}
