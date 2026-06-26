"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon, MessageSquareIcon, PlusIcon } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
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
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useConversationParticipant } from "../hooks/use-conversation-participant";
import { useMessageActions } from "../hooks/use-message-actions";
import { mimeToMediaType } from "../lib/compress";
import { uploadFileXHR } from "../lib/upload";
import type { Conversation as ConversationType } from "../types";
import { getAvatarStyle } from "../utils/avatar";
import { DateSeparator, isSameDay } from "./date-separator";
import type { Message, ReplyTarget } from "./message-bubble";
import { MessageBubble } from "./message-bubble";
import type { SendPayload } from "./message-input";
import { MessageInput } from "./message-input";
import { QuickReplies } from "./quick-replies";
import { SystemMessage } from "./system-message";


function ConnectedQuickReplies({ onSendPayload }: { onSendPayload: (payload: SendPayload) => void }) {
  const { textInput } = usePromptInputController();
  return (
    <QuickReplies
      replies={[]}
      onSelect={textInput.setInput}
      actions={[
        {
          label: "⊞ QR Carousel",
          onSelect: () =>
            onSendPayload({
              text: "Here are our latest arrivals, each under $25:",
              mediaType: "interactive_carousel",
              mediaFilename: JSON.stringify({
                cards: [
                  {
                    title: "Blue Echeveria",
                    description: "A rosette-shaped succulent with powdery blue leaves.",
                    imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80",
                    quickReplies: [
                      { id: "learn-blue-echeveria", title: "Learn more" },
                      { id: "fav-blue-echeveria", title: "Add to favorites" },
                    ],
                  },
                  {
                    title: "Zebra Haworthia",
                    description: "Striking white stripes on deep green leaves.",
                    imageUrl: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&q=80",
                    quickReplies: [
                      { id: "learn-zebra-haworthia", title: "Learn more" },
                      { id: "fav-zebra-haworthia", title: "Add to favorites" },
                    ],
                  },
                  {
                    title: "Panda Plant",
                    description: "Soft, fuzzy leaves with chocolate-brown edges.",
                    imageUrl: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&q=80",
                    quickReplies: [
                      { id: "learn-panda-plant", title: "Learn more" },
                      { id: "fav-panda-plant", title: "Add to favorites" },
                    ],
                  },
                ],
              }),
            }),
        },
        {
          label: "⊞ Carousel",
          onSelect: () =>
            onSendPayload({
              text: "Here are our latest arrivals, each under $25:",
              mediaType: "interactive_carousel",
              mediaFilename: JSON.stringify({
                cards: [
                  {
                    title: "Blue Echeveria",
                    description: "A rosette-shaped succulent with powdery blue leaves.",
                    imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80",
                    buttonText: "Buy now",
                    buttonUrl: "https://example.com/blue-echeveria",
                  },
                  {
                    title: "Zebra Haworthia",
                    description: "Striking white stripes on deep green leaves.",
                    imageUrl: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&q=80",
                    buttonText: "Buy now",
                    buttonUrl: "https://example.com/zebra-haworthia",
                  },
                  {
                    title: "Panda Plant",
                    description: "Soft, fuzzy leaves with chocolate-brown edges.",
                    imageUrl: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&q=80",
                    buttonText: "Buy now",
                    buttonUrl: "https://example.com/panda-plant",
                  },
                ],
              }),
            }),
        },
        {
          label: "↗ CTA URL",
          onSelect: () =>
            onSendPayload({
              text: "Tap the button below to see available dates.",
              mediaType: "interactive_cta_url",
              mediaUrl:
                "https://www.luckyshrub.com?clickID=kqDGWd24Q5TRwoEQTICY7W1JKoXvaZOXWAS7h1P76s0R7Paec4",
              mediaFilename: JSON.stringify({
                displayText: "See Dates",
                footer: "Dates subject to change.",
                headerImageUrl:
                  "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80",
              }),
            }),
        },
      ]}
    />
  );
}

interface UploadingEntry {
  id: string;
  file: File;
  caption: string;
  mediaType: string;
  blobUrl: string;
  progress: number;
  failed: boolean;
  abortController: AbortController;
}

interface ConversationViewProps {
  conversation: ConversationType | null;
  stableKeyMap: RefObject<Map<string, string>>;
  onToggleInfo: () => void;
  onBack?: () => void;
  scrollToMessageId?: string | null;
  externalReplyTo?: ReplyTarget | null;
}

export function ConversationView({
  conversation,
  stableKeyMap,
  onToggleInfo,
  onBack,
  scrollToMessageId,
  externalReplyTo,
}: ConversationViewProps) {
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState<ReplyTarget | undefined>(undefined);
  const { handleStar, handleReact, handleReply } = useMessageActions(
    conversation?.id ?? "",
    {
      conversationName: conversation?.name,
      onReply: setReplyTo,
    },
  );
  const [uploadingEntries, setUploadingEntries] = useState<UploadingEntry[]>(
    [],
  );
  const entriesRef = useRef<Map<string, UploadingEntry>>(new Map());
  // Maps message id → reply target so optimistic + real messages render the quoted block
  const replyToMapRef = useRef<Map<string, ReplyTarget>>(new Map());
  // Captures the active replyTo at send time so onMutate (sync) can read it
  const pendingReplyRef = useRef<ReplyTarget | undefined>(undefined);
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? "";

  useEffect(() => {
    if (!externalReplyTo) return;
    setReplyTo(externalReplyTo);
  }, [externalReplyTo]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = document.querySelector(
      `[data-message-id="${scrollToMessageId}"]`,
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToMessageId]);

  const { messagesQueryOptions, prepareImplicitJoin, confirmImplicitJoin } =
    useConversationParticipant(conversation, stableKeyMap);

  const { data: rawMessages = [], isSuccess: messagesReady } = useQuery({
    ...messagesQueryOptions,
    enabled: !!conversation,
    refetchInterval: () =>
      conversation && queryClient.isMutating() === 0 ? 1500 : false,
  });

  const sendMessage = useMutation(
    trpc.chat.sendMessage.mutationOptions({
      onMutate: async ({
        content,
        mediaUrl,
        mediaType,
        mediaFilename,
        conversationId,
      }) => {
        // Capture and clear before any await — ref is set in handleSend and must not be cleared there
        const capturedReply = pendingReplyRef.current;
        pendingReplyRef.current = undefined;
        await queryClient.cancelQueries({
          queryKey: messagesQueryOptions.queryKey,
        });
        const previous = queryClient.getQueryData(
          messagesQueryOptions.queryKey,
        );
        const optimisticId = `optimistic-${Date.now()}`;
        stableKeyMap.current.set(optimisticId, optimisticId);
        const joinPrep = prepareImplicitJoin();
        const lastText = mediaType ? content || `[${mediaType}]` : content;
        const now = new Date();

        if (capturedReply)
          replyToMapRef.current.set(optimisticId, capturedReply);

        queryClient.setQueryData(
          messagesQueryOptions.queryKey,
          (old: typeof rawMessages | undefined) => [
            ...(old ?? []),
            ...(joinPrep ? [joinPrep.msg] : []),
            {
              id: optimisticId,
              conversationId,
              externalId: null,
              role: "ASSISTANT" as const,
              content: lastText,
              mediaType: mediaType ?? null,
              mediaId: null,
              mediaUrl: mediaUrl ?? null,
              mediaFilename: mediaFilename ?? null,
              replyToId: null,
              replyTo: null,
              deletedAt: null,
              status: "SENDING" as const,
              timestamp: now,
              starred: false,
              reactions: [] as {
                emoji: string;
                count: number;
                byMe: boolean;
              }[],
            },
          ],
        );

        queryClient.setQueriesData(
          { queryKey: [["chat", "getConversations"]] },
          (old: unknown) =>
            Array.isArray(old)
              ? old.map((c: Record<string, unknown>) =>
                  c.id === conversationId
                    ? { ...c, lastMessageText: lastText, lastMessageAt: now }
                    : c,
                )
              : old,
        );

        return { previous, optimisticId, joinPrep, capturedReply };
      },
      onSuccess: ({ message, joinSystemMessage }, _vars, context) => {
        if (context?.optimisticId)
          stableKeyMap.current.set(message.id, context.optimisticId);
        if (context?.capturedReply && context.optimisticId) {
          replyToMapRef.current.set(message.id, context.capturedReply);
          replyToMapRef.current.delete(context.optimisticId);
        }
        confirmImplicitJoin(
          joinSystemMessage,
          context?.joinPrep?.joinOptimisticId,
        );
        queryClient.setQueryData(
          messagesQueryOptions.queryKey,
          (old: typeof rawMessages | undefined) =>
            (old ?? [])
              .filter(
                (m) =>
                  joinSystemMessage !== null ||
                  m.id !== context?.joinPrep?.joinOptimisticId,
              )
              .map((m) => {
                if (m.id === context?.optimisticId)
                  return { ...message, reactions: m.reactions };
                if (
                  joinSystemMessage &&
                  m.id === context?.joinPrep?.joinOptimisticId
                )
                  return {
                    ...joinSystemMessage,
                    replyTo: null,
                    reactions: [] as {
                      emoji: string;
                      count: number;
                      byMe: boolean;
                    }[],
                  };
                return m;
              }),
        );
      },
      onError: (_err, _vars, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(
            messagesQueryOptions.queryKey,
            context.previous,
          );
        }
        if (context?.optimisticId)
          replyToMapRef.current.delete(context.optimisticId);
      },
    }),
  );

  useEffect(() => {
    return () => {
      for (const entry of entriesRef.current.values()) {
        URL.revokeObjectURL(entry.blobUrl);
      }
    };
  }, []);

  const messages = rawMessages.map((m) => {
    let text = m.content;
    if (m.role === "SYSTEM" && userName) {
      if (text === `${userName} se ha unido a la conversación`)
        text = "Te has unido a la conversación";
      else if (text === `${userName} ha abandonado la conversación`)
        text = "Has abandonado la conversación";
    }
    let replyTo: import("./message-bubble").ReplyTarget | undefined;
    if (m.replyTo) {
      replyTo = {
        id: m.replyTo.id,
        role: m.replyTo.role === "USER" ? "contact" : "user",
        senderName:
          m.replyTo.role === "USER"
            ? (conversation?.name ?? "Contacto")
            : userName || "Tú",
        text: m.replyTo.content,
        mediaType: m.replyTo.mediaType,
        mediaUrl: m.replyTo.mediaUrl,
        mediaFilename: m.replyTo.mediaFilename,
      };
    } else {
      replyTo = replyToMapRef.current.get(m.id);
    }
    return {
      id: m.id,
      role: (m.role === "USER"
        ? "contact"
        : m.role === "SYSTEM"
          ? "system"
          : "user") as "user" | "contact" | "system",
      text,
      mediaType: m.mediaType,
      mediaUrl: m.mediaUrl,
      mediaFilename: m.mediaFilename,
      createdAt: m.timestamp,
      status: m.status as Message["status"],
      replyTo,
      reactions: ("reactions" in m ? m.reactions : []) as {
        emoji: string;
        count: number;
        byMe: boolean;
      }[],
      starred: "starred" in m ? (m.starred as boolean) : false,
    };
  });

  function updateEntry(id: string, patch: Partial<UploadingEntry>) {
    setUploadingEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    const existing = entriesRef.current.get(id);
    if (existing) entriesRef.current.set(id, { ...existing, ...patch });
  }

  function removeEntry(id: string) {
    const entry = entriesRef.current.get(id);
    if (entry) URL.revokeObjectURL(entry.blobUrl);
    entriesRef.current.delete(id);
    setUploadingEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function runUpload(entry: UploadingEntry, conversationId: string) {
    try {
      const { url, mimeType, filename } = await uploadFileXHR(
        entry.file,
        conversationId,
        (pct) => updateEntry(entry.id, { progress: pct }),
        entry.abortController.signal,
      );
      removeEntry(entry.id);
      sendMessage.mutate({
        conversationId,
        content: entry.caption,
        mediaUrl: url,
        mediaType: mimeToMediaType(mimeType),
        mediaFilename: filename,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        removeEntry(entry.id);
      } else {
        updateEntry(entry.id, { failed: true });
      }
    }
  }

  function handleSendMedia(file: File, caption: string) {
    if (!conversation) return;
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const blobUrl = URL.createObjectURL(file);
    const mediaType = mimeToMediaType(file.type);
    const abortController = new AbortController();
    const entry: UploadingEntry = {
      id,
      file,
      caption,
      mediaType,
      blobUrl,
      progress: 0,
      failed: false,
      abortController,
    };
    entriesRef.current.set(id, entry);
    setUploadingEntries((prev) => [...prev, entry]);
    runUpload(entry, conversation.id);
  }

  function cancelUpload(id: string) {
    entriesRef.current.get(id)?.abortController.abort();
  }

  function retryUpload(id: string) {
    if (!conversation) return;
    const entry = entriesRef.current.get(id);
    if (!entry) return;
    const newController = new AbortController();
    const updated = {
      ...entry,
      abortController: newController,
      progress: 0,
      failed: false,
    };
    entriesRef.current.set(id, updated);
    setUploadingEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    runUpload(updated, conversation.id);
  }

  const uploadMessages: Message[] = uploadingEntries.map((u) => ({
    id: u.id,
    role: "user" as const,
    text: u.caption,
    mediaType: u.mediaType,
    mediaUrl: u.blobUrl,
    mediaFilename: u.file.name,
    createdAt: new Date(),
    uploadProgress: u.progress,
    uploadFailed: u.failed,
    onCancelUpload: () => cancelUpload(u.id),
    onRetryUpload: () => retryUpload(u.id),
  }));

  const allMessages = [...messages, ...uploadMessages];

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareIcon />
            </EmptyMedia>
            <EmptyTitle>Tus mensajes</EmptyTitle>
            <EmptyDescription>
              Selecciona una conversación para empezar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  function handleSend(payload: SendPayload) {
    if (!conversation) return;
    if (!payload.text.trim() && !payload.mediaUrl) return;
    pendingReplyRef.current = payload.replyTo;
    sendMessage.mutate({
      conversationId: conversation.id,
      content: payload.text,
      mediaUrl: payload.mediaUrl,
      mediaType: payload.mediaType,
      mediaFilename: payload.mediaFilename,
      replyToId: payload.replyTo?.id,
    });
    setReplyTo(undefined);
  }

  return (
    <div
      className="grid min-w-0 flex-1"
      style={{ gridTemplateRows: "auto 1fr auto", height: "100%" }}
    >
      {/* header */}
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
          className="flex flex-1 cursor-pointer items-center gap-3 px-2 py-1.5 text-left"
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
        </button>
        <button
          type="button"
          onClick={onToggleInfo}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
          title="Información del contacto"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      {/* messages */}
      <div className="overflow-x-hidden overflow-y-hidden">
        {messagesReady && <Conversation key={conversation.id} className="h-full">
          <ConversationContent className="gap-3 px-4 py-4">
            {allMessages.length === 0 ? (
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
                    Ver perfil
                  </Button>
                </div>
              </ConversationEmptyState>
            ) : (
              allMessages.map((message, i) => {
                const stableKey =
                  stableKeyMap.current.get(message.id) ?? message.id;
                const prev = allMessages[i - 1];
                const showDate =
                  !prev ||
                  !isSameDay(
                    new Date(message.createdAt),
                    new Date(prev.createdAt),
                  );
                return (
                  <div key={stableKey} data-message-id={message.id}>
                    {showDate && (
                      <DateSeparator date={new Date(message.createdAt)} />
                    )}
                    {message.role === "system" ? (
                      <SystemMessage text={message.text} />
                    ) : (
                      <MessageBubble
                        message={
                          message as Parameters<
                            typeof MessageBubble
                          >[0]["message"]
                        }
                        onReply={handleReply}
                        onReact={handleReact}
                        onStar={handleStar}
                        onReplyClick={(replyId) => {
                          const el = document.querySelector(`[data-message-id="${replyId}"]`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>}
      </div>

      {/* input */}
      <div>
        <PromptInputProvider>
          <ConnectedQuickReplies onSendPayload={handleSend} />
          <MessageInput
            conversationId={conversation.id}
            credentialId={conversation.credentialId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(undefined)}
            onSend={handleSend}
            onSendMedia={handleSendMedia}
          />
        </PromptInputProvider>
      </div>
    </div>
  );
}
