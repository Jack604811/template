"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EntitySearch } from "@/components/entity-components";
import { Pills } from "@/components/ui/pills";
import { credentialTypeOptions } from "@/features/credentials/components/credential";
import type { Credential, CredentialType } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import {
  IntegrationAppCard,
  IntegrationsEmptyCard,
} from "./integration-app-card";

const CATEGORY_PILLS = [
  { id: "all", label: "Todas" },
  { id: "ai", label: "IA" },
  { id: "communication", label: "Comunicación" },
  { id: "productivity", label: "Productividad" },
  { id: "business", label: "Negocio" },
];

export function IntegrationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  return (
    <div className="flex flex-col h-full">
      <div className="hidden sm:flex items-center justify-between px-4 pt-6 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
      </div>

      {/* Search */}
      <div className="px-4 pt-8 pb-3">
        <EntitySearch
          placeholder="Buscar integración..."
          value={search}
          onChange={setSearch}
        />
      </div>

      {/* Category pills */}
      <Pills
        items={CATEGORY_PILLS}
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="overflow-x-auto scrollbar-none px-4 pb-3"
      />

      <IntegrationsGrid
        search={search}
        activeCategory={activeCategory}
        onMcpOpen={() => router.push("/integrations/mcp")}
      />
    </div>
  );
}

type AppOption = (typeof credentialTypeOptions)[number];

function SortableIntegrationCard({
  app,
  credentials,
  onManage,
}: {
  app: AppOption;
  credentials: Credential[];
  onManage: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.value });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
      {...attributes}
      {...listeners}
    >
      <IntegrationAppCard
        app={app}
        credentials={credentials}
        onManage={onManage}
      />
    </div>
  );
}

function IntegrationsGrid({
  search,
  activeCategory,
  onMcpOpen,
}: {
  search: string;
  activeCategory: string;
  onMcpOpen: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const { data } = useQuery(
    trpc.credentials.getMany.queryOptions({ pageSize: 100 }),
  );

  const [orderedApps, setOrderedApps] = useState<AppOption[]>([
    ...credentialTypeOptions,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedApps((prev) => {
      const oldIndex = prev.findIndex((a) => a.value === active.id);
      const newIndex = prev.findIndex((a) => a.value === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const credentialsByType = useMemo(() => {
    const map = new Map<CredentialType, Credential[]>();
    const items: Credential[] = data?.items ?? [];
    for (const c of items) {
      const existing = map.get(c.type) ?? [];
      map.set(c.type, [...existing, c]);
    }
    return map;
  }, [data]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orderedApps.filter((app) => {
      const matchesSearch =
        !q ||
        app.label.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "all" ||
        (app as { category?: string }).category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [orderedApps, search, activeCategory]);

  const showMcpCard = activeCategory === "all" && !search.trim();

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 md:px-6">
      {!showMcpCard && filteredApps.length === 0 ? (
        <IntegrationsEmptyCard />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredApps.map((a) => a.value)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {showMcpCard && <McpCard onClick={onMcpOpen} />}
              {filteredApps.map((app) => (
                <SortableIntegrationCard
                  key={app.value}
                  app={app}
                  credentials={
                    credentialsByType.get(app.value as CredentialType) ?? []
                  }
                  onManage={() =>
                    router.push(`/integrations/${app.value.toLowerCase()}`)
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function McpCard({ onClick }: { onClick: () => void }) {
  return (
    <>
      {/* Desktop */}
      <button
        type="button"
        onClick={onClick}
        className="hidden md:flex flex-col rounded-2xl border border-border bg-card p-5 gap-4 text-left h-full shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer w-full"
      >
        <div className="flex items-start justify-between">
          <div className="relative h-14 w-14 rounded-[16px] bg-white shadow-sm overflow-hidden flex items-center justify-center">
            <Image src="/logos/MCP.svg" alt="MCP" width={36} height={36} />
          </div>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight bg-muted text-foreground">
            Platform
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground">
            MCP
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            Conecta servidores MCP para extender las capacidades del agente.
          </p>
        </div>
        <div className="flex items-center pt-1 border-t border-border/40">
          <span className="text-[13px] text-muted-foreground">
            Conectar servidor
          </span>
        </div>
      </button>

      {/* Mobile */}
      <button
        type="button"
        onClick={onClick}
        className="md:hidden flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent"
      >
        <div className="relative h-11 w-11 shrink-0 rounded-[13px] bg-white shadow-sm overflow-hidden flex items-center justify-center">
          <Image src="/logos/MCP.svg" alt="MCP" width={28} height={28} />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <span className="text-[15px] font-medium leading-snug truncate">
            MCP
          </span>
          <span className="text-[12px] text-muted-foreground">
            Conectar servidor
          </span>
        </div>
      </button>
    </>
  );
}
