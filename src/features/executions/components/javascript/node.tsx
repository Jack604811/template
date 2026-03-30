"use client";

import { type Node, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { CodeXml } from "lucide-react";
import { memo, useCallback } from "react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitleInput,
} from "@/components/react-flow/base-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/workflow-node";
import { useWorkflowStore } from "@/features/editor/store/workflow-store";
import { ensureNodesWithStartNode } from "@/features/editor/utils/node-selector-utils";
import { JAVASCRIPT_CHANNEL_NAME } from "@/inngest/channels/javascript";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchJavascriptRealtimeToken } from "./actions";
import type { JavascriptNodeData } from "./executor";
import { JavascriptNodeContent, type JavascriptFormValues } from "./node-content";

type JavascriptNodeType = Node<JavascriptNodeData>;

export const JavascriptNode = memo((props: NodeProps<JavascriptNodeType>) => {
  const { setNodes } = useReactFlow();
  const setEdges = useWorkflowStore((state) => state.setEdges);

  const { status: nodeStatus, errorMessage } = useNodeStatus({
    nodeId: props.id,
    channel: JAVASCRIPT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchJavascriptRealtimeToken,
  });

  const handleDataChange = useCallback(
    (values: JavascriptFormValues) => {
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

  const handleDelete = () => {
    const currentEdges = useWorkflowStore.getState().edges;
    setNodes((nodes) =>
      ensureNodesWithStartNode(nodes.filter((node) => node.id !== props.id)),
    );
    setEdges(
      currentEdges.filter(
        (edge) => edge.source !== props.id && edge.target !== props.id,
      ),
    );
  };

  const nodeData = props.data;
  const variableName = nodeData?.variableName ?? "jsResult";

  return (
    <WorkflowNode onDelete={handleDelete}>
      <NodeStatusIndicator status={nodeStatus} variant="border">
        <BaseNode status={nodeStatus}>
          <BaseNodeHeader>
            <CodeXml className="size-4 shrink-0 text-muted-foreground" />
            <BaseNodeHeaderTitleInput
              value={variableName}
              onSave={handleVariableNameChange}
            />
          </BaseNodeHeader>
          <BaseNodeContent>
            <BaseHandle id="target-1" type="target" position={Position.Left} />
            <JavascriptNodeContent
              nodeId={props.id}
              defaultValues={nodeData}
              onDataChange={handleDataChange}
            />
            {nodeStatus === "error" && errorMessage && (
              <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                {errorMessage}
              </div>
            )}
            <BaseHandle id="source-1" type="source" position={Position.Right} />
          </BaseNodeContent>
        </BaseNode>
      </NodeStatusIndicator>
    </WorkflowNode>
  );
});

JavascriptNode.displayName = "JavascriptNode";
