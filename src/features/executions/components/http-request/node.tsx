"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useCallback } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import type { HttpRequestFormValues } from "./dialog";
import { HttpRequestNodeContent } from "./node-content";
import { useNodeStatus } from "../../hooks/use-node-status";
import { HTTP_REQUEST_CHANNEL_NAME } from "@/inngest/channels/http-request";
import { fetchHttpRequestRealtimeToken } from "./actions";

type HttpRequestNodeData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: HTTP_REQUEST_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchHttpRequestRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "myApiCall";

  const handleDataChange = useCallback(
    (values: HttpRequestFormValues) => {
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
      icon={GlobeIcon}
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
    >
      <HttpRequestNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseExecutionNode>
  );
});

HttpRequestNode.displayName = "HttpRequestNode";
