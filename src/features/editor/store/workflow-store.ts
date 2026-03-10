import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { isEqual } from "lodash";
import { temporal } from "zundo";
import { create } from "zustand";
import { ensureNodesWithStartNode } from "../utils/node-selector-utils";

export interface WorkflowState {
  nodes: Node[];
  edges: Edge[];

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
}

export const useWorkflowStore = create<WorkflowState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],

      setNodes: (nodes) => set({ nodes: ensureNodesWithStartNode(nodes) }),
      setEdges: (edges) => set({ edges }),

      onNodesChange: (changes: NodeChange[]) => {
        const currentNodes = get().nodes;
        const updatedNodes = applyNodeChanges(changes, currentNodes);

        const removedNodeIds = new Set<string>();
        for (const change of changes) {
          if (change.type === "remove" && change.id) {
            removedNodeIds.add(change.id);
          }
        }

        let updatedEdges = get().edges;
        if (removedNodeIds.size > 0) {
          updatedEdges = updatedEdges.filter(
            (edge) =>
              !removedNodeIds.has(edge.source) &&
              !removedNodeIds.has(edge.target),
          );
        }

        const currentEdges = get().edges;
        if (
          isEqual(currentNodes, updatedNodes) &&
          isEqual(currentEdges, updatedEdges)
        ) {
          return;
        }
        const normalizedNodes = ensureNodesWithStartNode(updatedNodes);
        set({
          nodes: normalizedNodes,
          edges: updatedNodes.length === 0 ? [] : updatedEdges,
        });
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        const currentEdges = get().edges;
        const updatedEdges = applyEdgeChanges(changes, currentEdges);
        if (isEqual(currentEdges, updatedEdges)) return;
        set({ edges: updatedEdges });
      },

      onConnect: (connection: Connection) => {
        // defaultEdgeOptions in editor.tsx will handle marker and style configuration
        set({
          edges: addEdge(connection, get().edges),
        });
      },
    }),
    {
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      equality: (past, present) => {
        return (
          isEqual(past.nodes, present.nodes) &&
          isEqual(past.edges, present.edges)
        );
      },
      limit: undefined, // Infinite history
    },
  ),
);

export const useWorkflowTemporal = () => useWorkflowStore.temporal;
