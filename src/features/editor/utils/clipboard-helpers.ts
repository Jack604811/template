import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import { createId } from "@paralleldrive/cuid2";
import { NodeType } from "@/generated/prisma";

/**
 * Validate that a position object has x and y properties
 */
export function isValidPosition(
  position: unknown,
): position is { x: number; y: number } {
  return (
    typeof position === "object" &&
    position !== null &&
    "x" in position &&
    "y" in position &&
    typeof (position as { x: unknown }).x === "number" &&
    typeof (position as { y: unknown }).y === "number"
  );
}

/**
 * Get selected nodes from the editor, excluding INITIAL nodes
 */
export function getSelectedNodes(
  editor: ReactFlowInstance | null,
): { nodes: Node[]; error: string | null } {
  if (!editor) {
    return { nodes: [], error: "Editor not ready" };
  }
  const allNodes = editor.getNodes();
  const selectedNodes = allNodes.filter((node) => node.selected);
  if (selectedNodes.length === 0) {
    return { nodes: [], error: "No nodes selected" };
  }
  const validNodes = selectedNodes.filter(
    (node) => node.type !== NodeType.INITIAL,
  );
  if (validNodes.length === 0) {
    return { nodes: [], error: "Cannot copy INITIAL nodes" };
  }
  return { nodes: validNodes, error: null };
}

/**
 * Get edges that are internal to the selected nodes (both source and target are selected)
 */
export function getInternalEdges(
  editor: ReactFlowInstance,
  selectedNodeIds: Set<string>,
): Edge[] {
  const allEdges = editor.getEdges();
  return allEdges.filter(
    (edge) =>
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
  );
}

/**
 * Calculate paste position at viewport center with random offset
 */
export function calculatePastePosition(
  editor: ReactFlowInstance,
  offsetRange: number,
): { x: number; y: number } {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const offsetX = (Math.random() - 0.5) * offsetRange;
  const offsetY = (Math.random() - 0.5) * offsetRange;
  return editor.screenToFlowPosition({
    x: centerX + offsetX,
    y: centerY + offsetY,
  });
}

/**
 * Apply position offset to nodes while maintaining relative positions
 */
export function applyPositionOffset(
  nodes: Node[],
  originalNodes: Node[],
  pastePosition: { x: number; y: number },
): void {
  const firstNodeOriginal = originalNodes[0];
  if (!firstNodeOriginal || !isValidPosition(firstNodeOriginal.position)) {
    nodes.forEach((node) => {
      node.position = pastePosition;
    });
    return;
  }
  const offset = {
    x: pastePosition.x - firstNodeOriginal.position.x,
    y: pastePosition.y - firstNodeOriginal.position.y,
  };
  nodes.forEach((node, index) => {
    const originalNode = originalNodes[index];
    if (originalNode && isValidPosition(originalNode.position)) {
      node.position = {
        x: originalNode.position.x + offset.x,
        y: originalNode.position.y + offset.y,
      };
    } else {
      node.position = pastePosition;
    }
  });
}

/**
 * Generate new IDs for nodes and create ID mapping
 */
export function generateNodeIdMap(
  nodes: Node[],
): { idMap: Map<string, string>; newNodes: Node[] } {
  const idMap = new Map<string, string>();
  const newNodes: Node[] = nodes.map((node) => {
    const newId = createId();
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      selected: true,
    };
  });
  return { idMap, newNodes };
}

/**
 * Map edge source/target IDs to new node IDs
 */
export function mapEdgeIds(
  edges: Edge[],
  nodeIdMap: Map<string, string>,
): Edge[] | null {
  const newEdges: Edge[] = [];
  for (const edge of edges) {
    const newSourceId = nodeIdMap.get(edge.source);
    const newTargetId = nodeIdMap.get(edge.target);
    if (!newSourceId || !newTargetId) {
      return null;
    }
    newEdges.push({
      ...edge,
      id: createId(),
      source: newSourceId,
      target: newTargetId,
      selected: true,
    });
  }
  return newEdges;
}

