import type { NodeExecutor } from "@/features/executions/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import type { WebhookTriggerNodeData } from "./actions";

function buildWebhookPayloadFromSchema(schema: {
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
}) {
  return {
    body: schema.body,
    headers: schema.headers,
    query: schema.query,
    method: "POST",
    path: "",
    raw: "",
  };
}

/**
 * Webhook Trigger Executor
 *
 * When the workflow is triggered by the webhook API route, context already
 * contains webhook data. When run from the UI (Execute workflow button),
 * context has no webhook; we inject the node's stored webhookSchema as
 * sample data so downstream nodes and the Inngest step output are not empty.
 */
export const webhookTriggerExecutor: NodeExecutor<
  WebhookTriggerNodeData
> = async ({ data, nodeId, context, publish }) => {
  await publish(webhookTriggerChannel().status({ nodeId, status: "loading" }));

  let result = context;
  if (context && "webhook" in context && context.webhook != null) {
    result = context;
  } else if (data?.webhookSchema) {
    result = { ...context, webhook: buildWebhookPayloadFromSchema(data.webhookSchema) };
  }

  await publish(webhookTriggerChannel().status({ nodeId, status: "success" }));
  return result;
};

