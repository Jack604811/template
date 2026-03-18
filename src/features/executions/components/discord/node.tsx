"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import type { DiscordFormValues } from "./dialog";
import { DiscordNodeContent } from "./node-content";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchDiscordRealtimeToken } from "./actions";
import { DISCORD_CHANNEL_NAME } from "@/inngest/channels/discord";

type DiscordNodeData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
  username?: string;
};

type DiscordNodeType = Node<DiscordNodeData>;

export const DiscordNode = memo((props: NodeProps<DiscordNodeType>) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: DISCORD_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDiscordRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "myDiscord";

  const handleDataChange = useCallback(
    (values: DiscordFormValues) => {
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
      icon="/logos/discord.svg"
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
    >
      <DiscordNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseExecutionNode>
  );
});

DiscordNode.displayName = "DiscordNode";
