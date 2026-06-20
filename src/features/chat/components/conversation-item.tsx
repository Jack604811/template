"use client";

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
}

export function ConversationItem({
  conversation,
  selected,
  onClick,
}: ConversationItemProps) {
  const { name, lastMessage, lastMessageAt, unreadCount, online, initials } =
    conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        selected ? "bg-muted" : "hover:bg-muted/50",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10">
          <AvatarFallback
            className="text-[15px] font-semibold text-white"
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
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">{name}</p>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {timeAgo(lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{lastMessage}</p>
          </div>
          {unreadCount > 0 && (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
      </div>
    </button>
  );
}
