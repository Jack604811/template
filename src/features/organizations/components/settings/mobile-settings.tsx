"use client";

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Building2Icon } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { OrgRole } from "../../utils/roles";
import { AppearanceSection, SectionLabel } from "./primitives";
import { PanelContent } from "./panel-content";
import { type Tab, TABS } from "./types";

export function MobileSettings({
  orgName,
  orgId,
  role,
  plan,
}: {
  orgName: string;
  orgId: string;
  role: OrgRole;
  plan: string;
}) {
  const [openTab, setOpenTab] = useState<Tab | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const activeTab = TABS.find((t) => t.id === openTab);
  const canManage = role === "owner" || role === "admin";

  return (
    <>
      <div className="flex flex-col px-4 py-4">
        <Link
          href="/select-organization"
          className="flex items-center gap-3 py-3 px-2 rounded-xl transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <div className="size-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Building2Icon className="size-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-semibold text-foreground leading-tight truncate">
              {orgName}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                {plan}
              </span>
            </div>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
        </Link>

        <div className="mt-4">
          <SectionLabel>Configuración</SectionLabel>
          <div className="mt-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOpenTab(t.id)}
                  className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted border-b border-border/30 last:border-0"
                >
                  <Icon className="size-[18px] shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[15px] text-foreground/90">{t.label}</span>
                  <ChevronRightIcon className="size-4 text-foreground/20 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <SectionLabel>Apariencia</SectionLabel>
          <AppearanceSection compact />
        </div>

        <p className="text-center text-[11px] text-muted-foreground/30 py-8">Nodebase · v1.0.0</p>
      </div>

      <Drawer open={openTab !== null} onOpenChange={(v) => !v && setOpenTab(null)}>
        <DrawerContent className="max-h-[100dvh] h-[95dvh]">
          <DrawerTitle className="sr-only">{activeTab?.label ?? ""}</DrawerTitle>
          <DrawerDescription className="sr-only">{activeTab?.label}</DrawerDescription>

          <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            </DrawerClose>
            <span className="text-[15px] font-semibold">{activeTab?.label ?? ""}</span>
            {canManage && openTab === "equipo" ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <PlusIcon className="size-5" />
              </button>
            ) : canManage && openTab === "campos" ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
              >
                <PlusIcon className="size-5" />
              </button>
            ) : (
              <DrawerClose asChild>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
                >
                  <XIcon className="size-5" />
                </button>
              </DrawerClose>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-safe-or-8">
            {openTab && (
              <PanelContent
                tab={openTab}
                orgId={orgId}
                role={role}
                addOpen={addOpen}
                onAddOpenChange={setAddOpen}
                inviteOpen={inviteOpen}
                setInviteOpen={setInviteOpen}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
