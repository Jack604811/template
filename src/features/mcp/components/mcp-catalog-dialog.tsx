"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { credentialTypeOptions } from "@/features/credentials/components/credential";

const availableServers = credentialTypeOptions.filter(
  (opt) => opt.category !== "ai",
);
import { McpDialog } from "@/features/mcp/components/mcp-dialog";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SearchIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type PendingSelection =
  | { kind: "existing"; server: { serverId: string; label: string; url: string } }
  | { kind: "curated"; prefill: { label?: string; url?: string } }
  | { kind: "custom" }
  | null;

interface ServerCardProps {
  logo: string;
  name: string;
  description: string;
  onAdd: () => void;
}

function ServerCard({ logo, name, description, onAdd }: ServerCardProps) {
  return (
    <div className="relative rounded-xl border p-3 transition-colors hover:bg-accent">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="absolute right-2 top-2 size-7 rounded-full"
        onClick={onAdd}
        aria-label={`Add ${name}`}
      >
        <Plus className="size-3" />
      </Button>
      <div className="flex flex-col gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
          <Image src={logo} alt={name} width={24} height={24} />
        </div>
        <div className="pr-8">
          <p className="text-sm font-medium leading-tight">{name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ServerCardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["a", "b", "c", "d"].map((id) => (
        <div key={id} className="space-y-2 rounded-xl border p-3">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

interface McpCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    label: string;
    serverId: string;
    selectedTools: { name: string }[];
  }) => void;
}

export function McpCatalogDialog({
  open,
  onOpenChange,
  onAdd,
}: McpCatalogDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection>(null);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);

  const serversQuery = useQuery({
    ...trpc.mcp.getServers.queryOptions(),
    enabled: open,
  });

  const filteredUserServers = useMemo(() => {
    if (!serversQuery.data) return [];
    if (!searchQuery) return serversQuery.data;
    const q = searchQuery.toLowerCase();
    return serversQuery.data.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.url.toLowerCase().includes(q),
    );
  }, [serversQuery.data, searchQuery]);

  const filteredCuratedServers = useMemo(() => {
    if (!searchQuery) return availableServers;
    const q = searchQuery.toLowerCase();
    return availableServers.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleSelectExisting = (server: {
    id: string;
    label: string;
    url: string;
  }) => {
    setPendingSelection({
      kind: "existing",
      server: { serverId: server.id, label: server.label, url: server.url },
    });
    setMcpDialogOpen(true);
  };

  const handleSelectCurated = (server: { label: string }) => {
    setPendingSelection({
      kind: "curated",
      prefill: { label: server.label },
    });
    setMcpDialogOpen(true);
  };

  const handleSelectCustom = () => {
    setPendingSelection({ kind: "custom" });
    setMcpDialogOpen(true);
  };

  const showUserSection =
    serversQuery.isPending || filteredUserServers.length > 0;
  const isEmpty =
    !serversQuery.isPending &&
    filteredUserServers.length === 0 &&
    filteredCuratedServers.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pb-0 py-6">
            <DialogTitle>MCP Servers</DialogTitle>
            <DialogDescription>
              Add MCP tools to extend your agent&apos;s capabilities
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 px-6 py-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search MCP servers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0 h-[38px]"
              onClick={handleSelectCustom}
            >
              Add custom server
            </Button>
          </div>

          <div className="max-h-[400px] space-y-6 overflow-y-auto px-6 pb-6">
            {showUserSection && (
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Your Servers
                </h3>
                {serversQuery.isPending ? (
                  <ServerCardSkeleton />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredUserServers.map((server) => (
                      <ServerCard
                        key={server.id}
                        logo="/logos/MCP.svg"
                        name={server.label}
                        description={server.url}
                        onAdd={() => handleSelectExisting(server)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {filteredCuratedServers.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Available
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {filteredCuratedServers.map((server) => (
                    <ServerCard
                      key={server.value}
                      logo={server.logo}
                      name={server.label}
                      description={server.description}
                      onAdd={() => handleSelectCurated(server)}
                    />
                  ))}
                </div>
              </section>
            )}

            {isEmpty && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No MCP servers found. Try a different search or add a custom
                server.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <McpDialog
        key={
          pendingSelection?.kind === "existing"
            ? pendingSelection.server.serverId
            : pendingSelection?.kind === "curated"
              ? (pendingSelection.prefill.label ?? "curated")
              : "custom"
        }
        open={mcpDialogOpen}
        onOpenChange={(isOpen) => {
          setMcpDialogOpen(isOpen);
          if (!isOpen) setPendingSelection(null);
        }}
        onAdd={(data) => {
          onAdd(data);
          setMcpDialogOpen(false);
          onOpenChange(false);
        }}
        onDelete={() => {
          queryClient.invalidateQueries(trpc.mcp.getServers.queryOptions());
        }}
        existingServer={
          pendingSelection?.kind === "existing"
            ? pendingSelection.server
            : undefined
        }
        prefill={
          pendingSelection?.kind === "curated"
            ? pendingSelection.prefill
            : undefined
        }
      />
    </>
  );
}
