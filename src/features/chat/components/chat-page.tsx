"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { ChatFilter, Conversation } from "../types";
import { ChatDetails } from "./chat-details";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";
import type { ReplyTarget } from "./replied-message";

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
  return name.trim()[0]?.toUpperCase() ?? "?";
}

const chatParams = {
  id: parseAsString,
  filter: parseAsString.withDefault("all"),
  search: parseAsString.withDefault(""),
  tagId: parseAsString,
};

export function ChatPage() {
  const trpc = useTRPC();
  const [params, setParams] = useQueryStates(chatParams);
  const [infoOpen, setInfoOpen] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null,
  );
  const [pendingReply, setPendingReply] = useState<ReplyTarget | null>(null);
  const isMobile = useIsMobile();
  const stableKeyMap = useRef<Map<string, string>>(new Map());

  function handleNavigateToMessage(messageId: string) {
    setScrollToMessageId(messageId);
    setTimeout(() => setScrollToMessageId(null), 1000);
  }

  const { data: rawOrgTags = [] } = useQuery(trpc.chat.getTags.queryOptions());
  const orgTags = rawOrgTags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    createdAt: t.createdAt,
    conversationCount: t._count.conversations,
  }));

  const { data: rawConversations = [] } = useQuery({
    ...trpc.chat.getConversations.queryOptions({
      search: params.search,
      joined: params.filter === "joined" ? true : undefined,
    }),
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
      blocked: c.blocked,
      notes: c.notes,
      credentialId: c.credentialId,
      tagIds: c.tags.map((t) => t.tagId),
    };
  });

  const selectedConversation =
    conversations.find((c) => c.id === params.id) ?? null;

  const markAsRead = useMutation(trpc.chat.markAsRead.mutationOptions());

  function handleSelect(id: string) {
    stableKeyMap.current.clear();
    setParams({ id });
    setInfoOpen(false);
    markAsRead.mutate({ conversationId: id });
  }

  function handleDeleteSuccess(id: string) {
    if (params.id === id) setParams({ id: null });
    setInfoOpen(false);
  }

  if (isMobile) {
    if (params.id && selectedConversation) {
      return (
        <div className="flex h-dvh flex-col overflow-hidden">
          <ConversationView
            conversation={selectedConversation}
            stableKeyMap={stableKeyMap}
            onToggleInfo={() => setInfoOpen((v) => !v)}
            onBack={() => setParams({ id: null })}
            scrollToMessageId={scrollToMessageId}
            externalReplyTo={pendingReply}
          />
          <ChatDetails
            conversation={selectedConversation}
            stableKeyMap={stableKeyMap}
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            onDeleteSuccess={handleDeleteSuccess}
            onNavigateToMessage={handleNavigateToMessage}
            onReplyToMessage={(r) => {
              setPendingReply(r);
              setTimeout(() => setPendingReply(null), 100);
            }}
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
          tagId={params.tagId ?? null}
          tags={orgTags}
          onSelect={handleSelect}
          onFilterChange={(filter) => setParams({ filter })}
          onSearchChange={(search) => setParams({ search })}
          onTagChange={(tagId) => setParams({ tagId })}
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
          tagId={params.tagId ?? null}
          tags={orgTags}
          onSelect={handleSelect}
          onFilterChange={(filter) => setParams({ filter })}
          onSearchChange={(search) => setParams({ search })}
          onTagChange={(tagId) => setParams({ tagId })}
        />
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 overflow-hidden",
          infoOpen && "hidden xl:flex",
        )}
      >
        <ConversationView
          key={params.id ?? "empty"}
          conversation={selectedConversation}
          stableKeyMap={stableKeyMap}
          onToggleInfo={() => setInfoOpen((v) => !v)}
          scrollToMessageId={scrollToMessageId}
          externalReplyTo={pendingReply}
        />
      </div>

      {infoOpen && selectedConversation && (
        <div className="flex flex-1 overflow-hidden xl:w-[320px] xl:flex-none xl:border-l">
          <ChatDetails
            conversation={selectedConversation}
            stableKeyMap={stableKeyMap}
            open
            onClose={() => setInfoOpen(false)}
            onDeleteSuccess={handleDeleteSuccess}
            onNavigateToMessage={handleNavigateToMessage}
            onReplyToMessage={(r) => {
              setPendingReply(r);
              setTimeout(() => setPendingReply(null), 100);
            }}
          />
        </div>
      )}
    </div>
  );
}
