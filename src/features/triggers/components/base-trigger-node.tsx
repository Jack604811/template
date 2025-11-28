"use client";

import { type NodeProps, NodeToolbar, Position, useReactFlow } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { memo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { ExecuteWorkflowButton } from "@/features/editor/components/execute-workflow-button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";

interface BaseTriggerNodeProps extends NodeProps {
  icon: LucideIcon | string;
  name: string;
  description?: string;
  children?: ReactNode;
  status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
};

export const BaseTriggerNode = memo(
  ({
    id,
    icon: Icon,
    name,
    description,
    children,
    status = "initial",
    onSettings,
    onDoubleClick,
  }: BaseTriggerNodeProps) => {
    const { setNodes, setEdges } = useReactFlow();
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
      executeWorkflow.mutate({ id: workflowId, triggerNodeId: id });
    };

    return (
      <>
        <NodeToolbar position={Position.Left} align="center" offset={10}>
          <ExecuteWorkflowButton workflowId={workflowId} nodeId={id} />
        </NodeToolbar>
        <WorkflowNode
          name={name}
          description={description}
          onDelete={handleDelete}
          onSettings={onSettings}
          onExecute={handleExecute}
          isExecuting={executeWorkflow.isPending}
        >
        <NodeStatusIndicator
          status={status}
          variant="border"
          className="rounded-l-2xl"
        >
          <BaseNode status={status} onDoubleClick={onDoubleClick} className="rounded-l-2xl relative group">
            <BaseNodeContent>
              {typeof Icon === "string" ? (
                <Image 
                  src={Icon} 
                  alt={name} 
                  width={16} 
                  height={16}
                />
              ) : (
                <Icon className="size-4 text-muted-foreground" />
              )}
              {children}
              <BaseHandle
                id="source-1"
                type="source"
                position={Position.Right}
              />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
      </>
    )
  },
);

BaseTriggerNode.displayName = "BaseTriggerNode";
