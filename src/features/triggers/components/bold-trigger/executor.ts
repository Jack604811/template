import type { NodeExecutor } from "@/features/executions/types";
import { boldTriggerChannel } from "@/inngest/channels/bold-trigger";

export const boldTriggerExecutor: NodeExecutor = async ({
  nodeId,
  context,
  publish,
}) => {
  await publish(boldTriggerChannel().status({ nodeId, status: "loading" }));
  await publish(boldTriggerChannel().status({ nodeId, status: "success" }));
  return context;
};
