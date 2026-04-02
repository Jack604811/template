import type { NodeExecutor } from "@/features/executions/types";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";

type GoogleFormTriggerData = Record<string, unknown>;

export const googleFormTriggerExecutor: NodeExecutor<GoogleFormTriggerData> = async ({
  nodeId,
  context,
  publish,
}) => {
  await publish(googleFormTriggerChannel().status({ nodeId, status: "loading" }));
  await publish(googleFormTriggerChannel().status({ nodeId, status: "success" }));
  return context;
};
