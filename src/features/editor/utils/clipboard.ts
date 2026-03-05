import type { Edge, Node } from "@xyflow/react";

/**
 * Clipboard data structure for persisting copied nodes and edges
 */
export interface ClipboardData {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

const CLIPBOARD_STORAGE_KEY = "reactflow-clipboard-v1";

/**
 * Copy nodes and edges to clipboard storage
 * @param nodes - Nodes to copy
 * @param edges - Edges to copy
 * @returns true if successful, false otherwise
 */
export const copyToClipboard = (nodes: Node[], edges: Edge[]): boolean => {
  try {
    const data: ClipboardData = {
      nodes,
      edges,
      timestamp: Date.now(),
    };
    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    // Silently handle storage errors (quota exceeded, etc.)
    // Errors are already handled by returning false
    return false;
  }
};

/**
 * Get clipboard data from storage
 * @returns Clipboard data or null if not found/invalid
 */
export const getFromClipboard = (): ClipboardData | null => {
  try {
    const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const data = JSON.parse(stored) as ClipboardData;
    if (
      !data ||
      !Array.isArray(data.nodes) ||
      !Array.isArray(data.edges) ||
      typeof data.timestamp !== "number"
    ) {
      // Invalid data structure - silently return null
      return null;
    }
    return data;
  } catch {
    // Silently handle parsing errors
    // Errors are already handled by returning null
    return null;
  }
};

/**
 * Check if clipboard has data
 * @returns true if clipboard has valid data
 */
export const hasClipboardData = (): boolean => {
  return getFromClipboard() !== null;
};

