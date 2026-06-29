"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useMarkAsUnread(conversationId: string, onSuccess?: () => void) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const allKey = trpc.chat.getConversations.queryOptions({ search: "" }).queryKey;
  const joinedKey = trpc.chat.getConversations.queryOptions({ search: "", joined: true }).queryKey;
  const broadKey = allKey.slice(0, 1);

  return useMutation(
    trpc.chat.markAsUnread.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: broadKey });
        const previousAll = queryClient.getQueryData(allKey);
        const previousJoined = queryClient.getQueryData(joinedKey);
        queryClient.setQueryData(allKey, (old) =>
          old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 1 } : c)),
        );
        queryClient.setQueryData(joinedKey, (old) =>
          old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 1 } : c)),
        );
        onSuccess?.();
        return { previousAll, previousJoined };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previousAll) queryClient.setQueryData(allKey, ctx.previousAll);
        if (ctx?.previousJoined) queryClient.setQueryData(joinedKey, ctx.previousJoined);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: broadKey }),
    }),
  );
}
