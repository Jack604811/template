"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useCallback } from "react";
import { HTTP_REQUEST_CHANNEL_NAME } from "@/inngest/channels/http-request";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchHttpRequestRealtimeToken } from "./actions";
import {
  type HttpRequestFormValues,
  HttpRequestNodeContent,
} from "./node-content";

type HttpRequestNodeData = {
  variableName?: string;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  authType?: "none" | "bearer" | "basic" | "apiKey";
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyPlacement?: "header" | "query";
  headers?: { key: string; value: string }[];
  queryParams?: { key: string; value: string }[];
  bodyType?: "json" | "form" | "raw";
  body?: string;
  timeout?: number;
  followRedirects?: boolean;
  responseType?: "auto" | "json" | "text";
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus, errorMessage } = useNodeStatus({
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
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  const handleVariableNameChange = useCallback(
    (value: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, variableName: value } }
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  return (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon={GlobeIcon}
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
      errorMessage={errorMessage}
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
