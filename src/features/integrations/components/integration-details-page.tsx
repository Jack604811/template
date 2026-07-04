"use client";

import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeftIcon,
  EllipsisVerticalIcon,
  KeyRoundIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCredentialOption } from "@/features/credentials/components/credential";
import { CredentialConnectionDialog } from "@/features/credentials/components/credential-connection-dialog";
import { useRemoveCredential } from "@/features/credentials/hooks/use-credentials";
import { McpDialog } from "@/features/mcp/components/mcp-dialog";
import type { Credential, CredentialType } from "@/generated/prisma";
import { useDetailPageNavigation } from "@/hooks/use-detail-page-navigation";
import { useTRPC } from "@/trpc/client";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

interface IntegrationDetailsPageProps {
  type: string;
}

interface ApiKey {
  id: string;
  name: string;
  preview: string;
  createdAt: Date;
}

const MOCK_API_KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "Producción",
    preview: "nb_a3f9...e812",
    createdAt: new Date("2026-05-10"),
  },
  {
    id: "k2",
    name: "Staging",
    preview: "nb_b7c2...1a4f",
    createdAt: new Date("2026-06-01"),
  },
];

export function IntegrationDetailsPage({ type }: IntegrationDetailsPageProps) {
  if (type === "API-KEYS") return <ApiKeysSection />;
  if (type === "MCP") return <McpSection />;
  return <AppSection type={type} />;
}

function McpSection() {
  const trpc = useTRPC();
  const { data: servers, refetch } = useSuspenseQuery(
    trpc.mcp.getServers.queryOptions(),
  );
  const deleteServer = useMutation(
    trpc.mcp.deleteServer.mutationOptions({ onSuccess: () => refetch() }),
  );
  const { handleBreadcrumbClick } = useDetailPageNavigation("/integrations");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex shrink-0 items-center px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="flex flex-1 justify-center">
          <div className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="flex items-start gap-5 border-b border-border/40 px-6 py-5">
        <div className="relative h-20 w-20 shrink-0 rounded-[20px] bg-white shadow-md overflow-hidden flex items-center justify-center p-3">
          <Image
            src="/logos/MCP.svg"
            alt="MCP"
            fill
            className="object-contain p-3"
          />
        </div>
        <div className="flex flex-1 items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight">MCP</h1>
            <p className="mt-0.5 text-sm text-muted-foreground leading-snug max-w-lg">
              Conecta servidores MCP para extender las capacidades del agente.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon />
            Conectar servidor
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <ZapIcon className="size-7 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">Sin servidores MCP</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Conecta tu primer servidor MCP para usarlo en tus flujos de
                trabajo.
              </p>
            </div>
            <Button className="mt-1" onClick={() => setAddOpen(true)}>
              <PlusIcon />
              Conectar servidor
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40 px-4 md:px-6">
            {servers.map((server, index) => (
              <McpServerRow
                key={server.id}
                server={server}
                index={index}
                onDelete={() =>
                  setDeleteTarget({ id: server.id, label: server.label })
                }
                isDeleting={
                  deleteServer.isPending &&
                  deleteServer.variables?.serverId === server.id
                }
              />
            ))}
          </div>
        )}
      </div>

      <McpDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={() => {
          refetch();
          setAddOpen(false);
        }}
      />

      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.label}
          onConfirm={() => {
            deleteServer.mutate({ serverId: deleteTarget.id });
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function McpServerRow({
  server,
  index,
  onDelete,
  isDeleting,
}: {
  server: { id: string; label: string; url: string };
  index: number;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-4 transition-opacity ${isDeleting ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[13px] font-semibold text-muted-foreground">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[15px] font-medium leading-snug">
          {server.label}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground font-mono truncate">
          {server.url}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Activo
        </span>
        <span className="sm:hidden h-2 w-2 rounded-full bg-emerald-500" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <EllipsisVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon className="size-3.5" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function DeleteConfirm({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
        <p className="text-[15px] font-semibold">¿Eliminar {label}?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta acción no se puede deshacer.
        </p>
        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const { handleBreadcrumbClick } = useDetailPageNavigation("/integrations");
  const [createOpen, setCreateOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_API_KEYS);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex shrink-0 items-center px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="flex flex-1 justify-center">
          <div className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="flex items-start gap-5 border-b border-border/40 px-6 py-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-foreground/8">
          <KeyRoundIcon className="size-9 text-foreground/60" />
        </div>
        <div>
          <h1 className="text-[26px] font-bold leading-tight">API Keys</h1>
          <p className="mt-0.5 text-sm text-muted-foreground leading-snug max-w-lg">
            Genera claves para conectar tus apps y servicios externos a
            Nodebase.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <KeyRoundIcon className="size-7 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">Sin API keys</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Crea tu primera API key para conectar servicios externos.
              </p>
            </div>
            <Button className="mt-1 gap-2" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              Crear API key
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40 px-4 md:px-6">
            {keys.map((key, index) => (
              <ApiKeyRow
                key={key.id}
                apiKey={key}
                index={index}
                onDelete={() =>
                  setKeys((prev) => prev.filter((k) => k.id !== key.id))
                }
              />
            ))}
          </div>
        )}
      </div>

      <CreateApiKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ApiKeyRow({
  apiKey,
  index,
  onDelete,
}: {
  apiKey: ApiKey;
  index: number;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[13px] font-semibold text-muted-foreground">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[15px] font-medium leading-snug">
          {apiKey.name}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground font-mono">
          {apiKey.preview}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          Creada{" "}
          {formatDistanceToNow(apiKey.createdAt, {
            addSuffix: true,
            locale: es,
          })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Activa
        </span>
        <span className="sm:hidden h-2 w-2 rounded-full bg-emerald-500" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <EllipsisVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon className="size-3.5" />
              Revocar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function AppSection({ type }: { type: string }) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.credentials.getMany.queryOptions({ pageSize: 100 }),
  );

  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(
    null,
  );
  const removeCredential = useRemoveCredential();
  const { handleBreadcrumbClick } = useDetailPageNavigation("/integrations");

  const app = getCredentialOption(type as CredentialType);
  const allItems: Credential[] = data?.items ?? [];
  const credentials = allItems.filter((c) => c.type === type);

  const openAdd = () => {
    setEditingCredential(null);
    setConnectionDialogOpen(true);
  };

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <ZapIcon className="size-8 opacity-30" />
        <p>Integración no encontrada</p>
        <Button variant="outline" asChild>
          <Link href="/integrations">Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex shrink-0 items-center px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="flex flex-1 justify-center">
          <div className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="flex items-start gap-5 border-b border-border/40 px-6 py-5">
        <div className="relative h-20 w-20 shrink-0 rounded-[20px] bg-white shadow-md overflow-hidden">
          <Image src={app.logo} alt={app.label} fill className="object-cover" />
        </div>
        <div className="flex flex-1 items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight">{app.label}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground leading-snug max-w-lg">
              {app.description}
            </p>
          </div>
          <Button onClick={openAdd}>
            <PlusIcon />
            Agregar cuenta
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <AccountsListSkeleton />
        ) : credentials.length === 0 ? (
          <EmptyAccountsState appLabel={app.label} onAdd={openAdd} />
        ) : (
          <div className="divide-y divide-border/40 px-4 md:px-6">
            {credentials.map((credential, index) => (
              <AccountRow
                key={credential.id}
                credential={credential}
                index={index}
                onEdit={() => {
                  setEditingCredential(credential);
                  setConnectionDialogOpen(true);
                }}
                onDelete={() => removeCredential.mutate({ id: credential.id })}
                isDeleting={
                  removeCredential.isPending &&
                  removeCredential.variables?.id === credential.id
                }
              />
            ))}
          </div>
        )}
      </div>

      <CredentialConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={(open) => {
          setConnectionDialogOpen(open);
          if (!open) setEditingCredential(null);
        }}
        credentialType={type as CredentialType}
        onCredentialCreated={() => setConnectionDialogOpen(false)}
        existingCredential={
          editingCredential
            ? { id: editingCredential.id, name: editingCredential.name }
            : undefined
        }
      />
    </div>
  );
}

function AccountRow({
  credential,
  index,
  onEdit,
  onDelete,
  isDeleting,
}: {
  credential: Credential;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`relative flex items-center gap-4 py-4 transition-opacity hover:bg-muted/40 ${isDeleting ? "pointer-events-none opacity-40" : ""}`}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${credential.name}`}
        className="absolute inset-0 z-[1]"
      />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[13px] font-semibold text-muted-foreground">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[15px] font-medium leading-snug">
          {credential.name}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Conectado{" "}
          {formatDistanceToNow(new Date(credential.createdAt), {
            addSuffix: true,
            locale: es,
          })}
        </p>
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Activo
        </span>
        <span className="sm:hidden h-2 w-2 rounded-full bg-emerald-500" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <EllipsisVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon className="size-3.5" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon className="size-3.5" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EmptyAccountsState({
  appLabel,
  onAdd,
}: {
  appLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
        <ZapIcon className="size-7 text-muted-foreground/30" />
      </div>
      <div>
        <p className="text-[15px] font-semibold">Sin cuentas conectadas</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Conecta tu primera cuenta de {appLabel} para usarla en tus flujos de
          trabajo.
        </p>
      </div>
      <Button className="mt-1 gap-2" onClick={onAdd}>
        <PlusIcon className="size-4" />
        Conectar {appLabel}
      </Button>
    </div>
  );
}

function AccountsListSkeleton() {
  return (
    <div className="divide-y divide-border/40 px-4 md:px-6">
      {["a", "b", "c"].map((k) => (
        <div key={k} className="flex animate-pulse items-center gap-4 py-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
