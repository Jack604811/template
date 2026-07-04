"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { PlugIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteItem } from "@/components/ui/delete-item";
import { McpDialog } from "@/features/mcp/components/mcp-dialog";
import { useTRPC } from "@/trpc/client";

export function PanelMcp() {
  const trpc = useTRPC();
  const { data: servers, refetch } = useSuspenseQuery(
    trpc.mcp.getServers.queryOptions(),
  );
  const deleteServer = useMutation(
    trpc.mcp.deleteServer.mutationOptions({ onSuccess: () => refetch() }),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  return (
    <>
      <McpDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={() => {
          refetch();
          setAddOpen(false);
        }}
      />

      <DeleteItem
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`¿Eliminar ${deleteTarget?.label}?`}
        description="Esta acción no se puede deshacer. El servidor MCP y su configuración serán eliminados."
        onConfirm={() => {
          if (deleteTarget) deleteServer.mutate({ serverId: deleteTarget.id });
        }}
      />

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/40 mb-4">
            <PlugIcon className="size-5 text-muted-foreground" />
          </div>
          <p className="text-[15px] font-medium text-foreground">
            Sin servidores MCP
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Conecta servidores MCP para extender las capacidades del agente.
          </p>
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon />
            Conectar servidor
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {servers.map((server, i) => (
            <div
              key={server.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${i < servers.length - 1 ? "border-b border-border/40" : ""}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/40">
                <PlugIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium leading-tight truncate">
                  {server.label}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {server.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({ id: server.id, label: server.label })
                }
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
