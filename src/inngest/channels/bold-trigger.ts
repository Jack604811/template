import { channel, topic } from "@inngest/realtime";

export const BOLD_TRIGGER_CHANNEL_NAME = "bold-trigger-execution";

export const boldTriggerChannel = channel(BOLD_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
