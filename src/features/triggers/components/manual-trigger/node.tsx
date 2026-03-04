"use client";

import { useReactFlow, type NodeProps } from "@xyflow/react";
import { MousePointerIcon } from "lucide-react";
import { memo } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { ManualTriggerNodeContent } from "./node-content";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";

export const ManualTriggerNode = memo((props: NodeProps) => {
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MANUAL_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchManualTriggerRealtimeToken,
  });

  const name = (props.data?.name as string | undefined) ?? "Manual";

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
      icon={MousePointerIcon}
      name={name}
      onNameChange={handleNameChange}
      status={nodeStatus}
    >
      <ManualTriggerNodeContent />
    </BaseTriggerNode>
  );
});
