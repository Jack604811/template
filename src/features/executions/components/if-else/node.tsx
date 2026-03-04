"use client";

import { Position, type Node, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import {
  type NodeStatus,
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/workflow-node";
import { useWorkflowStore } from "@/features/editor/store/workflow-store";
import { IfElseDialog, type IfElseFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { IF_ELSE_CHANNEL_NAME } from "@/inngest/channels/if-else";
import { fetchIfElseRealtimeToken } from "./actions";
import type { IfElseNodeData } from "./executor";

type IfElseNodeType = Node<IfElseNodeData>;

const getDescription = (conditionsLength: number | undefined): string => {
  if (!conditionsLength || conditionsLength === 0) {
    return "Not configured";
  }
  if (conditionsLength === 1) {
    return "Evaluates 1 condition";
  }
  return `Evaluates ${conditionsLength} conditions`;
};

export const IfElseNode = memo((props: NodeProps<IfElseNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);

  const nodeStatus: NodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IF_ELSE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchIfElseRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: IfElseFormValues) => {
    const currentNodes = useWorkflowStore.getState().nodes;
    const nextNodes = currentNodes.map((node) => {
      if (node.id === props.id) {
        return {
          ...node,
          data: {
            ...node.data,
            ...values,
          },
        };
      }
      return node;
    });
    setNodes(nextNodes);
  };

  const handleDelete = () => {
    const currentNodes = useWorkflowStore.getState().nodes;
    const currentEdges = useWorkflowStore.getState().edges;
    setNodes(currentNodes.filter((node) => node.id !== props.id));
    setEdges(
      currentEdges.filter(
        (edge) => edge.source !== props.id && edge.target !== props.id,
      ),
    );
  };

  const nodeData = props.data;
  const conditions = nodeData?.conditions ?? [];
  const description = useMemo(
    () => getDescription(conditions.length),
    [conditions.length],
  );

  const totalBranches = conditions.length + 1; // conditions + else

  return (
    <>
      <IfElseDialog
        nodeId={props.id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <WorkflowNode
        name="Condition"
        description={description}
        onDelete={handleDelete}
        onSettings={handleOpenSettings}
      >
        <NodeStatusIndicator status={nodeStatus} variant="border">
          <BaseNode status={nodeStatus} onDoubleClick={handleOpenSettings}>
            <BaseNodeContent>
              <GitBranch className="size-4 text-muted-foreground" />
              <BaseHandle
                id="target-1"
                type="target"
                position={Position.Left}
              />
              {conditions.map((condition, index) => (
                <BaseHandle
                  key={condition.id ?? `case-${index}`}
                  id={`case-${index}`}
                  type="source"
                  position={Position.Right}
                  style={{
                    top: `${((index + 0.5) / totalBranches) * 100}%`,
                  }}
                  className="absolute -right-1.5"
                />
              ))}
              <BaseHandle
                id="else"
                type="source"
                position={Position.Right}
                style={{
                  top: `${((totalBranches - 0.5) / totalBranches) * 100}%`,
                }}
                className="absolute -right-1.5"
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    </>
  );
});

IfElseNode.displayName = "IfElseNode";

