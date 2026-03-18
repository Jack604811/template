"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import type { AgentMcpToolOption } from "@/features/executions/components/agent/constants";
import { KeyRoundIcon, Server } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface McpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    label: string;
    serverId: string;
    selectedTools: { name: string }[];
  }) => void;
}

export const McpDialog = ({
  open,
  onOpenChange,
  onAdd,
}: McpDialogProps) => {
  const trpc = useTRPC();
  const [step, setStep] = useState<"connect" | "select">("connect");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tools, setTools] = useState<AgentMcpToolOption[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

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

  const loading = connectMutation.isPending || addServerMutation.isPending;

  const handleConnect = async () => {
    if (!url.trim() || !label.trim()) {
      toast.error("URL and label are required");
      return;
    }
    connectMutation.mutate(
      {
        url: url.trim(),
        apiKey: apiKey.trim() || undefined,
      },
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
    if (!url.trim() || !label.trim()) return;
    const selected = tools.filter((t) => selectedTools.has(t.name));
    addServerMutation.mutate(
      {
        url: url.trim(),
        label: label.trim(),
        apiKey: apiKey.trim() || undefined,
      },
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

  const toggleTool = (name: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "connect" ? (
          <>
            <DialogHeader>
              <div className="flex flex-col items-center gap-2">
                <Server className="size-8 text-muted-foreground" />
                <DialogTitle>Connect to MCP Server</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="mcp-url">URL</Label>
                <Input
                  id="mcp-url"
                  placeholder="https://example.com/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Only use MCP servers you trust.
                </p>
              </div>
              <div>
                <Label htmlFor="mcp-label">Label</Label>
                <Input
                  id="mcp-label"
                  placeholder="My MCP Server"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mcp-api-key">
                  API key / token (optional)
                </Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3 shadow-xs">
                  <KeyRoundIcon className="size-4 text-muted-foreground" />
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
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleConnect}
                  disabled={!url.trim() || !label.trim() || loading}
                >
                  {loading ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Server className="size-6 text-muted-foreground" />
                <div>
                  <DialogTitle>{label}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{url}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Tools</legend>
                <div className="max-h-60 w-full space-y-2 overflow-y-auto rounded-md border p-2">
                  {tools.map((tool) => (
                    <label
                      key={tool.name}
                      htmlFor={`mcp-tool-${tool.name}`}
                      className="flex cursor-pointer items-center gap-3 rounded border border-transparent p-2 hover:bg-muted/50"
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
              </fieldset>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMcp}
                  disabled={loading || selectedTools.size === 0}
                >
                  {loading
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
