"use client";

import { useReactFlow, type NodeProps } from "@xyflow/react";
import { memo, useCallback } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GMAIL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/gmail-trigger";
import { fetchGmailTriggerRealtimeToken } from "./actions";
import { GmailTriggerNodeContent, type GmailTriggerFormValues } from "./node-content";
import { BaseTriggerNode } from "../base-trigger-node";

export const GmailTriggerNode = memo((props: NodeProps) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailTriggerRealtimeToken,
  });

  const name = (props.data?.name as string | undefined) ?? "Gmail";
  const nodeData = props.data as Partial<GmailTriggerFormValues>;

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
    (values: GmailTriggerFormValues) => {
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
      icon="/logos/gmail.svg"
      name={name}
      onNameChange={handleNameChange}
      status={nodeStatus}
    >
      <GmailTriggerNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseTriggerNode>
  );
});

GmailTriggerNode.displayName = "GmailTriggerNode";
