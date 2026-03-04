"use client";

import { useParams } from "next/navigation";
import { ExecuteWorkflowButton } from "@/features/editor/components/execute-workflow-button";

export function ManualTriggerNodeContent() {
  const { workflowId } = useParams() as { workflowId: string };

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-muted-foreground">
        Used to manually execute a workflow. Click the button below to run it
        now.
      </p>
      <div className="nodrag flex justify-center">
        <ExecuteWorkflowButton workflowId={workflowId} />
      </div>
    </div>
  );
}
