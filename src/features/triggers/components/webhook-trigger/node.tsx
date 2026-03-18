"use client";

import { useReactFlow, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { WebhookTriggerNodeContent } from "./node-content";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchWebhookTriggerRealtimeToken } from "./actions";
import { WEBHOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/webhook-trigger";

export const WebhookTrigger = memo((props: NodeProps) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWebhookTriggerRealtimeToken,
  });

  const name = (props.data?.name as string | undefined) ?? "Webhook";

  const handleNameChange = (value: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, name: value } }
          : node
      )
    );
  };

  return (
    <BaseTriggerNode
      {...props}
      icon="/logos/webhooks.svg"
      name={name}
      onNameChange={handleNameChange}
      status={nodeStatus}
    >
      <WebhookTriggerNodeContent nodeId={props.id} />
    </BaseTriggerNode>
  );
});

WebhookTrigger.displayName = "WebhookTrigger";

