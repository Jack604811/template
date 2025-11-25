import { create } from 'zustand';
import { temporal } from 'zundo';
import { 
  type Edge, 
  type Node, 
  type OnNodesChange, 
  type OnEdgesChange, 
  type OnConnect, 
  type NodeChange, 
  type EdgeChange, 
  type Connection, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge,
} from '@xyflow/react';
import { isEqual } from 'lodash';

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
      
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      
      onNodesChange: (changes: NodeChange[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      
      onEdgesChange: (changes: EdgeChange[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
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
        return isEqual(past.nodes, present.nodes) && isEqual(past.edges, present.edges);
      },
      limit: undefined, // Infinite history
    }
  )
);

export const useWorkflowTemporal = () => useWorkflowStore.temporal;
