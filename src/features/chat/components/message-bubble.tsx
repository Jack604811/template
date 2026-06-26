"use client";

import { useDrag } from "@use-gesture/react";
import {
  ArchiveIcon,
  CheckIcon,
  CheckCheckIcon,
  CornerUpLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  PlayCircleIcon,
  RefreshCwIcon,
  UserRoundIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AudioSpeed,
  AUDIO_SPEEDS,
  formatAudioTime,
  getStoredAudioSpeed,
  storeAudioSpeed,
} from "@/components/ui/audio-player";
import { StaticWaveform } from "@/components/ui/waveform";
import { cn } from "@/lib/utils";
import { MessageContextMenu } from "./message-context-menu";
import { RepliedMessage, type ReplyTarget } from "./replied-message";

export interface Message {
  id: string;
  role: "user" | "contact" | "system";
  text: string;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaFilename: string | null;
  createdAt: Date;
  status?: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  replyTo?: ReplyTarget;
  reactions?: { emoji: string; count: number; byMe: boolean }[];
  starred?: boolean;
  uploadProgress?: number;
  uploadFailed?: boolean;
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
}

export type { ReplyTarget };

// ─── Circular progress ───────────────────────────────────────────────────────

function CircularProgress({ value }: { value: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="white" strokeWidth="3.5"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: "stroke-dasharray 0.15s ease" }} />
    </svg>
  );
}

function MiniCircularProgress({ value }: { value: number }) {
  const r = 9;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth="2.5" />
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: "stroke-dasharray 0.15s ease" }} />
    </svg>
  );
}

function UploadOverlay({ progress, failed, onCancel, onRetry }: {
  progress: number; failed: boolean; onCancel?: () => void; onRetry?: () => void;
}) {
  if (failed) {
    return (
      <button type="button" onClick={onRetry}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/60">
        <div className="flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
          <RefreshCwIcon className="size-5 text-white" />
        </div>
        <span className="text-[11px] font-semibold text-white drop-shadow">Reintentar</span>
      </button>
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[1px]">
      <div className="relative flex items-center justify-center">
        <CircularProgress value={progress} />
        <button type="button" onClick={onCancel}
          className="absolute flex size-9 items-center justify-center rounded-full">
          <XIcon className="size-4 text-white drop-shadow" />
        </button>
      </div>
    </div>
  );
}

// ─── Global audio singleton for bubbles ──────────────────────────────────────
// One audio element + pub/sub system so ALL instances of the same bubble
// (chat, starred panel, search results, etc.) stay in sync automatically.

type PlayEvent = { activeId: string | null; playing: boolean };
type PlayListener = (e: PlayEvent) => void;
type SpeedListener = (speed: AudioSpeed) => void;

const _playListeners = new Set<PlayListener>();
const _speedListeners = new Set<SpeedListener>();
let _bubbleActiveId: string | null = null;
let _bubbleAudio: HTMLAudioElement | null = null;

function getBubbleAudio(): HTMLAudioElement {
  if (!_bubbleAudio) _bubbleAudio = new Audio();
  return _bubbleAudio;
}

function notifyPlay(activeId: string | null, playing: boolean) {
  _bubbleActiveId = activeId;
  _playListeners.forEach((fn) => { fn({ activeId, playing }); });
}

function notifySpeed(speed: AudioSpeed) {
  _speedListeners.forEach((fn) => { fn(speed); });
}

function subscribePlay(fn: PlayListener): () => void {
  _playListeners.add(fn);
  return () => { _playListeners.delete(fn); };
}

function subscribeSpeed(fn: SpeedListener): () => void {
  _speedListeners.add(fn);
  return () => { _speedListeners.delete(fn); };
}

// ─── useAudioBubble ───────────────────────────────────────────────────────────

// Fallback bars seeded from message ID so each bubble has a consistent shape
// before the real audio is analyzed.
function seedBars(seed: string, count: number): number[] {
  let h = 0;
  for (const c of seed) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Array.from({ length: count }, () => {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    return ((h >>> 0) % 8) + 1;
  });
}

function useWaveformBars(src: string | null, seed: string, barCount = 50): number[] {
  const [bars, setBars] = useState<number[]>(() => seedBars(seed, barCount));

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let ctx: AudioContext | null = null;
    const safeSrc: string = src;

    async function analyze() {
      try {
        const res = await fetch(safeSrc);
        const buffer = await res.arrayBuffer();
        ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buffer);
        if (cancelled) return;

        const data = decoded.getChannelData(0);
        const step = Math.floor(data.length / barCount);
        const raw = Array.from({ length: barCount }, (_, i) => {
          let sum = 0;
          const start = i * step;
          for (let j = start; j < start + step; j++) sum += Math.abs(data[j]);
          return sum / step;
        });

        const max = Math.max(...raw, 0.0001);
        setBars(raw.map((v) => Math.max(1, Math.round((v / max) * 8) + 1)));
      } catch {
        // keep seed bars on error
      } finally {
        void ctx?.close();
      }
    }

    void analyze();
    return () => { cancelled = true; };
  }, [src, barCount]);

  return bars;
}

function useAudioBubble(src: string | null, bubbleId: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<AudioSpeed>(getStoredAudioSpeed);
  // Refs let event callbacks read current values without stale closures
  const isPlayingRef = useRef(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Audio element event listeners (always attached, guard by bubbleId)
  useEffect(() => {
    const audio = getBubbleAudio();

    const onTime = () => {
      if (_bubbleActiveId !== bubbleId) return;
      setCurrentTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onDur = () => {
      if (_bubbleActiveId === bubbleId) setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onEnded = () => {
      if (!isPlayingRef.current) return;
      notifyPlay(null, false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("ended", onEnded);
    };
  }, [bubbleId]);

  // Subscribe to play/pause events — keeps ALL instances of this bubble in sync
  useEffect(() => {
    return subscribePlay(({ activeId, playing }) => {
      const mine = activeId === bubbleId;
      const next = mine && playing;
      if (isPlayingRef.current !== next) {
        isPlayingRef.current = next;
        setIsPlaying(next);
      }
      // Reset position when a different bubble becomes active
      if (!mine && activeId !== null) setCurrentTime(0);
    });
  }, [bubbleId]);

  // Subscribe to speed changes — keeps ALL instances of this bubble in sync
  useEffect(() => {
    return subscribeSpeed((next) => {
      speedRef.current = next;
      setSpeed(next);
    });
  }, []);

  const toggle = useCallback(() => {
    if (!src) return;
    const audio = getBubbleAudio();
    if (_bubbleActiveId === bubbleId && isPlayingRef.current) {
      // Notify first so isPlayingRef is false before audio.pause() fires the pause event
      notifyPlay(bubbleId, false);
      audio.pause();
    } else {
      if (audio.src !== src) {
        audio.src = src;
        audio.currentTime = 0;
        setCurrentTime(0);
        setDuration(0);
      }
      audio.playbackRate = speedRef.current;
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
      notifyPlay(bubbleId, true);
      void audio.play();
    }
  }, [src, bubbleId]);

  const seek = useCallback((progress: number) => {
    if (_bubbleActiveId !== bubbleId) return;
    const audio = getBubbleAudio();
    if (audio.duration) audio.currentTime = progress * audio.duration;
  }, [bubbleId]);

  const cycleSpeed = useCallback(() => {
    const idx = AUDIO_SPEEDS.indexOf(speedRef.current);
    const next = AUDIO_SPEEDS[(idx + 1) % AUDIO_SPEEDS.length];
    storeAudioSpeed(next);
    if (_bubbleActiveId === bubbleId) getBubbleAudio().playbackRate = next;
    notifySpeed(next);
  }, [bubbleId]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return { isPlaying, progress, currentTime, duration, speed, toggle, seek, cycleSpeed };
}

// ─── Content bubbles ─────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function AudioBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const bars = useWaveformBars(message.mediaUrl ?? null, message.id);
  const player = useAudioBubble(message.mediaUrl ?? null, message.id);

  const timeLabel = player.isPlaying && player.duration > 0
    ? formatAudioTime(player.currentTime)
    : formatAudioTime(player.duration);

  return (
    <div className="flex w-64 items-center gap-2 py-0.5">
      {/* Play / Pause */}
      <button
        type="button"
        onClick={player.toggle}
        disabled={!message.mediaUrl}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
          isUser
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-foreground/10 hover:bg-foreground/18 text-foreground",
          !message.mediaUrl && "opacity-40 cursor-not-allowed",
        )}
        aria-label={player.isPlaying ? "Pause" : "Play"}
      >
        {player.isPlaying
          ? <PauseIcon className="size-4" fill="currentColor" />
          : <PlayIcon className="size-4 translate-x-px" fill="currentColor" />}
      </button>

      {/* Waveform */}
      <StaticWaveform
        bars={bars}
        progress={player.progress}
        isUser={isUser}
        onSeek={message.mediaUrl ? player.seek : undefined}
        className="min-w-0 flex-1"
      />

      {/* Duration */}
      <span className={cn(
        "shrink-0 text-[10px] tabular-nums leading-none",
        isUser ? "text-primary-foreground/50" : "text-muted-foreground/70",
      )}>
        {timeLabel}
      </span>

      {/* Speed */}
      <button
        type="button"
        onClick={player.cycleSpeed}
        className={cn(
          "shrink-0 text-[11px] font-bold tabular-nums transition-colors select-none",
          isUser ? "text-primary-foreground/80" : "text-foreground/70",
        )}
        aria-label={`Speed ${player.speed}x, tap to change`}
      >
        {player.speed}x
      </button>
    </div>
  );
}

function ImageBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const uploading = message.uploadProgress !== undefined;
  return (
    <div className="flex flex-col">
      <div className="relative">
        {message.mediaUrl ? (
          <NextImage src={message.mediaUrl} alt="imagen" width={256} height={256}
            className="block h-auto w-64 max-h-full rounded-xl object-cover" unoptimized />
        ) : (
          <div className={cn("flex h-40 w-64 items-center justify-center rounded-xl",
            isUser ? "bg-primary-foreground/10" : "bg-foreground/8")}>
            <ImageIcon className={cn("size-8", isUser ? "text-primary-foreground/40" : "text-foreground/20")} />
          </div>
        )}
        {uploading && (
          <UploadOverlay progress={message.uploadProgress ?? 0} failed={message.uploadFailed ?? false}
            onCancel={message.onCancelUpload} onRetry={message.onRetryUpload} />
        )}
      </div>
      {message.text && message.text !== "[image]" && (
        <p className="mt-1 px-1 text-[13px] leading-snug">{message.text}</p>
      )}
    </div>
  );
}

function VideoBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const uploading = message.uploadProgress !== undefined;
  return (
    <div className="flex flex-col">
      <div className="relative">
        {message.mediaUrl ? (
          <video src={message.mediaUrl} controls={!uploading}
            className="w-64 max-h-64 rounded-xl object-contain" preload="metadata">
            <track kind="captions" />
          </video>
        ) : (
          <div className={cn("relative flex h-40 w-64 items-center justify-center rounded-xl",
            isUser ? "bg-primary-foreground/10" : "bg-foreground/8")}>
            <VideoIcon className={cn("size-8", isUser ? "text-primary-foreground/40" : "text-foreground/20")} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn("flex size-12 items-center justify-center rounded-full",
                isUser ? "bg-primary-foreground/20" : "bg-black/20")}>
                <PlayCircleIcon className={cn("size-7", isUser ? "text-primary-foreground/80" : "text-white/80")} />
              </div>
            </div>
          </div>
        )}
        {uploading && (
          <UploadOverlay progress={message.uploadProgress ?? 0} failed={message.uploadFailed ?? false}
            onCancel={message.onCancelUpload} onRetry={message.onRetryUpload} />
        )}
      </div>
      {message.text && message.text !== "[video]" && (
        <p className="mt-1 px-1 text-[13px] leading-snug">{message.text}</p>
      )}
    </div>
  );
}

const DOC_TYPES: Record<string, { icon: React.ElementType; iconColor: string; bg: string; label: string }> = {
  pdf:  { icon: FileTextIcon,        iconColor: "text-red-500",    bg: "bg-red-500/12",    label: "PDF" },
  doc:  { icon: FileTextIcon,        iconColor: "text-blue-500",   bg: "bg-blue-500/12",   label: "Word" },
  docx: { icon: FileTextIcon,        iconColor: "text-blue-500",   bg: "bg-blue-500/12",   label: "Word" },
  xls:  { icon: FileSpreadsheetIcon, iconColor: "text-green-500",  bg: "bg-green-500/12",  label: "Excel" },
  xlsx: { icon: FileSpreadsheetIcon, iconColor: "text-green-500",  bg: "bg-green-500/12",  label: "Excel" },
  csv:  { icon: FileSpreadsheetIcon, iconColor: "text-green-500",  bg: "bg-green-500/12",  label: "CSV" },
  ppt:  { icon: FileIcon,            iconColor: "text-orange-500", bg: "bg-orange-500/12", label: "PowerPoint" },
  pptx: { icon: FileIcon,            iconColor: "text-orange-500", bg: "bg-orange-500/12", label: "PowerPoint" },
  zip:  { icon: ArchiveIcon,         iconColor: "text-yellow-500", bg: "bg-yellow-500/12", label: "ZIP" },
  rar:  { icon: ArchiveIcon,         iconColor: "text-yellow-500", bg: "bg-yellow-500/12", label: "RAR" },
  "7z": { icon: ArchiveIcon,         iconColor: "text-yellow-500", bg: "bg-yellow-500/12", label: "7Z" },
};

function DocumentBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const filename = message.mediaFilename ?? "Documento";
  const rawExt = filename.split(".").pop()?.toLowerCase() ?? "";
  const docType = DOC_TYPES[rawExt];
  const Icon = docType?.icon ?? FileIcon;
  const iconColor = isUser ? "text-primary-foreground/90" : (docType?.iconColor ?? "text-foreground/60");
  const bgColor = isUser ? "bg-primary-foreground/15" : (docType?.bg ?? "bg-foreground/8");
  const label = (docType?.label ?? rawExt.toUpperCase()) || "Archivo";
  const uploading = message.uploadProgress !== undefined;

  return (
    <div className="w-56">
      <div className="flex items-center gap-3 py-0.5 pr-0.5">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", bgColor)}>
          <Icon className={cn("size-5", iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">{filename}</p>
          <p className={cn("mt-0.5 text-[11px]", isUser ? "text-primary-foreground/55" : "text-muted-foreground")}>
            {uploading && !message.uploadFailed ? `${message.uploadProgress}%` : label}
          </p>
        </div>
        {uploading ? (
          <button type="button"
            onClick={message.uploadFailed ? message.onRetryUpload : message.onCancelUpload}
            className={cn("flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              isUser ? "bg-primary-foreground/15 hover:bg-primary-foreground/25" : "bg-foreground/8 hover:bg-foreground/15")}>
            {message.uploadFailed
              ? <RefreshCwIcon className="size-3.5 text-destructive" />
              : <MiniCircularProgress value={message.uploadProgress ?? 0} />}
          </button>
        ) : message.mediaUrl ? (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              const url = message.mediaUrl ?? "";
              try {
                const res = await fetch(url);
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = objectUrl;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(objectUrl);
              } catch {
                window.open(url, "_blank");
              }
            }}
            className={cn("flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              isUser ? "bg-primary-foreground/15 hover:bg-primary-foreground/25" : "bg-foreground/8 hover:bg-foreground/15")}
          >
            <DownloadIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      {uploading && !message.uploadFailed && (
        <div className={cn("mt-1.5 h-[3px] w-full overflow-hidden rounded-full",
          isUser ? "bg-primary-foreground/15" : "bg-foreground/10")}>
          <div className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${message.uploadProgress}%` }} />
        </div>
      )}
    </div>
  );
}

function LocationBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const placeName = message.mediaFilename ?? "";
  const geoMatch = message.mediaUrl?.match(/^geo:(-?[\d.]+),(-?[\d.]+)/);
  const lat = geoMatch?.[1];
  const lon = geoMatch?.[2];
  const mapsUrl = lat && lon
    ? `https://maps.google.com/?q=${lat},${lon}`
    : placeName ? `https://maps.google.com/?q=${encodeURIComponent(placeName)}` : null;

  return (
    <a href={mapsUrl ?? undefined} target="_blank" rel="noreferrer"
      className={cn("block w-64 overflow-hidden rounded-2xl", !mapsUrl && "pointer-events-none")}>
      <div className={cn("relative flex h-32 items-center justify-center overflow-hidden",
        isUser ? "bg-primary-foreground/10" : "bg-emerald-950/60")}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className={cn("absolute inset-0 opacity-15", isUser ? "bg-primary-foreground" : "bg-emerald-400")}
          style={{ backgroundImage: "linear-gradient(transparent 46%, currentColor 46%, currentColor 54%, transparent 54%), linear-gradient(90deg, transparent 30%, currentColor 30%, currentColor 36%, transparent 36%)", backgroundSize: "80px 80px" }} />
        <div className="relative flex flex-col items-center">
          <div className={cn("flex size-10 items-center justify-center rounded-full shadow-lg",
            isUser ? "bg-primary-foreground text-primary" : "bg-emerald-500 text-white")}>
            <MapPinIcon className="size-5" />
          </div>
          <div className={cn("mt-0.5 size-2 rounded-full opacity-30",
            isUser ? "bg-primary-foreground" : "bg-emerald-500")} />
        </div>
      </div>
      <div className={cn("flex items-center justify-between gap-2 px-3 py-2.5",
        isUser ? "bg-primary-foreground/10" : "bg-foreground/8")}>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold leading-tight">{placeName || "Ubicación compartida"}</p>
          {lat && lon && (
            <p className={cn("text-[10px]", isUser ? "text-primary-foreground/50" : "text-muted-foreground")}>
              {parseFloat(lat).toFixed(4)}, {parseFloat(lon).toFixed(4)}
            </p>
          )}
        </div>
        {mapsUrl && <ExternalLinkIcon className={cn("size-3.5 shrink-0", isUser ? "text-primary-foreground/60" : "text-muted-foreground")} />}
      </div>
    </a>
  );
}

function ContactBubble({ isUser }: { isUser: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 px-1 py-1.5">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary-foreground/20" : "bg-foreground/10")}>
          <UserRoundIcon className="size-5" />
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-tight">Contacto</p>
          <p className={cn("text-[11px]", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>
            Contacto de WhatsApp
          </p>
        </div>
      </div>
      <div className={cn("border-t px-3 py-2 text-center",
        isUser ? "border-primary-foreground/10" : "border-border/40")}>
        <p className={cn("text-[12px] font-medium", isUser ? "text-primary-foreground/80" : "text-primary")}>
          Ver contacto
        </p>
      </div>
    </div>
  );
}

// ─── Shared interactive card ──────────────────────────────────────────────────

type InteractiveCardProps = {
  imageUrl?: string;
  title?: string;
  description?: string;
  footer?: string;
  buttonUrl?: string;
  buttonText?: string;
  quickReplies?: { id: string; title: string }[];
};

function InteractiveCard({ imageUrl, title, description, footer, buttonUrl, buttonText, quickReplies }: InteractiveCardProps) {
  return (
    <div className="w-64 overflow-hidden rounded-xl border border-border/40 bg-card text-card-foreground">
      {imageUrl && (
        <NextImage src={imageUrl} alt="" width={256} height={160} className="block h-40 w-full object-cover" unoptimized />
      )}
      <div className="space-y-0.5 px-3 pb-2 pt-2.5">
        {title && <p className="text-[13px] font-semibold leading-tight text-foreground">{title}</p>}
        {description && <p className="text-[13px] leading-snug text-foreground">{description}</p>}
        {footer && <p className="text-[11px] text-muted-foreground">{footer}</p>}
      </div>
      {quickReplies && quickReplies.length > 0 ? (
        <div className="border-t border-border/40">
          {quickReplies.map((qr) => (
            <div
              key={qr.id}
              className="flex items-center justify-center border-b border-border/40 py-2 text-[13px] font-medium text-primary last:border-b-0"
            >
              {qr.title}
            </div>
          ))}
        </div>
      ) : buttonUrl ? (
        <a
          href={buttonUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 border-t border-border/50 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-muted/40"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLinkIcon className="size-3.5 shrink-0" />
          {buttonText ?? "Open"}
        </a>
      ) : null}
    </div>
  );
}

function CtaUrlBubble({ message }: { message: Message; isUser: boolean }) {
  let buttonText = "Open";
  let footer: string | undefined;
  let headerImageUrl: string | undefined;
  try {
    const parsed = JSON.parse(message.mediaFilename ?? "{}") as {
      displayText?: string;
      footer?: string;
      headerImageUrl?: string;
    };
    buttonText = parsed.displayText ?? "Open";
    footer = parsed.footer;
    headerImageUrl = parsed.headerImageUrl;
  } catch {}

  const bodyText = message.text && message.text !== "[interactive_cta_url]" ? message.text : undefined;

  return (
    <InteractiveCard
      imageUrl={headerImageUrl}
      description={bodyText}
      footer={footer}
      buttonUrl={message.mediaUrl ?? undefined}
      buttonText={buttonText}
    />
  );
}

function StickerBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  if (message.mediaUrl) {
    return <NextImage src={message.mediaUrl} alt="sticker" width={96} height={96} className="size-24 object-contain" unoptimized />;
  }
  return (
    <div className={cn("flex h-20 w-20 items-center justify-center rounded-2xl",
      isUser ? "bg-primary-foreground/10" : "bg-foreground/5")}>
      <FileIcon className={cn("size-8", isUser ? "text-primary-foreground/40" : "text-foreground/20")} />
    </div>
  );
}

// ─── Carousel ────────────────────────────────────────────────────────────────

type CarouselCard = {
  title?: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  quickReplies?: { id: string; title: string }[];
};

function CarouselBubble({ message }: { message: Message; isUser: boolean }) {
  let cards: CarouselCard[] = [];
  try {
    const parsed = JSON.parse(message.mediaFilename ?? "{}") as { cards?: CarouselCard[] };
    cards = parsed.cards ?? [];
  } catch {}

  return (
    <div className="w-full overflow-hidden">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card, i) => (
          <div key={`${card.title ?? ""}-${i}`} className="shrink-0">
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

export function MessageContent({ message, isUser }: { message: Message; isUser: boolean }) {
  switch (message.mediaType) {
    case "image":    return <ImageBubble message={message} isUser={isUser} />;
    case "video":    return <VideoBubble message={message} isUser={isUser} />;
    case "audio":
    case "voice":    return <AudioBubble message={message} isUser={isUser} />;
    case "document": return <DocumentBubble message={message} isUser={isUser} />;
    case "location": return <LocationBubble message={message} isUser={isUser} />;
    case "contacts": return <ContactBubble isUser={isUser} />;
    case "sticker":              return <StickerBubble message={message} isUser={isUser} />;
    case "interactive_cta_url":  return <CtaUrlBubble message={message} isUser={isUser} />;
    case "interactive_carousel": return <CarouselBubble message={message} isUser={isUser} />;
    case "button":
    case "interactive": {
      const isPlaceholder = /^\[.*?\]$/.test(message.text?.trim() ?? "");
      return <span className="leading-relaxed">{isPlaceholder ? "Button reply" : message.text}</span>;
    }
    default:                     return <span className="leading-relaxed">{message.text}</span>;
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 54;
const SWIPE_MAX = 70;

// ─── Message status icon ──────────────────────────────────────────────────────

function MessageStatusIcon({ status, insideBubble }: { status?: Message["status"]; insideBubble?: boolean }) {
  if (!status || status === "SENDING") {
    return <CheckIcon className="size-3 opacity-40" />;
  }
  if (status === "FAILED") {
    return <XIcon className="size-3 text-destructive" />;
  }
  if (status === "SENT") {
    return <CheckIcon className="size-3" />;
  }
  const readColor = insideBubble ? "opacity-100 brightness-150" : "text-primary";
  return (
    <CheckCheckIcon className={cn("size-3", status === "READ" ? readColor : "")} />
  );
}

// ─── Desktop popover menu items ───────────────────────────────────────────────

function MessageActions({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "hidden md:flex size-8 items-center justify-center rounded-full shrink-0",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        "focus-visible:opacity-100 focus-visible:outline-none",
        "bg-foreground/15 hover:bg-foreground/22",
      )}
      aria-label="Opciones del mensaje"
    >
      <MoreHorizontalIcon className="size-4 text-foreground/70" />
    </button>
  );
}

// ─── Swipeable row with long-press ───────────────────────────────────────────

interface SwipeableRowProps {
  children: (swipeProgress: number) => React.ReactNode;
  onReply: () => void;
  onLongPress: () => void;
  className?: string;
}

function SwipeableRow({ children, onReply, onLongPress, className }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [popped, setPopped] = useState(false);
  const didReply = useRef(false);

  // ─── Long press (native touch, independent of useDrag threshold) ──────────
  const lpTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lpFired = useRef(false);
  const touchOrigin = useRef({ x: 0, y: 0 });

  function onTouchStart(e: React.TouchEvent) {
    lpFired.current = false;
    touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lpTimer.current = setTimeout(() => {
      lpFired.current = true;
      onLongPress();
    }, 500);
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = Math.abs(e.touches[0].clientX - touchOrigin.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchOrigin.current.y);
    if (dx > 8 || dy > 8) clearTimeout(lpTimer.current);
  }

  function onTouchEnd() {
    clearTimeout(lpTimer.current);
  }

  // ─── Swipe gesture ────────────────────────────────────────────────────────
  const snapBack = () => {
    setSnapping(true);
    setOffset(0);
    setPopped(false);
    setTimeout(() => setSnapping(false), 340);
  };

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], first, last, cancel }) => {
      if (first) didReply.current = false;

      if (mx < 0) { cancel(); return; }

      // swipe started — cancel any pending long press
      if (mx > 8) clearTimeout(lpTimer.current);

      const eased = mx < SWIPE_THRESHOLD
        ? mx
        : SWIPE_THRESHOLD + (mx - SWIPE_THRESHOLD) * 0.2;
      const val = Math.min(Math.max(0, eased), SWIPE_MAX);

      if (!last) {
        setOffset(val);
        if (val >= SWIPE_THRESHOLD && !didReply.current) {
          didReply.current = true;
          setPopped(true);
        }
      } else {
        clearTimeout(lpTimer.current);
        const shouldReply = didReply.current || (mx > SWIPE_THRESHOLD * 0.6 && vx > 0.3);
        if (shouldReply && !lpFired.current) onReply();
        snapBack();
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true, mouse: false },
      threshold: 10,
    },
  );

  const progress = Math.min(offset / SWIPE_THRESHOLD, 1);
  const iconScale = popped ? 1.22 : 0.35 + progress * 0.65;

  return (
    <div
      className={cn("relative select-none overflow-x-clip", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1 top-1/2"
        style={{
          opacity: Math.min(progress * 1.6, 1),
          transform: `translateY(-50%) scale(${iconScale})`,
          transition: popped ? "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)" : "none",
        }}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-foreground/12">
          <CornerUpLeftIcon className="size-[15px] text-foreground/65" />
        </div>
      </div>

      <div
        {...bind()}
        style={{
          transform: `translateX(${offset}px)`,
          transition: snapping ? "transform 0.34s cubic-bezier(0.34,1.56,0.64,1)" : "none",
          touchAction: "pan-y",
        }}
      >
        {children(progress)}
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  onReply,
  onReact,
  onStar,
  onReplyClick,
  hideActions = false,
}: {
  message: Message;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onStar?: (messageId: string, starred: boolean) => void;
  onReplyClick?: (replyId: string) => void;
  hideActions?: boolean;
}) {
  const isUser = message.role === "user";
  const type = message.mediaType ?? "";
  const isNoPadding = ["image", "video", "location", "contacts", "interactive_cta_url"].includes(type);
  const isNoBubble = type === "sticker" || type === "interactive_carousel";
  const isTimeOutside = type !== "sticker";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAsText, setMenuAsText] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const headerBubbleRef = useRef<HTMLDivElement>(null);
  const reactions = message.reactions?.filter((r) => r.count > 0) ?? [];

  function handleReply() {
    onReply?.(menuAsText ? { ...message, mediaType: null } : message);
  }

  function handleReact(emoji: string) {
    onReact?.(message.id, emoji);
  }

  function openMenu() {
    if (bubbleRef.current) {
      setAnchorRect(bubbleRef.current.getBoundingClientRect());
    }
    setMenuAsText(false);
    setMenuOpen(true);
  }

  function openMenuFromHeader() {
    if (headerBubbleRef.current) {
      setAnchorRect(headerBubbleRef.current.getBoundingClientRect());
    }
    setMenuAsText(true);
    setMenuOpen(true);
  }

  const contextMessage = menuAsText ? { ...message, mediaType: null } : message;

  return (
    <>
      <MessageContextMenu
        message={contextMessage}
        isUser={isUser}
        open={menuOpen}
        anchorRect={anchorRect}
        onClose={() => { setMenuOpen(false); setMenuAsText(false); }}
        onReply={handleReply}
        onReact={handleReact}
        onStar={() => onStar?.(message.id, !message.starred)}
      />

      <SwipeableRow onReply={handleReply} onLongPress={type === "interactive_carousel" ? openMenuFromHeader : openMenu}>
        {(_swipeProgress) => (
          <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
            {type === "interactive_carousel" && message.text && message.text !== "[interactive_carousel]" && (
              <div className={cn("group flex items-center gap-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
                <div
                  ref={headerBubbleRef}
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  <span className="leading-relaxed">{message.text}</span>
                </div>
                {!hideActions && <MessageActions onOpen={openMenuFromHeader} />}
              </div>
            )}
            {type === "interactive_carousel" && reactions.length > 0 && (
              <div className={cn(
                "mt-1 flex flex-wrap gap-1",
                isUser ? "mr-1 justify-end" : "justify-start",
              )}>
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => handleReact(r.emoji)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] leading-none transition-colors",
                      r.byMe
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/60 text-foreground hover:bg-muted",
                    )}
                  >
                    <span>{r.emoji}</span>
                    {r.count > 1 && <span className="text-[11px] font-medium">{r.count}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className={cn("group flex items-center gap-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
              <div
                ref={bubbleRef}
                className={cn(
                  "relative w-fit text-sm",
                  (!type || type === "button" || type === "interactive" || type === "interactive_carousel") && "max-w-[316px] mt-2",
                  !isNoBubble && "rounded-2xl",
                  isNoPadding && "overflow-hidden p-0",
                  !isNoPadding && !isNoBubble && "px-4 py-2.5",
                  isUser
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                  isNoBubble && "bg-transparent",
                )}
              >
                {message.replyTo && (
                  <RepliedMessage
                    reply={message.replyTo}
                    isUser={isUser}
                    payload={message.mediaType === "button" ? (() => {
                      try { return (JSON.parse(message.mediaFilename ?? "{}") as { payload?: string }).payload; } catch { return undefined; }
                    })() : undefined}
                    onClick={onReplyClick && message.replyTo ? () => onReplyClick(message.replyTo?.id ?? "") : undefined}
                  />
                )}
                <MessageContent message={message} isUser={isUser} />
                {!isTimeOutside && (
                  <span className={cn(
                    "ml-8 inline-flex items-center gap-0.5 align-bottom text-[10px] leading-none",
                    isUser ? "text-primary-foreground/50" : "text-muted-foreground/60",
                  )}>
                    {formatTime(message.createdAt)}
                    {isUser && <MessageStatusIcon status={message.status} insideBubble />}
                  </span>
                )}
              </div>

              {type !== "interactive_carousel" && !hideActions && <MessageActions onOpen={openMenu} />}
            </div>

            {reactions.length > 0 && type !== "interactive_carousel" && (
              <div className={cn(
                "mt-1 flex flex-wrap gap-1",
                isUser ? "mr-1 justify-end" : "justify-start",
              )}>
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => handleReact(r.emoji)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] leading-none transition-colors",
                      r.byMe
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/60 text-foreground hover:bg-muted",
                    )}
                  >
                    <span>{r.emoji}</span>
                    {r.count > 1 && <span className="text-[11px] font-medium">{r.count}</span>}
                  </button>
                ))}
              </div>
            )}

            {isTimeOutside && (!isNoBubble || type === "interactive_carousel") && (
              <span className={cn(
                "mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60",
                isUser ? "mr-1" : "",
              )}>
                {formatTime(message.createdAt)}
                {isUser && <MessageStatusIcon status={message.status} />}
              </span>
            )}
          </div>
        )}
      </SwipeableRow>
    </>
  );
}
