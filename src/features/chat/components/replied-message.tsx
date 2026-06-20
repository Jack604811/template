"use client";

import { FileIcon, ImageIcon, MicIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReplyTarget {
  id: string;
  role: "user" | "contact";
  senderName: string;
  text: string;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaFilename: string | null;
}

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
    case "image":    return <ImageIcon className="size-3 shrink-0" />;
    case "video":    return <VideoIcon className="size-3 shrink-0" />;
    case "audio":
    case "voice":    return <MicIcon className="size-3 shrink-0" />;
    default:         return <FileIcon className="size-3 shrink-0" />;
  }
}

interface RepliedMessageProps {
  reply: ReplyTarget;
  isUser: boolean;
  onClick?: () => void;
}

export function RepliedMessage({ reply, isUser, onClick }: RepliedMessageProps) {
  const hasMedia = !!reply.mediaType;
  const label = hasMedia ? mediaLabel(reply.mediaType, reply.mediaFilename) : reply.text;
  const isMediaWithThumb = (reply.mediaType === "image" || reply.mediaType === "video") && reply.mediaUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-1.5 flex w-full min-w-0 items-stretch gap-2 overflow-hidden rounded-xl text-left transition-opacity hover:opacity-80",
        isUser ? "bg-black/15" : "bg-foreground/8",
      )}
    >
      {/* Accent bar */}
      <div className={cn(
        "w-[3px] shrink-0 rounded-full",
        isUser ? "bg-primary-foreground/70" : "bg-primary",
      )} />

      {/* Content */}
      <div className="min-w-0 flex-1 py-2 pr-2">
        <div className={cn(
          "flex items-center gap-1 text-[12px] leading-snug",
          isUser ? "text-primary-foreground/60" : "text-muted-foreground",
        )}>
          {hasMedia && <MediaIcon mediaType={reply.mediaType!} />}
          <span className="truncate">{label || ""}</span>
        </div>
      </div>

      {/* Thumbnail for image/video */}
      {isMediaWithThumb && (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-r-xl">
          {reply.mediaType === "video" ? (
            <video
              src={reply.mediaUrl!}
              className="size-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reply.mediaUrl!} alt="" className="size-full object-cover" />
          )}
        </div>
      )}
    </button>
  );
}
