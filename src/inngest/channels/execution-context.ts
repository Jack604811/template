import { channel, topic } from "@inngest/realtime";

export const EXECUTION_CONTEXT_CHANNEL_NAME = "execution-context";

export const executionContextChannel = channel(
  EXECUTION_CONTEXT_CHANNEL_NAME,
).addTopic(
  topic("context-update").type<{
    workflowId: string;
    context: Record<string, unknown>;
  }>(),
);
