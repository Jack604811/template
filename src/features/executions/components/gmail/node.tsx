"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import type { GmailFormValues } from "./node-content";
import { GmailNodeContent } from "./node-content";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGmailRealtimeToken } from "./actions";
import { GMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail";

type GmailNodeData = {
  variableName?: string;
  credentialId?: string;
  to?: string;
  subject?: string;
  body?: string;
  attachmentsManual?: Array<{ filename: string; contentBase64: string }>;
  attachmentsVariable?: string;
  showAttachmentOptions?: boolean;
  action?: "send" | "draft" | "get";
  from?: string;
  hasAttachment?: boolean;
  attachmentType?: string;
  subjectContains?: string;
};

type GmailNodeType = Node<GmailNodeData>;

export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "Gmail";

  const handleDataChange = useCallback(
    (values: GmailFormValues) => {
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
      icon="/logos/gmail.svg"
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
    >
      <GmailNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
    </BaseExecutionNode>
  );
});

GmailNode.displayName = "GmailNode";
