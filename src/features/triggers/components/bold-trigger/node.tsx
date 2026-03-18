"use client";

import { useReactFlow, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { BOLD_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/bold-trigger";
import { fetchBoldTriggerRealtimeToken } from "./actions";
import { BoldTriggerNodeContent } from "./node-content";
import { BaseTriggerNode } from "../base-trigger-node";

export const BoldTriggerNode = memo((props: NodeProps) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: BOLD_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchBoldTriggerRealtimeToken,
  });

  const name = (props.data?.name as string | undefined) ?? "Bold";

  const handleNameChange = (value: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, name: value } }
          : node,
      ),
    );
  };

  return (
    <BaseTriggerNode
      {...props}
      icon="/logos/Bold.svg"
      name={name}
      onNameChange={handleNameChange}
      status={nodeStatus}
    >
      <BoldTriggerNodeContent nodeId={props.id} />
    </BaseTriggerNode>
  );
});

BoldTriggerNode.displayName = "BoldTriggerNode";
