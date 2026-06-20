"use client";

import { useDrag } from "@use-gesture/react";
import {
  ArchiveIcon,
  CheckIcon,
  CheckCheckIcon,
  CopyIcon,
  CornerUpLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  MapPinIcon,
  MicIcon,
  MoreHorizontalIcon,
  PlayCircleIcon,
  RefreshCwIcon,
  StarIcon,
  UserRoundIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import NextImage from "next/image";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { MessageContextMenu } from "./message-context-menu";
import { getAvatarStyle } from "../utils/avatar";
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

// ─── Content bubbles ─────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function AudioBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const bars = [3, 5, 8, 5, 9, 6, 4, 7, 5, 8, 4, 6, 9, 5, 3, 7, 8, 5, 4, 6, 8, 5, 3];
  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      <div className="flex items-center gap-2">
        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary-foreground/20" : "bg-foreground/10")}>
          <MicIcon className="size-4" />
        </div>
        <div className="flex h-8 items-end gap-px">
          {bars.map((h, i) => (
            <div key={`bar-${i}-${h}`}
              className={cn("w-[3px] rounded-full", isUser ? "bg-primary-foreground/70" : "bg-foreground/30")}
              style={{ height: `${(h / 9) * 100}%` }} />
          ))}
        </div>
      </div>
      {message.mediaUrl && (
        <audio controls src={message.mediaUrl} className="h-8 w-full min-w-[200px]">
          <track kind="captions" />
        </audio>
      )}
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
          <a href={message.mediaUrl} download={filename} target="_blank" rel="noreferrer"
            className={cn("flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              isUser ? "bg-primary-foreground/15 hover:bg-primary-foreground/25" : "bg-foreground/8 hover:bg-foreground/15")}
            onClick={(e) => e.stopPropagation()}>
            <DownloadIcon className="size-3.5" />
          </a>
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

function MessageContent({ message, isUser }: { message: Message; isUser: boolean }) {
  switch (message.mediaType) {
    case "image":    return <ImageBubble message={message} isUser={isUser} />;
    case "video":    return <VideoBubble message={message} isUser={isUser} />;
    case "audio":
    case "voice":    return <AudioBubble message={message} isUser={isUser} />;
    case "document": return <DocumentBubble message={message} isUser={isUser} />;
    case "location": return <LocationBubble message={message} isUser={isUser} />;
    case "contacts": return <ContactBubble isUser={isUser} />;
    case "sticker":  return <StickerBubble message={message} isUser={isUser} />;
    default:         return <span className="leading-relaxed">{message.text}</span>;
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

function BubbleMenuItems({
  message,
  onReply,
  onClose,
}: {
  message: Message;
  onReply: () => void;
  onClose: () => void;
}) {
  const isMedia = !!message.mediaType && !["contacts", "location", "sticker"].includes(message.mediaType);

  function handleReply() {
    onClose();
    setTimeout(onReply, 50);
  }

  function handleCopy() {
    if (message.text) void navigator.clipboard.writeText(message.text);
    onClose();
  }

  function handleDownload() {
    if (message.mediaUrl) {
      const a = document.createElement("a");
      a.href = message.mediaUrl;
      a.download = message.mediaFilename ?? "media";
      a.click();
    }
    onClose();
  }

  const itemCls = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors hover:bg-muted active:bg-muted";

  return (
    <div className="flex flex-col">
      <button type="button" onClick={handleReply} className={itemCls}>
        <CornerUpLeftIcon className="size-4 shrink-0 text-muted-foreground" />
        Responder
      </button>
      {message.text && !message.mediaType && (
        <button type="button" onClick={handleCopy} className={itemCls}>
          <CopyIcon className="size-4 shrink-0 text-muted-foreground" />
          Copiar
        </button>
      )}
      <button type="button" onClick={onClose} className={itemCls}>
        <StarIcon className="size-4 shrink-0 text-muted-foreground" />
        Destacar
      </button>
      {isMedia && message.mediaUrl && (
        <button type="button" onClick={handleDownload} className={itemCls}>
          <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
          Descargar
        </button>
      )}
    </div>
  );
}

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

function MessageActions({ message, isUser, onReply, onReact }: { message: Message; isUser: boolean; onReply: () => void; onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "hidden md:flex size-8 items-center justify-center rounded-full shrink-0",
            "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
            "focus-visible:opacity-100 focus-visible:outline-none",
            isUser ? "bg-foreground/15 hover:bg-foreground/22" : "bg-muted hover:bg-muted/80",
          )}
          aria-label="Opciones del mensaje"
        >
          <MoreHorizontalIcon className="size-4 text-foreground/70" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={isUser ? "left" : "right"} align="center" sideOffset={6} className="w-56 p-1">
        <div className="flex items-center justify-around px-1 py-1.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onReact(emoji); setOpen(false); }}
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-[20px]",
                "transition-transform duration-100 hover:scale-125 active:scale-90",
                message.reactions?.find((r) => r.emoji === emoji && r.byMe) && "bg-primary/10 ring-1 ring-primary/30",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mx-2 mb-1 h-px bg-border/50" />
        <BubbleMenuItems message={message} onReply={onReply} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
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
  conversation,
  onReply,
  onReact,
}: {
  message: Message;
  conversation: Conversation;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}) {
  const isUser = message.role === "user";
  const type = message.mediaType ?? "";
  const isNoPadding = ["image", "video", "location", "contacts"].includes(type);
  const isNoBubble = type === "sticker";
  const isTimeOutside = type !== "sticker";
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reactions = message.reactions?.filter((r) => r.count > 0) ?? [];

  function handleReply() {
    onReply?.(message);
  }

  function handleReact(emoji: string) {
    onReact?.(message.id, emoji);
  }

  function openMenu() {
    if (bubbleRef.current) {
      setAnchorRect(bubbleRef.current.getBoundingClientRect());
    }
    setMenuOpen(true);
  }

  return (
    <>
      <MessageContextMenu
        message={message}
        isUser={isUser}
        open={menuOpen}
        anchorRect={anchorRect}
        onClose={() => setMenuOpen(false)}
        onReply={handleReply}
        onReact={handleReact}
      />

      <SwipeableRow onReply={handleReply} onLongPress={openMenu}>
        {(_swipeProgress) => (
          <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
            <div className={cn("group flex items-center gap-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
              {!isUser && (
                <Avatar className="size-7 shrink-0 self-center">
                  <AvatarFallback
                    className="text-[11px] font-semibold text-white"
                    style={getAvatarStyle(conversation.name)}
                  >
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                ref={bubbleRef}
                className={cn(
                  "relative text-sm max-w-[80vw] md:max-w-[65vw]",
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
                  <RepliedMessage reply={message.replyTo} isUser={isUser} />
                )}
                <MessageContent message={message} isUser={isUser} />
                {!isTimeOutside && (
                  <span className={cn(
                    "ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px] leading-none",
                    isUser ? "text-primary-foreground/50" : "text-muted-foreground/60",
                  )}>
                    {formatTime(message.createdAt)}
                    {isUser && <MessageStatusIcon status={message.status} insideBubble />}
                  </span>
                )}
              </div>

              <MessageActions message={message} isUser={isUser} onReply={handleReply} onReact={handleReact} />
            </div>

            {reactions.length > 0 && (
              <div className={cn(
                "mt-1 flex flex-wrap gap-1",
                isUser ? "mr-1 justify-end" : "ml-9 justify-start",
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

            {isTimeOutside && !isNoBubble && (
              <span className={cn(
                "mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60",
                isUser ? "mr-1" : "ml-9",
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
