"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type RefObject } from "react";
import type { Message } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import type { Conversation } from "../types";

type CachedMessage = Omit<Message, "timestamp" | "status"> & {
  timestamp: Date;
  status: import("@/generated/prisma").MessageStatus;
  replyTo: { id: string; role: Message["role"]; content: string; mediaType: string | null; mediaUrl: string | null; mediaFilename: string | null } | null;
  reactions: { emoji: string; count: number; byMe: boolean }[];
};

export function useConversationParticipant(
  conversation: Conversation | null,
  stableKeyMap: RefObject<Map<string, string>>,
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hasJoinedRef = useRef<boolean | null>(null);
  const prevConvIdRef = useRef<string | undefined>(conversation?.id);

  const messagesQueryOptions = trpc.chat.getMessages.queryOptions(
    { conversationId: conversation?.id ?? "" },
  );
  const participantQueryOptions = trpc.chat.checkParticipant.queryOptions(
    { conversationId: conversation?.id ?? "" },
  );

  const { data: serverIsParticipant } = useQuery({
    ...participantQueryOptions,
    enabled: !!conversation,
  });

  // Reset local tracking when switching conversations
  if (prevConvIdRef.current !== conversation?.id) {
    prevConvIdRef.current = conversation?.id;
    hasJoinedRef.current = null;
  }

  // Sync ref when server confirms the user is no longer a participant (after leave)
  useEffect(() => {
    if (serverIsParticipant === false) hasJoinedRef.current = null;
  }, [serverIsParticipant]);

  const hasJoined =
    hasJoinedRef.current !== null ? hasJoinedRef.current : (serverIsParticipant ?? false);

  const JOIN_TEXT_SELF = "Te has unido a la conversación";
  const LEAVE_TEXT_SELF = "Has abandonado la conversación";

  function makeSystemMsg(content: string): CachedMessage {
    return {
      id: `system-optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId: conversation?.id ?? "",
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
      starred: false,
      reactions: [],
    };
  }

  // Called from sendMessage.onMutate — registers the optimistic join side-effect
  function prepareImplicitJoin(): { joinOptimisticId: string; msg: CachedMessage } | null {
    if (hasJoined) return null;
    const joinOptimisticId = `optimistic-join-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    stableKeyMap.current.set(joinOptimisticId, joinOptimisticId);
    return { joinOptimisticId, msg: { ...makeSystemMsg(JOIN_TEXT_SELF), id: joinOptimisticId } };
  }

  // Called from sendMessage.onSuccess — wires the real join message into the stable key map
  function confirmImplicitJoin(
    realJoinMsg: { id: string } | null,
    joinOptimisticId: string | undefined,
  ) {
    if (realJoinMsg && joinOptimisticId) {
      stableKeyMap.current.set(realJoinMsg.id, joinOptimisticId);
      hasJoinedRef.current = true;
      void queryClient.invalidateQueries({ queryKey: participantQueryOptions.queryKey });
    } else if (!realJoinMsg && joinOptimisticId) {
      // Server confirmed already joined — remove the stale optimistic entry
      queryClient.setQueryData(messagesQueryOptions.queryKey, (old: CachedMessage[] | undefined) =>
        (old ?? []).filter((m) => m.id !== joinOptimisticId),
      );
    }
  }

  // Explicit join — used by chat-details "Unirte" button
  const joinConversation = useMutation(
    trpc.chat.joinConversation.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
        const joinOptimisticId = `optimistic-join-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        stableKeyMap.current.set(joinOptimisticId, joinOptimisticId);
        hasJoinedRef.current = true;
        queryClient.setQueryData(
          messagesQueryOptions.queryKey,
          (old: CachedMessage[] | undefined) => [
            ...(old ?? []),
            { ...makeSystemMsg(JOIN_TEXT_SELF), id: joinOptimisticId },
          ],
        );
        return { previous, joinOptimisticId };
      },
      onError: (_err, _vars, context) => {
        hasJoinedRef.current = null;
        if (context?.previous !== undefined) {
          queryClient.setQueryData(messagesQueryOptions.queryKey, context.previous);
        }
      },
      onSuccess: (result, _vars, context) => {
        if (!context?.joinOptimisticId) return;
        if (result) {
          stableKeyMap.current.set(result.id, context.joinOptimisticId);
          void queryClient.invalidateQueries({ queryKey: participantQueryOptions.queryKey });
          queryClient.setQueryData(
            messagesQueryOptions.queryKey,
            (old: CachedMessage[] | undefined) =>
              (old ?? []).map((m) => (m.id === context.joinOptimisticId ? { ...result, replyTo: null, reactions: [] as CachedMessage["reactions"] } : m)),
          );
        } else {
          // Already a participant — remove optimistic entry
          queryClient.setQueryData(
            messagesQueryOptions.queryKey,
            (old: CachedMessage[] | undefined) =>
              (old ?? []).filter((m) => m.id !== context.joinOptimisticId),
          );
        }
      },
    }),
  );

  // Explicit leave — used by chat-details "Salir" row
  const leaveConversation = useMutation(
    trpc.chat.leaveConversation.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: messagesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(messagesQueryOptions.queryKey);
        const leaveOptimisticId = `optimistic-leave-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        stableKeyMap.current.set(leaveOptimisticId, leaveOptimisticId);
        hasJoinedRef.current = false;
        queryClient.setQueryData(
          messagesQueryOptions.queryKey,
          (old: CachedMessage[] | undefined) => [
            ...(old ?? []),
            { ...makeSystemMsg(LEAVE_TEXT_SELF), id: leaveOptimisticId },
          ],
        );
        return { previous, leaveOptimisticId };
      },
      onError: (_err, _vars, context) => {
        hasJoinedRef.current = null;
        if (context?.previous !== undefined) {
          queryClient.setQueryData(messagesQueryOptions.queryKey, context.previous);
        }
      },
      onSuccess: (result, _vars, context) => {
        if (!result || !context?.leaveOptimisticId) return;
        stableKeyMap.current.set(result.leaveSystemMessage.id, context.leaveOptimisticId);
        void queryClient.invalidateQueries({ queryKey: participantQueryOptions.queryKey });
        queryClient.setQueryData(
          messagesQueryOptions.queryKey,
          (old: CachedMessage[] | undefined) =>
            (old ?? []).map((m) =>
              m.id === context.leaveOptimisticId ? { ...result.leaveSystemMessage, replyTo: null, reactions: [] as CachedMessage["reactions"] } : m,
            ),
        );
      },
    }),
  );

  return {
    hasJoined,
    isParticipant: serverIsParticipant,
    participantQueryOptions,
    messagesQueryOptions,
    prepareImplicitJoin,
    confirmImplicitJoin,
    joinConversation,
    leaveConversation,
  };
}
