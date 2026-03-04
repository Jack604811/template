"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { memo, useCallback } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import type { AgentFormValues } from "./dialog";
import { AgentNodeContent } from "./node-content";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchAgentRealtimeToken } from "./actions";
import { AGENT_CHANNEL_NAME } from "@/inngest/channels/agent";

type AgentNodeData = AgentFormValues & { variableName?: string };

type AgentNodeType = Node<AgentNodeData>;

export const AgentNode = memo((props: NodeProps<AgentNodeType>) => {
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: AGENT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAgentRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "agentResult";

  const handleDataChange = useCallback(
    (values: AgentFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...values } }
            : node
        )
      );
    },
    [props.id, setNodes]
  );

  const handleVariableNameChange = useCallback(
    (value: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, variableName: value } }
            : node
        )
      );
    },
    [props.id, setNodes]
  );

  return (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon={Bot}
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
    >
      <AgentNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseExecutionNode>
  );
});

AgentNode.displayName = "AgentNode";
