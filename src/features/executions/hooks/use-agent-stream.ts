import type { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { AGENT_CHANNEL_NAME } from "@/inngest/channels/agent";
import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useRef, useState } from "react";

export type AgentToolCall = {
  toolCallId: string;
  toolName: string;
  done: boolean;
};

export type AgentStreamState = {
  status: NodeStatus;
  streamText: string;
  toolCalls: AgentToolCall[];
};

interface UseAgentStreamOptions {
  nodeId: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token>;
}

export function useAgentStream({ nodeId, refreshToken }: UseAgentStreamOptions): AgentStreamState {
  const [status, setStatus] = useState<NodeStatus>("initial");
  const [streamText, setStreamText] = useState("");
  const [toolCalls, setToolCalls] = useState<AgentToolCall[]>([]);

  const lastLengthRef = useRef(0);

  const { data } = useInngestSubscription({
    refreshToken,
    enabled: true,
  });

  useEffect(() => {
    // When subscription resets (reconnect / new session), reset pointer so we
    // reprocess all messages from the beginning and pick up the loading event.
    if (!data?.length) {
      lastLengthRef.current = 0;
      return;
    }

    const newMessages = data.slice(lastLengthRef.current);
    lastLengthRef.current = data.length;

    for (const msg of newMessages) {
      if (
        msg.kind !== "data" ||
        msg.channel !== AGENT_CHANNEL_NAME ||
        msg.topic !== "update" ||
        msg.data.nodeId !== nodeId
      ) {
        continue;
      }

      const { status: newStatus, text, toolCalls: tcs, toolResults: trs } = msg.data as {
        status: "loading" | "success" | "error";
        text?: string;
        toolCalls?: { toolName: string; toolCallId: string }[];
        toolResults?: { toolName: string; toolCallId: string; result: unknown }[];
      };

      // Reset on new run
      if (newStatus === "loading") {
        setStreamText("");
        setToolCalls([]);
      }

      setStatus(newStatus as NodeStatus);

      if (text) {
        setStreamText(text);
      }

      if (tcs?.length || trs?.length) {
        setToolCalls((prev) => {
          const prevDoneIds = new Set(prev.filter((tc) => tc.done).map((tc) => tc.toolCallId));
          const base: AgentToolCall[] = tcs?.length
            ? tcs.map((tc) => ({ ...tc, done: prevDoneIds.has(tc.toolCallId) }))
            : prev;

          if (!trs?.length) return base;

          const doneIds = new Set(trs.map((tr) => tr.toolCallId));
          const merged = base.map((tc) =>
            doneIds.has(tc.toolCallId) ? { ...tc, done: true } : tc,
          );

          const existingIds = new Set(base.map((tc) => tc.toolCallId));
          for (const tr of trs) {
            if (!existingIds.has(tr.toolCallId)) {
              merged.push({ toolName: tr.toolName, toolCallId: tr.toolCallId, done: true });
            }
          }

          return merged;
        });
      }
    }
  }, [data, nodeId]);

  return { status, streamText, toolCalls };
}
