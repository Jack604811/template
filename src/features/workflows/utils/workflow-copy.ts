import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma";
import type { Workflow, Node, Connection } from "@/generated/prisma";

export interface CopyWorkflowOptions {
  name?: string;
  organizationId: string;
  isTemplate?: boolean;
  isPublicTemplate?: boolean;
  userId?: string | null;
  categoryId?: string | null;
  templateName?: string | null;
}

export interface WorkflowWithNodesAndConnections extends Workflow {
  nodes: Node[];
  connections: Connection[];
}

/**
 * Creates a Prisma create data structure for copying a workflow's nodes and connections.
 * Generates new IDs for all nodes and updates connection references accordingly.
 *
 * @param sourceWorkflow - The workflow to copy (must include nodes and connections)
 * @param options - Options for the copied workflow
 * @returns Prisma create data structure ready for workflow.create()
 */
export function copyWorkflowStructure(
  sourceWorkflow: WorkflowWithNodesAndConnections,
  options: CopyWorkflowOptions,
): Prisma.WorkflowCreateInput {
  // Create a map of old node IDs to new node IDs
  const nodeIdMap = new Map<string, string>();
  sourceWorkflow.nodes.forEach((node) => {
    nodeIdMap.set(node.id, randomUUID());
  });

  return {
    name: options.name ?? sourceWorkflow.name,
    organization: {
      connect: { id: options.organizationId },
    },
    isTemplate: options.isTemplate ?? false,
    isPublicTemplate: options.isPublicTemplate ?? false,
    ...(options.userId ? { user: { connect: { id: options.userId } } } : {}),
    ...(options.categoryId ? { category: { connect: { id: options.categoryId } } } : {}),
    templateName: options.templateName ?? null,
    nodes: {
      create: sourceWorkflow.nodes.map((node) => {
        const newNodeId = nodeIdMap.get(node.id);
        if (!newNodeId) {
          throw new Error(`Failed to find new ID for node ${node.id}`);
        }
        return {
          id: newNodeId,
          type: node.type,
          position: node.position as Prisma.InputJsonValue,
          name: node.name,
          data: node.data as Prisma.InputJsonValue,
        };
      }),
    },
    connections: {
      create: sourceWorkflow.connections.map((connection) => {
        const newFromNodeId = nodeIdMap.get(connection.fromNodeId);
        const newToNodeId = nodeIdMap.get(connection.toNodeId);
        if (!newFromNodeId || !newToNodeId) {
          throw new Error(`Failed to find new IDs for connection`);
        }
        return {
          fromNodeId: newFromNodeId,
          toNodeId: newToNodeId,
          fromOutput: connection.fromOutput,
          toInput: connection.toInput,
        };
      }),
    },
  };
}
