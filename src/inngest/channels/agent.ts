import { channel, topic } from "@inngest/realtime";

export const AGENT_CHANNEL_NAME = "agent-execution";

export type AgentToolCallEvent = {
  toolName: string;
  toolCallId: string;
};

export type AgentToolResultEvent = {
  toolName: string;
  toolCallId: string;
  result: unknown;
};

// Single topic carrying everything — Inngest publish() uses the channel name
// as the step ID, so only ONE publish call per channel per function run is safe.
// We pack status + tool activity + final text into one message.
export const agentChannel = channel(AGENT_CHANNEL_NAME).addTopic(
  topic("update").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
    text?: string;
    errorMessage?: string;
    toolCalls?: AgentToolCallEvent[];
    toolResults?: AgentToolResultEvent[];
  }>(),
);
