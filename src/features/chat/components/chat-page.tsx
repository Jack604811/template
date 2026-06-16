"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ChatFilter, Conversation } from "../types";
import { ChatDetails } from "./chat-details";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "alex.johnson",
    initials: "AJ",
    channel: "tiktok",
    lastMessage: "Hey! Did you see the photos from ...",
    lastMessageAt: new Date(Date.now() - 5 * 60000),
    unreadCount: 1,
    online: true,
  },
  {
    id: "2",
    name: "mike.chen",
    initials: "MC",
    channel: "instagram",
    lastMessage: "See you tomorrow 👋",
    lastMessageAt: new Date(Date.now() - 2 * 3600000),
    unreadCount: 0,
    online: false,
  },
  {
    id: "3",
    name: "emma.davis",
    initials: "ED",
    channel: "tiktok",
    lastMessage: "That sounds great! 🔵",
    lastMessageAt: new Date(Date.now() - 4 * 3600000),
    unreadCount: 1,
    online: false,
  },
  {
    id: "4",
    name: "james.wilson",
    initials: "JW",
    channel: "whatsapp",
    lastMessage: "Loved your latest post!",
    lastMessageAt: new Date(Date.now() - 6 * 3600000),
    unreadCount: 0,
    online: true,
  },
  {
    id: "5",
    name: "olivia.martin",
    initials: "OM",
    channel: "discord",
    lastMessage: "Can you send me the details?",
    lastMessageAt: new Date(Date.now() - 8 * 3600000),
    unreadCount: 0,
    online: false,
  },
  {
    id: "6",
    name: "daniel.lee",
    initials: "DL",
    channel: "web",
    lastMessage: "Perfect timing!",
    lastMessageAt: new Date(Date.now() - 10 * 3600000),
    unreadCount: 0,
    online: false,
  },
  {
    id: "7",
    name: "sophia.garcia",
    initials: "SG",
    channel: "instagram",
    lastMessage: "I'll check it out",
    lastMessageAt: new Date(Date.now() - 12 * 3600000),
    unreadCount: 0,
    online: true,
  },
];

const chatParams = {
  id: parseAsString,
  filter: parseAsString.withDefault("all"),
  search: parseAsString.withDefault(""),
};

export function ChatPage() {
  const [params, setParams] = useQueryStates(chatParams);
  const [infoOpen, setInfoOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedConversation =
    MOCK_CONVERSATIONS.find((c) => c.id === params.id) ?? null;

  function handleSelect(id: string) {
    setParams({ id });
    setInfoOpen(false);
  }

  if (isMobile) {
    if (params.id && selectedConversation) {
      return (
        <div className="flex h-full flex-col">
          <ConversationView
            conversation={selectedConversation}
            onToggleInfo={() => setInfoOpen((v) => !v)}
            onBack={() => setParams({ id: null })}
          />
          <ChatDetails
            conversation={selectedConversation}
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
          />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <ConversationList
          conversations={MOCK_CONVERSATIONS}
          selectedId={params.id}
          filter={params.filter as ChatFilter}
          search={params.search}
          onSelect={handleSelect}
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
          conversations={MOCK_CONVERSATIONS}
          selectedId={params.id}
          filter={params.filter as ChatFilter}
          search={params.search}
          onSelect={handleSelect}
          onFilterChange={(filter) => setParams({ filter })}
          onSearchChange={(search) => setParams({ search })}
        />
      </div>

      {/* Chat — hidden below xl when info is open */}
      <div className={cn("flex min-w-0 flex-1 overflow-hidden", infoOpen && "hidden xl:flex")}>
        <ConversationView
          key={params.id ?? "empty"}
          conversation={selectedConversation}
          onToggleInfo={() => setInfoOpen((v) => !v)}
        />
      </div>

      {/* Details — full-width below xl, fixed panel at xl+ */}
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
