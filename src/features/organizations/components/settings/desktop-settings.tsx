"use client";

import { Building2Icon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomFieldDetails } from "@/features/custom-fields/components/custom-field-details";
import { CustomFieldDisplayLocation } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import type { OrgRole } from "../../utils/roles";
import { AppearanceSection, SectionLabel } from "./primitives";
import { PanelContent } from "./panel-content";
import { type FieldItem, type Tab, TABS } from "./types";

type Sidebar =
  | { mode: "create" }
  | { mode: "edit"; field: FieldItem }
  | null;

export function DesktopSettings({
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
  const [active, setActive] = useState<Tab>("general");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sidebar, setSidebar] = useState<Sidebar>(null);
  const canManage = role === "owner" || role === "admin";

  const sidebarTitle =
    sidebar?.mode === "edit" ? sidebar.field.name : "Nuevo campo";

  return (
    <div className="flex h-dvh">
      {/* Nav sidebar */}
      <aside className="w-56 shrink-0 border-r flex flex-col p-4 gap-1">
        <Link
          href="/select-organization"
          className="flex items-center gap-2.5 px-2 py-3 mb-2 rounded-xl transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Building2Icon className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">{orgName}</p>
            <p className="text-[11px] text-muted-foreground">{plan}</p>
          </div>
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
        </Link>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1 mt-2">
          Configuración
        </p>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setActive(t.id); setSidebar(null); }}
              className={cn(
                "flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t.label}
            </button>
          );
        })}

        <div className="mt-auto pt-4 border-t border-border/40">
          <AppearanceSection compact />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {TABS.find((t) => t.id === active)?.label}
            </h2>
            {canManage && active === "equipo" && (
              <Button onClick={() => setInviteOpen(true)}>
                <PlusIcon />
                Invitar
              </Button>
            )}
            {canManage && active === "campos" && (
              <Button onClick={() => setSidebar({ mode: "create" })}>
                <PlusIcon />
                Nuevo
              </Button>
            )}
          </div>
          <PanelContent
            tab={active}
            orgId={orgId}
            role={role}
            addOpen={false}
            onAddOpenChange={() => {}}
            inviteOpen={inviteOpen}
            setInviteOpen={setInviteOpen}
            onEditField={(field) => setSidebar({ mode: "edit", field })}
          />
        </div>
      </main>

      {/* Field sidebar */}
      {sidebar && (
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden border-l">
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <span className="text-[15px] font-semibold">{sidebarTitle}</span>
            <button
              type="button"
              onClick={() => setSidebar(null)}
              className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto px-4 pb-6">
            {sidebar.mode === "edit" ? (
              <CustomFieldDetails
                open
                onOpenChange={(v) => !v && setSidebar(null)}
                hideDisplayLocation
                fieldId={sidebar.field.id}
                defaultValues={{
                  name: sidebar.field.name,
                  type: sidebar.field.type,
                  required: sidebar.field.required,
                  displayLocation: sidebar.field.displayLocation,
                  options: Array.isArray(sidebar.field.options)
                    ? sidebar.field.options.join("\n")
                    : undefined,
                  defaultValue: sidebar.field.defaultValue ?? undefined,
                  placeholder: sidebar.field.placeholder ?? undefined,
                }}
                asSidePanel
              />
            ) : (
              <CustomFieldDetails
                open
                onOpenChange={(v) => !v && setSidebar(null)}
                hideDisplayLocation
                defaultValues={{ displayLocation: CustomFieldDisplayLocation.CUSTOMER }}
                asSidePanel
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
