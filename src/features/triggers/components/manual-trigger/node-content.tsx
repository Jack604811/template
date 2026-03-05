"use client";

import { useParams } from "next/navigation";
import { ExecuteWorkflowButton } from "@/features/editor/components/execute-workflow-button";

interface ManualTriggerNodeContentProps {
  nodeId: string;
}

export function ManualTriggerNodeContent({ nodeId }: ManualTriggerNodeContentProps) {
  const { workflowId } = useParams() as { workflowId: string };

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-muted-foreground">
        Used to manually execute a workflow. Click the button below to run it
        now.
      </p>
      <div className="nodrag flex justify-center">
        <ExecuteWorkflowButton workflowId={workflowId} nodeId={nodeId} />
      </div>
    </div>
  );
}
