"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon, MessageSquareIcon } from "lucide-react";
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
import { useTRPC } from "@/trpc/client";
import type { Conversation as ConversationType } from "../types";
import { getAvatarStyle } from "../utils/avatar";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { QuickReplies } from "./quick-replies";

const CHAT_QUICK_REPLIES = [
  "¿En qué puedo ayudarte?",
  "Déjame verificar eso.",
  "¿Podrías darme más detalles?",
  "Lo escalaré a nuestro equipo.",
  "Tu solicitud ha sido resuelta.",
  "¿Hay algo más en lo que pueda ayudarte?",
];

function ConnectedQuickReplies() {
  const { textInput } = usePromptInputController();
  return <QuickReplies replies={CHAT_QUICK_REPLIES} onSelect={textInput.setInput} />;
}

interface ConversationViewProps {
  conversation: ConversationType | null;
  onToggleInfo: () => void;
  onBack?: () => void;
}

export function ConversationView({ conversation, onToggleInfo, onBack }: ConversationViewProps) {
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const messagesQueryOptions = trpc.chat.getMessages.queryOptions(
    { conversationId: conversation?.id ?? "" },
  );

  const sendMessage = useMutation(trpc.chat.sendMessage.mutationOptions({
    onMutate: async ({ content }) => {
      await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
      const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
      const optimisticId = `optimistic-${Date.now()}`;
      queryClient.setQueryData(messagesQueryOptions.queryKey, (old: typeof rawMessages | undefined) => [
        ...(old ?? []),
        {
          id: optimisticId,
          conversationId: conversation?.id ?? "",
          externalId: null,
          role: "ASSISTANT" as const,
          content,
          mediaType: null,
          mediaId: null,
          mediaUrl: null,
          mediaFilename: null,
          timestamp: new Date(),
        },
      ]);
      return { previous, optimisticId };
    },
    onSuccess: (realMessage, _vars, context) => {
      queryClient.setQueryData(messagesQueryOptions.queryKey, (old: typeof rawMessages | undefined) =>
        (old ?? []).map((m) => (m.id === context?.optimisticId ? realMessage : m)),
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(messagesQueryOptions.queryKey, context.previous);
      }
    },
  }));

  const { data: rawMessages = [] } = useQuery({
    ...messagesQueryOptions,
    enabled: !!conversation,
    refetchInterval: conversation && !sendMessage.isPending ? 1500 : false,
  });

  const messages = rawMessages.map((m) => ({
    id: m.id,
    role: (m.role === "USER" ? "contact" : "user") as "user" | "contact",
    text: m.content,
    mediaType: m.mediaType,
    mediaUrl: m.mediaUrl,
    mediaFilename: m.mediaFilename,
    createdAt: m.timestamp,
  }));

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareIcon />
            </EmptyMedia>
            <EmptyTitle>Tus mensajes</EmptyTitle>
            <EmptyDescription>Selecciona una conversación para empezar.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  function handleSend(text: string) {
    if (!conversation || !text.trim()) return;
    sendMessage.mutate({ conversationId: conversation.id, content: text });
  }

  return (
    <div
      className="grid min-w-0 flex-1"
      style={{ gridTemplateRows: "auto 1fr auto", height: "100%" }}
    >
      {/* Row 1 — header */}
      <div className="flex h-14 items-center gap-1 border-b px-2">
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
            <p className="truncate text-sm font-semibold leading-none">{conversation.name}</p>
            <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
              {conversation.channel}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12">
            <span className="text-sm font-medium">+</span>
          </div>
        </button>
      </div>

      {/* Row 2 — scrollable conversation */}
      <div className="overflow-hidden">
        <Conversation className="h-full">
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
                    <p className="text-[17px] font-semibold">{conversation.name}</p>
                    <p className="mt-0.5 text-sm capitalize text-muted-foreground">{conversation.channel}</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-1 rounded-full px-5" onClick={onToggleInfo}>
                    Ver perfil
                  </Button>
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} conversation={conversation} />
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Row 3 — input */}
      <div>
        <PromptInputProvider>
          <ConnectedQuickReplies />
          <MessageInput onSend={handleSend} />
        </PromptInputProvider>
      </div>
    </div>
  );
}
