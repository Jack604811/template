"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { memo, useCallback, useEffect } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useAgentStream } from "../../hooks/use-agent-stream";
import { fetchAgentRealtimeToken } from "./actions";
import { AgentNodeContent, type AgentFormValues } from "./node-content";

type AgentNodeData = AgentFormValues & { variableName?: string };

type AgentNodeType = Node<AgentNodeData>;
const DEFAULT_AGENT_VARIABLE_NAME = "Agent";

export const AgentNode = memo((props: NodeProps<AgentNodeType>) => {
  const { setNodes } = useReactFlow();

  const { status, streamText, toolCalls } = useAgentStream({
    nodeId: props.id,
    refreshToken: fetchAgentRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? DEFAULT_AGENT_VARIABLE_NAME;

  useEffect(() => {
    if (nodeData?.variableName) {
      return;
    }
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                variableName: DEFAULT_AGENT_VARIABLE_NAME,
              },
            }
          : node,
      ),
    );
  }, [nodeData?.variableName, props.id, setNodes]);

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
      status={status}
    >
      <AgentNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
        streamText={streamText}
        toolCalls={toolCalls}
        isStreaming={status === "loading"}
      />
    </BaseExecutionNode>
  );
});

AgentNode.displayName = "AgentNode";
