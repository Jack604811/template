import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.executions.getMany>;

/**
 * Prefetch all executions
 */
export const prefetchExecutions = (params: Input) => {
  return prefetch(trpc.executions.getMany.queryOptions(params));
};

/**
 * Prefetch a single execution
 */
export const prefetchExecution = (id: string) => {
  return prefetch(trpc.executions.getOne.queryOptions({ id }));
};

/**
 * Prefetch last execution context for a workflow (variable picker).
 * Called on workflow editor load so the variable selector has data without client fetch.
 */
export const prefetchLastExecutionContext = (workflowId: string) => {
  return prefetch(
    trpc.executions.getLastExecutionContext.queryOptions({ workflowId }),
  );
};
