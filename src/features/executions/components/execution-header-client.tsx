"use client";

import { ExecutionHeader } from "./execution-header";
import { useSuspenseExecution } from "../hooks/use-executions";

export const ExecutionHeaderClient = ({ executionId }: { executionId: string }) => {
  const { data: execution } = useSuspenseExecution(executionId);

  return (
    <ExecutionHeader
      executionId={executionId}
      status={execution.status}
      workflowName={execution.workflow.name}
    />
  );
};
