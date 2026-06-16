"use client";

import { SearchIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Pills } from "@/components/ui/pills";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatFilter, Conversation } from "../types";
import { ConversationItem } from "./conversation-item";

const CHAT_FILTERS: { id: ChatFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "joined", label: "Joined" },
  { id: "groups", label: "Groups" },
];

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  filter: ChatFilter;
  search: string;
  onSelect: (id: string) => void;
  onFilterChange: (filter: ChatFilter) => void;
  onSearchChange: (search: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  filter,
  search,
  onSelect,
  onFilterChange,
  onSearchChange,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    if (filter === "unread" && c.unreadCount === 0) return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.lastMessage.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 px-4 pt-5 pb-3">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Messages</h1>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="border-transparent bg-muted/40 pl-9 focus-visible:border-border"
            placeholder="Search or start a new chat"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </header>

      <Pills
        items={CHAT_FILTERS}
        value={filter}
        onValueChange={(v) => onFilterChange(v as ChatFilter)}
        className="flex-nowrap gap-1.5 overflow-x-auto px-3 pb-3 scrollbar-none"
      />

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <Empty className="border-none py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>No conversations</EmptyTitle>
              <EmptyDescription>Try a different search or filter.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              selected={c.id === selectedId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
