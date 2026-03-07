import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useRef, useState } from "react";
import { AGENT_CHANNEL_NAME } from "@/inngest/channels/agent";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";

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
    if (!data?.length) return;

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
          // Build the new base list from tcs if present, otherwise carry prev.
          // Preserve done:true for any toolCallId already marked complete in prev.
          const prevDoneIds = new Set(prev.filter((tc) => tc.done).map((tc) => tc.toolCallId));
          const base: AgentToolCall[] = tcs?.length
            ? tcs.map((tc) => ({ ...tc, done: prevDoneIds.has(tc.toolCallId) }))
            : prev;

          if (!trs?.length) return base;

          const doneIds = new Set(trs.map((tr) => tr.toolCallId));

          // Mark matching base entries as done
          const merged = base.map((tc) =>
            doneIds.has(tc.toolCallId) ? { ...tc, done: true } : tc,
          );

          // Append any trs whose toolCallId isn't in base (arrived before tcs)
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
