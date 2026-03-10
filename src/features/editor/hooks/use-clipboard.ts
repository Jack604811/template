"use client";

import type { Edge, Node } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { editorAtom } from "../store/atoms";
import { useWorkflowStore } from "../store/workflow-store";
import {
  copyToClipboard,
  getFromClipboard,
  hasClipboardData,
} from "../utils/clipboard";
import {
  applyPositionOffset,
  calculatePastePosition,
  generateNodeIdMap,
  getInternalEdges,
  getSelectedNodes,
  mapEdgeIds,
} from "../utils/clipboard-helpers";
import { buildNodesAfterInsertion } from "../utils/node-selector-utils";

// Constants
const PASTE_OFFSET_RANGE = 100; // Random offset range in pixels for paste position

const errorMessages = {
  EDITOR_NOT_READY: "Editor not ready",
  NO_NODES_SELECTED: "No nodes selected",
  CANNOT_COPY_INITIAL: "Cannot copy INITIAL nodes",
  CANNOT_CUT_INITIAL: "Cannot cut INITIAL nodes",
  CLIPBOARD_EMPTY: "Clipboard is empty",
  FAILED_TO_COPY: "Failed to copy nodes",
  FAILED_TO_MAP_EDGE_IDS: "Failed to map edge IDs",
} as const;

const successMessages = {
  COPIED: (count: number) => `Copied ${count} node(s)`,
  CUT: (count: number) => `Cut ${count} node(s)`,
  PASTED: (count: number) => `Pasted ${count} node(s)`,
  DUPLICATED: (count: number) => `Duplicated ${count} node(s)`,
} as const;

/**
 * Deselect all existing nodes and edges, then add new ones
 */
function addNodesAndEdgesWithDeselection(
  newNodes: Node[],
  newEdges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
): void {
  const currentNodes = useWorkflowStore.getState().nodes;
  const currentEdges = useWorkflowStore.getState().edges;

  const deselectedNodes = currentNodes.map((node) => ({
    ...node,
    selected: false,
  }));

  const deselectedEdges = currentEdges.map((edge) => ({
    ...edge,
    selected: false,
  }));

  setNodes(buildNodesAfterInsertion(deselectedNodes, newNodes));
  setEdges([...deselectedEdges, ...newEdges]);
}

/**
 * Hook for clipboard operations (copy, cut, paste, duplicate)
 */
export const useClipboard = () => {
  const editor = useAtomValue(editorAtom);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);

  /**
   * Copy selected nodes and their internal edges
   */
  const handleCopy = useCallback(() => {
    const result = getSelectedNodes(editor);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    const nodesToCopy = result.nodes;
    const selectedNodeIds = new Set(nodesToCopy.map((node) => node.id));
    const edgesToCopy = editor ? getInternalEdges(editor, selectedNodeIds) : [];

    const success = copyToClipboard(nodesToCopy, edgesToCopy);
    if (success) {
      toast.success(successMessages.COPIED(nodesToCopy.length));
    } else {
      toast.error(errorMessages.FAILED_TO_COPY);
    }
  }, [editor]);

  /**
   * Cut selected nodes and their internal edges (copy + delete)
   */
  const handleCut = useCallback(() => {
    const result = getSelectedNodes(editor);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    const nodesToCut = result.nodes;
    const selectedNodeIds = new Set(nodesToCut.map((node) => node.id));
    const edgesToCut = editor ? getInternalEdges(editor, selectedNodeIds) : [];

    // Copy to clipboard first
    const success = copyToClipboard(nodesToCut, edgesToCut);

    if (!success) {
      toast.error(errorMessages.FAILED_TO_COPY);
      return;
    }

    // Get current state from workflow store and remove cut nodes
    // Edge cleanup is handled automatically by onNodesChange in the workflow store
    const currentNodes = useWorkflowStore.getState().nodes;

    setNodes(currentNodes.filter((node) => !selectedNodeIds.has(node.id)));

    toast.success(successMessages.CUT(nodesToCut.length));
  }, [editor, setNodes]);

  /**
   * Paste nodes and edges from clipboard
   */
  const handlePaste = useCallback(() => {
    if (!editor) {
      toast.error(errorMessages.EDITOR_NOT_READY);
      return;
    }

    if (!hasClipboardData()) {
      toast.error(errorMessages.CLIPBOARD_EMPTY);
      return;
    }

    const clipboardData = getFromClipboard();
    if (!clipboardData || clipboardData.nodes.length === 0) {
      toast.error(errorMessages.CLIPBOARD_EMPTY);
      return;
    }

    const { nodes: nodesToPaste, edges: edgesToPaste } = clipboardData;
    const { idMap, newNodes } = generateNodeIdMap(nodesToPaste);
    const pastePosition = calculatePastePosition(editor, PASTE_OFFSET_RANGE);
    applyPositionOffset(newNodes, nodesToPaste, pastePosition);

    const newEdges = mapEdgeIds(edgesToPaste, idMap);
    if (!newEdges) {
      toast.error(errorMessages.FAILED_TO_MAP_EDGE_IDS);
      return;
    }

    addNodesAndEdgesWithDeselection(newNodes, newEdges, setNodes, setEdges);

    toast.success(successMessages.PASTED(newNodes.length));
  }, [editor, setNodes, setEdges]);

  /**
   * Duplicate selected nodes (instant copy-paste)
   */
  const handleDuplicate = useCallback(() => {
    const result = getSelectedNodes(editor);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (!editor) {
      toast.error(errorMessages.EDITOR_NOT_READY);
      return;
    }

    const nodesToDuplicate = result.nodes;
    const { idMap, newNodes } = generateNodeIdMap(nodesToDuplicate);
    const pastePosition = calculatePastePosition(editor, PASTE_OFFSET_RANGE);
    applyPositionOffset(newNodes, nodesToDuplicate, pastePosition);

    const selectedNodeIds = new Set(nodesToDuplicate.map((node) => node.id));
    const edgesToDuplicate = editor
      ? getInternalEdges(editor, selectedNodeIds)
      : [];

    const newEdges = mapEdgeIds(edgesToDuplicate, idMap);
    if (!newEdges) {
      toast.error(errorMessages.FAILED_TO_MAP_EDGE_IDS);
      return;
    }

    addNodesAndEdgesWithDeselection(newNodes, newEdges, setNodes, setEdges);

    toast.success(successMessages.DUPLICATED(newNodes.length));
  }, [editor, setNodes, setEdges]);

  return {
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    hasClipboardData,
  };
};
