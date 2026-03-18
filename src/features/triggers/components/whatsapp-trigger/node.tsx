"use client";

import { useReactFlow, type NodeProps } from "@xyflow/react";
import { memo, useCallback } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { WHATSAPP_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/whatsapp-trigger";
import { fetchWhatsAppTriggerRealtimeToken } from "./actions";
import { WhatsAppTriggerNodeContent, type WhatsAppTriggerFormValues } from "./node-content";
import { BaseTriggerNode } from "../base-trigger-node";

export const WhatsAppTriggerNode = memo((props: NodeProps) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: WHATSAPP_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWhatsAppTriggerRealtimeToken,
  });

  const name = (props.data?.name as string | undefined) ?? "WhatsApp";
  const nodeData = props.data as Partial<WhatsAppTriggerFormValues>;

  const handleNameChange = (value: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, name: value } }
          : node,
      ),
    );
  };

  const handleDataChange = useCallback(
    (values: WhatsAppTriggerFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...values } }
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  return (
    <BaseTriggerNode
      {...props}
      icon="/logos/whatsapp.svg"
      name={name}
      onNameChange={handleNameChange}
      status={nodeStatus}
    >
      <WhatsAppTriggerNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseTriggerNode>
  );
});

WhatsAppTriggerNode.displayName = "WhatsAppTriggerNode";
