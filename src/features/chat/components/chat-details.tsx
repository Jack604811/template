"use client";

import {
  BanIcon,
  BellIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  ImageIcon,
  LockIcon,
  PaletteIcon,
  ShieldIcon,
  StarIcon,
  TimerIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import { getAvatarStyle } from "../utils/avatar";

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  destructive?: boolean;
  onClick?: () => void;
}

function InfoRow({ icon, label, value, destructive = false, onClick }: InfoRowProps) {
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
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

interface ChatDetailsProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function PanelContent({
  conversation,
  onClose,
  onDelete,
  mobile = false,
}: {
  conversation: Conversation;
  onClose: () => void;
  onDelete: (id: string) => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-2">
        {mobile ? (
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
      <ScrollArea className="flex-1">
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

        <Separator />

        <div className="px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Notas
          </p>
          <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
            <Textarea
              placeholder="Agregar notas sobre este contacto..."
              className="min-h-[80px] resize-none border-0 bg-transparent p-0 text-[15px] leading-snug shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <Separator />

        <div className="py-1">
          <InfoRow icon={<UsersIcon />} label="Equipo asignado" value="Ninguno" />
          <InfoRow icon={<ImageIcon />} label="Multimedia y docs" value="Ninguno" />
          <InfoRow icon={<StarIcon />} label="Mensajes destacados" value="Ninguno" />
        </div>

        <Separator />

        <div className="py-1">
          <InfoRow icon={<PaletteIcon />} label="Tema" />
          <InfoRow icon={<CameraIcon />} label="Guardar en fotos" value="Por defecto" />
          <InfoRow icon={<LockIcon />} label="Cifrado" />
          <InfoRow icon={<TimerIcon />} label="Mensajes temporales" value="Desactivado" />
          <InfoRow icon={<BellIcon />} label="Silenciar mensajes" />
        </div>

        <Separator />

        <div className="py-1">
          <InfoRow icon={<ShieldIcon />} label="Restringir" />
          <InfoRow icon={<BanIcon />} label="Bloquear" />
          <InfoRow icon={<FlagIcon />} label="Reportar" />
          <InfoRow icon={<TrashIcon />} label="Eliminar chat" destructive onClick={() => { onDelete(conversation.id); onClose(); }} />
        </div>
      </ScrollArea>
    </div>
  );
}

export function ChatDetails({
  conversation,
  open,
  onClose,
  onDelete,
}: ChatDetailsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="h-[92dvh] p-0">
          <DrawerTitle className="sr-only">Contact Info</DrawerTitle>
          <DrawerDescription className="sr-only">{conversation.name}</DrawerDescription>
          <PanelContent conversation={conversation} onClose={onClose} onDelete={onDelete} mobile />
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PanelContent conversation={conversation} onClose={onClose} onDelete={onDelete} />
    </div>
  );
}
