import type { Connection, Node } from "@/generated/prisma";
import toposort from "toposort";
import { inngest } from "./client";
import { createId } from "@paralleldrive/cuid2";

export const topologicalSort = (
  nodes: Node[],
  connections: Connection[],
): Node[] => {
  if (nodes.length === 0) return nodes;

  const nodeIds = nodes.map((n) => n.id);
  const edges: [string, string][] = connections.map((conn) => [
    conn.fromNodeId,
    conn.toNodeId,
  ]);

  let sortedNodeIds: string[];
  try {
    sortedNodeIds = toposort.array(nodeIds, edges);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      throw new Error("Workflow contains a cycle");
    }
    throw error;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedNodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is Node => n != null);
};

interface SendWorkflowExecutionParams {
  workflowId: string;
  initialData?: Record<string, unknown>;
  triggerNodeId?: string;
}

/**
 * Send workflow execution event to Inngest.
 * Pass-through payload like template: workflowId + initialData (and optional triggerNodeId) are forwarded as event.data so variable values flow from triggers.
 */
export const sendWorkflowExecution = async (
  params: SendWorkflowExecutionParams,
) => {
  const { workflowId, initialData = {}, triggerNodeId } = params;
  return inngest.send({
    name: "workflows/execute.workflow",
    data: {
      workflowId,
      initialData,
      ...(triggerNodeId != null && { triggerNodeId }),
    },
    id: createId(),
  });
};
