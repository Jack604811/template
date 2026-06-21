"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerUpLeftIcon, CopyIcon, DownloadIcon, PlusIcon, StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageContent } from "./message-bubble";
import type { Message } from "./message-bubble";
import { RepliedMessage } from "./replied-message";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const PAD = 10;
const EMOJI_ITEM_W = 44;
const EMOJI_ROW_H = 52;
const ACTION_W = 260;


interface MessageContextMenuProps {
  message: Message;
  isUser: boolean;
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onStar: () => void;
}

export function MessageContextMenu({
  message,
  isUser,
  open,
  anchorRect,
  onClose,
  onReply,
  onReact,
  onStar,
}: MessageContextMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 230);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted || !anchorRect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // ─── Emoji row ───────────────────────────────────────────────────────────────
  const emojiRowW = Math.min((REACTIONS.length + 1) * EMOJI_ITEM_W + 16, vw - PAD * 2);
  const emojiTop = Math.max(PAD + 8, anchorRect.top - EMOJI_ROW_H - 6);
  const emojiLeft = isUser
    ? Math.max(PAD, anchorRect.right - emojiRowW)
    : Math.max(PAD, Math.min(anchorRect.left, vw - emojiRowW - PAD));

  // ─── Action list ─────────────────────────────────────────────────────────────
  const isMedia = !!message.mediaType && !["contacts", "location", "sticker"].includes(message.mediaType);
  const actionCount = 2 + (!message.mediaType ? 1 : 0) + (isMedia && !!message.mediaUrl ? 1 : 0);
  const estimatedActionH = actionCount * 52 + 2;

  let actionTop = anchorRect.bottom + 8;
  if (actionTop + estimatedActionH > vh - PAD) {
    actionTop = Math.max(PAD, anchorRect.top - estimatedActionH - 8);
  }

  const actionLeft = isUser
    ? Math.max(PAD, anchorRect.right - ACTION_W)
    : Math.max(PAD, Math.min(anchorRect.left, vw - ACTION_W - PAD));

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  function handleReply() {
    onClose();
    setTimeout(onReply, 60);
  }

  function handleCopy() {
    if (message.text) void navigator.clipboard.writeText(message.text);
    onClose();
  }

  async function handleDownload() {
    onClose();
    if (!message.mediaUrl) return;
    try {
      const res = await fetch(message.mediaUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = message.mediaFilename ?? "media";
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(message.mediaUrl, "_blank");
    }
  }

  const actions: { label: string; icon: React.ElementType; onClick: () => void; danger?: boolean; active?: boolean }[] = [
    { label: "Responder", icon: CornerUpLeftIcon, onClick: handleReply },
    ...(!message.mediaType && message.text ? [{ label: "Copiar", icon: CopyIcon, onClick: handleCopy }] : []),
    { label: message.starred ? "Quitar destacado" : "Destacar", icon: StarIcon, active: message.starred, onClick: () => { onStar(); onClose(); } },
    ...(isMedia && message.mediaUrl ? [{ label: "Descargar", icon: DownloadIcon, onClick: handleDownload }] : []),
  ];

  const ease = "cubic-bezier(0.4,0,0.2,1)";
  const dur = "0.2s";

  return createPortal(
    <div className="fixed inset-0 z-50" onContextMenu={(e) => e.preventDefault()}>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${dur} ${ease}` }}
        onClick={onClose}
      />

      {/* ── Message ghost (sharp above blur) ─────────────────────────────── */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: anchorRect.top,
          left: anchorRect.left,
          width: anchorRect.width,
          height: anchorRect.height,
          opacity: visible ? 1 : 0,
          transform: `scale(${visible ? 1 : 0.97})`,
          transformOrigin: isUser ? "right center" : "left center",
          transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
        }}
      >
        <div
          className={cn(
            "h-full rounded-2xl text-sm",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
            message.mediaType === "sticker" && "bg-transparent",
            ["image", "video", "location", "contacts"].includes(message.mediaType ?? "")
              ? "overflow-hidden p-0"
              : message.mediaType !== "sticker" && "px-4 py-2.5",
          )}
        >
          {message.replyTo && <RepliedMessage reply={message.replyTo} isUser={isUser} />}
          <MessageContent message={message} isUser={isUser} />
        </div>
      </div>

      {/* ── Emoji reactions ───────────────────────────────────────────────── */}
      <div
        className="absolute flex items-center gap-0.5 rounded-full bg-popover px-2 py-1.5 shadow-2xl ring-1 ring-border/30"
        style={{
          top: emojiTop,
          left: emojiLeft,
          opacity: visible ? 1 : 0,
          transform: `scale(${visible ? 1 : 0.8})`,
          transformOrigin: isUser ? "right center" : "left center",
          transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
        }}
      >
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { onReact(emoji); onClose(); }}
            className={cn(
              "flex size-10 items-center justify-center rounded-full text-[22px] transition-transform duration-100 active:scale-90 hover:scale-115",
              message.reactions?.find((r) => r.emoji === emoji && r.byMe) && "bg-primary/15 ring-2 ring-primary/30",
            )}
          >
            {emoji}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-border/60" />
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 active:scale-90"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>

      {/* ── Action list ──────────────────────────────────────────────────── */}
      <div
        ref={actionsRef}
        className="absolute overflow-hidden rounded-2xl bg-popover shadow-2xl ring-1 ring-border/30"
        style={{
          top: actionTop,
          left: actionLeft,
          width: ACTION_W,
          opacity: visible ? 1 : 0,
          transform: `scale(${visible ? 1 : 0.92}) translateY(${visible ? 0 : 8}px)`,
          transformOrigin: `${isUser ? "right" : "left"} top`,
          transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
          transitionDelay: visible ? "0.05s" : "0s",
        }}
      >
        {actions.map((action, i) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              "flex w-full items-center justify-between px-4 py-[15px]",
              "text-[15px] transition-colors active:bg-muted hover:bg-muted/50",
              action.danger ? "text-destructive" : "text-foreground",
              i < actions.length - 1 && "border-b border-border/50",
            )}
          >
            <span>{action.label}</span>
            <action.icon className={cn("size-[18px]", action.danger ? "text-destructive/70" : action.active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
