"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useCallback } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import type { WhatsAppFormValues } from "./node-content";
import { WhatsAppNodeContent } from "./node-content";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchWhatsAppRealtimeToken } from "./actions";
import { WHATSAPP_CHANNEL_NAME } from "@/inngest/channels/whatsapp";

type WhatsAppNodeData = {
  variableName?: string;
  credentialId?: string;
  to?: string;
  body?: string;
  action?: "send_text" | "send_template" | "send_messages";
  messages?: Array<{ type: "text" | "image" | "audio" | "document" | "video"; text?: string; url?: string; mediaId?: string; mediaFilename?: string; caption?: string; filename?: string }>;
  templateName?: string;
  templateLanguage?: string;
  templateHeaderCount?: number;
  templateParams?: string[];
};

type WhatsAppNodeType = Node<WhatsAppNodeData>;

export const WhatsAppNode = memo((props: NodeProps<WhatsAppNodeType>) => {
  const { setNodes } = useReactFlow();

  const { status: nodeStatus, errorMessage } = useNodeStatus({
    nodeId: props.id,
    channel: WHATSAPP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWhatsAppRealtimeToken,
  });

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "WhatsApp";

  const handleDataChange = useCallback(
    (values: WhatsAppFormValues) => {
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
      icon="/logos/whatsapp.svg"
      variableName={variableName}
      onVariableNameChange={handleVariableNameChange}
      status={nodeStatus}
    >
      <WhatsAppNodeContent
        nodeId={props.id}
        defaultValues={nodeData}
        onDataChange={handleDataChange}
      />
      {nodeStatus === "error" && errorMessage && (
        <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {errorMessage}
        </div>
      )}
    </BaseExecutionNode>
  );
});

WhatsAppNode.displayName = "WhatsAppNode";
