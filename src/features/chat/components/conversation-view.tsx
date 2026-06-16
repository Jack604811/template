"use client";

import { ChevronLeftIcon, MessageSquareIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInputProvider,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Conversation as ConversationType } from "../types";
import { getAvatarStyle } from "../utils/avatar";
import { MessageInput } from "./message-input";
import { QuickReplies } from "./quick-replies";

interface Message {
  id: string;
  role: "user" | "contact";
  text: string;
  createdAt: Date;
}

function MessageBubble({
  message,
  conversation,
}: {
  message: Message;
  conversation: ConversationType;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
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
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

const CHAT_QUICK_REPLIES = [
  "How can I help you today?",
  "Let me check that for you.",
  "Could you provide more details?",
  "I'll escalate this to our team.",
  "Your issue has been resolved.",
  "Is there anything else I can help with?",
];

function ConnectedQuickReplies() {
  const { textInput } = usePromptInputController();
  return (
    <QuickReplies
      replies={CHAT_QUICK_REPLIES}
      onSelect={textInput.setInput}
    />
  );
}

const DUMMY_REPLIES = [
  "That's interesting! Tell me more.",
  "Got it!",
  "Sounds good to me!",
  "I'll check it out and get back to you.",
  "Sure, let's do it!",
  "Thanks for letting me know.",
  "Haha, no way!",
  "I was just thinking the same thing.",
];

interface ConversationViewProps {
  conversation: ConversationType | null;
  onToggleInfo: () => void;
  onBack?: () => void;
}

export function ConversationView({
  conversation,
  onToggleInfo,
  onBack,
}: ConversationViewProps) {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareIcon />
            </EmptyMedia>
            <EmptyTitle>Your Messages</EmptyTitle>
            <EmptyDescription>
              Send private photos and messages to a friend or group.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  function handleSend(text: string) {
    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const reply =
        DUMMY_REPLIES[Math.floor(Math.random() * DUMMY_REPLIES.length)];
      setMessages((prev) => [
        ...prev,
        { id: nanoid(), role: "contact", text: reply, createdAt: new Date() },
      ]);
    }, 800);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b px-2">
        {isMobile && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleInfo}
          className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/30"
        >
          <Avatar className="hidden size-8 md:flex">
            <AvatarFallback
              className="text-xs font-semibold text-white"
              style={getAvatarStyle(conversation.name)}
            >
              {conversation.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-none">
              {conversation.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
              {conversation.channel}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12">
            <span className="text-sm font-medium">+</span>
          </div>
        </button>
      </div>

      <Conversation>
        <ConversationContent className="gap-3 px-4 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="size-20">
                  <AvatarFallback
                    className="text-2xl font-semibold text-white"
                    style={getAvatarStyle(conversation.name)}
                  >
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[17px] font-semibold">
                    {conversation.name}
                  </p>
                  <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                    {conversation.channel}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 rounded-full px-5"
                  onClick={onToggleInfo}
                >
                  View Profile
                </Button>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                conversation={conversation}
              />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0">
        <PromptInputProvider>
          <ConnectedQuickReplies />
          <MessageInput onSend={handleSend} />
        </PromptInputProvider>
      </div>
    </div>
  );
}
