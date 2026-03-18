"use client";

import {
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { memo, useCallback } from "react";
import { BaseHandle } from "@/components/react-flow/base-handle";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitleInput,
} from "@/components/react-flow/base-node";
import {
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/workflow-node";
import { useWorkflowStore } from "@/features/editor/store/workflow-store";
import { ensureNodesWithStartNode } from "@/features/editor/utils/node-selector-utils";
import { IF_ELSE_CHANNEL_NAME } from "@/inngest/channels/if-else";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchIfElseRealtimeToken } from "./actions";
import type { IfElseFormValues } from "./dialog";
import type { IfElseNodeData } from "./executor";
import { IfElseNodeContent } from "./node-content";

type IfElseNodeType = Node<IfElseNodeData>;

export const IfElseNode = memo((props: NodeProps<IfElseNodeType>) => {
  const { setNodes } = useReactFlow();
  const setEdges = useWorkflowStore((state) => state.setEdges);

  const { status: nodeStatus } = useNodeStatus({
    nodeId: props.id,
    channel: IF_ELSE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchIfElseRealtimeToken,
  });

  const handleDataChange = useCallback(
    (values: IfElseFormValues) => {
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
  const variableName = nodeData?.variableName ?? "condition";

  return (
    <WorkflowNode onDelete={handleDelete}>
      <NodeStatusIndicator status={nodeStatus} variant="border">
        <BaseNode status={nodeStatus}>
          <BaseNodeHeader>
            <GitBranch className="size-4 shrink-0 text-muted-foreground" />
            <BaseNodeHeaderTitleInput
              value={variableName}
              onSave={handleVariableNameChange}
            />
          </BaseNodeHeader>
          <BaseNodeContent>
            <BaseHandle id="target-1" type="target" position={Position.Left} />
            <IfElseNodeContent
              nodeId={props.id}
              defaultValues={nodeData}
              onDataChange={handleDataChange}
            />
          </BaseNodeContent>
        </BaseNode>
      </NodeStatusIndicator>
      <BaseHandle
        id="else"
        type="source"
        position={Position.Right}
        label="Else"
      />
    </WorkflowNode>
  );
});

IfElseNode.displayName = "IfElseNode";
