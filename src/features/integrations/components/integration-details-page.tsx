"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeftIcon,
  EllipsisVerticalIcon,
  KeyRoundIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
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
  { id: "k1", name: "Producción", preview: "nb_a3f9...e812", createdAt: new Date("2026-05-10") },
  { id: "k2", name: "Staging", preview: "nb_b7c2...1a4f", createdAt: new Date("2026-06-01") },
];

export function IntegrationDetailsPage({ type }: IntegrationDetailsPageProps) {
  if (type === "API-KEYS") return <ApiKeysSection />;
  return <AppSection type={type} />;
}

function ApiKeysSection() {
  const { handleBreadcrumbClick } = useDetailPageNavigation("/integrations");
  const [createOpen, setCreateOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_API_KEYS);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-3.5" />
          <span className="hidden sm:inline">Crear API key</span>
          <span className="sm:hidden">Crear</span>
        </Button>
      </div>

      <div className="flex items-start gap-5 border-b border-border/40 px-6 py-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-foreground/8">
          <KeyRoundIcon className="size-9 text-foreground/60" />
        </div>
        <div>
          <h1 className="text-[26px] font-bold leading-tight">API Keys</h1>
          <p className="mt-0.5 text-sm text-muted-foreground leading-snug max-w-lg">
            Genera claves para conectar tus apps y servicios externos a Nodebase.
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
                onDelete={() => setKeys((prev) => prev.filter((k) => k.id !== key.id))}
              />
            ))}
          </div>
        )}
      </div>

      <CreateApiKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ApiKeyRow({ apiKey, index, onDelete }: { apiKey: ApiKey; index: number; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[13px] font-semibold text-muted-foreground">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[15px] font-medium leading-snug">{apiKey.name}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground font-mono">{apiKey.preview}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          Creada {formatDistanceToNow(apiKey.createdAt, { addSuffix: true, locale: es })}
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
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
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
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
      <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={handleBreadcrumbClick}
          className="flex size-10 items-center justify-center rounded-full bg-foreground/8 text-foreground transition-colors hover:bg-foreground/12"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <PlusIcon className="size-3.5" />
          <span className="hidden sm:inline">Agregar cuenta</span>
          <span className="sm:hidden">Agregar</span>
        </Button>
      </div>

      <div className="flex items-start gap-5 border-b border-border/40 px-6 py-5">
        <div className="relative h-20 w-20 shrink-0 rounded-[20px] bg-white shadow-md overflow-hidden">
          <Image src={app.logo} alt={app.label} fill className="object-cover" />
        </div>
        <div>
          <h1 className="text-[26px] font-bold leading-tight">{app.label}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground leading-snug max-w-lg">
            {app.description}
          </p>
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
    <div className={`relative flex items-center gap-4 py-4 transition-opacity hover:bg-muted/40 ${isDeleting ? "pointer-events-none opacity-40" : ""}`}>
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
        <p className="truncate text-[15px] font-medium leading-snug">{credential.name}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Conectado{" "}
          {formatDistanceToNow(new Date(credential.createdAt), { addSuffix: true, locale: es })}
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
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

function EmptyAccountsState({ appLabel, onAdd }: { appLabel: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
        <ZapIcon className="size-7 text-muted-foreground/30" />
      </div>
      <div>
        <p className="text-[15px] font-semibold">Sin cuentas conectadas</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Conecta tu primera cuenta de {appLabel} para usarla en tus flujos de trabajo.
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
