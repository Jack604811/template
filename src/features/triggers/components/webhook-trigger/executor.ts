import type { NodeExecutor } from "@/features/executions/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import type { WebhookTriggerNodeData } from "./actions";

/**
 * Webhook Trigger Executor
 * 
 * Executes the webhook trigger node. This is a pass-through executor
 * that simply forwards the context (which includes webhook data) to
 * the next node in the workflow.
 * 
 * The webhook data is injected into the context by the webhook API route
 * when the webhook is called.
 */
export const webhookTriggerExecutor: NodeExecutor<
  WebhookTriggerNodeData
> = async ({ nodeId, context, step, publish }) => {
  await publish(
    webhookTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const result = await step.run("webhook-trigger", async () => {
    // Webhook trigger is a pass-through node
    // The webhook data is already in the context from the API route
    return context;
  });

  await publish(
    webhookTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};

