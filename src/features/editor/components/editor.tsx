"use client";

import { useCallback, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Background,
  MiniMap,
  Panel,
  MarkerType,
} from '@xyflow/react';
import { ErrorView, LoadingView } from "@/components/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import { useTheme } from "next-themes";

import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/node-components';
import { AddNodeButton } from './add-node-button';
import { useSetAtom } from 'jotai';
import { editorAtom } from '../store/atoms';
import { useEditorMode } from '../hooks/use-editor-mode';
import { EditorControls } from './editor-controls';
import { useWorkflowStore, useWorkflowTemporal } from '../store/workflow-store';
import { useShallow } from 'zustand/react/shallow';

export const EditorLoading = () => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = () => {
  return <ErrorView message="Error loading editor" />;
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { 
    data: workflow
  } = useSuspenseWorkflow(workflowId);

  const setEditor = useSetAtom(editorAtom);
  const { mode, setMode, toggle, flowProps } = useEditorMode();
  const temporal = useWorkflowTemporal();
  const { resolvedTheme } = useTheme();

  // Theme-aware background grid color
  const backgroundColor = resolvedTheme === 'dark' ? '#27272A' : '#E4E4E7';
  
  // Edge colors - same for edges and markers
  const defaultColors = resolvedTheme === 'dark' ? '#71717A' : '#B1B1B6';

  // Use shallow selector to avoid unnecessary re-renders
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setNodes,
    setEdges
  } = useWorkflowStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
    }))
  );

  // Initialize store with workflow data
  // Use a ref to track initialized state to prevent re-runs or loops
  const initialized = useRef(false);

  useEffect(() => {
    if (workflow && !initialized.current) {
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      initialized.current = true;
    }
  }, [workflow, setNodes, setEdges]);

  const onNodeDragStart = useCallback(() => {
    // Capture the current state (Start Point) into history before dragging begins
    // We manually push the current state to the pastStates stack
    const currentState = {
      nodes: useWorkflowStore.getState().nodes,
      edges: useWorkflowStore.getState().edges,
    };
    
    temporal.getState().pause();
    
    // Manually injecting the state to ensure we can return to exactly this point
    // We access the internal setState of the temporal store to append to pastStates
    temporal.setState((state) => ({
      pastStates: [...state.pastStates, currentState],
    }));
  }, [temporal]);

  const onNodeDragStop = useCallback(() => {
    // Resume history tracking so future actions are recorded
    temporal.getState().resume();
  }, [temporal]);

  return (
    <div className='size-full'>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeComponents}
        onInit={setEditor}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        defaultEdgeOptions={{
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: defaultColors,
            width: 12,
            height: 12,
          },
          style: {
            stroke: defaultColors,
            strokeWidth: 1,
          },
        }}
        fitView
        snapGrid={[10, 10]}
        snapToGrid
        {...flowProps}
      >
        <Background
          id="1"
          gap={10}
          color={backgroundColor}
        />
        <MiniMap zoomable pannable />
        <EditorControls 
          mode={mode}
          onModeChange={setMode}
          onToggle={toggle}
        />
        <Panel position="top-right">
          <AddNodeButton />
        </Panel>
      </ReactFlow>
    </div>
  );
};
