"use client";

import { FileIcon, ImageIcon, MicIcon, VideoIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReplyTarget } from "./replied-message";

function mediaLabel(mediaType: string | null, mediaFilename: string | null): string {
  switch (mediaType) {
    case "image":    return "Foto";
    case "video":    return "Video";
    case "audio":
    case "voice":    return "Mensaje de voz";
    case "document": return mediaFilename ?? "Documento";
    case "sticker":  return "Sticker";
    case "location": return "Ubicación";
    case "contacts": return "Contacto";
    default:         return "";
  }
}

function MediaIcon({ mediaType }: { mediaType: string }) {
  switch (mediaType) {
    case "image":    return <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />;
    case "video":    return <VideoIcon className="size-3.5 shrink-0 text-muted-foreground" />;
    case "audio":
    case "voice":    return <MicIcon className="size-3.5 shrink-0 text-muted-foreground" />;
    default:         return <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />;
  }
}

interface ReplyInputPreviewProps {
  reply: ReplyTarget;
  onCancel: () => void;
}

export function ReplyInputPreview({ reply, onCancel }: ReplyInputPreviewProps) {
  const hasMedia = !!reply.mediaType;
  const isMediaWithThumb = (reply.mediaType === "image" || reply.mediaType === "video") && reply.mediaUrl;
  const label = hasMedia ? mediaLabel(reply.mediaType, reply.mediaFilename) : reply.text;

  return (
    <div className={cn(
      "mx-4 mb-1 flex items-center gap-2 overflow-hidden rounded-xl border border-border/60 bg-muted/40",
    )}>
      {/* Accent bar */}
      <div className="w-[3px] self-stretch shrink-0 bg-primary rounded-full my-2 ml-2" />

      {/* Text content */}
      <div className="min-w-0 flex-1 py-2">
        <p className="text-[11px] font-semibold leading-none text-primary mb-0.5">
          {reply.senderName}
        </p>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          {hasMedia && <MediaIcon mediaType={reply.mediaType!} />}
          <span className="truncate">{label || " "}</span>
        </div>
      </div>

      {/* Thumbnail */}
      {isMediaWithThumb && (
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg">
          {reply.mediaType === "video" ? (
            <video src={reply.mediaUrl!} className="size-full object-cover" muted preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reply.mediaUrl!} alt="" className="size-full object-cover" />
          )}
        </div>
      )}

      {/* Close */}
      <button
        type="button"
        onClick={onCancel}
        className="mr-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/8 transition-colors hover:bg-foreground/15"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
