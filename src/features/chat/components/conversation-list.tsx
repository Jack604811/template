"use client";

import { SearchIcon } from "lucide-react";
import { EntitySearch } from "@/components/entity-components";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Pills } from "@/components/ui/pills";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatFilter, Conversation } from "../types";
import { ConversationItem } from "./conversation-item";

const CHAT_FILTERS: { id: ChatFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "unread", label: "No leídos" },
  { id: "joined", label: "Asignados" },
  { id: "groups", label: "Grupos" },
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
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Mensajes</h1>
        <EntitySearch
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar conversación"
        />
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
              <EmptyTitle>Sin conversaciones</EmptyTitle>
              <EmptyDescription>Los mensajes de WhatsApp aparecerán aquí.</EmptyDescription>
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
