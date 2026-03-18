"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import type { SlackFormValues } from "./dialog";
import { SlackNodeContent } from "./node-content";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchSlackRealtimeToken } from "./actions";
import { SLACK_CHANNEL_NAME } from "@/inngest/channels/slack";

type SlackNodeData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
  username?: string;
};

type SlackNodeType = Node<SlackNodeData>;

export const SlackNode = memo((props: NodeProps<SlackNodeType>) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: SLACK_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSlackRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "mySlack";

  const handleDataChange = useCallback(
    (values: SlackFormValues) => {
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
      icon="/logos/slack.svg"
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
    >
      <SlackNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseExecutionNode>
  );
});

SlackNode.displayName = "SlackNode";
