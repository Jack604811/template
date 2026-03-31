"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentMcpToolOption } from "@/features/executions/components/agent/constants";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRoundIcon, SearchIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";



interface ExistingServer {
  serverId: string;
  label: string;
  url: string;
}

interface McpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    label: string;
    serverId: string;
    selectedTools: { name: string }[];
  }) => void;
  onDelete?: () => void;
  existingServer?: ExistingServer;
  prefill?: { label?: string; url?: string };
}

export const McpDialog = ({
  open,
  onOpenChange,
  onAdd,
  onDelete,
  existingServer,
  prefill,
}: McpDialogProps) => {
  const trpc = useTRPC();
  const [step, setStep] = useState<"connect" | "select">(
    existingServer ? "select" : "connect",
  );
  const [url, setUrl] = useState(prefill?.url ?? "");
  const [label, setLabel] = useState(prefill?.label ?? "");
  const [apiKey, setApiKey] = useState("");
  const [tools, setTools] = useState<AgentMcpToolOption[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [toolSearch, setToolSearch] = useState("");

  const existingToolsQuery = useQuery({
    ...trpc.mcp.getToolsByServerId.queryOptions({
      serverId: existingServer?.serverId ?? "",
    }),
    enabled: existingServer != null,
  });

  useEffect(() => {
    if (existingToolsQuery.data) {
      setTools(existingToolsQuery.data.tools);
      setSelectedTools(
        new Set(existingToolsQuery.data.tools.map((t) => t.name)),
      );
    }
  }, [existingToolsQuery.data]);

  const connectMutation = useMutation(
    trpc.mcp.connect.mutationOptions({
      onError: (err) => {
        toast.error(err.message ?? "Failed to connect to MCP server");
      },
    }),
  );
  const addServerMutation = useMutation(
    trpc.mcp.addServer.mutationOptions({
      onError: (err) => {
        toast.error(err.message ?? "Failed to save MCP server");
      },
    }),
  );

  const deleteServerMutation = useMutation(
    trpc.mcp.deleteServer.mutationOptions({
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete MCP server");
      },
    }),
  );

  const loading =
    connectMutation.isPending ||
    addServerMutation.isPending ||
    (existingServer != null && existingToolsQuery.isPending);

  const handleConnect = async () => {
    if (!url.trim() || !label.trim()) {
      toast.error("URL and label are required");
      return;
    }
    connectMutation.mutate(
      { url: url.trim(), apiKey: apiKey.trim() || undefined },
      {
        onSuccess: (result) => {
          setTools(result.tools);
          setSelectedTools(new Set(result.tools.map((t) => t.name)));
          setStep("select");
        },
      },
    );
  };

  const handleAddMcp = () => {
    if (existingServer) {
      const selected = tools.filter((t) => selectedTools.has(t.name));
      onAdd({
        label: existingServer.label,
        serverId: existingServer.serverId,
        selectedTools: selected.map((t) => ({ name: t.name })),
      });
      onOpenChange(false);
      return;
    }

    if (!url.trim() || !label.trim()) return;
    const selected = tools.filter((t) => selectedTools.has(t.name));
    addServerMutation.mutate(
      { url: url.trim(), label: label.trim(), apiKey: apiKey.trim() || undefined },
      {
        onSuccess: ({ serverId }) => {
          onAdd({
            label: label.trim(),
            serverId,
            selectedTools: selected.map((t) => ({ name: t.name })),
          });
          onOpenChange(false);
          setStep("connect");
          setUrl("");
          setLabel("");
          setApiKey("");
          setTools([]);
          setSelectedTools(new Set());
          toast.success("MCP server added");
        },
      },
    );
  };

  const handleDelete = () => {
    if (!existingServer) return;
    deleteServerMutation.mutate(
      { serverId: existingServer.serverId },
      {
        onSuccess: () => {
          toast.success("MCP server deleted");
          onOpenChange(false);
          onDelete?.();
        },
      },
    );
  };

  const toggleTool = (name: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allSelected = tools.length > 0 && selectedTools.size === tools.length;
  const someSelected = selectedTools.size > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(tools.map((t) => t.name)));
    }
  };

  const displayLabel = existingServer?.label ?? label;
  const displayUrl = existingServer?.url ?? url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg max-h-[800px]">
        {step === "connect" ? (
          <>
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>Connect MCP Server</DialogTitle>
              <DialogDescription>
                Enter the server URL and an optional API key to connect.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="mcp-label">Name</Label>
                <Input
                  id="mcp-label"
                  placeholder="My MCP Server"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mcp-url">URL</Label>
                <Input
                  id="mcp-url"
                  placeholder="https://example.com/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Only use MCP servers you trust.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mcp-api-key">API key / token (optional)</Label>
                <div className="flex items-center gap-2 rounded-md border border-input px-3 shadow-xs">
                  <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    id="mcp-api-key"
                    type="password"
                    placeholder="Leave empty for no auth"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <Button
                onClick={handleConnect}
                disabled={!url.trim() || !label.trim() || loading}
              >
                {connectMutation.isPending ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 px-6 py-8">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
                <Image src="/logos/MCP.svg" alt="MCP" width={28} height={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{displayLabel}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {displayUrl}
                </p>
              </div>
            </div>

            <div className="px-6 pb-3">
              {!existingToolsQuery.isPending && tools.length > 0 && (
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tools..."
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 pb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tools
              </span>
              {!existingToolsQuery.isPending && tools.length > 0 && (
                <label
                  htmlFor="mcp-select-all"
                  className="flex cursor-pointer items-center gap-2 select-none text-xs text-muted-foreground"
                >
                  <Checkbox
                    id="mcp-select-all"
                    checked={allSelected}
                    data-state={someSelected ? "indeterminate" : undefined}
                    onCheckedChange={handleSelectAll}
                  />
                  Select all
                </label>
              )}
            </div>

            {existingServer && existingToolsQuery.isPending ? (
              <div className="space-y-2 px-6 pb-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              <div className="max-h-76 overflow-y-auto px-6 pb-2">
                <div className="space-y-0.5">
                  {tools.filter((t) =>
                    t.name.toLowerCase().includes(toolSearch.toLowerCase())
                  ).map((tool) => (
                    <label
                      key={tool.name}
                      htmlFor={`mcp-tool-${tool.name}`}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <Checkbox
                        id={`mcp-tool-${tool.name}`}
                        checked={selectedTools.has(tool.name)}
                        onCheckedChange={() => toggleTool(tool.name)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{tool.name}</p>
                        {tool.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-10">
              <div>
                {existingServer && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={deleteServerMutation.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMcp}
                  disabled={loading || selectedTools.size === 0}
                >
                  {addServerMutation.isPending
                    ? "Saving…"
                    : `Add (${selectedTools.size} selected)`}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
