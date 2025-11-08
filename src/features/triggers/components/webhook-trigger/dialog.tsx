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
import { Label } from "@/components/ui/label";
import { CopyIcon, PlayIcon, StopCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
}

export const WebhookTriggerDialog = ({
  open,
  onOpenChange,
  nodeId,
}: Props) => {
  const { getNode, setNodes } = useReactFlow();
  const node = getNode(nodeId);
  const currentWebhookId = (node?.data?.webhookId as string) || "";
  
  const [customPath, setCustomPath] = useState(currentWebhookId);
  const [isListening, setIsListening] = useState(false);
  const [events, setEvents] = useState<Array<{
    id: string;
    timestamp: string;
    method: string;
    body: unknown;
    headers: Record<string, string>;
    query: Record<string, string>;
  }>>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Reset customPath when dialog opens
  useEffect(() => {
    if (open) {
      setCustomPath(currentWebhookId);
      setEvents([]);
      setIsListening(false);
    }
  }, [open, currentWebhookId]);

  // Cleanup polling on unmount or when dialog closes
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Stop listening when dialog closes
  useEffect(() => {
    if (!open && isListening) {
      setIsListening(false);
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }
  }, [open, isListening]);

  // Construct the webhook URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookId = customPath || nodeId;
  const webhookUrl = `${baseUrl}/webhook/${webhookId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleSave = () => {
    if (!customPath) {
      toast.error("Webhook ID is required");
      return;
    }
    
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                webhookId: customPath,
              },
            }
          : n,
      ),
    );
    toast.success("Webhook configured");
    onOpenChange(false);
  };

  const pollForEvents = async () => {
    if (!customPath) return;
    
    try {
      const response = await fetch(`/api/webhook/${customPath}/events`);
      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
      }
    } catch (error) {
      console.error("Failed to poll for events:", error);
    }
  };

  const handleStartListening = async () => {
    if (!customPath) {
      toast.error("Please set a Webhook ID first");
      return;
    }

    setIsListening(true);
    setEvents([]);
    toast.success("Listening for webhook events...");

    // Clear existing webhook events
    try {
      await fetch(`/api/webhook/${customPath}/events`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to clear events:", error);
    }

    // Start polling every 2 seconds
    pollingInterval.current = setInterval(pollForEvents, 2000);
  };

  const handleStopListening = () => {
    setIsListening(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    toast.info("Stopped listening");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure the webhook URL to trigger this workflow from external services.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-path">
              Webhook ID
            </Label>
            <Input
              id="custom-path"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="my-webhook"
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              A unique identifier for this webhook endpoint
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">
              Webhook URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {!isListening ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleStartListening}
                disabled={!customPath}
              >
                <PlayIcon className="size-4 mr-2" />
                Listen for Events
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleStopListening}
              >
                <StopCircleIcon className="size-4 mr-2" />
                Stop Listening
              </Button>
            )}
          </div>

          {events.length > 0 && (
            <div className="space-y-2">
              <Label>Recent Events</Label>
              <ScrollArea className="h-64 rounded-lg border bg-muted/50">
                <div className="p-4 space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border bg-background p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold">
                          {event.method}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.body !== null && event.body !== undefined && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium">Body:</span>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {typeof event.body === "string"
                              ? event.body
                              : JSON.stringify(event.body, null, 2)}
                          </pre>
                        </div>
                      )}
                      {Object.keys(event.query).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium">Query:</span>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(event.query, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {isListening && events.length === 0 && (
            <div className="rounded-lg border-2 border-dashed bg-muted/50 p-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="size-8 animate-pulse rounded-full bg-primary/20" />
                <p className="text-sm font-medium">Waiting for webhook events...</p>
                <p className="text-xs text-muted-foreground">
                  Send a request to the webhook URL above
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Usage:</h4>
            <p className="text-sm text-muted-foreground">
              Send HTTP requests (GET, POST, PUT, DELETE, PATCH) to this URL to trigger your workflow.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Available Variables</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {"{{webhook.body}}"}
                </code>{" "}
                - Request body (JSON)
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {"{{webhook.headers}}"}
                </code>{" "}
                - Request headers
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {"{{webhook.query}}"}
                </code>{" "}
                - Query parameters
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {"{{webhook.method}}"}
                </code>{" "}
                - HTTP method
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {"{{webhook.path}}"}
                </code>{" "}
                - Request path
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {"{{json webhook}}"}
                </code>{" "}
                - Full webhook data as JSON
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

