"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  DownloadIcon,
  Edit3,
  Folder,
  MoreVertical,
  PackageXIcon,
  Plus,
  PlusIcon,
  Trash2,
  UploadIcon,
  FolderIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useRef, useState } from "react";
import { EntitySearch } from "@/components/entity-components";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Pills } from "@/components/ui/pills";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { useTRPC } from "@/trpc/client";
import { useSuspenseBookables } from "../hooks/use-bookables";
import { useBookablesParams } from "../hooks/use-bookables-params";
import { formatDuration, getStatusColor, getStatusLabel } from "../lib/utils";
import { Badge } from "@/components/ui/badge";
import { BookableImage } from "./bookable-image";
import type { BookableWithRelations } from "../types";
import {
  useCreateCollection,
  useDuplicateCollection,
  useRemoveCollection,
  useSuspenseCollections,
  useUpdateCollection,
} from "../hooks/use-collections";

// ─── Action button ─────────────────────────────────────────────────────────────

const ActionBtn = forwardRef<
  HTMLButtonElement,
  { icon: React.ElementType; label: string; onClick?: () => void; active?: boolean }
>(({ icon: Icon, label, onClick, active, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center gap-1.5"
    {...props}
  >
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl border transition-colors",
        active ? "bg-muted" : "bg-background hover:bg-muted",
      )}
      style={{ width: 54, height: 54 }}
    >
      <Icon className="size-5" />
      {active && (
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />
      )}
    </div>
    <span
      className={cn(
        "text-[11px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
      )}
    >
      {label}
    </span>
  </button>
));

ActionBtn.displayName = "ActionBtn";

// ─── Categorías sheet ─────────────────────────────────────────────────────────

const CategoriasSheet = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const collectionsQuery = useSuspenseCollections();
  const collections = collectionsQuery.data;

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const removeCollection = useRemoveCollection();
  const duplicateCollection = useDuplicateCollection();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleSaveEdit = useCallback(async (id: string) => {
    if (!editingValue.trim()) { setEditingId(null); return; }
    const name = editingValue.trim();
    setEditingId(null);
    const qo = trpc.bookableCollections.getMany.queryOptions();
    queryClient.setQueryData(qo.queryKey, (old: typeof collections | undefined) =>
      old?.map((c) => (c.id === id ? { ...c, name } : c)),
    );
    try { await updateCollection.mutateAsync({ id, name }); }
    catch { queryClient.invalidateQueries(qo); }
  }, [editingValue, updateCollection, trpc, queryClient]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) { setIsCreating(false); return; }
    const name = newName.trim();
    setIsCreating(false); setNewName("");
    const tempId = `temp-${Date.now()}`;
    const qo = trpc.bookableCollections.getMany.queryOptions();
    queryClient.setQueryData(qo.queryKey, (old: typeof collections | undefined) =>
      [...(old ?? []), { id: tempId, name, bookableCount: 0, icon: null, order: (old?.length ?? 0), createdAt: new Date(), updatedAt: new Date(), _count: { bookables: 0 }, organizationId: "" } as typeof collections[number]],
    );
    try { await createCollection.mutateAsync({ name }); }
    catch { queryClient.setQueryData(qo.queryKey, (old: typeof collections | undefined) => old?.filter((c) => c.id !== tempId)); }
  }, [newName, createCollection, trpc, queryClient]);

  const handleDuplicate = useCallback(async (id: string) => {
    setOpenDropdown(null);
    const original = collections.find((c) => c.id === id);
    if (!original) return;
    const tempId = `temp-${Date.now()}`;
    const qo = trpc.bookableCollections.getMany.queryOptions();
    queryClient.setQueryData(qo.queryKey, (old: typeof collections | undefined) =>
      [{ ...original, id: tempId, name: `${original.name} Copy`, bookableCount: 0, createdAt: new Date(), updatedAt: new Date() } as typeof collections[number], ...(old ?? [])],
    );
    try { await duplicateCollection.mutateAsync({ id }); }
    catch { queryClient.setQueryData(qo.queryKey, (old: typeof collections | undefined) => old?.filter((c) => c.id !== tempId)); }
  }, [collections, duplicateCollection, trpc, queryClient]);

  const handleDelete = useCallback(async (id: string) => {
    setOpenDropdown(null);
    const qo = trpc.bookableCollections.getMany.queryOptions();
    queryClient.setQueryData(qo.queryKey, (old: typeof collections | undefined) => old?.filter((c) => c.id !== id));
    try { await removeCollection.mutateAsync({ id }); }
    catch { queryClient.invalidateQueries(qo); }
  }, [removeCollection, trpc, queryClient]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {collections.length} {collections.length === 1 ? "categoría" : "categorías"}
        </p>
        <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
          <Plus className="size-3.5 mr-1" /> Nueva
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {collections.map((col) => {
          const isEditing = editingId === col.id;
          return (
            <div key={col.id} className="relative">
              {isEditing ? (
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-2">
                  <Folder className="size-4 text-primary shrink-0" />
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => handleSaveEdit(col.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(col.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-6 border-0 bg-background px-2 text-sm flex-1"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="group flex items-center justify-between rounded-lg px-2 py-2 hover:bg-accent transition-colors">
                  <button
                    type="button"
                    onDoubleClick={() => { setEditingId(col.id); setEditingValue(col.name); }}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <Folder className="size-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{col.name}</span>
                  </button>
                  <DropdownMenu
                    open={openDropdown === col.id}
                    onOpenChange={(open) => setOpenDropdown(open ? col.id : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => { setEditingId(col.id); setEditingValue(col.name); setOpenDropdown(null); }}>
                          <Edit3 className="size-4" /> Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(col.id)}>
                          <Copy className="size-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(col.id)} variant="destructive">
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}

        {isCreating && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-2">
            <Folder className="size-4 text-primary shrink-0" />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
              }}
              placeholder="Nombre de categoría"
              className="h-6 border-0 bg-background px-2 text-sm flex-1"
              autoFocus
            />
          </div>
        )}

        {collections.length === 0 && !isCreating && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Sin categorías. Crea una para empezar.
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Collection filter ─────────────────────────────────────────────────────────

const CollectionFilter = () => {
  const trpc = useTRPC();
  const [params, setParams] = useBookablesParams();
  const { data: collections = [] } = useQuery(
    trpc.bookableCollections.getMany.queryOptions(),
  );

  if (collections.length === 0) return null;

  const items = [
    { id: "", label: "Todos" },
    ...collections.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <Pills
      items={items}
      value={params.collectionId ?? ""}
      onValueChange={(id) => setParams({ collectionId: id || null, page: 1 })}
      className="overflow-x-auto scrollbar-none px-4 pb-3"
    />
  );
};

// ─── Export helper ────────────────────────────────────────────────────────────

const exportToCsv = (items: BookableWithRelations[], currency: string) => {
  const header = ["Título", "Precio", "Duración", "Estado"];
  const rows = items.map((b) => [
    `"${b.title}"`,
    formatCurrency(b.basePrice, currency),
    formatDuration(b.durationValue, b.durationUnit),
    getStatusLabel(b.status),
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "servicios.csv";
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export const BookablesListActions = () => {
  const router = useRouter();
  const [params, setParams] = useBookablesParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const { data: bookables } = useQuery(
    trpc.bookables.getMany.queryOptions({
      page: 1,
      pageSize: 1000,
      search: "",
    }),
  );
  const currency = useCurrentOrganizationWithSettings()?.currency ?? "USD";

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-center gap-4 px-4 pt-8 pb-4 sm:justify-start">
        <ActionBtn
          icon={PlusIcon}
          label="Nuevo"
          onClick={() => router.push("/services/new")}
        />

        <Dialog>
          <DialogTrigger asChild>
            <ActionBtn icon={FolderIcon} label="Categorías" />
          </DialogTrigger>
          <DialogContent className="flex flex-col max-h-[70vh] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Categorías</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden mt-2">
              <CategoriasSheet />
            </div>
          </DialogContent>
        </Dialog>

        <ActionBtn
          icon={UploadIcon}
          label="Importar"
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // TODO: implement import logic
              e.target.value = "";
            }
          }}
        />

        <ActionBtn
          icon={DownloadIcon}
          label="Exportar"
          onClick={() => {
            const items = (bookables?.items ?? []) as BookableWithRelations[];
            exportToCsv(items, currency);
          }}
        />
      </div>
      <div className="px-4 pb-3">
        <EntitySearch
          placeholder="Buscar servicio..."
          value={params.search ?? ""}
          onChange={(value) => setParams({ search: value, page: 1 })}
        />
      </div>
      <CollectionFilter />
    </div>
  );
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const BookablesListItems = () => {
  const router = useRouter();
  const [params] = useBookablesParams();
  const { data } = useSuspenseBookables(params.collectionId ?? null);
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency ?? "USD";
  const items = data.items as BookableWithRelations[];

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageXIcon />
            </EmptyMedia>
            <EmptyTitle>Sin servicios</EmptyTitle>
            <EmptyDescription>
              No se encontraron servicios. Crea uno para empezar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8">
      <div className="flex flex-col">
        {items.map((bookable) => (
          <button
            key={bookable.id}
            type="button"
            onClick={() => router.push(`/services/${bookable.id}`)}
            className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
          >
            <BookableImage images={bookable.images} alt={bookable.title} size={64} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {bookable.title}
              </p>
              <p className="truncate text-sm font-medium text-primary">
                {formatCurrency(bookable.basePrice, currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(bookable.durationValue, bookable.durationUnit)}
              </p>
            </div>
            <Badge variant="secondary" className={getStatusColor(bookable.status)}>
              {getStatusLabel(bookable.status)}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Page header ──────────────────────────────────────────────────────────────

export const BookablesListHeader = () => (
  <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
    <SidebarTrigger />
    <span className="text-sm font-medium">Servicios</span>
  </header>
);
