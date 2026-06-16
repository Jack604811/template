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
}

function InfoRow({ icon, label, value, destructive = false }: InfoRowProps) {
  return (
    <button
      type="button"
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
}

function PanelContent({
  conversation,
  onClose,
  mobile = false,
}: {
  conversation: Conversation;
  onClose: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="relative flex flex-col items-center gap-1.5 px-4 pb-6 pt-4">
          <div className="flex w-full items-center justify-between">
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
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </p>
          <Textarea
            placeholder="Add notes about this contact..."
            className="min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        <Separator />

        <div className="py-1">
          <InfoRow icon={<UsersIcon />} label="Assigned Team" value="None" />
          <InfoRow icon={<ImageIcon />} label="Media, Links, and Docs" value="None" />
          <InfoRow icon={<StarIcon />} label="Starred Messages" value="None" />
        </div>

        <Separator />

        <div className="py-1">
          <InfoRow icon={<PaletteIcon />} label="Theme" />
          <InfoRow icon={<CameraIcon />} label="Save to Camera Roll" value="Default" />
          <InfoRow icon={<LockIcon />} label="Encryption" />
          <InfoRow icon={<TimerIcon />} label="Disappearing Messages" value="Off" />
          <InfoRow icon={<BellIcon />} label="Mute Messages" />
        </div>

        <Separator />

        <div className="py-1">
          <InfoRow icon={<ShieldIcon />} label="Restrict" />
          <InfoRow icon={<BanIcon />} label="Block" />
          <InfoRow icon={<FlagIcon />} label="Report" />
          <InfoRow icon={<TrashIcon />} label="Delete Chat" destructive />
        </div>
      </ScrollArea>
    </div>
  );
}

export function ChatDetails({
  conversation,
  open,
  onClose,
}: ChatDetailsProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="h-[92dvh] p-0">
          <DrawerTitle className="sr-only">Contact Info</DrawerTitle>
          <DrawerDescription className="sr-only">{conversation.name}</DrawerDescription>
          <PanelContent conversation={conversation} onClose={onClose} mobile />
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PanelContent conversation={conversation} onClose={onClose} />
    </div>
  );
}
