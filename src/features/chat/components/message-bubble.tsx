"use client";

import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MapPinIcon,
  MicIcon,
  PlayCircleIcon,
  UserRoundIcon,
  VideoIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { getAvatarStyle } from "../utils/avatar";

export interface Message {
  id: string;
  role: "user" | "contact";
  text: string;
  mediaType: string | null;
  mediaUrl: string | null;
  mediaFilename: string | null;
  createdAt: Date;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function AudioBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const bars = [3, 5, 8, 5, 9, 6, 4, 7, 5, 8, 4, 6, 9, 5, 3, 7, 8, 5, 4, 6, 8, 5, 3];

  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary-foreground/20" : "bg-foreground/10",
        )}>
          <MicIcon className="size-4" />
        </div>
        <div className="flex h-8 items-end gap-px">
          {bars.map((h, i) => (
            <div
              key={`bar-${i}-${h}`}
              className={cn(
                "w-[3px] rounded-full",
                isUser ? "bg-primary-foreground/70" : "bg-foreground/30",
              )}
              style={{ height: `${(h / 9) * 100}%` }}
            />
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
  return (
    <div className="flex flex-col">
      {message.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={message.mediaUrl}
          alt="imagen"
          className="block h-auto w-full max-w-[260px] rounded-xl"
          style={{ maxHeight: "16rem" }}
        />
      ) : (
        <div className={cn(
          "flex h-40 w-52 items-center justify-center rounded-xl",
          isUser ? "bg-primary-foreground/10" : "bg-foreground/8",
        )}>
          <ImageIcon className={cn("size-8", isUser ? "text-primary-foreground/40" : "text-foreground/20")} />
        </div>
      )}
      {message.text && message.text !== "[image]" && (
        <p className="mt-1 px-1 text-[13px] leading-snug">{message.text}</p>
      )}
    </div>
  );
}

function VideoBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  return (
    <div className="flex flex-col">
      {message.mediaUrl ? (
        <video
          src={message.mediaUrl}
          controls
          className="max-h-64 max-w-[260px] rounded-xl object-cover"
          preload="metadata"
        >
          <track kind="captions" />
        </video>
      ) : (
        <div className={cn(
          "relative flex h-40 w-52 items-center justify-center rounded-xl",
          isUser ? "bg-primary-foreground/10" : "bg-foreground/8",
        )}>
          <VideoIcon className={cn("size-8", isUser ? "text-primary-foreground/40" : "text-foreground/20")} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "flex size-12 items-center justify-center rounded-full",
              isUser ? "bg-primary-foreground/20" : "bg-black/20",
            )}>
              <PlayCircleIcon className={cn("size-7", isUser ? "text-primary-foreground/80" : "text-white/80")} />
            </div>
          </div>
        </div>
      )}
      {message.text && message.text !== "[video]" && (
        <p className="mt-1 px-1 text-[13px] leading-snug">{message.text}</p>
      )}
    </div>
  );
}

function DocumentBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const filename = message.mediaFilename ?? "Documento";
  const ext = filename.split(".").pop()?.toUpperCase() ?? "DOC";

  return (
    <div className="flex items-center gap-3 py-1 pr-1">
      <div className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        isUser ? "bg-primary-foreground/20" : "bg-blue-500/15",
      )}>
        <FileTextIcon className={cn("size-5", isUser ? "text-primary-foreground/80" : "text-blue-500")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight">{filename}</p>
        <p className={cn("text-[11px]", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {ext}
        </p>
      </div>
      {message.mediaUrl && (
        <a
          href={message.mediaUrl}
          download={filename}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
            isUser ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-foreground/8 hover:bg-foreground/12",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DownloadIcon className="size-3.5" />
        </a>
      )}
    </div>
  );
}

function LocationBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  const location = message.text.replace("[location]", "").trim();
  return (
    <div className="overflow-hidden rounded-xl">
      <div className={cn(
        "flex h-28 w-52 items-center justify-center",
        isUser ? "bg-primary-foreground/10" : "bg-emerald-500/10",
      )}>
        <div className="flex flex-col items-center gap-1.5">
          <MapPinIcon className={cn("size-7", isUser ? "text-primary-foreground/60" : "text-emerald-600")} />
          <span className={cn("px-3 text-center text-[11px]", isUser ? "text-primary-foreground/50" : "text-muted-foreground")}>
            {location || "Ubicación compartida"}
          </span>
        </div>
      </div>
      <div className={cn(
        "border-t px-3 py-2",
        isUser ? "border-primary-foreground/10" : "border-border/40",
      )}>
        <p className="text-[12px] font-medium">Ver en mapa</p>
      </div>
    </div>
  );
}

function ContactBubble({ isUser }: { isUser: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 px-1 py-1.5">
        <div className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary-foreground/20" : "bg-foreground/10",
        )}>
          <UserRoundIcon className="size-5" />
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-tight">Contacto</p>
          <p className={cn("text-[11px]", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>
            Contacto de WhatsApp
          </p>
        </div>
      </div>
      <div className={cn(
        "border-t px-3 py-2 text-center",
        isUser ? "border-primary-foreground/10" : "border-border/40",
      )}>
        <p className={cn("text-[12px] font-medium", isUser ? "text-primary-foreground/80" : "text-primary")}>
          Ver contacto
        </p>
      </div>
    </div>
  );
}

function StickerBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  if (message.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={message.mediaUrl} alt="sticker" className="size-24 object-contain" loading="lazy" />
    );
  }

  return (
    <div className={cn(
      "flex h-20 w-20 items-center justify-center rounded-2xl",
      isUser ? "bg-primary-foreground/10" : "bg-foreground/5",
    )}>
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

export function MessageBubble({
  message,
  conversation,
}: {
  message: Message;
  conversation: Conversation;
}) {
  const isUser = message.role === "user";
  const type = message.mediaType ?? "";
  const isNoPadding = ["image", "video", "location", "contacts"].includes(type);
  const isNoBubble = type === "sticker";
  const isTimeOutside = ["image", "video", "location", "contacts", "document", "audio", "voice"].includes(type);

  return (
    <div className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <Avatar className="mb-1 size-7 shrink-0">
          <AvatarFallback
            className="text-[11px] font-semibold text-white"
            style={getAvatarStyle(conversation.name)}
          >
            {conversation.initials}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex max-w-[70%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative text-sm",
            !isNoBubble && "rounded-2xl",
            isNoPadding && "overflow-hidden p-0",
            !isNoPadding && !isNoBubble && "px-4 py-2.5",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
            isNoBubble && "bg-transparent",
          )}
        >
          <MessageContent message={message} isUser={isUser} />
          {!isTimeOutside && (
            <span className={cn(
              "ml-2 inline-block align-bottom text-[10px] leading-none",
              isUser ? "text-primary-foreground/50" : "text-muted-foreground/60",
            )}>
              {formatTime(message.createdAt)}
            </span>
          )}
        </div>
        {isTimeOutside && !isNoBubble && (
          <span className={cn(
            "mt-0.5 text-[10px] text-muted-foreground/60",
            isUser ? "mr-1" : "ml-1",
          )}>
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
