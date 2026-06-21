"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Message as BubbleMessage, ReplyTarget } from "../components/message-bubble";

interface MessageActionsOptions {
  conversationName?: string;
  onReply?: (reply: ReplyTarget) => void;
}

export function useMessageActions(conversationId: string, opts: MessageActionsOptions = {}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const messagesQueryOptions = trpc.chat.getMessages.queryOptions({ conversationId });

  const toggleStar = useMutation(
    trpc.chat.toggleStar.mutationOptions({
      onMutate: async ({ messageId, starred }) => {
        await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
        queryClient.setQueryData(messagesQueryOptions.queryKey, (old) =>
          (old ?? []).map((m) => (m.id === messageId ? { ...m, starred } : m)),
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous !== undefined)
          queryClient.setQueryData(messagesQueryOptions.queryKey, context.previous);
      },
    }),
  );

  const toggleReaction = useMutation(
    trpc.chat.toggleReaction.mutationOptions({
      onMutate: async ({ messageId, emoji }) => {
        await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
        queryClient.setQueryData(messagesQueryOptions.queryKey, (old) =>
          (old ?? []).map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions ?? [];
            const existing = reactions.find((r) => r.emoji === emoji);
            const myOtherReaction = reactions.find((r) => r.byMe && r.emoji !== emoji);
            let updated = reactions
              .map((r) => {
                if (r.emoji === emoji) return { ...r, count: r.byMe ? r.count - 1 : r.count + 1, byMe: !r.byMe };
                if (r.emoji === myOtherReaction?.emoji) return { ...r, count: r.count - 1, byMe: false };
                return r;
              })
              .filter((r) => r.count > 0);
            if (!existing) updated = [...updated, { emoji, count: 1, byMe: true }];
            return { ...m, reactions: updated };
          }),
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous !== undefined)
          queryClient.setQueryData(messagesQueryOptions.queryKey, context.previous);
      },
      onSettled: () => void queryClient.invalidateQueries({ queryKey: messagesQueryOptions.queryKey }),
    }),
  );

  function handleReply(msg: BubbleMessage) {
    opts.onReply?.({
      id: msg.id,
      role: msg.role as "user" | "contact",
      senderName: msg.role === "user" ? "Tú" : (opts.conversationName ?? "Contacto"),
      text: msg.text,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl,
      mediaFilename: msg.mediaFilename,
    });
  }

  return {
    handleStar: (messageId: string, starred: boolean) => toggleStar.mutate({ messageId, starred }),
    handleReact: (messageId: string, emoji: string) => toggleReaction.mutate({ messageId, emoji }),
    handleReply,
  };
}
