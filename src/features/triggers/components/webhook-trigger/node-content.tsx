"use client";

import { useQuery } from "@tanstack/react-query";
import { CopyIcon, PlayIcon, StopCircleIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflowStore } from "@/features/editor/store/workflow-store";
import { useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import { useTRPC } from "@/trpc/client";
import type {
  WebhookEvent,
  WebhookEventsResponse,
  WebhookStoredSchema,
  WebhookTriggerNodeData,
} from "./actions";

const POLLING_INTERVAL_MS = 2000;

function toFriendlyLabel(path: string): string {
  const lastSegment = path.split(".").pop() ?? path;
  const withSpaces = lastSegment.replace(/([A-Z])/g, " $1").trim();
  const titleCased =
    withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
  return titleCased.replace(/\bid\b/i, "ID");
}

function getVariableNamesFromSchema(
  schema: WebhookStoredSchema | undefined,
): string[] {
  if (
    !schema?.body ||
    typeof schema.body !== "object" ||
    schema.body === null
  ) {
    return [];
  }
  if (Array.isArray(schema.body)) {
    return [];
  }
  const body = schema.body as Record<string, unknown>;
  const names: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      const sub = value as Record<string, unknown>;
      for (const subKey of Object.keys(sub)) {
        names.push(`${key}.${subKey}`);
      }
    } else {
      names.push(key);
    }
  }
  return names;
}

function useWebhookEvents(webhookId: string) {
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
      await fetch(`/api/webhook/${webhookId}/events`, { method: "DELETE" });
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
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      pollingInterval.current = setInterval(pollForEvents, POLLING_INTERVAL_MS);
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      };
    }
  }, [isListening, pollForEvents]);

  return { events, isListening, startListening, stopListening };
}

function WebhookEventList({
  events,
  isListening,
}: {
  events: WebhookEvent[];
  isListening: boolean;
}) {
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
          <div className="space-y-3 p-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="space-y-2 rounded-lg border bg-background p-2.5"
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
                    <pre className="max-h-32 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all rounded bg-muted p-1.5 text-xs">
                      {typeof event.body === "string"
                        ? event.body
                        : JSON.stringify(event.body, null, 2)}
                    </pre>
                  </div>
                )}
                {Object.keys(event.query).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium">Query:</span>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-1.5 text-xs">
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
}

function toDisplaySchema(
  contextWebhook: Record<string, unknown> | null | undefined,
  storedSchema: WebhookStoredSchema | undefined,
): WebhookStoredSchema | undefined {
  if (contextWebhook && "body" in contextWebhook) {
    return {
      body: contextWebhook.body,
      headers: (contextWebhook.headers as Record<string, string>) ?? {},
      query: (contextWebhook.query as Record<string, string>) ?? {},
    };
  }
  return storedSchema;
}

interface WebhookNodeContentProps {
  nodeId: string;
}

export function WebhookTriggerNodeContent({ nodeId }: WebhookNodeContentProps) {
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const params = useParams<{ workflowId: string }>();
  const workflowId = params?.workflowId;
  const trpc = useTRPC();
  const saveWorkflow = useUpdateWorkflow();

  const { data: lastExecution } = useQuery({
    ...trpc.executions.getLastExecutionContext.queryOptions({
      workflowId: workflowId ?? "",
    }),
    enabled: Boolean(workflowId),
  });

  const currentWebhookId =
    (node?.data as WebhookTriggerNodeData)?.webhookId || "";
  const storedSchema = (node?.data as WebhookTriggerNodeData)?.webhookSchema;
  const contextWebhook = lastExecution?.context?.webhook as
    | Record<string, unknown>
    | undefined;
  const displaySchema = useMemo(
    () => toDisplaySchema(contextWebhook, storedSchema),
    [contextWebhook, storedSchema],
  );
  const variableNames = useMemo(
    () => getVariableNamesFromSchema(displaySchema),
    [displaySchema],
  );

  const [customPath, setCustomPath] = useState(currentWebhookId);
  const previewWebhookId = customPath || nodeId;

  const { events, isListening, startListening, stopListening } =
    useWebhookEvents(previewWebhookId);

  const prevEventsLengthRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const justReceivedEvents =
      events.length > 0 && prevEventsLengthRef.current === 0;
    prevEventsLengthRef.current = events.length;
    if (!justReceivedEvents || !nodeId) return;
    const event = events[0];
    const schema: WebhookStoredSchema = {
      body: event.body,
      headers: event.headers ?? {},
      query: event.query ?? {},
    };
    const nodes = useWorkflowStore.getState().nodes;
    setNodes(
      nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, webhookSchema: schema } }
          : n,
      ),
    );
    toast.success(
      "Webhook schema saved. Use these variables in your workflow.",
    );
    if (workflowId) {
      const timeoutId = setTimeout(() => {
        const { nodes: currentNodes, edges } = useWorkflowStore.getState();
        saveWorkflow.mutate({ id: workflowId, nodes: currentNodes, edges });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [events, nodeId, setNodes, workflowId, saveWorkflow]);

  useEffect(() => {
    setCustomPath(currentWebhookId);
  }, [currentWebhookId]);

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

  const handlePathChange = (value: string) => {
    setCustomPath(value);
    const nodes = useWorkflowStore.getState().nodes;
    const updatedNodes = nodes.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, webhookId: value } }
        : n,
    );
    setNodes(updatedNodes);
    if (workflowId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const { nodes: currentNodes, edges } = useWorkflowStore.getState();
        saveWorkflow.mutate({ id: workflowId, nodes: currentNodes, edges });
        saveTimeoutRef.current = null;
      }, 500);
    }
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhook-url">Webhook URL</Label>
        <div className="flex min-w-0 gap-2">
          <div className="nodrag flex min-w-0 cursor-text flex-1 flex-nowrap items-center gap-0 overflow-x-auto rounded-md border border-input bg-background font-mono text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="shrink-0 whitespace-nowrap py-2 pl-3 text-sm">
              {baseUrl}/api/webhook/
            </span>
            <Input
              id="webhook-url"
              value={previewWebhookId}
              onChange={(e) => handlePathChange(e.target.value)}
              className="nodrag cursor-text min-w-0 shrink border-0 bg-transparent px-0 py-2 pr-0 font-mono text-sm whitespace-nowrap focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="nodrag"
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
            className="nodrag w-full"
            onClick={handleStartListening}
          >
            <PlayIcon className="mr-2 size-4" />
            Listen for Events
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="nodrag w-full"
            onClick={handleStopListening}
          >
            <StopCircleIcon className="mr-2 size-4" />
            Stop Listening
          </Button>
        )}
      </div>

      <WebhookEventList events={events} isListening={isListening} />

      <div className="space-y-2 rounded-lg bg-muted p-4">
        <h4 className="text-sm font-medium">Usage</h4>
        <p className="text-sm text-muted-foreground">
          Send HTTP requests (GET, POST, PUT, DELETE, PATCH) to this URL to
          trigger your workflow.
        </p>
      </div>

      <div className="space-y-2 rounded-lg bg-muted p-4">
        <h4 className="text-sm font-medium">Variables from this webhook</h4>
        {displaySchema ? (
          <p className="text-sm text-muted-foreground">
            {variableNames.length > 0 ? (
              <>
                You can use these in the next steps:{" "}
                <span className="font-medium text-foreground">
                  {variableNames.map(toFriendlyLabel).join(", ")}
                </span>
              </>
            ) : (
              "No fields were detected in the request body. Send a request with JSON (e.g. name, email) and listen again to capture variables."
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click <strong>Listen for Events</strong>, then send a request to the
            webhook URL above. The fields you send (e.g. name, email, phone) will
            appear here so you can use them in later steps.
          </p>
        )}
      </div>
    </div>
  );
}
