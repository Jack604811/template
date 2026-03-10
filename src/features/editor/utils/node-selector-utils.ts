import { createId } from "@paralleldrive/cuid2";
import type { Node } from "@xyflow/react";
import { NodeType } from "@/generated/prisma";

export const ensureNodesWithStartNode = (nodes: Node[]): Node[] => {
  if (nodes.length > 0) {
    return nodes;
  }

  return [
    {
      id: createId(),
      type: NodeType.INITIAL,
      data: {},
      position: { x: 0, y: 0 },
    },
  ];
};

export const buildNodesAfterInsertion = (
  nodes: Node[],
  insertedNodes: Node[],
): Node[] => {
  const nodesWithoutInitial = nodes.filter(
    (node) => node.type !== NodeType.INITIAL,
  );

  return ensureNodesWithStartNode([...nodesWithoutInitial, ...insertedNodes]);
};

export const buildNodesAfterSelection = (
  nodes: Node[],
  newNode: Node,
): Node[] => {
  return buildNodesAfterInsertion(nodes, [newNode]);
};
