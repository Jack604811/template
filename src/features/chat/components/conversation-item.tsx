"use client";

import { Trash2Icon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { getAvatarStyle } from "../utils/avatar";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface ConversationItemProps {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function ConversationItem({
  conversation,
  selected,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const { name, lastMessage, lastMessageAt, unreadCount, online, initials } =
    conversation;

  return (
    <div className={cn("group relative", selected ? "bg-muted" : "hover:bg-muted/50")}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 pr-10 text-left transition-colors"
      >
        <div className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarFallback
              className="text-[13px] font-semibold text-white"
              style={getAvatarStyle(name)}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {online && (
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-green-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {timeAgo(lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {lastMessage}
            </span>
            {unreadCount > 0 && (
              <span className="flex size-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="Eliminar chat"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );
}
