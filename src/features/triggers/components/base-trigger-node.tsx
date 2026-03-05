"use client";

import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { memo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitleInput,
} from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import {
  type NodeStatus,
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";

interface BaseTriggerNodeProps extends NodeProps {
  icon: LucideIcon | string;
  name: string;
  onNameChange: (value: string) => void;
  children?: ReactNode;
  status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
}

export const BaseTriggerNode = memo(
  ({
    id,
    icon: Icon,
    name,
    onNameChange,
    children,
    status = "initial",
    onSettings,
    onDoubleClick,
  }: BaseTriggerNodeProps) => {
    const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
    const { workflowId } = useParams() as { workflowId: string };
    const executeWorkflow = useExecuteWorkflow();

    const handleDelete = () => {
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.filter((node) => node.id !== id);
        return updatedNodes;
      });

      setEdges((currentEdges) => {
        const updatedEdges = currentEdges.filter(
          (edge) => edge.source !== id && edge.target !== id
        );
        return updatedEdges;
      });
    };

    const handleExecute = () => {
      const nodes = getNodes();
      const edges = getEdges();
      executeWorkflow.mutate({
        id: workflowId,
        triggerNodeId: id,
        nodes,
        edges,
      });
    };

    return (
      <WorkflowNode
        onDelete={handleDelete}
        onSettings={onSettings}
        onExecute={handleExecute}
        isExecuting={executeWorkflow.isPending}
      >
        <NodeStatusIndicator status={status} variant="border">
          <BaseNode status={status} onDoubleClick={onDoubleClick}>
            <BaseNodeHeader>
              {typeof Icon === "string" ? (
                <Image
                  src={Icon}
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 shrink-0"
                />
              ) : (
                <Icon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <BaseNodeHeaderTitleInput
                value={name}
                onSave={onNameChange}
                skipValidation
              />
            </BaseNodeHeader>
            <BaseNodeContent>
              {children}
              <BaseHandle
                id="source-1"
                type="source"
                position={Position.Right}
                label="Output"
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    );
  },
);

BaseTriggerNode.displayName = "BaseTriggerNode";
