"use client";

import { CreditCardIcon } from "lucide-react";
import { Suspense } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrgRole } from "../../utils/roles";
import { MemberList } from "../member-list";
import { PanelGeneral } from "./panel-general";
import { PanelMcp } from "./panel-mcp";
import type { FieldItem, Tab } from "./types";
import { VariablesList } from "./variables-list";

function StubPanel({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <Empty className="border-none py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>Próximamente</EmptyTitle>
        <EmptyDescription>
          Esta sección estará disponible pronto.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function SkeletonRow({ last = false }: { last?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 py-3.5 ${!last ? "border-b border-border/40" : ""}`}
    >
      <Skeleton className="size-9 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-16 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>
    </div>
  );
}

function GeneralSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-2.5 w-24 rounded" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow last />
      </div>
      <div>
        <Skeleton className="mb-2 h-2.5 w-24 rounded" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow last />
      </div>
    </div>
  );
}

function VariableSkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <Skeleton className="h-4 flex-1 max-w-[160px] rounded" />
      <Skeleton className="h-3.5 w-16 rounded" />
      <Skeleton className="size-4 rounded" />
    </div>
  );
}

function VariablesSkeleton() {
  return (
    <div className="divide-y divide-border/40">
      <VariableSkeletonRow />
      <VariableSkeletonRow />
      <VariableSkeletonRow />
      <VariableSkeletonRow />
      <VariableSkeletonRow />
    </div>
  );
}

function McpSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Skeleton className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32 rounded" />
        <Skeleton className="h-3 w-48 rounded" />
      </div>
      <Skeleton className="size-8 shrink-0 rounded-lg" />
    </div>
  );
}

function McpSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden divide-y divide-border/40">
      <McpSkeletonRow />
      <McpSkeletonRow />
      <McpSkeletonRow />
    </div>
  );
}

function MemberSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Usuario
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Rol
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
              Se unió el
            </th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {(["a", "b", "c", "d"] as const).map((k) => (
            <tr key={k} className="border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3 w-40 rounded" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Skeleton className="h-3.5 w-14 rounded" />
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <Skeleton className="h-3.5 w-20 rounded" />
              </td>
              <td className="px-4 py-3">
                <Skeleton className="size-8 rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanelContent({
  tab,
  orgId,
  role,
  addOpen,
  onAddOpenChange,
  inviteOpen,
  setInviteOpen,
  onEditField,
}: {
  tab: Tab;
  orgId: string;
  role: OrgRole;
  addOpen: boolean;
  onAddOpenChange: (v: boolean) => void;
  inviteOpen: boolean;
  setInviteOpen: (v: boolean) => void;
  onEditField?: (field: FieldItem) => void;
}) {
  switch (tab) {
    case "general":
      return (
        <Suspense fallback={<GeneralSkeleton />}>
          <PanelGeneral />
        </Suspense>
      );
    case "campos":
      return (
        <Suspense fallback={<VariablesSkeleton />}>
          <VariablesList
            addOpen={addOpen}
            onAddOpenChange={onAddOpenChange}
            onEdit={onEditField ?? (() => {})}
          />
        </Suspense>
      );
    case "equipo":
      return (
        <Suspense fallback={<MemberSkeleton />}>
          <MemberList
            organizationId={orgId}
            currentRole={role}
            inviteOpen={inviteOpen}
            setInviteOpen={setInviteOpen}
          />
        </Suspense>
      );
    case "facturacion":
      return <StubPanel icon={CreditCardIcon} />;
    case "mcp":
      return (
        <Suspense fallback={<McpSkeleton />}>
          <PanelMcp />
        </Suspense>
      );
  }
}
