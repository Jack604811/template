"use client";

import { CameraIcon, FileIcon, ImageIcon, MicIcon, VideoIcon } from "lucide-react";
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

type ReplyPreview = { label: string; subtitle?: string; thumbUrl?: string };

function getReplyPreview(mediaType: string | null, mediaFilename: string | null, text: string, payload?: string): ReplyPreview {
  switch (mediaType) {
    case "image":    return { label: "Foto" };
    case "video":    return { label: "Video" };
    case "audio":
    case "voice":    return { label: "Mensaje de voz" };
    case "document": return { label: mediaFilename ?? "Documento" };
    case "sticker":  return { label: "Sticker" };
    case "location": return { label: "Ubicación" };
    case "contacts": return { label: "Contacto" };
    case "interactive_cta_url": return { label: text || "Enlace" };
    case "interactive_carousel": {
      try {
        const parsed = JSON.parse(mediaFilename ?? "{}") as {
          cards?: { title?: string; description?: string; imageUrl?: string; quickReplies?: { id: string }[]; buttonText?: string; buttonUrl?: string }[];
        };
        let card = parsed.cards?.[0];
        if (payload && parsed.cards) {
          const matched = parsed.cards.find((c) => c.quickReplies?.some((qr) => qr.id === payload));
          if (matched) card = matched;
        }
        return {
          label: card?.title ?? "Carrusel",
          subtitle: card?.description,
          thumbUrl: card?.imageUrl,
        };
      } catch {
        return { label: "Carrusel" };
      }
    }
    default: return { label: text || "" };
  }
}

function MediaIcon({ mediaType }: { mediaType: string }) {
  switch (mediaType) {
    case "image":    return <ImageIcon className="size-3 shrink-0" />;
    case "video":    return <VideoIcon className="size-3 shrink-0" />;
    case "audio":
    case "voice":    return <MicIcon className="size-3 shrink-0" />;
    case "interactive_carousel": return <CameraIcon className="size-3 shrink-0" />;
    case "button":
    case "interactive": return null;
    default:         return <FileIcon className="size-3 shrink-0" />;
  }
}

interface RepliedMessageProps {
  reply: ReplyTarget;
  isUser: boolean;
  payload?: string;
  onClick?: () => void;
}

export function RepliedMessage({ reply, isUser, payload, onClick }: RepliedMessageProps) {
  const hasMedia = !!reply.mediaType;
  const { label, subtitle, thumbUrl: previewThumb } = getReplyPreview(reply.mediaType, reply.mediaFilename, reply.text, payload);
  const imageThumb = (reply.mediaType === "image" || reply.mediaType === "video") ? reply.mediaUrl : null;
  const thumbUrl = imageThumb ?? previewThumb ?? null;

  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "mb-1.5 flex w-full min-w-0 items-stretch gap-2 overflow-hidden rounded-xl text-left",
        onClick && "transition-opacity hover:opacity-80",
        isUser ? "bg-black/15" : "bg-foreground/8",
      )}
    >
      {/* Accent bar */}
      <div className={cn("w-[3px] shrink-0 rounded-full", isUser ? "bg-primary-foreground/70" : "bg-primary")} />

      {/* Content */}
      <div className="min-w-0 flex-1 py-2.5 pr-2 flex flex-col justify-between gap-3">
        <div className={cn(
          "flex items-center gap-1 text-[12px] leading-snug",
          isUser ? "text-primary-foreground/60" : "text-muted-foreground",
        )}>
          {hasMedia && reply.mediaType && <MediaIcon mediaType={reply.mediaType} />}
          <span className="truncate font-medium">{label}</span>
        </div>
        {subtitle && (
          <p className={cn(
            "line-clamp-2 text-[11px] leading-snug",
            isUser ? "text-primary-foreground/50" : "text-muted-foreground/70",
          )}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Thumbnail */}
      {thumbUrl && (
        <div className="relative w-[40px] h-[48px] shrink-0 overflow-hidden rounded-r-xl self-center my-auto">
          {reply.mediaType === "video" ? (
            <video src={thumbUrl} className="size-full object-cover" muted preload="metadata">
              <track kind="captions" />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="" className="size-full object-cover" />
          )}
        </div>
      )}
    </Comp>
  );
}
