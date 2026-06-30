"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BellDotIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  TagIcon,
  Trash2Icon,
  UserIcon,
  Users2Icon,
} from "lucide-react";
import { useState } from "react";
import { DeleteItem } from "@/components/ui/delete-item";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTRPC } from "@/trpc/client";
import { useConversationParticipant } from "../hooks/use-conversation-participant";
import { useMarkAsUnread } from "../hooks/use-mark-as-unread";
import type { Conversation } from "../types";
import { type Tag, TagDialog } from "./conversation-list";

interface ConversationContextMenuProps {
  conversation: Conversation;
  stableKeyMap: React.RefObject<Map<string, string>>;
  onToggleInfo: () => void;
  isInfoOpen?: boolean;
  onDeleted?: () => void;
  onMarkedUnread?: () => void;
}

export function ConversationContextMenu({
  conversation,
  stableKeyMap,
  onToggleInfo,
  isInfoOpen = false,
  onDeleted,
  onMarkedUnread,
}: ConversationContextMenuProps) {
  const trpc = useTRPC();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: rawTags = [] } = useQuery(trpc.chat.getTags.queryOptions());
  const tags: Tag[] = rawTags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    createdAt: t.createdAt,
    conversationCount: t._count.conversations,
  }));

  const { hasJoined, joinConversation, leaveConversation } = useConversationParticipant(conversation, stableKeyMap);

  const markAsUnread = useMarkAsUnread(conversation.id, onMarkedUnread);

  const deleteConversation = useMutation(
    trpc.chat.deleteConversation.mutationOptions({
      onSuccess: () => onDeleted?.(),
    }),
  );

  const menuItemClass =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted";

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/8"
          >
            <EllipsisVerticalIcon className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1.5">
          <div className="flex flex-col">
            <button type="button" onClick={onToggleInfo} className={menuItemClass}>
              <UserIcon className="size-4 shrink-0 text-muted-foreground" />
              {isInfoOpen ? "Ocultar perfil" : "Ver perfil"}
            </button>
            <button type="button" className={menuItemClass}>
              <Users2Icon className="size-4 shrink-0 text-muted-foreground" />
              Asignar equipo
            </button>
            <button type="button" onClick={() => setTagDialogOpen(true)} className={menuItemClass}>
              <TagIcon className="size-4 shrink-0 text-muted-foreground" />
              Etiquetas
            </button>
            <button
              type="button"
              onClick={() => markAsUnread.mutate({ conversationId: conversation.id })}
              className={menuItemClass}
            >
              <BellDotIcon className="size-4 shrink-0 text-muted-foreground" />
              Marcar como no leído
            </button>
            <button
              type="button"
              onClick={() =>
                hasJoined
                  ? leaveConversation.mutate({ conversationId: conversation.id })
                  : joinConversation.mutate({ conversationId: conversation.id })
              }
              className={menuItemClass}
            >
              <LogOutIcon className="size-4 shrink-0 text-muted-foreground" />
              {hasJoined ? "Abandonar" : "Unirte"}
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-muted"
            >
              <Trash2Icon className="size-4 shrink-0" />
              Eliminar chat
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <TagDialog open={tagDialogOpen} onOpenChange={setTagDialogOpen} tags={tags} conversationId={conversation.id} />
      <DeleteItem
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteConversation.mutate({ conversationId: conversation.id })}
        title="Eliminar chat"
        description="¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer."
      />
    </>
  );
}
