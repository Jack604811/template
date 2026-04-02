import type { NodeExecutor } from "@/features/executions/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

type ManualTriggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({
  nodeId,
  context,
  publish,
}) => {
  await publish(manualTriggerChannel().status({ nodeId, status: "loading" }));
  await publish(manualTriggerChannel().status({ nodeId, status: "success" }));
  return context;
};
