"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useState } from "react";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CredentialConnectionDialog } from "@/features/credentials/components/credential-connection-dialog";
import { useRemoveCredential } from "@/features/credentials/hooks/use-credentials";
import type { Credential, CredentialType } from "@/generated/prisma";
import type { credentialTypeOptions } from "@/features/credentials/components/credential";

type AppOption = (typeof credentialTypeOptions)[number];

interface IntegrationInstancesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: AppOption;
  credentials: Credential[];
}

export function IntegrationInstancesDrawer({
  open,
  onOpenChange,
  app,
  credentials,
}: IntegrationInstancesDrawerProps) {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const removeCredential = useRemoveCredential();

  const handleAdd = () => {
    setEditingCredential(null);
    setConnectionDialogOpen(true);
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setConnectionDialogOpen(true);
  };

  const handleDelete = (credential: Credential) => {
    removeCredential.mutate({ id: credential.id });
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex flex-col sm:max-w-md">
          <DrawerHeader className="border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
                <Image src={app.logo} alt={app.label} width={24} height={24} />
              </div>
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-base">{app.label}</DrawerTitle>
                <DrawerDescription className="text-xs leading-snug line-clamp-1">
                  {app.description}
                </DrawerDescription>
              </div>
              <Button size="sm" className="shrink-0 gap-1.5" onClick={handleAdd}>
                <PlusIcon className="size-3.5" />
                Agregar
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto">
            {credentials.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
                  <ZapIcon className="size-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-[15px] font-medium">Sin cuentas conectadas</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Conecta tu primera cuenta de {app.label} para comenzar.
                  </p>
                </div>
                <Button className="mt-2 gap-2" onClick={handleAdd}>
                  <PlusIcon className="size-4" />
                  Conectar {app.label}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {credentials.map((credential) => (
                  <CredentialInstanceRow
                    key={credential.id}
                    credential={credential}
                    onEdit={() => handleEdit(credential)}
                    onDelete={() => handleDelete(credential)}
                    isDeleting={
                      removeCredential.isPending &&
                      removeCredential.variables?.id === credential.id
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <CredentialConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={(isOpen) => {
          setConnectionDialogOpen(isOpen);
          if (!isOpen) setEditingCredential(null);
        }}
        credentialType={app.value as CredentialType}
        onCredentialCreated={() => setConnectionDialogOpen(false)}
        existingCredential={
          editingCredential
            ? { id: editingCredential.id, name: editingCredential.name }
            : undefined
        }
      />
    </>
  );
}

function CredentialInstanceRow({
  credential,
  onEdit,
  onDelete,
  isDeleting,
}: {
  credential: Credential;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 transition-opacity ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium leading-snug truncate">{credential.name}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Conectado{" "}
          {formatDistanceToNow(new Date(credential.createdAt), {
            addSuffix: true,
            locale: es,
          })}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
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
            <DropdownMenuItem
              variant="destructive"
              onClick={onDelete}
            >
              <Trash2Icon className="size-3.5" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
