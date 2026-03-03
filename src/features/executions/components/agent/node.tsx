"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { AgentDialog } from "./dialog";
import type { AgentFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchAgentRealtimeToken } from "./actions";
import { AGENT_CHANNEL_NAME } from "@/inngest/channels/agent";

type AgentNodeData = AgentFormValues;

type AgentNodeType = Node<AgentNodeData>;

export const AgentNode = memo((props: NodeProps<AgentNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: AGENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAgentRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AgentFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      }),
    );
  };

  const nodeData = props.data;
  const displayName = nodeData?.label?.trim() || "Agent";
  const description = nodeData?.userPrompt
    ? `${nodeData.userPrompt.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <AgentDialog
        nodeId={props.id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Bot}
        name={displayName}
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AgentNode.displayName = "AgentNode";
