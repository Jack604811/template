"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  BanIcon,
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  LogInIcon,
  SlidersHorizontalIcon,
  LogOutIcon,
  StarIcon,
  TagIcon,
  TimerIcon,
  TrashIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Pills } from "@/components/ui/pills";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useContactBlock } from "../hooks/use-contact-block";
import { useConversationParticipant } from "../hooks/use-conversation-participant";
import type { Conversation } from "../types";
import { getAvatarStyle } from "../utils/avatar";

type MediaFilter = "media" | "docs" | "links";

const MEDIA_PILLS = [
  { id: "media" as const, label: "Media" },
  { id: "docs" as const, label: "Docs" },
  { id: "links" as const, label: "Links" },
];

const URL_RE = /https?:\/\/[^\s<>"]+/g;

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  destructive?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

function InfoRow({ icon, label, value, destructive = false, onClick, children }: InfoRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-2xl [&>svg]:size-4",
          destructive ? "bg-destructive/10 text-destructive" : "bg-muted/30 text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <span className="flex-1 font-medium">{label}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      {children}
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

interface ChatDetailsProps {
  conversation: Conversation;
  stableKeyMap: RefObject<Map<string, string>>;
  open: boolean;
  onClose: () => void;
  onDeleteSuccess: (id: string) => void;
}

function PanelContent({
  conversation,
  stableKeyMap,
  onClose,
  onDeleteSuccess,
  mobile = false,
}: {
  conversation: Conversation;
  stableKeyMap: RefObject<Map<string, string>>;
  onClose: () => void;
  onDeleteSuccess: (id: string) => void;
  mobile?: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { isPending: isBlockPending, toggle: toggleBlock } = useContactBlock(conversation, stableKeyMap);
  const [localBlocked, setLocalBlocked] = useState(conversation.blocked);
  const [notes, setNotes] = useState(conversation.notes ?? "");
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [view, setView] = useState<"menu" | "multimedia">("menu");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("media");
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drawerTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (notesDrawerOpen) {
      const t = setTimeout(() => drawerTextareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [notesDrawerOpen]);

  useEffect(() => {
    setNotes(conversation.notes ?? "");
  }, [conversation.notes]);


  const conversationsQueryKey = trpc.chat.getConversations.queryOptions({ search: "" }).queryKey.slice(0, 1);
  const updateNotes = useMutation(
    trpc.chat.updateNotes.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      },
    }),
  );

  const { data: rawMessages = [] } = useQuery(
    trpc.chat.getMessages.queryOptions({ conversationId: conversation.id }),
  );

  function saveNotes(value: string) {
    setNotes(value);
    updateNotes.mutate({ conversationId: conversation.id, notes: value });
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      updateNotes.mutate({ conversationId: conversation.id, notes: value });
    }, 800);
  }

  function openNotesDrawer() {
    setDraft(notes);
    setNotesDrawerOpen(true);
  }

  const { hasJoined, joinConversation, leaveConversation } = useConversationParticipant(
    conversation,
    stableKeyMap,
  );

  const deleteConversation = useMutation(trpc.chat.deleteConversation.mutationOptions({
    onSuccess: () => onDeleteSuccess(conversation.id),
  }));

  const mediaItems = rawMessages.filter(
    (m) => ["image", "video"].includes(m.mediaType ?? "") && m.mediaUrl,
  ).reverse();
  const docItems = rawMessages.filter(
    (m) => ["document", "audio", "voice"].includes(m.mediaType ?? "") && m.mediaUrl,
  ).reverse();
  const linkItems = rawMessages.flatMap((m) =>
    !m.mediaUrl ? (m.content.match(URL_RE) ?? []).map((url, i) => ({ id: `${m.id}-${i}`, url })) : [],
  ).reverse();

  const previewMedia = mediaItems.slice(0, 3);

  const avatarSection = (
    <div className="relative flex flex-col items-center gap-1.5 px-4 pb-6 pt-4">
      <div />
      <Avatar className="mt-2 size-20">
        <AvatarFallback
          className="text-2xl font-semibold text-white"
          style={getAvatarStyle(conversation.name)}
        >
          {conversation.initials}
        </AvatarFallback>
      </Avatar>
      <p className="mt-2 text-[17px] font-semibold">{conversation.name}</p>
      <p className="text-sm capitalize text-muted-foreground">{conversation.channel}</p>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between px-2">
        {view === "multimedia" ? (
          <button
            type="button"
            onClick={() => setView("menu")}
            className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
        ) : mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
        ) : (
          <div className="size-10" />
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Multimedia full view */}
      {view === "multimedia" ? (
        <ScrollArea className="min-h-0 flex-1">
          {avatarSection}
          <Separator />
          <div className="py-4">
            <div className="overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Pills
                items={MEDIA_PILLS}
                value={mediaFilter}
                onValueChange={setMediaFilter}
                className="w-max"
              />
            </div>

            {mediaFilter === "media" && (
              mediaItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 px-4">
                  {mediaItems.map((m) => (
                    <a
                      key={m.id}
                      href={m.mediaUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-xl bg-muted/40"
                    >
                      {m.mediaType === "video" ? (
                        <>
                          <video
                            src={m.mediaUrl ?? ""}
                            className="size-full object-cover"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <VideoIcon className="size-5 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <Image src={m.mediaUrl ?? ""} alt="" fill className="object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <MediaEmptyState icon={<ImageIcon />} label="media compartida" />
              )
            )}

            {mediaFilter === "docs" && (
              docItems.length > 0 ? (
                <div className="flex flex-col gap-2 px-4">
                  {docItems.map((m) => (
                    <a
                      key={m.id}
                      href={m.mediaUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                        <FileTextIcon className="size-4" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {m.mediaFilename ?? "Archivo"}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <MediaEmptyState icon={<FileTextIcon />} label="documentos" />
              )
            )}

            {mediaFilter === "links" && (
              linkItems.length > 0 ? (
                <div className="flex flex-col gap-2 px-4">
                  {linkItems.map((l) => (
                    <a
                      key={l.id}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                        <LinkIcon className="size-4" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{l.url}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <MediaEmptyState icon={<LinkIcon />} label="links" />
              )
            )}
          </div>
        </ScrollArea>
      ) : (
        /* Main menu view */
        <ScrollArea className="min-h-0 flex-1">
          {avatarSection}

          <Separator />

          <div className="px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notas
            </p>
            {mobile ? (
              <button
                type="button"
                onClick={openNotesDrawer}
                className="w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-left min-h-[80px] items-start flex flex-col justify-start"
              >
                {notes ? (
                  <span className="text-[15px] text-foreground leading-snug">{notes}</span>
                ) : (
                  <span className="text-[15px] text-muted-foreground/50 italic">Agregar notas sobre este contacto...</span>
                )}
              </button>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Agregar notas sobre este contacto..."
                  className="w-full bg-transparent border-none outline-none text-[15px] text-foreground leading-snug resize-none p-0 m-0 font-[inherit] min-h-[80px] placeholder:text-muted-foreground/50 placeholder:italic"
                />
              </div>
            )}
          </div>

          <Drawer open={notesDrawerOpen} onOpenChange={(v) => !v && setNotesDrawerOpen(false)}>
            <DrawerContent>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                  >
                    <ChevronLeftIcon className="size-5" />
                  </button>
                </DrawerClose>
                <DrawerTitle className="text-[15px] font-semibold">Notas</DrawerTitle>
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                  >
                    <XIcon className="size-5" />
                  </button>
                </DrawerClose>
              </div>
              <DrawerDescription className="sr-only">Editar notas del contacto</DrawerDescription>
              <div className="px-5 pt-2 pb-safe-or-6 flex flex-col gap-3">
                <textarea
                  ref={drawerTextareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Agregar notas sobre este contacto..."
                  className="w-full h-[50dvh] rounded-2xl border border-border bg-muted/30 px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground/50 placeholder:italic"
                />
                <button
                  type="button"
                  onClick={() => { saveNotes(draft); setNotesDrawerOpen(false); }}
                  disabled={updateNotes.isPending}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-[15px] font-semibold transition-opacity disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </DrawerContent>
          </Drawer>

          <Separator />

          <div className="py-1">
            <InfoRow icon={<UsersIcon />} label="Equipo asignado" value="Ninguno" />
            <InfoRow icon={<TagIcon />} label="Etiquetas" />
            <InfoRow icon={<SlidersHorizontalIcon />} label="Variables" />
            <InfoRow icon={<CalendarIcon />} label="Reservas" />
            <InfoRow
              icon={<ImageIcon />}
              label="Multimedia y docs"
              onClick={() => { setMediaFilter("media"); setView("multimedia"); }}
            />

            {previewMedia.length > 0 && (
              <button
                type="button"
                onClick={() => { setMediaFilter("media"); setView("multimedia"); }}
                className="grid w-full grid-cols-3 gap-1 px-4 pb-3"
              >
                {previewMedia.map((m) => (
                  <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted/40">
                    {m.mediaType === "video" ? (
                      <>
                        <video src={m.mediaUrl ?? ""} className="size-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <VideoIcon className="size-5 text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <Image src={m.mediaUrl ?? ""} alt="" fill className="object-cover" />
                    )}
                  </div>
                ))}
              </button>
            )}
          </div>

          <Separator />

          <div className="py-1">
            <InfoRow icon={<StarIcon />} label="Mensajes destacados" value="Ninguno" />
            <InfoRow icon={<TimerIcon />} label="Mensajes temporales" value="Desactivado" />
            <InfoRow icon={<BellIcon />} label="Silenciar mensajes" />
          </div>

          <Separator />

          <div className="py-1">
            {hasJoined ? (
              <InfoRow
                icon={<LogOutIcon />}
                label="Abandonar la conversación"
                onClick={() => leaveConversation.mutate({ conversationId: conversation.id })}
              />
            ) : (
              <InfoRow
                icon={<LogInIcon />}
                label="Unirte a la conversación"
                onClick={() => joinConversation.mutate({ conversationId: conversation.id })}
              />
            )}
            <InfoRow
              icon={<BanIcon />}
              label={localBlocked ? "Desbloquear" : "Bloquear"}
              onClick={isBlockPending ? undefined : () => {
                setLocalBlocked((v) => !v);
                toggleBlock();
              }}
            />
            <InfoRow
              icon={<TrashIcon />}
              label="Eliminar chat"
              destructive
              onClick={() => deleteConversation.mutate({ conversationId: conversation.id })}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function MediaEmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
      <div className="[&>svg]:size-8">{icon}</div>
      <p className="text-xs">No hay {label}</p>
    </div>
  );
}

export function ChatDetails({
  conversation,
  stableKeyMap,
  open,
  onClose,
  onDeleteSuccess,
}: ChatDetailsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="mt-0! h-dvh! max-h-dvh! rounded-none! p-0">
          <DrawerTitle className="sr-only">Contact Info</DrawerTitle>
          <DrawerDescription className="sr-only">{conversation.name}</DrawerDescription>
          <PanelContent key={conversation.id}
            conversation={conversation}
            stableKeyMap={stableKeyMap}
            onClose={onClose}
            onDeleteSuccess={onDeleteSuccess}
            mobile
          />
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PanelContent
        conversation={conversation}
        stableKeyMap={stableKeyMap}
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
      />
    </div>
  );
}
