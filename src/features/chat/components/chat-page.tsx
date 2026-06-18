"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { ChatFilter, Conversation } from "../types";
import { ChatDetails } from "./chat-details";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";

const MEDIA_LABELS: Record<string, string> = {
  "[image]": "Imagen",
  "[video]": "Video",
  "[audio]": "Audio",
  "[voice]": "Audio",
  "[document]": "Archivo",
  "[sticker]": "Sticker",
  "[location]": "Ubicación",
  "[contacts]": "Contacto",
};

function formatLastMessage(text: string): string {
  return MEDIA_LABELS[text.trim()] ?? text;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const chatParams = {
  id: parseAsString,
  filter: parseAsString.withDefault("all"),
  search: parseAsString.withDefault(""),
};

export function ChatPage() {
  const trpc = useTRPC();
  const [params, setParams] = useQueryStates(chatParams);
  const [infoOpen, setInfoOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: rawConversations = [] } = useQuery({
    ...trpc.chat.getConversations.queryOptions({ search: params.search }),
    refetchInterval: 5000,
  });

  const conversations: Conversation[] = rawConversations.map((c) => {
    const name = c.contactName ?? c.externalId;
    return {
      id: c.id,
      name,
      initials: getInitials(name),
      channel: c.channel.toLowerCase() as Conversation["channel"],
      lastMessage: formatLastMessage(c.lastMessageText ?? ""),
      lastMessageAt: c.lastMessageAt ?? c.createdAt,
      unreadCount: c.unreadCount,
      online: false,
    };
  });

  const selectedConversation = conversations.find((c) => c.id === params.id) ?? null;

  const markAsRead = useMutation(trpc.chat.markAsRead.mutationOptions());
  const deleteConversation = useMutation(
    trpc.chat.deleteConversation.mutationOptions(),
  );

  function handleSelect(id: string) {
    setParams({ id });
    setInfoOpen(false);
    markAsRead.mutate({ conversationId: id });
  }

  function handleDelete(id: string) {
    deleteConversation.mutate(
      { conversationId: id },
      {
        onSuccess: () => {
          if (params.id === id) setParams({ id: null });
        },
      },
    );
  }

  if (isMobile) {
    if (params.id && selectedConversation) {
      return (
        <div className="flex h-dvh flex-col overflow-hidden">
          <ConversationView
            conversation={selectedConversation}
            onToggleInfo={() => setInfoOpen((v) => !v)}
            onBack={() => setParams({ id: null })}
          />
          <ChatDetails
            conversation={selectedConversation}
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            onDelete={handleDelete}
          />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <ConversationList
          conversations={conversations}
          selectedId={params.id}
          filter={params.filter as ChatFilter}
          search={params.search}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onFilterChange={(filter) => setParams({ filter })}
          onSearchChange={(search) => setParams({ search })}
        />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="w-[320px] shrink-0 border-r">
        <ConversationList
          conversations={conversations}
          selectedId={params.id}
          filter={params.filter as ChatFilter}
          search={params.search}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onFilterChange={(filter) => setParams({ filter })}
          onSearchChange={(search) => setParams({ search })}
        />
      </div>

      <div className={cn("flex min-w-0 flex-1 overflow-hidden", infoOpen && "hidden xl:flex")}>
        <ConversationView
          key={params.id ?? "empty"}
          conversation={selectedConversation}
          onToggleInfo={() => setInfoOpen((v) => !v)}
        />
      </div>

      {infoOpen && selectedConversation && (
        <div className="flex flex-1 overflow-hidden xl:w-[320px] xl:flex-none xl:border-l">
          <ChatDetails
            conversation={selectedConversation}
            open
            onClose={() => setInfoOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
