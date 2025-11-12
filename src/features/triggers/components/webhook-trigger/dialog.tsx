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
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  WebhookEvent,
  WebhookEventsResponse,
  WebhookTriggerNodeData,
} from "./actions";

const POLLING_INTERVAL_MS = 2000;

interface UseWebhookEventsOptions {
  webhookId: string;
  enabled: boolean;
}

interface UseWebhookEventsReturn {
  events: WebhookEvent[];
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

function useWebhookEvents({
  webhookId,
  enabled,
}: UseWebhookEventsOptions): UseWebhookEventsReturn {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const pollForEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/webhook/${webhookId}/events`);
      if (response.ok) {
        const data = (await response.json()) as WebhookEventsResponse;
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
          setIsListening(false);
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      }
    } catch (error) {
      console.error("Failed to poll for events:", error);
    }
  }, [webhookId]);

  const startListening = useCallback(async () => {
    setEvents([]);

    try {
      await fetch(`/api/webhook/${webhookId}/events`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to clear events:", error);
    }

    setIsListening(true);
  }, [webhookId]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (isListening) {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      pollingInterval.current = setInterval(pollForEvents, POLLING_INTERVAL_MS);

      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      };
    }
  }, [isListening, pollForEvents]);

  useEffect(() => {
    if (!enabled && isListening) {
      stopListening();
    }
  }, [enabled, isListening, stopListening]);

  return {
    events,
    isListening,
    startListening,
    stopListening,
  };
}

interface WebhookEventListProps {
  events: WebhookEvent[];
  isListening: boolean;
}

const WebhookEventList = ({ events, isListening }: WebhookEventListProps) => {
  if (isListening && events.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed bg-muted/50 p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-pulse rounded-full bg-primary/20" />
          <p className="text-sm font-medium">Waiting for webhook events...</p>
          <p className="text-xs text-muted-foreground">
            Send a request to the webhook URL above
          </p>
        </div>
      </div>
    );
  }

  if (events.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Recent Events</p>
        <ScrollArea className="h-48 rounded-lg border bg-muted/50">
          <div className="p-3 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border bg-background p-2.5 space-y-2"
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
                    <pre className="text-xs bg-muted p-1.5 rounded overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                      {typeof event.body === "string"
                        ? event.body
                        : JSON.stringify(event.body, null, 2)}
                    </pre>
                  </div>
                )}
                {Object.keys(event.query).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Query:</span>
                    <pre className="text-xs bg-muted p-1.5 rounded overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(event.query, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return null;
};

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
  const currentWebhookId = (node?.data as WebhookTriggerNodeData)?.webhookId || "";

  const [customPath, setCustomPath] = useState(currentWebhookId);

  // For URL preview, show what the user is typing (or node ID if empty)
  const previewWebhookId = customPath || nodeId;

  // Use custom hook for webhook events
  const { events, isListening, startListening, stopListening } =
    useWebhookEvents({
      webhookId: previewWebhookId,
      enabled: open,
    });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCustomPath(currentWebhookId);
    }
  }, [open, currentWebhookId]);

  // Construct the webhook URL
  // Use window.location.origin if available (client-side), fallback to env var
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhook/${previewWebhookId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleSave = () => {
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

  const handleStartListening = async () => {
    toast.success("Listening for webhook events...");
    await startListening();
  };

  const handleStopListening = () => {
    stopListening();
    toast.info("Stopped listening");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webhook Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure the webhook URL to trigger this workflow from external services.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Webhook ID Configuration */}
          <div className="space-y-2">
            <Label htmlFor="custom-path">Webhook ID</Label>
            <Input
              id="custom-path"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="my-webhook"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Optional. Leave empty to use the node ID as the webhook path.
            </p>
          </div>

          {/* Webhook URL Display */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
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

          {/* Event Listener Toggle */}
          <div className="space-y-2">
            {!isListening ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleStartListening}
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

          {/* Event List */}
          <WebhookEventList events={events} isListening={isListening} />

          {/* Usage Information */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Usage</h4>
            <p className="text-sm text-muted-foreground">
              Send HTTP requests (GET, POST, PUT, DELETE, PATCH) to this URL to
              trigger your workflow.
            </p>
          </div>

          {/* Available Variables */}
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

          {/* Actions */}
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

