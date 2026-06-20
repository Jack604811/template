"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RefObject } from "react";
import type { Message } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import type { Conversation } from "../types";

type CachedMessage = Omit<Message, "timestamp" | "status"> & {
  timestamp: Date;
  status: import("@/generated/prisma").MessageStatus;
  replyTo: { id: string; role: Message["role"]; content: string; mediaType: string | null; mediaUrl: string | null; mediaFilename: string | null } | null;
  reactions: { emoji: string; count: number; byMe: boolean }[];
};

function makeSystemMsg(conversationId: string, content: string): CachedMessage {
  return {
    id: `optimistic-block-${Date.now()}`,
    conversationId,
    externalId: null,
    role: "SYSTEM",
    content,
    mediaType: null,
    mediaId: null,
    mediaUrl: null,
    mediaFilename: null,
    replyToId: null,
    replyTo: null,
    deletedAt: null,
    status: "SENT" as const,
    timestamp: new Date(),
    reactions: [],
  };
}

export function useContactBlock(
  conversation: Conversation | null,
  stableKeyMap: RefObject<Map<string, string>>,
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const messagesQueryOptions = trpc.chat.getMessages.queryOptions(
    { conversationId: conversation?.id ?? "" },
  );
  const conversationsQueryKey = trpc.chat.getConversations.queryOptions({ search: "" }).queryKey.slice(0, 1);

  function addOptimisticMessage(text: string) {
    const msg = makeSystemMsg(conversation?.id ?? "", text);
    stableKeyMap.current.set(msg.id, msg.id);
    queryClient.setQueryData(
      messagesQueryOptions.queryKey,
      (old: CachedMessage[] | undefined) => [...(old ?? []), msg],
    );
    return msg.id;
  }

  function replaceOptimisticMessage(optimisticId: string, real: CachedMessage) {
    stableKeyMap.current.set(real.id, optimisticId);
    queryClient.setQueryData(
      messagesQueryOptions.queryKey,
      (old: CachedMessage[] | undefined) =>
        (old ?? []).map((m) => (m.id === optimisticId ? real : m)),
    );
    void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
  }

  const blockContact = useMutation(
    trpc.chat.blockContact.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
        const optimisticId = addOptimisticMessage("Contacto bloqueado");
        return { previous, optimisticId };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous !== undefined)
          queryClient.setQueryData(messagesQueryOptions.queryKey, ctx.previous);
      },
      onSuccess: (result, _vars, ctx) => {
        if (!ctx?.optimisticId) return;
        const [, msg] = result as [unknown, CachedMessage];
        replaceOptimisticMessage(ctx.optimisticId, msg);
      },
    }),
  );

  const unblockContact = useMutation(
    trpc.chat.unblockContact.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
        const optimisticId = addOptimisticMessage("Contacto desbloqueado");
        return { previous, optimisticId };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous !== undefined)
          queryClient.setQueryData(messagesQueryOptions.queryKey, ctx.previous);
      },
      onSuccess: (result, _vars, ctx) => {
        if (!ctx?.optimisticId) return;
        const [, msg] = result as [unknown, CachedMessage];
        replaceOptimisticMessage(ctx.optimisticId, msg);
      },
    }),
  );

  function toggle() {
    if (!conversation) return;
    if (conversation.blocked) {
      unblockContact.mutate({ conversationId: conversation.id });
    } else {
      blockContact.mutate({ conversationId: conversation.id });
    }
  }

  return {
    isBlocked: conversation?.blocked ?? false,
    isPending: blockContact.isPending || unblockContact.isPending,
    toggle,
  };
}
